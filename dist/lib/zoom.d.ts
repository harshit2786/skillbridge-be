export interface ZoomMeeting {
    id: string;
    join_url: string;
    start_url: string;
}
export declare function createZoomMeeting(payload: {
    title: string;
    scheduledAt: Date;
    duration: number;
}): Promise<ZoomMeeting>;
//# sourceMappingURL=zoom.d.ts.map