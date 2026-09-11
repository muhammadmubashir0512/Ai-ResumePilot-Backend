import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  answerCheck,
  InterviewService,
  textToSpeech,
  speechToText,
  PreviousInterviewReport,
} from "../services/mockInterview.service.js";
import { getValue } from "../utils/redis.js";
import ApiError from "../utils/ApiError.js";

const MockInterview = asyncHandler(async (req, res) => {
  const user = req.user._id;

  const { resumeId, targetRole, interviewType, difficulty, language } =
    req.body;

  const result = await InterviewService({
    user,
    resumeId,
    targetRole,
    interviewType,
    difficulty,
    language,
    resumeFile: req.file,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Mock Interview Setup successfully"));
});

const getInterviewStatus = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const statusData = await getValue(`job-status:${jobId}`);

  if (!statusData) {
    throw new ApiError(404, "Job not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, statusData, "Status fetched"));
});

const interviewQuestionAnswer = asyncHandler(async (req, res) => {
  const user = req.user._id;
  const { currentQuestion } = req.body;
  const { interviewId } = req.params;

  if (!req.file) {
    throw new ApiError(400, "Audio file is required");
  }

  const answer = await speechToText({
    audioBuffer: req.file.buffer,
    filename: req.file.originalname,
  });

  const result = await answerCheck({
    user,
    answer,
    currentQuestion,
    interviewId,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        answer,
        ...result,
      },
      "Answer submitted successfully",
    ),
  );
});

const AiInterviewspeak = asyncHandler(async (req, res) => {
  const { text } = req.body;

  const audioBuffer = await textToSpeech({ text });

  res.set({
    "Content-Type": "audio/wav",
    "Content-Length": audioBuffer.length,
    "Cache-Control": "no-cache",
  });

  return res.send(audioBuffer);
});

const PreviousInterview = asyncHandler(async (req, res) => {
  const owner = req.user._id;

  const result = await PreviousInterviewReport(owner);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result,
        "Latest Resume Analysis Report fetched successfully",
      ),
    );
});

export {
  MockInterview,
  getInterviewStatus,
  interviewQuestionAnswer,
  AiInterviewspeak,
  PreviousInterview,
};
