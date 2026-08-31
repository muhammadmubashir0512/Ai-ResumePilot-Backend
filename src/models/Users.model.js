import mongoose from "mongoose";
import { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      unique: true,
    },
    confirmPassword: {
      type: String,
    },
    refreshToken: {
      type: String,
    },
    profileImg: {
      type: String,
    },
    onSignupVerified: {
      type: Boolean,
      default: false,
    },
    subscription: {
      stripeCustomerId: {
        type: String,
        default: null,
      },

      stripeSubscriptionId: {
        type: String,
        default: null,
      },

      plan: {
        type: String,
        enum: ["free", "pro"],
        default: "free",
      },

      status: {
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
        default: "active",
      },

      currentPeriodEnd: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true },
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

UserSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

UserSchema.methods.generateAccessToken = async function () {
  return jwt.sign(
    {
      id: this.id,
      email: this.email,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    },
  );
};

UserSchema.methods.generateRefreshToken = async function () {
  return jwt.sign(
    {
      id: this.id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    },
  );
};

export const User = mongoose.model("User", UserSchema);
