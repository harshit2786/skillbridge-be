import { Queue } from "bullmq";
export declare const resourceQueue: Queue<any, any, string, any, any, string>;
export interface ResourceJobData {
    resourceId: string;
    refId: string;
    projectId: string;
    filename: string;
}
export declare const addResourceJob: (data: ResourceJobData) => Promise<void>;
//# sourceMappingURL=queue.d.ts.map