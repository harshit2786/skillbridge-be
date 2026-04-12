import { Storage } from "@google-cloud/storage";
let _bucket = null;
function getBucket() {
    if (!_bucket) {
        const bucketName = process.env.GCS_BUCKET_NAME;
        if (!bucketName)
            throw new Error("GCS_BUCKET_NAME environment variable is required");
        let storage;
        if (process.env.GCS_KEY_BASE64) {
            storage = new Storage({
                ...(process.env.GCS_PROJECT_ID && { projectId: process.env.GCS_PROJECT_ID }),
                credentials: JSON.parse(Buffer.from(process.env.GCS_KEY_BASE64, "base64").toString()),
            });
        }
        else {
            storage = new Storage({
                ...(process.env.GCS_PROJECT_ID && { projectId: process.env.GCS_PROJECT_ID }),
                ...(process.env.GCS_KEY_FILE && { keyFilename: process.env.GCS_KEY_FILE }),
            });
        }
        _bucket = storage.bucket(bucketName);
    }
    return _bucket;
}
export const uploadToGCS = async (file, destination) => {
    const blob = getBucket().file(destination);
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
    const [url] = await getBucket().file(refId).getSignedUrl({
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    return url;
};
export const deleteFromGCS = async (refId) => {
    await getBucket().file(refId).delete();
};
//# sourceMappingURL=gcs.js.map