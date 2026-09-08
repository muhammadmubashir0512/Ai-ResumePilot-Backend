import { Queue } from "bullmq";
import { bullMqConnection } from "../config/bullmqConnection.js";

export const InterviewQueue = new Queue("mock-Interview", {
  connection: bullMqConnection,
});

export const InterviewAnswerQueue = new Queue("mock-Interview-answer", {
  connection: bullMqConnection,
});
