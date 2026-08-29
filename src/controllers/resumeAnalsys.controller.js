import ApiResponse from "../utils/ApiResponse.js";
import {
  getAverageScore,
  PreviousResumeReport,
  ResumeAnalysis,
  ResumeImprove,
} from "../services/resumeAnalysis.service.js";
import { getValue } from "../utils/redis.js";
import ApiError from "../utils/ApiError.js";
import { Resume } from "../models/Resume.model.js";

export const ResumeUpload = async (req, res) => {
  const owner = req.user._id;
  const { jobTittle, jobDescription } = req.body;
  const resume = req.file;

  const result = await ResumeAnalysis({
    owner,
    jobTittle,
    jobDescription,
    resume,
  });

  if (result.cached) {
    return res
      .status(200)
      .json(new ApiResponse(200, result.result, "Cached result"));
  }

  return res
    .status(202)
    .json(new ApiResponse(202, { jobId: result.jobId }, "Analysis queued"));
};

export const getResumeStatus = async (req, res) => {
  const { jobId } = req.params;
  const statusData = await getValue(`job-status:${jobId}`);

  if (!statusData) {
    throw new ApiError(404, "Job not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, statusData, "Status fetched"));
};

export const improveResume = async (req, res) => {
  const owner = req.user._id;
  const { keywords, improvements } = req.body;
  const { ResumeId } = req.params;

  const result = await ResumeImprove({
    owner,
    keywords,
    improvements,
    ResumeId,
  });

  if (result.cached) {
    return res
      .status(200)
      .json(new ApiResponse(200, result.result, "Cached result"));
  }

  return res
    .status(202)
    .json(new ApiResponse(202, { jobId: result.jobId }, "Improvement queued"));
};

export const getImproveStatus = async (req, res) => {
  const { jobId } = req.params;
  const statusData = await getValue(`job-status:${jobId}`);

  if (!statusData) {
    throw new ApiError(404, "Job not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, statusData, "Status fetched"));
};

export const avgUserStats = async (req, res) => {
  const owner = req.user._id;
  const result = await getAverageScore(owner);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "User Avg Score fetched successfully"));
};

export const PreviousResume = async (req, res) => {
  const owner = req.user._id;
  const result = await PreviousResumeReport(owner);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        result,
        "Latest Resume Analysis Report fetched successfully",
      ),
    );
};
