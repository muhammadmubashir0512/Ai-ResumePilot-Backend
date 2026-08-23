import { Router } from "express";
import validate from "../middleware/validate.js";
import userValidation from "../validation/auth/Signup.validate.js";
import loginValidation from "../validation/auth/Login.auth.js";
import verifyJWT from "../middleware/auth.middleware.js";
import getUser from "../controllers/getUser.controller.js";
import { Signup, Login, LogOut } from "../controllers/auth.controller.js";

const route = Router();

route.post("/signup", validate(userValidation, "body"), Signup);
route.post("/login", validate(loginValidation, "body"), Login);
route.get("/logout", verifyJWT, LogOut);
route.get("/me", verifyJWT, getUser);

export default route;
