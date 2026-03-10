import { Queue } from "bullmq";


const redisUrl = new URL(process.env.REDIS_URL || "redis://localhost:6379");

export const resourceQueue = new Queue("resource-processing", {
  connection: {
    host: redisUrl.hostname,
    port: Number(redisUrl.port) || 6379,
    password: redisUrl.password || undefined,
    maxRetriesPerRequest: null,
  },
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