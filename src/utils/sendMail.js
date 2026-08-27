import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

export const sendMail = async (to, subject, text) => {
  await transport.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject,
    text,
  });
};
