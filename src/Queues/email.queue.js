import { Queue } from "bullmq";
import { bullMqConnection } from "../config/bullmqConnection.js";

export const emailQueue = new Queue("email", {
  connection: bullMqConnection,
});
