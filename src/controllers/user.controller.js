import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import { ProfileUpdation, UpdatePassword } from "../services/user.service.js";

const getUser = asyncHandler(async (req, res) => {
  const user = req.user;

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User Data fetched successfully"));
});

const updateProfileInfo = asyncHandler(async (req, res) => {
  const email = req.user.email;
  const profileImg = req.file;
  const { fullName } = req.body;

  const result = await ProfileUpdation({ email, profileImg, fullName });

  return res
    .status(200)
    .json(new ApiResponse(200, result, "User Profile Updated successfully"));
});

const PasswaordUpdate = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { oldPassword, newPassword } = req.body;

  const password = await UpdatePassword({ userId, oldPassword, newPassword });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Updated Sucessfully"));
});

export { getUser, updateProfileInfo, PasswaordUpdate };
