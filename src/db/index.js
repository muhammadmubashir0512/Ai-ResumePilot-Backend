import mongoose from "mongoose";
import { DB_NAME } from "../../constant.js";

const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
    console.log("Database connected successfully");
  } catch (error) {
    console.log("Error", error);
  }
};

export default connectDB;
