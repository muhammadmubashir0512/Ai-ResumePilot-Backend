import mongoose from "mongoose";
import "dotenv/config";

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected (worker)"))
  .catch((err) => console.error("MongoDB connection error:", err));

import "./email.worker.js";
import "./resume.worker.js";
import "./interview.worker.js";
