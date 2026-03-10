import { QdrantClient } from "@qdrant/js-client-rest";
declare const qdrant: QdrantClient;
export declare const initQdrantCollection: () => Promise<void>;
export declare const upsertVectors: (points: {
    id: string;
    vector: number[];
    payload: {
        projectId: string;
        resourceId: string;
        filename: string;
        chunk: string;
        chunkIndex: number;
    };
}[]) => Promise<void>;
export declare const searchVectors: (vector: number[], projectId: string, limit?: number) => Promise<{
    score: number;
    payload: {
        chunk: string;
        filename: string;
        resourceId: string;
        chunkIndex: number;
    };
}[]>;
export declare const deleteVectorsByResourceId: (resourceId: string) => Promise<void>;
export default qdrant;
//# sourceMappingURL=qdrant.d.ts.map