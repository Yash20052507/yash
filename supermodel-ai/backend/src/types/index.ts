// src/types/index.ts
export interface User {
  id: string; // UUID
  username: string;
  email: string;
  password_hash: string;
  credits: number;
  is_admin: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NewUser {
  username: string;
  email: string;
  password: string;
  credits?: number;
  is_admin?: boolean;
}

export type UserUpdate = Partial<Omit<NewUser, 'password' | 'email' | 'username'> & {
  password?: string;
  email?: string;
  username?: string;
}>;


export interface Session {
  id: string; // UUID
  user_id: string; // UUID, foreign key to users
  name: string;
  context_summary?: string;
  created_at: Date;
  updated_at: Date;
}

export interface NewSession {
  user_id: string;
  name: string;
  context_summary?: string;
}

export type SessionUpdate = Partial<NewSession>;


export interface Message {
  id: string; // UUID
  session_id: string; // UUID, foreign key to sessions
  user_id?: string; // UUID, foreign key to users (nullable for AI messages)
  content: string;
  role: 'user' | 'ai' | 'system';
  token_count?: number;
  model_used?: string;
  created_at: Date;
}

export interface NewMessage {
  session_id: string;
  user_id?: string;
  content: string;
  role: 'user' | 'ai' | 'system';
  token_count?: number;
  model_used?: string;
}


export interface SkillPack {
  id: string; // UUID
  name: string;
  description?: string;
  category?: string;
  author_id: string; // UUID, foreign key to users
  version: string;
  download_count: number;
  rating: number; // Numeric(2,1)
  price_credits: number;
  is_public: boolean;
  content_hash?: string; // SHA-256
  created_at: Date;
  updated_at: Date;
}

export interface NewSkillPack {
  name: string;
  description?: string;
  category?: string;
  author_id: string;
  version?: string;
  price_credits?: number;
  is_public?: boolean;
  content_hash?: string;
}

export type SkillPackUpdate = Partial<Omit<NewSkillPack, 'author_id'>>;


export interface UserSkillPack {
  user_id: string;
  skill_pack_id: string;
  acquired_at: Date;
}


export interface SkillPackReview {
  id: string; // UUID
  skill_pack_id: string;
  user_id: string;
  rating: number; // 1-5
  comment?: string;
  created_at: Date;
}

export interface NewSkillPackReview {
  skill_pack_id: string;
  user_id: string;
  rating: number;
  comment?: string;
}

export type SkillPackReviewUpdate = Partial<Omit<NewSkillPackReview, 'skill_pack_id' | 'user_id'>>;


export interface Task {
  id: string; // UUID
  user_id: string; // UUID, foreign key to users
  type: string; // e.g., 'embedding_generation', 'skill_pack_import'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'queued';
  progress: number; // 0-100
  metadata?: any; // JSONB
  result?: any; // JSONB
  error_message?: string;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

export interface NewTask {
  user_id: string;
  type: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'queued';
  progress?: number;
  metadata?: any;
}

export type TaskUpdate = Partial<Omit<NewTask, 'user_id' | 'type'>> & {
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'queued';
  progress?: number;
  result?: any;
  error_message?: string;
  completed_at?: Date;
};


export interface Transaction {
  id: string; // UUID
  user_id: string; // UUID, foreign key to users
  type: 'purchase_credits' | 'skill_pack_purchase' | 'usage_fee' | 'refund' | 'bonus';
  amount_credits: number;
  reference_id?: string; // UUID, e.g., skill_pack_id or task_id
  description?: string;
  created_at: Date;
}

export interface NewTransaction {
  user_id: string;
  type: 'purchase_credits' | 'skill_pack_purchase' | 'usage_fee' | 'refund' | 'bonus';
  amount_credits: number;
  reference_id?: string;
  description?: string;
}


export interface ApiKey {
  id: string; // UUID
  user_id: string; // UUID, foreign key to users
  key_hash: string; // Hash of the API key
  name: string;
  last_used_at?: Date;
  expires_at?: Date;
  created_at: Date;
}

export interface NewApiKey {
  user_id: string;
  key_hash: string; // The actual key is hashed before storing
  name: string;
  expires_at?: Date;
}

export type ApiKeyUpdate = Partial<{
  name: string;
  last_used_at: Date;
}>;


export interface SessionSkillPack {
  session_id: string;
  skill_pack_id: string;
}


// For MongoDB skill_pack_contents
export interface SkillPackContentData {
  instructions: string;
  examples: Array<{ input: string; output: string }>;
  templates?: Array<{ name: string; code: string }>;
  knowledge_base_summary?: string;
  prompt_templates?: Array<{ name: string; template: string }>;
}

export interface SkillPackContentDBSchema {
  _id?: any; // MongoDB ObjectId, typically string or ObjectId
  skill_pack_pg_id: string; // Corresponding PostgreSQL skill_pack.id (UUID)
  content: SkillPackContentData;
  version: string;
  // embeddings: Array<number>; // Example, structure might vary based on embedding service
  // chunk_metadata: any; // Metadata related to how content was chunked for embeddings
  created_at: Date;
  updated_at: Date;
}

export interface NewSkillPackContent {
  skill_pack_pg_id: string;
  content: SkillPackContentData;
  version: string;
}

export type SkillPackContentUpdate = Partial<Pick<SkillPackContentDBSchema, 'content' | 'version'>>;
