import { Router } from "express";
import verifyJWT from "../middleware/auth.middleware.js";
import {
  AiInterviewspeak,
  getInterviewStatus,
  interviewQuestionAnswer,
  MockInterview,
  PreviousInterview,
} from "../controllers/mockinterview.controller.js";
import upload from "../middleware/multer.middleware.js";

const interviewRoute = new Router();

interviewRoute.post(
  "/start",
  verifyJWT,
  upload.single("resume"),
  MockInterview,
);
interviewRoute.get("/status/:jobId", verifyJWT, getInterviewStatus);
interviewRoute.post(
  "/answer/:interviewId",
  verifyJWT,
  upload.single("audio"),
  interviewQuestionAnswer,
);
interviewRoute.post("/speak", AiInterviewspeak);

interviewRoute.get("/latest", verifyJWT, PreviousInterview);

export default interviewRoute;
