import Router from "express";
import verifyJWT from "../middleware/auth.middleware.js";
import {
  getImproveStatus,
  getResumeStatus,
  improveResume,
  PreviousResume,
  ResumeUpload,
} from "../controllers/resumeAnalsys.controller.js";
import upload from "../middleware/multer.middleware.js";
import resumeUploadValidation from "../validation/resume.validate.js";
import validate from "../middleware/validate.js";
import requireSubscription from "../middleware/subscription.middleware.js";
import usageLimit from "../middleware/subscriptionusagelimit.middleware.js";

const resumeRoute = Router();

resumeRoute.post(
  "/analysis",
  upload.single("resume"),
  verifyJWT,
  requireSubscription("free", "premium", "pro"),
  usageLimit("resumeAnalysis"),
  validate(resumeUploadValidation, "body"),
  ResumeUpload,
);
resumeRoute.get("/analysis/:jobId", verifyJWT, getResumeStatus);

resumeRoute.post(
  "/improve/:ResumeId",
  verifyJWT,
  usageLimit("resumeImprovement"),
  improveResume,
);
resumeRoute.get("/improve/result/:jobId", verifyJWT, getImproveStatus);

resumeRoute.get("/latest", verifyJWT, PreviousResume);

export default resumeRoute;
