import "dotenv/config";
import { Worker, Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";
import { getEmbeddings } from "../lib/embeddings.js";
import { upsertVectors, initQdrantCollection } from "../lib/qdrant.js";
import { redisConnection } from "../lib/queue.js";
import { PDFParse } from "pdf-parse";
const prisma = new PrismaClient();
const storage = new Storage({
    projectId: process.env.GCS_PROJECT_ID ?? "",
    keyFilename: process.env.GCS_KEY_FILE ?? "",
});
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME || "");
// --- Helpers ---
const downloadPdfFromGCS = async (refId) => {
    const [buffer] = await bucket.file(refId).download();
    return buffer;
};
const extractTextFromPdf = async (buffer) => {
    const uint8Array = new Uint8Array(buffer); // ✅ convert Buffer to Uint8Array
    const pdfParse = new PDFParse(uint8Array);
    const data = await pdfParse.getText();
    return data.text;
};
const chunkText = (text, chunkSize = 1000, overlap = 200) => {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        const end = start + chunkSize;
        const chunk = text.slice(start, end).trim();
        if (chunk.length > 50) {
            // Skip very small chunks
            chunks.push(chunk);
        }
        start = end - overlap;
    }
    return chunks;
};
// --- Worker ---
const processResource = async (job) => {
    const { resourceId, refId, projectId, filename } = job.data;
    console.log(`🔄 Processing: ${filename}`);
    try {
        // Step 1: Download PDF from GCS
        console.log("  📥 Downloading from GCS...");
        const pdfBuffer = await downloadPdfFromGCS(refId);
        // Step 2: Extract text
        console.log("  📄 Extracting text...");
        const text = await extractTextFromPdf(pdfBuffer);
        if (!text || text.trim().length === 0) {
            throw new Error("No text content found in PDF");
        }
        console.log(`  📝 Extracted ${text.length} characters`);
        // Step 3: Chunk text
        console.log("  ✂️  Chunking text...");
        const chunks = chunkText(text);
        console.log(`  📦 Created ${chunks.length} chunks`);
        // Step 4: Generate embeddings (batch)
        console.log("  🧠 Generating embeddings...");
        const BATCH_SIZE = 20;
        const allPoints = [];
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);
            const embeddings = await getEmbeddings(batch);
            const points = batch.map((chunk, index) => {
                const vector = embeddings[index];
                if (!vector) {
                    throw new Error(`Missing embedding for chunk ${i + index}`);
                }
                return {
                    id: uuidv4(),
                    vector, // now guaranteed to be number[]
                    payload: {
                        projectId,
                        resourceId,
                        filename,
                        chunk,
                        chunkIndex: i + index,
                    },
                };
            });
            allPoints.push(...points);
        }
        // Step 5: Store in Qdrant
        console.log("  💾 Storing in Qdrant...");
        // Upsert in batches of 100
        for (let i = 0; i < allPoints.length; i += 100) {
            const batch = allPoints.slice(i, i + 100);
            await upsertVectors(batch);
        }
        // Step 6: Update status in DB
        await prisma.resource.update({
            where: { id: resourceId },
            data: { status: "PROCESSED" },
        });
        console.log(`✅ Completed: ${filename} (${chunks.length} chunks stored)`);
    }
    catch (error) {
        console.error(`❌ Failed: ${filename}`, error);
        await prisma.resource.update({
            where: { id: resourceId },
            data: {
                status: "FAILED",
                errorMsg: error instanceof Error ? error.message : "Unknown error",
            },
        });
        throw error; // BullMQ will retry based on config
    }
};
// --- Start Worker ---
const startWorker = async () => {
    console.log("🚀 Initializing Qdrant collection...");
    await initQdrantCollection();
    const worker = new Worker("resource-processing", processResource, {
        connection: redisConnection,
        concurrency: 2, // Process 2 jobs at a time
    });
    worker.on("completed", (job) => {
        console.log(`✅ Job completed: ${job.id}`);
    });
    worker.on("failed", (job, err) => {
        console.error(`❌ Job failed: ${job?.id}`, err.message);
    });
    worker.on("error", (err) => {
        console.error("Worker error:", err);
    });
    console.log("👷 Resource worker started. Waiting for jobs...");
};
startWorker().catch(console.error);
//# sourceMappingURL=resourceWorker.js.map