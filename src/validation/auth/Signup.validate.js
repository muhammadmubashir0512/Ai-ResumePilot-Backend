import { z } from "zod";

const userValidation = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  fullName: z
    .string()
    .min(3, { message: "FullName must be ateast 3 characters" }),
  password: z
    .string()
    .min(8, { message: "Passwaord must be atleast 8 characters" }),
  confirmPassword: z
    .string()
    .min(8, { message: "confirmPasswaord must be atleast 8 characters" }),
});

export default userValidation;
