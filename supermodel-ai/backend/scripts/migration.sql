-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    credits INTEGER DEFAULT 100,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    context_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Can be null for AI messages
    content TEXT NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'ai', 'system')), -- user, ai, or system
    token_count INTEGER,
    model_used VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Skill Packs Table
CREATE TABLE IF NOT EXISTS skill_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    author_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Author can be null or deleted
    version VARCHAR(20) DEFAULT '1.0.0',
    download_count INTEGER DEFAULT 0,
    rating NUMERIC(2, 1) DEFAULT 0.0, -- e.g., 4.5
    price_credits INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    content_hash VARCHAR(64), -- SHA-256 hash of the skill pack content for versioning/integrity
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (name, author_id, version) -- Ensure a user doesn't have duplicate named packs with same version
);

-- User Skill Packs (Junction Table for purchased/acquired skill packs)
CREATE TABLE IF NOT EXISTS user_skill_packs (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skill_pack_id UUID REFERENCES skill_packs(id) ON DELETE CASCADE,
    acquired_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, skill_pack_id)
);

-- Skill Pack Reviews Table
CREATE TABLE IF NOT EXISTS skill_pack_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_pack_id UUID REFERENCES skill_packs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (skill_pack_id, user_id) -- User can only review a skill pack once
);

-- Tasks Table (for background jobs)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Task is associated with a user
    type VARCHAR(50) NOT NULL, -- e.g., 'embedding_generation', 'skill_pack_import', 'model_finetuning'
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'queued')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    metadata JSONB, -- Store task-specific parameters, e.g., { "skill_pack_id": "uuid" }
    result JSONB, -- Store task output upon completion
    error_message TEXT, -- Store error details if the task fails
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('purchase_credits', 'skill_pack_purchase', 'usage_fee', 'refund', 'bonus')),
    amount_credits INTEGER NOT NULL, -- Can be positive (purchase) or negative (usage)
    reference_id UUID, -- e.g., skill_pack_id for a purchase, or task_id for usage fee
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) UNIQUE NOT NULL, -- Store a hash of the API key
    name VARCHAR(100),
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Session Skill Packs (Junction table for skill packs active in a session)
CREATE TABLE IF NOT EXISTS session_skill_packs (
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    skill_pack_id UUID REFERENCES skill_packs(id) ON DELETE CASCADE,
    PRIMARY KEY (session_id, skill_pack_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_skill_packs_author_id ON skill_packs(author_id);
CREATE INDEX IF NOT EXISTS idx_skill_packs_category ON skill_packs(category);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to tables with 'updated_at'
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_sessions
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_skill_packs
BEFORE UPDATE ON skill_packs
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_tasks
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
