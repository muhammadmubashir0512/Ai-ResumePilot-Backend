import ApiError from "../utils/ApiError.js";
import { Resume } from "../models/Resume.model.js";
import { Interview } from "../models/Interview.model.js";
import { InterviewQueue } from "../Queues/interview.queue.js";
import { setValue } from "../utils/redis.js";

export const InterviewService = async ({ user, resumeId }) => {
  if (!user) {
    throw new ApiError(401, "Unauthorized Request");
  }

  const userResume = await Resume.findOne({
    _id: resumeId,
    owner: user,
  });

  if (!userResume) {
    throw new ApiError(400, "No Resume Analysis Found");
  }

  const New_Interview = await Interview.create({
    owner: user,
    jobTitle: userResume.jobTitle,
    jobDescription: userResume.jobDescription,
    resumeText: userResume.pdfText,
    language: "Roman Urdu ",
    interviewType: "technical",
    difficulty: "medium",
    status: "pending",
    currentQuestionIndex: 0,
  });

  const interviewData = {
    resumeText: New_Interview.resumeText,
    jobTitle: New_Interview.jobTitle,
    jobDescription: New_Interview.jobDescription,
    language: New_Interview.language,
    interviewType: New_Interview.interviewType,
    difficulty: New_Interview.difficulty,
  };

  await InterviewQueue.add(
    "mock-interview",
    {
      interviewId: New_Interview._id.toString(),
      interviewData,
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    },
  );

  await setValue(
    `job-status:${New_Interview._id}`,
    {
      stage: "queued",
      status: "waiting",
    },
    600,
  );

  return New_Interview;
};

export const answerCheck = async ({
  user,
  asnwer,
  currentQuestion,
  interviewId,
}) => {
  if (!user) {
    throw new ApiError(401, "Unauthorized Request");
  }

  const userInterview = await Interview.findOne({
    _id: interviewId,
    owner: user,
  });

  if (!userInterview) {
    throw new ApiError(400, "No Interview Found");
  }

  if (!asnwer) {
    throw new ApiError(400, "Please give an answer");
  }

  const questionIndexCheck =
    currentQuestion === userInterview.currentQuestionIndex;
  if (!questionIndexCheck) {
    throw new ApiError(400, "Question index not match");
  }

  const question = userInterview.questions[currentQuestion];

  await InterviewQueue.add(
    "mock-interview",
    {
      interviewId: New_Interview._id.toString(),
      interviewData,
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    },
  );
};
