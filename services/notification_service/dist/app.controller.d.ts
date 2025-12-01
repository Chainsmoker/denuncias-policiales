import { AppService } from './app.service';
import { SendEmailDto } from './dto/send-email.dto';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    sendEmail(sendEmailDto: SendEmailDto): Promise<{
        success: boolean;
        messageId: any;
    }>;
}
