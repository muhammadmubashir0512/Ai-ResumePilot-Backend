import ApiResponse from "../utils/ApiResponse.js";
import { ResumeAnalysis } from "../services/resumeAnalysis.service.js";
import { getValue } from "../utils/redis.js";
import ApiError from "../utils/ApiError.js";

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
