import mongoose, { Schema } from "mongoose";

const InterviewSchema = new Schema(
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
      trim: true,
    },

    resumeText: {
      type: String,
      required: true,
    },

    language: {
      type: String,
      default: "English",
    },

    interviewType: {
      type: String,
      enum: ["technical", "behavioral", "mixed"],
      default: "mixed",
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },

    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "cancelled"],
      default: "pending",
    },

    currentQuestionIndex: {
      type: Number,
      default: 0,
    },

    maxQuestions: {
      type: Number,
      default: 2,
      min: 1,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    questions: [
      {
        question: {
          type: String,
          required: true,
        },

        answer: {
          type: String,
          default: null,
        },

        score: {
          type: Number,
          default: null,
        },

        feedback: {
          type: String,
          default: null,
        },

        type: {
          type: String,
          default: null,
        },
      },
    ],

    finalEvaluation: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true },
);

export const Interview = mongoose.model("Interview", InterviewSchema);
