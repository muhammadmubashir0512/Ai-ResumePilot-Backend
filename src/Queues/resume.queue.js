import { Queue } from "bullmq";
import { bullMqConnection } from "../config/bullmqConnection.js";

export const ResumeQueue = new Queue("resume-analysis", {
  connection: bullMqConnection,
});

export const ImproveResumeQueue = new Queue("improve-resume", {
  connection: bullMqConnection,
});
