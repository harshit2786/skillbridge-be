// SMS Provider Interface - any provider must implement this
import twilio from "twilio";
// Mock SMS Provider (for development)
// class MockSmsProvider implements SmsProvider {
//   async sendSms(phone: string, message: string): Promise<boolean> {
//     console.log("──────────────────────────────────");
//     console.log("📱 MOCK SMS");
//     console.log(`To: ${phone}`);
//     console.log(`Message: ${message}`);
//     console.log("──────────────────────────────────");
//     return true;
//   }
// }
// When ready for production, implement this:
//
class TwilioSmsProvider {
    client;
    constructor() {
        this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    }
    async sendSms(phone, message) {
        try {
            await this.client.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER || "",
                to: `+91${phone}`,
            });
            return true;
        }
        catch (error) {
            console.error("Twilio SMS error:", error);
            return false;
        }
    }
}
// Switch provider here — only this line changes
const smsProvider = new TwilioSmsProvider();
// const smsProvider: SmsProvider = new TwilioSmsProvider();
export const sendSms = (phone, message) => {
    return smsProvider.sendSms(phone, message);
};
//# sourceMappingURL=sms.service.js.map