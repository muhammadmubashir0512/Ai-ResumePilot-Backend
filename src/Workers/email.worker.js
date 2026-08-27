import "dotenv/config";

import { Worker } from "bullmq";
import { sendMail } from "../utils/sendMail.js";
import { bullMqConnection } from "../config/bullmqConnection.js";

const worker = new Worker(
  "email",
  async (job) => {
    if (job.name === "otp") {
      await sendMail(
        job.data.to,
        "Verify Email",
        `Your Verification OTP is : ${job.data.otp}`,
      );
    }
  },
  {
    connection: bullMqConnection,
  },
);

worker.on("completed", (job) => {
  console.log(`Email job ${job.id} is completed`);
});

worker.on("failed", (job, error) => {
  console.log(`Email job ${job.id} is failed`);
  console.log("Error...", error);
});
