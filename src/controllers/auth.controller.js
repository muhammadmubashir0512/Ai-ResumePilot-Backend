import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  LoginUser,
  logoutUser,
  SignupUser,
  OTPVerification,
} from "../services/auth.service.js";

const Login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { userData, accessToken, refreshToken } = await LoginUser({
    email,
    password,
  });

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  return res
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: userData, accessToken },
        "User LoggedIn Successfully",
      ),
    );
});

const Signup = asyncHandler(async (req, res) => {
  const { email, fullName, password, confirmPassword } = req.body;

  const { userData, otp } = await SignupUser({
    email,
    fullName,
    password,
    confirmPassword,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: userData, otp: otp },
        "User created successfully",
      ),
    );
});

const LogOut = asyncHandler(async (req, res) => {
  const existedUser = req.user;

  await logoutUser(existedUser._id);

  return res
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(new ApiResponse(200, null, "User LogOut Successfully"));
});

const VerifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const { userData, accessToken, refreshToken } = await OTPVerification({
    email,
    otp,
  });

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: userData, accessToken },
        "User Verified Successfully",
      ),
    );
});

const getUser = asyncHandler(async (req, res) => {
  const user = req.user;

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User Data fetched successfully"));
});

export default getUser;

export { Login, Signup, LogOut, VerifyOTP, getUser };
