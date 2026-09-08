import mongoose from "mongoose";
import { Schema } from "mongoose";

const SubscriptionSchema = new Schema(
  {
    SubscribedUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    stripeCustomerId: {
      type: String,
      default: null,
    },

    stripeSubscriptionId: {
      type: String,
      default: null,
    },

    subscriptionPlan: {
      type: String,
      enum: ["free", "premium", "pro"],
      default: "free",
    },

    subscriptionStatus: {
      type: String,
      enum: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "unpaid",
      ],
      default: "unpaid",
    },

    currentPeriodEnd: {
      type: Date,
      default: null,
    },
    usage: {
      resumeAnalysis: {
        count: {
          type: Number,
          default: 0,
          resetAt: Date,
        },
      },

      resumeImprovement: {
        count: {
          type: Number,
          default: 0,
          resetAt: Date,
        },
      },
      mockInterview: {
        count: {
          type: Number,
          default: 0,
          resetAt: Date,
        },
      },
    },
  },
  { timestamps: true },
);

export const Subscription = new mongoose.model(
  "Subscription",
  SubscriptionSchema,
);
