import { User } from "../models/Users.model.js";
import ApiError from "../utils/ApiError.js";
import { UploadImage } from "../utils/cloudinary.js";

export const ProfileUpdation = async ({ email, profileImg, fullName }) => {
  const profile = await UploadImage(profileImg.buffer, "profile-img");
  if (!profile) {
    throw new ApiError(400, "Failed to upload profileImg");
  }

  const profileUrl = profile.secure_url;

  const existedUser = await User.findOne({ email });

  existedUser.fullName = fullName;
  existedUser.profileImg = profileUrl;
  await existedUser.save({ validateBeforeSave: true });

  return {
    profileUrl,
    fullName,
  };
};

export const UpdatePassword = async ({ userId, oldPassword, newPassword }) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Current password is incorrect");
  }

  if (oldPassword === newPassword) {
    throw new ApiError(
      400,
      "New password must be different from the current password",
    );
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: true });

  return { message: "Password updated successfully" };
};
