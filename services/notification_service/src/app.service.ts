import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SendEmailDto } from './dto/send-email.dto';
import 'dotenv/config';

@Injectable()
export class AppService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

  }

  async sendEmail(sendEmailDto: SendEmailDto) {
    const { email, subject, message } = sendEmailDto;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: subject,
      text: message,
    };

    const info = await this.transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
    };
  }
}
