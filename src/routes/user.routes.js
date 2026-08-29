import { Router } from "express";
import verifyJWT from "../middleware/auth.middleware.js";
import { avgUserStats } from "../controllers/resumeAnalsys.controller.js";

const userRoute = Router();

userRoute.get("/avgscore", verifyJWT, avgUserStats);

export default userRoute;
