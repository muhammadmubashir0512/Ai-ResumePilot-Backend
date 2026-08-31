import { Router } from "express";
import verifyJWT from "../middleware/auth.middleware.js";
import { avgUserStats } from "../controllers/resumeAnalsys.controller.js";
import {
  getUser,
  PasswaordUpdate,
  updateProfileInfo,
} from "../controllers/user.controller.js";
import upload from "../middleware/multer.middleware.js";

const userRoute = Router();

userRoute.get("/avgscore", verifyJWT, avgUserStats);
userRoute.get("/me", verifyJWT, getUser);
userRoute.put(
  "/profile",
  upload.single("profileImg"),
  verifyJWT,
  updateProfileInfo,
);
userRoute.post("/updatePassword", verifyJWT, PasswaordUpdate);

export default userRoute;
