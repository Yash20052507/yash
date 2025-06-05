// src/utils/db.ts
import { Pool } from 'pg';
import { MongoClient, Db as MongoDb } from 'mongodb';
import config from '../config'; // Assuming config is in src/config/index.ts
import { logger } from './logger'; // Assuming logger is in src/utils/logger.ts

let pgPool: Pool | null = null;
let mongoClient: MongoClient | null = null;
let mongoDbInstance: MongoDb | null = null;

export function getPgPool(): Pool {
  if (!pgPool) {
    if (!config.database.postgresUri) {
      logger.error('FATAL ERROR: POSTGRES_URI is not defined in config.');
      throw new Error('POSTGRES_URI is not defined.');
    }
    pgPool = new Pool({
      connectionString: config.database.postgresUri,
    });
    pgPool.on('connect', () => {
      logger.info('PostgreSQL pool connected');
    });
    pgPool.on('error', (err) => {
      logger.error('PostgreSQL pool error:', err);
    });
  }
  return pgPool;
}

export async function getMongoDb(): Promise<MongoDb> {
  if (!mongoDbInstance) {
    if (!config.database.mongoUri) {
      logger.error('FATAL ERROR: MONGODB_URI is not defined in config.');
      throw new Error('MONGODB_URI is not defined.');
    }
    if (!mongoClient) {
      mongoClient = new MongoClient(config.database.mongoUri);
      try {
        await mongoClient.connect();
        logger.info('MongoDB client connected');
      } catch (err) {
        logger.error('MongoDB client connection error:', err);
        throw err;
      }
    }
    mongoDbInstance = mongoClient.db(); // Use default DB from URI or specify
  }
  return mongoDbInstance;
}

export async function closeDatabaseConnections(): Promise<void> {
  if (pgPool) {
    await pgPool.end();
    logger.info('PostgreSQL pool disconnected');
    pgPool = null;
  }
  if (mongoClient) {
    await mongoClient.close();
    logger.info('MongoDB client disconnected');
    mongoClient = null;
    mongoDbInstance = null;
  }
}
