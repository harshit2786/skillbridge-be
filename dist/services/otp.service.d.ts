export declare const generateOtpCode: () => string;
export declare const createAndSendOtp: (phone: string) => Promise<boolean>;
export declare const verifyOtp: (phone: string, code: string) => Promise<{
    success: boolean;
    message: string;
}>;
export declare const cleanupExpiredOtps: () => Promise<number>;
//# sourceMappingURL=otp.service.d.ts.map