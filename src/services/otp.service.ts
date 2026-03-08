import prisma from "../lib/prisma.js";
import { sendSms } from "./sms.service.js";

const OTP_LENGTH = 4;
const OTP_EXPIRY_MINUTES = 5;

export const generateOtpCode = (): string => {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
};

export const createAndSendOtp = async (phone: string): Promise<boolean> => {
  // Invalidate any existing OTPs for this phone
  await prisma.otp.deleteMany({
    where: { phone },
  });

  const code = generateOtpCode();

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

  // Save OTP to DB
  await prisma.otp.create({
    data: {
      phone,
      code,
      expiresAt,
    },
  });

  // Send SMS
  const message = `Your LMS login OTP is: ${code}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`;
  const sent = await sendSms(phone, message);

  return sent;
};

export const verifyOtp = async (
  phone: string,
  code: string
): Promise<{ success: boolean; message: string }> => {
  const otp = await prisma.otp.findFirst({
    where: {
      phone,
      code,
      verified: false,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return { success: false, message: "Invalid OTP" };
  }

  if (new Date() > otp.expiresAt) {
    // Clean up expired OTP
    await prisma.otp.delete({ where: { id: otp.id } });
    return { success: false, message: "OTP has expired" };
  }

  // Mark as verified and clean up
  await prisma.otp.delete({ where: { id: otp.id } });

  return { success: true, message: "OTP verified successfully" };
};

// Optional: cleanup job for expired OTPs
export const cleanupExpiredOtps = async (): Promise<number> => {
  const result = await prisma.otp.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
};