import ApiError from "../utils/ApiError.js";
import { getValue, setValue } from "../utils/redis.js";
import crypto from "crypto";
import { ImproveResumeQueue, ResumeQueue } from "../Queues/resume.queue.js";
import { Resume } from "../models/Resume.model.js";

export const ResumeAnalysis = async ({
  owner,
  jobTittle,
  jobDescription,
  resume,
}) => {
  if (!resume) {
    throw new ApiError(400, "Resume is requried!");
  }

  const allowedTypes = ["application/pdf"];

  if (!allowedTypes.includes(resume.mimetype)) {
    throw new ApiError(400, "Upload resume in only PDF or DOCX format");
  }

  const resumeHash = crypto.hash("sha256", resume.buffer);

  const hashKey = crypto.hash(
    "sha256",
    `${resumeHash}${jobTittle}${jobDescription}`,
  );

  const cacheKey = `Resume-analysis:${owner}:${hashKey}`;

  const redisResult = await getValue(cacheKey);

  if (redisResult) {
    return { cached: true, result: redisResult };
  }

  const resumeReference = resume.buffer.toString("base64");

  const job = await ResumeQueue.add(
    "resum-analysis",
    {
      resume: resumeReference,
      owner: owner,
      jobTittle: jobTittle,
      jobDescription: jobDescription,
      cacheKey,
    },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    },
  );

  await setValue(
    `job-status:${job.id}`,
    { stage: "queued", status: "waiting" },
    600,
  );

  return { jobId: job.id, status: "queued" };
};

export const ResumeImprove = async ({
  owner,
  keywords,
  improvements,
  ResumeId,
}) => {
  const result = await Resume.findOne({ ResumeId });

  if (!result) {
    throw new ApiError(404, "Resume analysis not found");
  }

  const selectionHash = crypto.hash(
    "sha256",
    `${ResumeId}${JSON.stringify(keywords)}${JSON.stringify(improvements)}`,
  );
  const cacheKey = `Resume-improve:${owner}:${selectionHash}`;

  const cachedResult = await getValue(cacheKey);
  if (cachedResult) {
    return { cached: true, result: cachedResult };
  }

  const job = await ImproveResumeQueue.add(
    "improve-resume",
    {
      owner,
      ResumeId,
      analysisResult: result.resumeAnalysis,
      previousResume: result.pdfText,
      jobTittle: result.jobTitle,
      jobDescription: result.jobDescription,
      missingKeyword: keywords,
      requiredImprovement: improvements,
      cacheKey,
    },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    },
  );

  await setValue(
    `job-status:${job.id}`,
    { stage: "queued", status: "waiting" },
    600,
  );

  return { jobId: job.id, status: "queued" };
};

export const getAverageScore = async (owner) => {
  if (!owner) {
    throw new ApiError(401, "Unathuorized request");
  }

  const result = await Resume.aggregate([
    {
      $match: {
        owner: owner,
      },
    },

    {
      $group: {
        _id: "$owner",

        averageAtsScore: {
          $avg: "$resumeAnalysis.ats_score",
        },

        averageKeywordMatchScore: {
          $avg: "$resumeAnalysis.keyword_match.score",
        },

        totalResumes: {
          $sum: 1,
        },
      },
    },

    {
      $project: {
        averageAtsScore: {
          $round: ["$averageAtsScore", 0],
        },

        averageKeywordMatchScore: {
          $round: ["$averageKeywordMatchScore", 0],
        },

        totalResumes: 1,
      },
    },

    {
      $project: {
        averageAtsScore: 1,
        averageKeywordMatchScore: 1,
        totalResumes: 1,

        skillGapPercent: {
          $subtract: [100, "$averageKeywordMatchScore"],
        },
      },
    },
  ]);

  if (result.length === 0) {
    return {
      averageAtsScore: 0,
      skillGapPercent: 0,
      totalResumes: 0,
    };
  }

  return result;
};

export const PreviousResumeReport = async (owner) => {
  if (!owner) {
    throw new ApiError(401, "Unathourized request");
  }

  const Result = await Resume.findOne({ owner }).sort({
    createdAt: -1,
  });
  if (!Result) {
    throw new ApiError(400, "No previous Resume");
  }

  const resume = Result.resumeAnalysis;

  return resume;
};
