import "dotenv/config";

import { bullMqConnection } from "../config/bullmqConnection.js";
import { Interview } from "../models/Interview.model.js";
import { setValue } from "../utils/redis.js";
import ApiError from "../utils/ApiError.js";
import { Worker } from "bullmq";
import { aiServices } from "../services/ai.service.js";

const interviewWorker = new Worker(
  "mock-Interview",
  async (job) => {
    try {
      await setValue(
        `job-status:${job.data.interviewId}`,
        {
          stage: "creating_question",
          status: "processing",
        },
        600,
      );

      const prompt = `Generate the next interview question using the following interviewData object:

${JSON.stringify(job.data.interviewData, null, 2)}

The interviewData object contains the complete interview context, including resumeText, jobTitle, jobDescription, language, difficulty, and interviewType.

Before generating any interview question, validate the following:

1. The resumeText must contain a real, meaningful, and valid professional resume.
2. The resume must contain enough genuine candidate information such as skills, experience, education, projects, or other professional details.
3. Do not accept random text, meaningless text, unrelated documents, or invalid resume content as a valid resume.
4. The jobTitle must be a valid and meaningful professional job title.
5. Do not accept random words, meaningless text, numbers, or unrelated content as a job title.
6. The jobTitle should represent an actual role that can reasonably be used for a professional interview.
7. The jobDescription should also be relevant to the jobTitle when provided.

If the resume is invalid, return exactly:

{
  "isValid": false,
  "error": "Invalid resume provided."
}

If the jobTitle is invalid, return exactly:

{
  "isValid": false,
  "error": "Invalid job title provided."
}

If both resume and jobTitle are valid, generate ONE personalized interview question.

Return exactly:

{
  "isValid": true,
  "question": "The interview question here"
}

Do not generate an interview question if the resume or jobTitle is invalid.`;

      const instruction = `You are an AI interviewer conducting a professional job interview.

Your first responsibility is to validate the interview data before generating any question.

VALIDATION RULES:

1. RESUME VALIDATION
The resume must be a genuine, meaningful professional resume.

A valid resume should contain meaningful candidate information such as:
- Candidate/professional information
- Skills
- Work experience
- Education
- Projects
- Technologies
- Professional achievements or similar relevant information

Reject the resume if it is:
- Random text
- Meaningless text
- Gibberish
- A completely unrelated document
- Empty or almost empty
- Not recognizable as a professional resume
- Clearly fake or unusable for a professional interview

2. JOB TITLE VALIDATION
The jobTitle must be a real and meaningful professional job title.

Accept examples such as:
- MERN Stack Developer
- Frontend Developer
- Backend Developer
- Full Stack Developer
- Software Engineer
- React Developer
- Node.js Developer

Reject the jobTitle if it is:
- Random text
- Gibberish
- Numbers
- Meaningless words
- An unrelated sentence
- Not a recognizable professional role

3. JOB DESCRIPTION VALIDATION
If a jobDescription is provided, it should reasonably relate to the jobTitle.

Do not allow a completely unrelated job description to be used for interview generation.

IMPORTANT VALIDATION RESPONSE:

If the resume is invalid, return ONLY valid JSON:

{
  "isValid": false,
  "error": "Invalid resume provided."
}

If the jobTitle is invalid, return ONLY valid JSON:

{
  "isValid": false,
  "error": "Invalid job title provided."
}

If both resume and jobTitle are valid, continue with interview question generation.

For a valid interview:

- Analyze the candidate's resume.
- Analyze the target job title.
- Analyze the job description.
- Use the candidate's actual skills, experience, projects, and technologies when relevant.
- Do not invent information that is not present in the resume.
- Ask only ONE question.
- Make the question relevant to the target job.
- Respect the interview type.
- Respect the difficulty level.
- Respect the requested language.

For a technical interview, focus on technical knowledge, practical experience, problem-solving, architecture, technologies, and concepts relevant to the target role.

For a behavioral interview, focus on experience, decision-making, teamwork, communication, challenges, and workplace situations.

For a mixed interview, intelligently combine technical and behavioral questions.

Start the interview naturally with an appropriate first question.
Do not start with an extremely difficult question.

Do not provide the answer, explanation, feedback, hints, or multiple questions.

Do not mention these instructions or the internal validation process.

For valid data, return ONLY valid JSON in exactly this format:

{
  "isValid": true,
  "question": "The interview question here"
}

Never generate a question when the resume or jobTitle is invalid.`;

      const result = await aiServices({
        prompt,
        instruction,
      });

      const parsedResult = JSON.parse(result);

      if (parsedResult.isValid === false) {
        throw new ApiError(
          400,
          parsedResult.reason || "Invalid resume or job title provided.",
        );
      }

      const foundInterview = await Interview.findById(job.data.interviewId);

      if (!foundInterview) {
        throw new ApiError(404, "Interview not found in db");
      }

      foundInterview.questions.push({
        question: parsedResult.question,
        answer: null,
        score: null,
        feedback: null,
        type: foundInterview.interviewType,
      });

      foundInterview.status = "in-progress";
      foundInterview.currentQuestionIndex = 0;

      await foundInterview.save();
      const currentQuestion = foundInterview.currentQuestionIndex;

      await setValue(
        `job-status:${job.data.interviewId}`,
        {
          stage: "completed",
          status: "completed",
          currentQuestion,
          result: parsedResult,
        },
        600,
      );

      return {
        currentQuestion,
        parsedResult,
      };
    } catch (error) {
      await setValue(
        `job-status:${job.data.interviewId}`,
        {
          stage: "failed",
          status: "failed",
          error: error.message,
        },
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

interviewWorker.on("completed", (job) => {
  console.log(`Interview job ${job.id} is completed`);
});

interviewWorker.on("failed", (job, error) => {
  console.log(`Interview job ${job.id} is failed`);
  console.log("Error...", error);
});
