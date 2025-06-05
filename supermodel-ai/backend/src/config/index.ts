// src/config/index.ts
import dotenv from 'dotenv';
dotenv.config({ path: require('path').resolve(__dirname, '../../../.env') });

const config = {
  server: {
    port: parseInt(process.env.PORT || '5000', 10),
    env: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000', // Added CORS origin
  },
  database: {
    postgresUri: process.env.POSTGRES_URI || '',
    mongoUri: process.env.MONGODB_URI || '',
    redisUri: process.env.REDIS_URI || '',
    redisHost: process.env.REDIS_HOST || 'localhost',
    redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-default-secret',
    expiresIn: process.env.JWT_EXPIRATION || '1d',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-3.5-turbo',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002',
    maxTokensPerResponse: parseInt(process.env.OPENAI_MAX_TOKENS_PER_RESPONSE || '1500', 10),
  },
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
    environment: process.env.PINECONE_ENVIRONMENT || '',
    indexName: process.env.PINECONE_INDEX || '',
    projectName: process.env.PINECONE_PROJECT_NAME || '',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || (15 * 60 * 1000).toString(), 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  }
};

// Validate essential config
if (!config.database.postgresUri || !config.database.mongoUri || !config.jwt.secret) {
  console.error("FATAL ERROR: Missing essential DB URIs or JWT Secret. Check .env file.");
  // process.exit(1);
}
if (!config.openai.apiKey) {
    console.warn("WARNING: OpenAI API key is not set. AI services will not function.");
}
if (!config.pinecone.apiKey || !config.pinecone.environment || !config.pinecone.indexName || !config.pinecone.projectName && config.pinecone.apiKey) { // Project name might not be needed for all pinecone client versions/setups if API key is global
    console.warn("WARNING: Pinecone configuration is incomplete. Vector search may not function as expected.");
}
if (!config.database.redisHost && !config.database.redisUri) {
    console.warn("WARNING: Redis configuration (host or URI) is not set. Task queue may not function.");
}
if (!config.server.corsOrigin) {
    console.warn("WARNING: CORS_ORIGIN is not set. Defaulting to 'http://localhost:3000'. This may cause issues in production.");
}


export default config;
