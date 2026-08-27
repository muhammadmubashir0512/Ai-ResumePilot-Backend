import Router from "express";
import verifyJWT from "../middleware/auth.middleware.js";
import {
  getResumeStatus,
  ResumeUpload,
} from "../controllers/resumeAnalsys.controller.js";
import upload from "../middleware/multer.middleware.js";
import resumeUploadValidation from "../validation/resume.validate.js";
import validate from "../middleware/validate.js";

const resumeRoute = Router();

resumeRoute.post(
  "/analysis",
  upload.single("resume"),
  verifyJWT,
  validate(resumeUploadValidation, "body"),
  ResumeUpload,
);

resumeRoute.get("/analysis/:jobId", verifyJWT, getResumeStatus);

export default resumeRoute;
