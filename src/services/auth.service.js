import { User } from "../models/Users.model.js";
import ApiError from "../utils/ApiError.js";

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
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, "User already exists");
  }

  if (password !== confirmPassword) {
    throw new ApiError(400, "Password and confirmpassword not match");
  }

  const newUser = await User.create({
    email,
    fullName,
    password,
  });

  const accessToken = await newUser.generateAccessToken();

  const userData = await User.findById(newUser._id).select(
    "-refreshToken -password -confirmPasswaord",
  );

  return {
    userData,
    accessToken,
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
