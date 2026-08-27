import { z } from "zod";

const resumeUploadValidation = z.object({
  jobTittle: z
    .string()
    .min(3, { message: "JobTittle must be atleast 3 characters" })
    .toLowerCase(),
  jobDescription: z
    .string()
    .min(10, { message: "Job Description must be atleast 10 character" })
    .toLowerCase(),
});

export default resumeUploadValidation;
