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
  OtpResend,
} from "../controllers/auth.controller.js";

const route = Router();

route.post("/signup", validate(userValidation, "body"), Signup);
route.post("/login", validate(loginValidation, "body"), Login);
route.post("/verify-otp", VerifyOTP);
route.post("/logout", verifyJWT, LogOut);
route.post("/resend-otp", OtpResend);

export default route;
