import "dotenv/config";

import { v2 as cloudinary } from "cloudinary";
import { Worker } from "bullmq";
import { bullMqConnection } from "../config/bullmqConnection.js";
import { createResumePdf, PdfToText } from "../services/PdfParse.service.js";
import { aiServices } from "../services/ai.service.js";
import { Resume } from "../models/Resume.model.js";
import { setValue, getValue } from "../utils/redis.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

console.log("Cloudinary config check:", {
  cloud_name: process.env.CLOUDINARY_APP_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET ? "SET (hidden)" : "MISSING",
});

const worker = new Worker(
  "resume-analysis",
  async (job) => {
    try {
      await setValue(
        `job-status:${job.id}`,
        { stage: "parsing_pdf", status: "processing" },
        600,
      );

      const resumeBuffer = Buffer.from(job.data.resume, "base64");

      const pdfText = await PdfToText(resumeBuffer);

      await setValue(
        `job-status:${job.id}`,
        { stage: "analyzing", status: "processing" },
        600,
      );

      const prompt = `
You are analyzing a candidate's resume against a specific job.

JOB TITLE:
${job.data.jobTittle}

JOB DESCRIPTION:
${job.data.jobDescription}

RESUME:
${pdfText}

Your task is to analyze ONLY the provided resume against the provided job title and job description.

Do NOT:
- Discuss anything unrelated to the resume or job.
- Invent candidate information, skills, experience, education, projects, or achievements.
- Assume information that is not present in the resume.
- Give generic career advice unrelated to this specific job.
- Change or rewrite the candidate's actual experience as if it were factual.
- Treat missing information as present.

Return the analysis with exactly these fields:

1. job_title
- Return the exact job title provided above, unchanged: "${job.data.jobTittle}"

2. ats_score
- Overall resume match score, 0-100.

3. keyword_match
- score: keyword match score, 0-100.
- found_keywords: array of important keywords found in the resume.
- missing_keywords: array of important keywords from the job description missing from the resume.

4. formatting
- score: formatting score, 0-100, based on structure, readability, consistency, and ATS-friendliness.
- status: one of "Excellent", "Good", "Average", "Bad" — should correspond logically to the score (e.g. 90+ → "Excellent", 75-89 → "Good", 50-74 → "Average", below 50 → "Bad").
- suggestion: max 2-3 lines, a short actionable note on formatting (only if status is not "Excellent"; otherwise a brief positive note).

5. key_strengths
- Array of 3 to 5 short points (max ~10 words each). The strongest aspects of the resume specifically for this job.

6. top_improvements
- Array of 3 to 5 objects, each with:
  - title: short improvement title (max 6 words)
  - body: actionable recommendation, max 2 lines

7. sections
- An object with exactly these 4 keys: contact_info, education, experience, projects.
- Each key's value is an object with:
  - status: one of "Good", "Normal", "Weak", "Missing"
    - "Missing": the section does not exist in the resume at all.
    - "Weak": the section exists but is incomplete, vague, or lacks important details for this job.
    - "Normal": the section exists and is acceptable but not standout.
    - "Good": the section is complete, relevant, and strong for this job.
  - note: max 1 line explaining the status (e.g. "No phone number listed", "Missing quantified achievements", "Not provided in resume").

8. job_match
- Max 2-3 lines explaining how well the resume matches the job. Mention relevant skills, experience, education, and projects only when they actually appear in the resume.

9. summary
- Max 2-3 lines, concise final assessment of the candidate's suitability for the given job.

IMPORTANT:
Base every conclusion strictly on the provided RESUME and JOB DESCRIPTION.
If information is missing, explicitly reflect that in the relevant status/note field — never invent it.
Do not use outside knowledge to invent candidate-specific information.
Keep every field within its stated length limit — do not exceed it.
`;

      const instruction = `
You are an expert ATS Resume Analyzer.

Your task is to analyze ONLY the provided resume against the provided job title and job description.

STRICT RULES:
1. Do not discuss anything unrelated to the provided resume or job.
2. Do not invent, assume, or fabricate any candidate information.
3. Do not add skills, experience, education, projects, achievements, or keywords that are not present in the provided data.
4. If required information is not available in the resume, reflect that clearly using the "Missing" or "Weak" status in the "sections" field, or an empty array/value elsewhere — never fabricate a fallback.
5. All scores must be based only on the provided resume and job description.
6. Respect every field's length limit exactly.
7. Follow this exact JSON structure — do not add, remove, or rename any keys:

{
  "job_title": string,
  "ats_score": number,
  "keyword_match": {
    "score": number,
    "found_keywords": string[],
    "missing_keywords": string[]
  },
  "formatting": {
    "score": number,
    "status": "Excellent" | "Good" | "Average" | "Bad",
    "suggestion": string
  },
  "key_strengths": string[],
  "top_improvements": [
    { "title": string, "body": string }
  ],
  "sections": {
    "contact_info": { "status": "Good" | "Normal" | "Weak" | "Missing", "note": string },
    "education": { "status": "Good" | "Normal" | "Weak" | "Missing", "note": string },
    "experience": { "status": "Good" | "Normal" | "Weak" | "Missing", "note": string },
    "projects": { "status": "Good" | "Normal" | "Weak" | "Missing", "note": string }
  },
  "job_match": string,
  "summary": string
}

8. Return ONLY valid JSON matching the structure above.
9. Do NOT return Markdown.
10. Do NOT wrap the response in \`\`\`json or any other code block.
11. Do NOT include any explanation, introduction, or text outside the JSON object.
`;

      const result = await aiServices({ prompt, instruction });

      const parsedResult = JSON.parse(result);

      await Resume.create({
        // ResumeId: job.id,
        owner: job.data.owner,
        jobTitle: job.data.jobTittle,
        jobDescription: job.data.jobDescription,
        pdfText,
        resumeAnalysis: parsedResult,
      });

      await setValue(job.data.cacheKey, parsedResult, 600);

      await setValue(
        `job-status:${job.id}`,
        { stage: "completed", status: "completed", result: parsedResult },
        600,
      );

      return parsedResult;
    } catch (error) {
      await setValue(
        `job-status:${job.id}`,
        { stage: "failed", status: "failed", error: error.message },
        600,
      );
      throw error;
    }
  },
  {
    connection: bullMqConnection,
    concurrency: 5,
  },
);

const improveWorker = new Worker(
  "improve-resume",
  async (job) => {
    try {
      await setValue(
        `job-status:${job.id}`,
        { stage: "parsing_pdf", status: "processing" },
        600,
      );

      const previousResume = job.data.previousResume;

      await setValue(
        `job-status:${job.id}`,
        { stage: "analyzing", status: "processing" },
        600,
      );

      const prompt = `
You are an expert Resume Improvement and ATS Optimization specialist.

Your task is to improve the candidate's resume using ONLY the information already present in the original resume and the user-selected improvements.

JOB TITLE:
${job.data.jobTittle}

JOB DESCRIPTION:
${job.data.jobDescription}

ORIGINAL RESUME:
${previousResume}

PREVIOUS ANALYSIS:
${JSON.stringify(job.data.analysisResult)}

USER-SELECTED MISSING KEYWORDS:
${JSON.stringify(job.data.missingKeyword)}

USER-SELECTED IMPROVEMENTS:
${JSON.stringify(job.data.requiredImprovement)}

Your task is to create an improved version of the ORIGINAL RESUME specifically targeted toward the provided JOB TITLE and JOB DESCRIPTION.

IMPORTANT:
The improved resume must remain truthful to the original resume.

You MAY:
- Improve wording and clarity.
- Improve the structure and organization of existing information.
- Naturally incorporate user-selected missing keywords ONLY when they can be truthfully supported by the original resume.
- Improve descriptions of existing experience, projects, and achievements without changing their factual meaning.
- Make existing achievements clearer and more impactful without inventing numbers.
- Improve ATS readability and keyword relevance.
- Rewrite existing content professionally.

You MUST NOT:
- Invent skills that the candidate does not have.
- Invent work experience.
- Invent education or certifications.
- Invent projects.
- Invent achievements.
- Invent numbers, percentages, metrics, company names, dates, technologies, responsibilities, or job titles.
- Add a selected keyword if there is no truthful basis for including it in the original resume.
- Change the factual meaning of the candidate's experience.
- Remove important factual information from the original resume.
- Add generic content that is unrelated to the candidate or target job.

For each selected improvement, apply it only where it can be supported by the original resume.

For selected missing keywords:
- If the keyword is already supported by the resume but missing or poorly represented, incorporate it naturally.
- If the keyword cannot be truthfully supported by the resume, do NOT fabricate it. Mention it in the improvement notes instead.

Return the following fields:

1. improved_resume
- Return the complete improved resume as plain text.
- Preserve all factual information from the original resume.
- Organize it professionally with clear section headings.
- Make it ATS-friendly.
- Do not use Markdown tables.
- Do not use JSON inside this field.

2. key_strengths
- Array of 3 to 5 short points.
- Mention the strongest improvements or strengths of the optimized resume.
- Maximum ~12 words per point.

3. previous_analysis
- Return the previous analysis scores:
  - ats_score
  - keyword_match_score
  - formatting_score

4. new_analysis
- Analyze the improved resume against the same job title and job description.
- Return:
  - ats_score
  - keyword_match_score
  - formatting_score
  - found_keywords
  - remaining_missing_keywords
  - short_summary

5. applied_improvements
- Array of objects:
  - title
  - description
- Explain which user-selected improvements were actually applied.

6. skipped_improvements
- Array of short strings.
- Mention selected improvements or keywords that could not be applied truthfully.
- Return an empty array if nothing was skipped.

7. improvement_summary
- Maximum 2-3 lines.
- Briefly explain how the resume was improved.

IMPORTANT:
The new analysis must be based on the ACTUAL improved_resume returned above.
Do not claim an improvement was made if it was not actually applied.
Do not invent information to increase the ATS score.
`;

      const instruction = `
You are an expert ATS Resume Optimization specialist.

Your task is to produce a professionally improved version of a candidate's resume using ONLY the original resume, job description, previous analysis, and user-selected improvements provided in the input.

STRICT RULES:

1. Never invent, fabricate, assume, or add candidate information.

2. Do not create new:
- skills
- experience
- education
- certifications
- projects
- achievements
- metrics
- percentages
- dates
- company names
- technologies
- responsibilities
- job titles

3. User-selected missing keywords may only be added when they are truthfully supported by the original resume.

4. If a selected keyword cannot be truthfully supported by the original resume, do not add it to the improved resume. Put it inside "skipped_improvements".

5. Improve wording, clarity, organization, ATS compatibility, and relevance without changing the factual meaning of the original resume.

6. The improved_resume must contain the complete optimized resume in plain text.

7. Do not remove important factual information from the original resume.

8. The new analysis must evaluate the actual improved_resume generated by the model.

9. previous_analysis must represent the previous resume analysis, while new_analysis must represent the improved resume analysis.

10. Return only valid JSON.

11. Do NOT return Markdown.

12. Do NOT wrap the response in \`\`\`json or any other code block.

13. Do NOT include explanations, introductions, or text outside the JSON object.

14. Follow this exact JSON structure. Do not add, remove, or rename keys:

{
  "improved_resume": string,
  "key_strengths": string[],
  "previous_analysis": {
    "ats_score": number,
    "keyword_match_score": number,
    "formatting_score": number
  },
  "new_analysis": {
    "ats_score": number,
    "keyword_match_score": number,
    "formatting_score": number,
    "found_keywords": string[],
    "remaining_missing_keywords": string[],
    "short_summary": string
  },
  "applied_improvements": [
    { "title": string, "description": string }
  ],
  "skipped_improvements": string[],
  "improvement_summary": string
}

15. Keep all information truthful to the original resume.

16. The goal is optimization, not fabrication.
`;

      const result = await aiServices({ prompt, instruction });
      const parsedResult = JSON.parse(result);

      const ResumePdf = await createResumePdf(parsedResult.improved_resume);
      const PdfUrl = await uploadOnCloudinary(ResumePdf);

      const downloadUrl = cloudinary.utils.private_download_url(
        PdfUrl.public_id,
        "pdf",
        {
          resource_type: "raw",
          type: "authenticated",
        },
      );

      const resume = await Resume.findOne({ ResumeId: job.data.ResumeId });

      if (!resume) {
        throw new ApiError(404, "Resume not found");
      }

      resume.isResumeUpdated = true;
      resume.updatedResume.url = PdfUrl.secure_url;
      resume.updatedResume.publicId = PdfUrl.public_id;

      await resume.save();

      const finalResult = {
        ...parsedResult,
        resumeUrl: PdfUrl,
        resumeDownloadUrl: downloadUrl,
      };

      await setValue(job.data.cacheKey, finalResult, 600);

      await setValue(
        `job-status:${job.id}`,
        {
          stage: "completed",
          status: "completed",
          result: finalResult,
        },
        600,
      );

      return finalResult;
    } catch (error) {
      await setValue(
        `job-status:${job.id}`,
        { stage: "failed", status: "failed", error: error.message },
        600,
      );
      throw error;
    }
  },
  {
    connection: bullMqConnection,
    concurrency: 5,
  },
);

worker.on("completed", (job) => {
  console.log(`Resume job ${job.id} is completed`);
});

worker.on("failed", (job, error) => {
  console.log(`Resume job ${job.id} is failed`);
  console.log("Error...", error);
});

improveWorker.on("completed", (job) => {
  console.log(`Resume improve ${job.id} is completed`);
});

improveWorker.on("failed", (job, error) => {
  console.log(`Resume Improve ${job.id} is failed`);
  console.log("Error...", error);
});
