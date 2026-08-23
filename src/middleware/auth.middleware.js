import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/Users.model.js";

const verifyJWT = asyncHandler(async (req, res, next) => {
  console.time("AUTH_MIDDLEWARE");
  const token =
    req.header("Authorization")?.replace("Bearer ", "") ||
    req?.cookies?.accessToken;
  if (!token) {
    throw new ApiError(401, "Unauthorized Request");
  }
  try {
    console.time("JWT_VERIFY");
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    console.timeEnd("JWT_VERIFY");

    console.time("USER_QUERY");

    const existedUser = await User.findById(decoded.id).select(
      "-password -refreshToken",
    );

    console.timeEnd("USER_QUERY");
    if (!existedUser) {
      throw new ApiError(401, "unathorized");
    }

    req.user = existedUser;

    console.timeEnd("AUTH_MIDDLEWARE");
    next();
  } catch (error) {
    console.timeEnd("AUTH_MIDDLEWARE");
    console.log("eeror", error);
  }
});

export default verifyJWT;
