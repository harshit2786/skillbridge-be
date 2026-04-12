import { Queue } from "bullmq";
export declare const redisConnection: {
    maxRetriesPerRequest: null;
    tls?: {};
    password?: string;
    host: string;
    port: number;
};
export declare const resourceQueue: Queue<any, any, string, any, any, string>;
export interface ResourceJobData {
    resourceId: string;
    refId: string;
    projectId: string;
    filename: string;
}
export declare const addResourceJob: (data: ResourceJobData) => Promise<void>;
export declare const quizGradingQueue: Queue<any, any, string, any, any, string>;
export interface QuizGradingJobData {
    quizAttemptId: string;
    quizId: string;
    traineeProgressId: string;
    projectId: string;
}
export declare const addQuizGradingJob: (data: QuizGradingJobData) => Promise<void>;
//# sourceMappingURL=queue.d.ts.map