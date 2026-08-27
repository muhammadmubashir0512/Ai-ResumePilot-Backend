import ApiError from "../utils/ApiError.js";
import { getValue, setValue } from "../utils/redis.js";
import crypto from "crypto";
import { ResumeQueue } from "../Queues/resume.queue.js";

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

  const job = await ResumeQueue.add("resum-analysis", {
    resume: resumeReference,
    owner: owner,
    jobTittle: jobTittle,
    jobDescription: jobDescription,
    cacheKey,
  });

  await setValue(
    `job-status:${job.id}`,
    { stage: "queued", status: "waiting" },
    600,
  );

  return { jobId: job.id, status: "queued" };
};
