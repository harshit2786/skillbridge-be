export declare const uploadToGCS: (file: Express.Multer.File, destination: string) => Promise<{
    refId: string;
    url: string;
}>;
export declare const getSignedUrl: (refId: string) => Promise<string>;
export declare const deleteFromGCS: (refId: string) => Promise<void>;
//# sourceMappingURL=gcs.d.ts.map