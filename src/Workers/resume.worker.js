import "dotenv/config";

import { Worker } from "bullmq";
import { bullMqConnection } from "../config/bullmqConnection.js";
import { PdfToText } from "../services/PdfParse.service.js";
import { aiServices } from "../services/ai.service.js";
import { Resume } from "../models/Resume.model.js";
import { setValue } from "../utils/redis.js";

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
        owner: job.data.owner,
        jobTitle: job.data.jobTittle,
        jobDescription: job.data.jobDescription,
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

worker.on("completed", (job) => {
  console.log(`Resume job ${job.id} is completed`);
});

worker.on("failed", (job, error) => {
  console.log(`Resume job ${job.id} is failed`);
  console.log("Error...", error);
});
