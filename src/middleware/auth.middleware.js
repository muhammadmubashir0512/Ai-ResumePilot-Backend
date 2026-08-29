import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/Users.model.js";

const verifyJWT = asyncHandler(async (req, res, next) => {
  const token =
    req.header("Authorization")?.replace("Bearer ", "") ||
    req?.cookies?.accessToken;
  if (!token) {
    throw new ApiError(401, "Unauthorized Request");
  }
  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const existedUser = await User.findById(decoded.id).select(
      "-password -refreshToken",
    );

    if (!existedUser) {
      throw new ApiError(401, "unathorized");
    }

    req.user = existedUser;

    next();
  } catch (error) {
    console.log("eeror", error);
  }
});

export default verifyJWT;
