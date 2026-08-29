import mongoose, { Schema } from "mongoose";
import { User } from "./Users.model.js";

const resumeModel = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },

    jobDescription: {
      type: String,
      required: true,
      trim: true,
    },

    resumeAnalysis: {
      type: Schema.Types.Mixed,
      required: true,
    },

    pdfText: {
      type: String,
      required: true,
    },

    ResumeId: {
      type: String,
      required: true,
      unique: true,
    },

    isResumeUpdated: {
      type: Boolean,
      default: false,
    },

    updatedResume: {
      url: {
        type: String,
        default: null,
      },
      publicId: {
        type: String,
        default: null,
      },
    },
  },
  { timestamps: true },
);

export const Resume = new mongoose.model("Resume", resumeModel);
