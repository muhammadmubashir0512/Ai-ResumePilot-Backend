import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.ORIGIN,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("Public"));
app.use(cookieParser());

import { errorHandler } from "./src/middleware/errorHandler.middleware.js";

import route from "./src/routes/auth.routes.js";
app.use("/api/v1/auth", route);

app.use(errorHandler);
export default app;
