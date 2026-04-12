import { Queue } from "bullmq";

const redisUrl = new URL(process.env.REDIS_URL || "redis://localhost:6379");
const isTLS = redisUrl.protocol === "rediss:";

// Shared Redis connection config
export const redisConnection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
  ...(redisUrl.password && { password: decodeURIComponent(redisUrl.password) }),
  ...(isTLS && { tls: {} }),
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

export interface ResourceJobData {
  resourceId: string;
  refId: string;
  projectId: string;
  filename: string;
}

export const addResourceJob = async (data: ResourceJobData): Promise<void> => {
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

export interface QuizGradingJobData {
  quizAttemptId: string;
  quizId: string;
  traineeProgressId: string;
  projectId: string;
}

export const addQuizGradingJob = async (data: QuizGradingJobData): Promise<void> => {
  await quizGradingQueue.add("grade-quiz", data, {
    jobId: data.quizAttemptId,
  });
  console.log(`📋 Quiz grading job added for attempt: ${data.quizAttemptId}`);
};