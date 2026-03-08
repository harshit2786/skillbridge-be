// Mock SMS Provider (for development)
class MockSmsProvider {
    async sendSms(phone, message) {
        console.log("──────────────────────────────────");
        console.log("📱 MOCK SMS");
        console.log(`To: ${phone}`);
        console.log(`Message: ${message}`);
        console.log("──────────────────────────────────");
        return true;
    }
}
// When ready for production, implement this:
//
// import twilio from "twilio";
//
// class TwilioSmsProvider implements SmsProvider {
//   private client;
//
//   constructor() {
//     this.client = twilio(
//       process.env.TWILIO_ACCOUNT_SID,
//       process.env.TWILIO_AUTH_TOKEN
//     );
//   }
//
//   async sendSms(phone: string, message: string): Promise<boolean> {
//     try {
//       await this.client.messages.create({
//         body: message,
//         from: process.env.TWILIO_PHONE_NUMBER,
//         to: phone,
//       });
//       return true;
//     } catch (error) {
//       console.error("Twilio SMS error:", error);
//       return false;
//     }
//   }
// }
// Switch provider here — only this line changes
const smsProvider = new MockSmsProvider();
// const smsProvider: SmsProvider = new TwilioSmsProvider();
export const sendSms = (phone, message) => {
    return smsProvider.sendSms(phone, message);
};
//# sourceMappingURL=sms.service.js.map