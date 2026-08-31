import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_APP_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (fileBuffer, folder = "resumePilot") => {
  return new Promise((resolve, reject) => {
    if (!fileBuffer) {
      return resolve(null);
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "raw",
        format: "pdf",
        type: "authenticated",
      },
      (error, result) => {
        if (error) {
          console.log("CLOUDINARY ERROR :", error);
          return reject(error);
        }

        resolve(result);
      },
    );

    uploadStream.end(fileBuffer);
  });
};

const UploadImage = (file, folder = "resumePilot") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          console.log("Cloudinary error...", error);
          return reject(error);
        }
        resolve(result);
      },
    );

    uploadStream.end(file);
  });
};

export { UploadImage, uploadOnCloudinary };
