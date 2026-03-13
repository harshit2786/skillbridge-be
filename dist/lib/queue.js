import { Queue } from "bullmq";
const redisUrl = new URL(process.env.REDIS_URL || "redis://localhost:6379");
// Shared Redis connection config
export const redisConnection = {
    host: redisUrl.hostname,
    port: Number(redisUrl.port) || 6379,
    password: redisUrl.password || undefined,
    maxRetriesPerRequest: null,
};
// ─── Resource Processing Queue (existing) ────────────────────────
export const resourceQueue = new Queue("resource-processing", {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});
export const addResourceJob = async (data) => {
    await resourceQueue.add("process-resource", data, {
        jobId: data.resourceId,
    });
    console.log(`📋 Job added to queue: ${data.filename}`);
};
// ─── Quiz Grading Queue (new) ────────────────────────────────────
export const quizGradingQueue = new Queue("quiz-grading", {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000,
        },
        removeOnComplete: {
            count: 100,
        },
        removeOnFail: {
            count: 50,
        },
    },
});
export const addQuizGradingJob = async (data) => {
    await quizGradingQueue.add("grade-quiz", data, {
        jobId: data.quizAttemptId,
    });
    console.log(`📋 Quiz grading job added for attempt: ${data.quizAttemptId}`);
};
//# sourceMappingURL=queue.js.map