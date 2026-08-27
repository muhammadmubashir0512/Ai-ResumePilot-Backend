import "dotenv/config";
import connectDB from "../db/index.js";

const startWorkers = async () => {
  await connectDB();

  await import("./email.worker.js");
  await import("./resume.worker.js");

  console.log("All workers started...");
};

startWorkers();
