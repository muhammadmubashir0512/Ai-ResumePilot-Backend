import { z } from "zod";

const loginValidation = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(8, { message: "Passwaord must be atleast 8 characters" }),
});

export default loginValidation;
