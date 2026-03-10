import { Storage } from "@google-cloud/storage";
const storage = new Storage({
    projectId: process.env.GCS_PROJECT_ID ?? "",
    keyFilename: process.env.GCS_KEY_FILE ?? "",
});
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME || "");
export const uploadToGCS = async (file, destination) => {
    const blob = bucket.file(destination);
    await new Promise((resolve, reject) => {
        const stream = blob.createWriteStream({
            resumable: false,
            contentType: file.mimetype,
            metadata: {
                originalName: file.originalname,
            },
        });
        stream.on("error", reject);
        stream.on("finish", resolve);
        stream.end(file.buffer);
    });
    // Generate a signed URL (valid for 7 days)
    const [url] = await blob.getSignedUrl({
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    return {
        refId: destination,
        url,
    };
};
export const getSignedUrl = async (refId) => {
    const [url] = await bucket.file(refId).getSignedUrl({
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    return url;
};
export const deleteFromGCS = async (refId) => {
    await bucket.file(refId).delete();
};
//# sourceMappingURL=gcs.js.map