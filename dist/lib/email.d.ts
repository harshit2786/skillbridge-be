export declare function sendHostInviteEmail(payload: {
    toEmail: string;
    trainerName: string;
    webinarTitle: string;
    scheduledAt: Date;
    duration: number;
    startUrl: string;
}): Promise<void>;
export declare function sendRegistrationConfirmEmail(payload: {
    toEmail: string;
    traineeName: string | null;
    webinarTitle: string;
    scheduledAt: Date;
    duration: number;
    joinUrl: string;
    hostName: string;
}): Promise<void>;
//# sourceMappingURL=email.d.ts.map