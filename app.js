import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "./src/config/passport.js";
import { StripeWebhook } from "./src/controllers/checkout.controller.js";

const app = express();

app.use(
  cors({
    origin: process.env.ORIGIN,
    credentials: true,
  }),
);

app.post(
  "/api/v1/stripe/webhook",
  express.raw({ type: "application/json" }),
  StripeWebhook,
);

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("Public"));
app.use(cookieParser());
app.use(passport.initialize());

import { errorHandler } from "./src/middleware/errorHandler.middleware.js";

import route from "./src/routes/auth.routes.js";
import resumeRoute from "./src/routes/resumeAnalsys.routes.js";
import userRoute from "./src/routes/user.routes.js";
import checkoutRoute from "./src/routes/checkout.route.js";
import interviewRoute from "./src/routes/mockInterview.routes.js";

app.use("/api/v1/auth", route);
app.use("/api/v1/resume", resumeRoute);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/checkout", checkoutRoute);
app.use("/api/v1/interview", interviewRoute);

app.use(errorHandler);
export default app;
