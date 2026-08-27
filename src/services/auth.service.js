import { User } from "../models/Users.model.js";
import { emailQueue } from "../Queues/email.queue.js";
import ApiError from "../utils/ApiError.js";
import { deleteValue, getValue, setValue } from "../utils/redis.js";

export const LoginUser = async ({ email, password }) => {
  const existedUser = await User.findOne({ email });
  if (!existedUser) {
    throw new ApiError(400, "User not found");
  }

  const passwordCheck = await existedUser.isPasswordCorrect(password);
  if (!passwordCheck) {
    throw new ApiError(400, "Incorrect Password");
  }

  const accessToken = await existedUser.generateAccessToken();
  const refreshToken = await existedUser.generateRefreshToken();

  existedUser.refreshToken = refreshToken;
  await existedUser.save({ validateBeforeSave: true });

  const userData = await User.findById(existedUser._id).select(
    "-refreshToken -password",
  );

  return {
    userData,
    accessToken,
    refreshToken,
  };
};

export const SignupUser = async ({
  fullName,
  email,
  password,
  confirmPassword,
}) => {
  if (password !== confirmPassword) {
    throw new ApiError(400, "Password and confirmpassword not match");
  }

  const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000);
  };

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    if (!existingUser.onSignupVerified) {
      // OTP generation for not verified user
      const otp = generateOTP();
      await setValue(`signup:otp:${email}`, otp, 300);

      await emailQueue.add("otp", {
        to: email,
        otp,
      });

      return {
        message: "Account already exists but is not verified. New OTP sent.",
      };
    }

    throw new ApiError(400, "User already exists");
  }

  // Otp genertion for New User
  const otp = generateOTP();
  await setValue(`signup:otp:${email}`, otp, 300);

  await emailQueue.add("otp", {
    to: email,
    otp,
  });

  const newUser = await User.create({
    email,
    fullName,
    password,
    onSignupVerified: false,
  });

  const userData = await User.findById(newUser._id).select(
    "-refreshToken -password -confirmPasswaord",
  );

  return {
    userData,
    otp,
  };
};

export const logoutUser = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    },
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
};

export const OTPVerification = async ({ email, otp }) => {
  const Userexists = await User.findOne({ email });
  if (!Userexists) {
    throw new ApiError(400, "User not exists Please Signup first");
  }

  if (Userexists.onSignupVerified) {
    throw new ApiError(400, "User already verified");
  }

  const SavedOTP = await getValue(`signup:otp:${email}`);

  if (!SavedOTP) {
    throw new ApiError(400, "OTP is expired");
  }

  if (SavedOTP !== String(otp)) {
    throw new ApiError(400, "Invalid Otp");
  }

  const accessToken = await Userexists.generateAccessToken();
  const refreshToken = await Userexists.generateRefreshToken();

  Userexists.onSignupVerified = true;
  Userexists.refreshToken = refreshToken;
  Userexists.save({ validateBeforeSave: true });

  await deleteValue(`signup:otp:${email}`);

  const userData = await User.findById(Userexists._id).select(
    "-refreshToken -password",
  );
  return {
    userData,
    accessToken,
    refreshToken,
  };
};
