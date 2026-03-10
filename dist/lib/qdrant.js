import { QdrantClient } from "@qdrant/js-client-rest";
const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL || "http://localhost:6333",
});
const COLLECTION_NAME = "resources";
// Initialize collection (run once)
export const initQdrantCollection = async () => {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);
    if (!exists) {
        await qdrant.createCollection(COLLECTION_NAME, {
            vectors: {
                size: 1536, // OpenAI text-embedding-3-small dimension
                distance: "Cosine",
            },
        });
        // Create payload index for filtering by projectId
        await qdrant.createPayloadIndex(COLLECTION_NAME, {
            field_name: "projectId",
            field_schema: "keyword",
        });
        console.log("✅ Qdrant collection created");
    }
};
export const upsertVectors = async (points) => {
    await qdrant.upsert(COLLECTION_NAME, {
        points,
    });
};
export const searchVectors = async (vector, projectId, limit = 5) => {
    const results = await qdrant.search(COLLECTION_NAME, {
        vector,
        limit,
        filter: {
            must: [
                {
                    key: "projectId",
                    match: { value: projectId },
                },
            ],
        },
        with_payload: true,
    });
    return results.map((r) => ({
        score: r.score,
        payload: r.payload,
    }));
};
export const deleteVectorsByResourceId = async (resourceId) => {
    await qdrant.delete(COLLECTION_NAME, {
        filter: {
            must: [
                {
                    key: "resourceId",
                    match: { value: resourceId },
                },
            ],
        },
    });
};
export default qdrant;
//# sourceMappingURL=qdrant.js.map