import { SendEmailDto } from './dto/send-email.dto';
import 'dotenv/config';
export declare class AppService {
    private transporter;
    constructor();
    sendEmail(sendEmailDto: SendEmailDto): Promise<{
        success: boolean;
        messageId: any;
    }>;
}
