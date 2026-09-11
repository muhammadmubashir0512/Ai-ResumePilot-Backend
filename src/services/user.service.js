import { User } from "../models/Users.model.js";
import ApiError from "../utils/ApiError.js";
import { UploadImage } from "../utils/cloudinary.js";
import { Resume } from "../models/Resume.model.js";
import { Interview } from "../models/Interview.model.js";

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

export const getAverageScore = async (owner) => {
  if (!owner) {
    throw new ApiError(401, "Unauthorized request");
  }

  const resumeResult = await Resume.aggregate([
    {
      $match: {
        owner: owner,
      },
    },

    {
      $group: {
        _id: "$owner",

        averageAtsScore: {
          $avg: "$resumeAnalysis.ats_score",
        },

        averageKeywordMatchScore: {
          $avg: "$resumeAnalysis.keyword_match.score",
        },

        totalResumes: {
          $sum: 1,
        },
      },
    },

    {
      $project: {
        averageAtsScore: {
          $round: ["$averageAtsScore", 0],
        },

        averageKeywordMatchScore: {
          $round: ["$averageKeywordMatchScore", 0],
        },

        totalResumes: 1,
      },
    },

    {
      $project: {
        averageAtsScore: 1,
        averageKeywordMatchScore: 1,
        totalResumes: 1,

        skillGapPercent: {
          $subtract: [100, "$averageKeywordMatchScore"],
        },
      },
    },
  ]);

  const interviewResult = await Interview.aggregate([
    {
      $match: {
        owner: owner,
        status: "completed",
      },
    },

    {
      $group: {
        _id: "$owner",

        interviewReadiness: {
          $avg: "$finalEvaluation.overallScore",
        },

        totalMockInterviews: {
          $sum: 1,
        },
      },
    },

    {
      $project: {
        _id: 0,

        interviewReadiness: {
          $round: ["$interviewReadiness", 0],
        },

        totalMockInterviews: 1,
      },
    },
  ]);

  return {
    averageAtsScore: resumeResult[0]?.averageAtsScore ?? 0,

    averageKeywordMatchScore: resumeResult[0]?.averageKeywordMatchScore ?? 0,

    skillGapPercent: resumeResult[0]?.skillGapPercent ?? 0,

    totalResumes: resumeResult[0]?.totalResumes ?? 0,

    interviewReadiness: interviewResult[0]?.interviewReadiness ?? 0,

    totalMockInterviews: interviewResult[0]?.totalMockInterviews ?? 0,
  };
};
