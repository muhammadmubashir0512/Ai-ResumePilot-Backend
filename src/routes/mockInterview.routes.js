import { Router } from "express";
import verifyJWT from "../middleware/auth.middleware.js";
import {
  getInterviewStatus,
  interviewQuestionAnswer,
  MockInterview,
} from "../controllers/mockinterview.controller.js";

const interviewRoute = new Router();

interviewRoute.post("/start/:resumeId", verifyJWT, MockInterview);
interviewRoute.get("/result/:jobId", verifyJWT, getInterviewStatus);
interviewRoute.post("/answer/:interviewId", verifyJWT, interviewQuestionAnswer);

export default interviewRoute;
