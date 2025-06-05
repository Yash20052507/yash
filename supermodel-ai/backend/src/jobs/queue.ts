// src/jobs/queue.ts
import { Queue, Worker, Job, Metrics, QueueScheduler } from 'bullmq';
import config from '../config';
import { logger } from '../utils/logger';
import { AIService } from '../ai/AIService';
import { SkillPackManager } from '../ai/SkillPackManager';
import { updateTask, findTaskById, TaskUpdate } from '../models/Task'; // Using existing updateTask

const redisConnectionDetails = config.database.redisUri
    ? config.database.redisUri // Use URI if provided
    : { host: config.database.redisHost, port: config.database.redisPort };

export const TASK_QUEUE_NAME = 'supermodel-tasks';

// It's good practice to have a QueueScheduler for features like delayed jobs, rate limiting, etc.
const queueScheduler = new QueueScheduler(TASK_QUEUE_NAME, { connection: redisConnectionDetails });
logger.info(`QueueScheduler for "${TASK_QUEUE_NAME}" initialized.`);


export const taskQueue = new Queue(TASK_QUEUE_NAME, {
    connection: redisConnectionDetails,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 10000, // 10 seconds initial backoff
        },
        removeOnComplete: { // Keep a certain number of jobs for history or remove them
            count: 1000, // Keep last 1000 completed jobs
            age: 7 * 24 * 3600 // Keep for 7 days
        },
        removeOnFail: {
            count: 5000, // Keep more failed jobs for inspection
            age: 30 * 24 * 3600 // Keep for 30 days
        }
    }
});

logger.info(`Task queue "${TASK_QUEUE_NAME}" initialized.`);

// Define job data interfaces
export interface EmbeddingGenerationJobData {
    taskId: string;
    skillPackPgId: string;
    skillPackVersion: string; // Added version
}
// Add other job types and their data interfaces here (e.g., ModelFinetuningJobData)

// Initialize services needed by worker
let aiServiceInstance: AIService;
let skillPackManagerInstance: SkillPackManager;

function getAIService(): AIService {
    if (!aiServiceInstance) aiServiceInstance = new AIService();
    return aiServiceInstance;
}
function getSkillPackManager(): SkillPackManager {
    if (!skillPackManagerInstance) skillPackManagerInstance = new SkillPackManager(getAIService());
    return skillPackManagerInstance;
}

// Worker to process jobs
export const taskWorker = new Worker<EmbeddingGenerationJobData>(TASK_QUEUE_NAME, async (job: Job<EmbeddingGenerationJobData>) => {
    const { taskId } = job.data;
    logger.info(`Processing job ${job.id} (Task ID: ${taskId}), type: ${job.name}. Attempt #${job.attemptsMade}`);

    const task = await findTaskById(taskId);
    if (!task) {
        logger.error(`Task ${taskId} not found for job ${job.id}. Skipping processing.`);
        // This job will likely fail and retry if attempts left. If no attempts, it goes to 'failed'.
        // Consider if this should immediately throw an error to mark as failed.
        throw new Error(`Task ${taskId} not found.`);
    }
    if (task.status === 'completed' || task.status === 'failed' && job.attemptsMade > 1) { // Don't re-process terminally failed/completed tasks on retry unless specific logic allows
        logger.warn(`Task ${taskId} is already in status ${task.status}. Job ${job.id} will not be re-processed.`);
        return { status: task.status, message: "Task already terminal."};
    }

    const updatesForProcessing: TaskUpdate = { status: 'processing', progress: task.progress > 0 ? task.progress : 10 };
    if (job.attemptsMade > 1) { // If it's a retry, reflect it in metadata
        updatesForProcessing.metadata = { ...task.metadata, retryAttempt: job.attemptsMade };
    }
    await updateTask(taskId, updatesForProcessing);

    try {
        let success = false;
        let resultPayload: any = { message: `${job.name} successful` };

        if (job.name === 'generate-skillpack-embeddings') {
            const { skillPackPgId, skillPackVersion } = job.data;
            if (!skillPackPgId || !skillPackVersion) {
                throw new Error(`Missing skillPackPgId or skillPackVersion for job ${job.name}`);
            }
            success = await getSkillPackManager().generateAndStoreEmbeddings(skillPackPgId, skillPackVersion);
            resultPayload.skillPackPgId = skillPackPgId;
            resultPayload.version = skillPackVersion;
        } else {
            logger.warn(`Unknown job name: ${job.name} for job ID ${job.id}`);
            throw new Error(`Unknown job name: ${job.name}`);
        }

        if (success) {
            await updateTask(taskId, { status: 'completed', progress: 100, result: resultPayload, completed_at: new Date() });
            logger.info(`Job ${job.id} for task ${taskId} completed successfully.`);
            return resultPayload;
        } else {
            // The specific error should have been logged by SkillPackManager or other services
            throw new Error(`${job.name} processing returned false for task ${taskId}.`);
        }
    } catch (error: any) {
        logger.error(`Error processing job ${job.id} for task ${taskId}: ${error.message}`, { stack: error.stack });
        // Update task with error, but don't overwrite existing error if this is a retry and it's a new error.
        const existingTask = await findTaskById(taskId); // Re-fetch to get latest metadata
        const newError = {
            message: error.message || 'Unknown error during job processing',
            attempt: job.attemptsMade,
            timestamp: new Date().toISOString()
        };
        const previousErrors = existingTask?.metadata?.errors || [];

        await updateTask(taskId, {
            status: 'failed',
            error_message: error.message || 'Unknown error',
            metadata: { ...existingTask?.metadata, errors: [...previousErrors, newError] }
        });
        throw error; // Re-throw to let BullMQ handle retry logic
    }
}, { connection: redisConnectionDetails, concurrency: config.server.env === 'test' ? 1 : 5 }); // Adjust concurrency

taskWorker.on('completed', (job: Job, result: any) => {
  logger.info(`Job ${job.id} (Task ID: ${job.data.taskId}) has completed. Result:`, result);
});

taskWorker.on('failed', (job: Job | undefined, err: Error) => {
  if (job) {
    logger.error(`Job ${job.id} (Task ID: ${job.data.taskId}) has failed after ${job.attemptsMade} attempts with error: ${err.message}`, { stack: err.stack });
  } else {
    logger.error(`A job has failed with error: ${err.message}`, { stack: err.stack });
  }
});

taskWorker.on('error', err => {
    logger.error('BullMQ worker error:', err);
});

// Function to add embedding generation task
export async function addEmbeddingGenerationTaskToQueue(taskId: string, skillPackPgId: string, skillPackVersion: string) {
    const jobData: EmbeddingGenerationJobData = { taskId, skillPackPgId, skillPackVersion };
    await taskQueue.add('generate-skillpack-embeddings', jobData);
    // Initial status update to 'queued'
    await updateTask(taskId, { status: 'queued', progress: 0 });
    logger.info(`Task ${taskId} for generating embeddings for skill pack ${skillPackPgId} v${skillPackVersion} added to queue.`);
}


// For graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing queue and worker.');
    await queueScheduler.close();
    await taskWorker.close();
    await taskQueue.close();
    logger.info('BullMQ components closed.');
    process.exit(0);
});

// For health checks or metrics (optional)
export async function getQueueMetrics(): Promise<Metrics | undefined> {
    try {
        return await taskQueue.getMetrics('completed', 0, 100); // Example: get last 100 completed jobs metrics
    } catch(e) {
        logger.error("Error fetching queue metrics", e);
    }
}
