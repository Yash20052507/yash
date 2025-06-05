// src/index.ts
import express from 'express';
import http from 'http';
import { QueueScheduler } from 'bullmq';
import config from './config';
import { logger } from './utils/logger';
import { setupGlobalMiddleware, setupFinalErrorHandlers } from './middleware';
import { setupRoutes } from './routes';
import { initSocketServer } from './utils/socket';
import { taskQueue, taskWorker, TASK_QUEUE_NAME } from './jobs/queue';
import { closeDatabaseConnections } from './utils/db';

let server: http.Server;
let queueScheduler: QueueScheduler;

async function main() {
  logger.info(`Starting SuperModel AI backend in ${config.server.env} mode...`);

  const app = express();
  server = http.createServer(app);

  // Setup global middleware (CORS, Morgan, body-parsers)
  // This runs for all requests, before routing.
  setupGlobalMiddleware(app);

  // Setup API routes. This includes API-specific rate limiters, 404 and error handlers.
  setupRoutes(app);

  // Setup Socket.IO
  try {
    initSocketServer(server);
    logger.info('Socket.IO server initialized.');
  } catch (error) {
    logger.error('Failed to initialize Socket.IO server:', error);
    // Depending on criticality, might exit: process.exit(1);
  }

  // Initialize BullMQ QueueScheduler
  // It's important that this uses the same connection details as the queue and worker.
  const redisConnection = taskQueue.opts.connection; // Reuse connection from the queue
  if (!redisConnection) {
    logger.error('Redis connection details not found on taskQueue options. Cannot start QueueScheduler.');
    process.exit(1); // Cannot proceed without this for BullMQ advanced features
  }
  queueScheduler = new QueueScheduler(TASK_QUEUE_NAME, {
    connection: redisConnection,
  });
  await queueScheduler.waitUntilReady(); // Ensure scheduler is connected
  logger.info('BullMQ QueueScheduler started and ready.');

  // Ensure task worker is running (it's defined and starts in queue.ts)
  // We just log its status here. BullMQ worker automatically starts processing jobs when instantiated.
  if (taskWorker.isRunning()) {
    logger.info(`BullMQ TaskWorker for queue "${TASK_QUEUE_NAME}" is running.`);
  } else {
    // This state should ideally not be reached if queue.ts is imported and worker instantiated.
    logger.error(`BullMQ TaskWorker for queue "${TASK_QUEUE_NAME}" is NOT running! This is unexpected.`);
    // You might try taskWorker.run() if it had such a method and was not auto-running,
    // but BullMQ workers usually start upon instantiation.
  }

  // Setup final catch-all error handlers (must be AFTER routes and other middleware)
  // This handles any errors not caught by the API-specific error handler in setupRoutes.
  setupFinalErrorHandlers(app);

  // Start HTTP server
  server.listen(config.server.port, () => {
    logger.info(`Server listening on port ${config.server.port}.`);
    logger.info(`Access API at http://localhost:${config.server.port}/api`);
    logger.info(`API Health Check: http://localhost:${config.server.port}/api/health`);
  });
}

async function shutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  // Stop HTTP server from accepting new connections
  if (server) {
    server.close(async (err) => {
      if (err) {
        logger.error('Error closing HTTP server:', err);
        // process.exit(1); // Don't exit immediately, try to close other things
      } else {
        logger.info('HTTP server closed.');
      }

      // Close BullMQ components
      // Worker should be closed first to stop processing new jobs
      if (taskWorker) {
        try {
          await taskWorker.close();
          logger.info('BullMQ TaskWorker closed.');
        } catch (qErr) { logger.error('Error closing BullMQ TaskWorker:', qErr); }
      }
      if (taskQueue) {
        try {
          await taskQueue.close();
          logger.info('BullMQ TaskQueue closed.');
        } catch (qErr) { logger.error('Error closing BullMQ TaskQueue:', qErr); }
      }
      if (queueScheduler) {
        try {
          await queueScheduler.close();
          logger.info('BullMQ QueueScheduler closed.');
        } catch (qErr) { logger.error('Error closing BullMQ QueueScheduler:', qErr); }
      }

      // Close database connections
      try {
        await closeDatabaseConnections();
        logger.info('Database connections closed.');
      } catch (dbErr) {
        logger.error('Error closing database connections:', dbErr);
      }

      logger.info('Graceful shutdown complete.');
      process.exit(err ? 1 : 0);
    });

    // If server doesn't close in time, force shut down
    setTimeout(() => {
      logger.warn('HTTP server did not close in time. Forcing shutdown.');
      process.exit(1);
    }, 15000); // 15 seconds timeout
  } else {
    logger.info('Server not initialized. Exiting.');
    process.exit(0);
  }
}

// Listen for termination signals
const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
signals.forEach((signal) => {
  process.on(signal, () => shutdown(signal));
});

// Handle unhandled promise rejections and uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  // Optionally, shutdown gracefully here as well, as the app is in an unstable state
  // shutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // For uncaught exceptions, it's generally recommended to exit quickly.
  // Attempting graceful shutdown might be risky if state is corrupted.
  process.exit(1);
});


main().catch((error) => {
  logger.fatal('Unhandled error during application startup:', error);
  process.exit(1);
});
