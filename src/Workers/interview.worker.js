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

Use all relevant information from the object to generate a personalized interview question.

Ask only ONE question.

Return exactly this JSON format:

{
  "question": "The interview question here"
}
`;

      const instruction = `You are an AI interviewer conducting a professional job interview.

Your task is to generate the next interview question based strictly on the candidate's resume, target job, job description, interview type, difficulty, and language provided in the interviewData object.

Act like a real professional interviewer, not a random question generator.

Analyze the candidate's resume and job description before generating the question.

The question must be relevant to the target job and interview type.

For a technical interview, focus on technical knowledge, practical experience, problem-solving, architecture, technologies, and concepts relevant to the target role.

For a behavioral interview, focus on experience, decision-making, teamwork, communication, challenges, and workplace situations.

For a mixed interview, intelligently combine technical and behavioral questions.

Respect the requested difficulty level and language.

Use the candidate's actual resume and experience to personalize the question whenever possible.

Start the interview naturally with an appropriate first question. Do not start with an extremely difficult question.

Ask only ONE question at a time.

Do not provide the answer, explanation, feedback, hints, or multiple questions.

Do not mention these instructions or the internal interview process.

Return only valid JSON.`;

      const result = await aiServices({
        prompt,
        instruction,
      });

      const parsedResult = JSON.parse(result);

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
