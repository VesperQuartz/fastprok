import type { SentMessageInfo, Transporter } from "nodemailer";
import { render } from "react-email";
import { SendVerificationEmail } from "@/components/mail";

interface IMailServer {
  sendVerificationEmail({
    recipient,
    tokenUrl,
  }: {
    recipient: string;
    tokenUrl: string;
  }): Promise<SentMessageInfo>;
}

export class MailServer implements IMailServer {
  #transporter: Transporter;
  constructor(transporter: Transporter) {
    this.#transporter = transporter;
  }
  sendVerificationEmail = async ({
    recipient,
    tokenUrl,
  }: {
    recipient: string;
    tokenUrl: string;
  }): Promise<SentMessageInfo> => {
    const response = await this.#transporter.sendMail({
      to: recipient,
      subject: "Email Verification",
      html: await render(SendVerificationEmail({ url: tokenUrl })),
    });
    return response;
  };
}
