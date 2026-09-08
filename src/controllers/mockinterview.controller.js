import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  answerCheck,
  InterviewService,
} from "../services/mockInterview.service.js";
import { getValue } from "../utils/redis.js";
import ApiError from "../utils/ApiError.js";

const MockInterview = asyncHandler(async (req, res) => {
  const user = req.user._id;
  const { resumeId } = req.params;
  const result = await InterviewService({ user, resumeId });
  return res
    .status(200)
    .json(new ApiResponse(200, result, "Mock Interview Setup successfully "));
});

const getInterviewStatus = async (req, res) => {
  const { jobId } = req.params;
  const statusData = await getValue(`job-status:${jobId}`);

  if (!statusData) {
    throw new ApiError(404, "Job not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, statusData, "Status fetched"));
};

const interviewQuestionAnswer = asyncHandler(async (req, res) => {
  const user = req.user._id;
  const { answer, currentQuestion } = req.body;
  const { interviewId } = req.params;

  const result = await answerCheck({
    user,
    answer,
    currentQuestion,
    interviewId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Answer submitted successfully"));
});

export { MockInterview, getInterviewStatus, interviewQuestionAnswer };
