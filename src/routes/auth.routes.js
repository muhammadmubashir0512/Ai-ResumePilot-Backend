import { Router } from "express";
import validate from "../middleware/validate.js";
import {
  userValidation,
  loginValidation,
} from "../validation/auth.validate.js";
import verifyJWT from "../middleware/auth.middleware.js";
import {
  Signup,
  Login,
  LogOut,
  VerifyOTP,
  getUser,
} from "../controllers/auth.controller.js";

const route = Router();

route.post("/signup", validate(userValidation, "body"), Signup);
route.post("/login", validate(loginValidation, "body"), Login);
route.post("/verify-otp", VerifyOTP);
route.get("/logout", verifyJWT, LogOut);
route.get("/me", verifyJWT, getUser);

export default route;
