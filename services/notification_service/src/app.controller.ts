import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { SendEmailDto } from './dto/send-email.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('send-email')
  async sendEmail(@Body() sendEmailDto: SendEmailDto) {
    return await this.appService.sendEmail(sendEmailDto);
  }
}
