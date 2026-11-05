import * as nodemailer from "nodemailer";
import { serverEnv } from "@/env/server";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: serverEnv.MAIL_USER,
    pass: serverEnv.MAIL_PASS,
  },
});
