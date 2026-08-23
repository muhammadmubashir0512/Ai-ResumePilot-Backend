import "dotenv/config";

import connectDB from "./src/db/index.js";
import app from "./app.js";

console.log("successfully next");
connectDB()
  .then(() => {
    app.listen(`${process.env.PORT}` || 8000, () => {
      console.log(`App is listening on PORT ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    (console.log("Database connection failed", error), process.exit(1));
  });
