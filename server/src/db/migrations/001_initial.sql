-- Users
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    username        VARCHAR(100) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- API Configuration (per user)
CREATE TABLE IF NOT EXISTS api_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    api_key_encrypted TEXT,
    selected_model  VARCHAR(255) DEFAULT 'meta-llama/llama-3.3-70b-instruct:free',
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Characters
CREATE TABLE IF NOT EXISTS characters (
    id              VARCHAR(100) PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    class           VARCHAR(50) NOT NULL,
    race            VARCHAR(50) NOT NULL,
    level           INTEGER DEFAULT 1,
    data            JSONB NOT NULL,
    is_active       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_characters_user ON characters(user_id);

-- Adventures
CREATE TABLE IF NOT EXISTS adventures (
    id              VARCHAR(100) PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    filename        VARCHAR(500),
    text            TEXT,
    pages           VARCHAR(20),
    char_count      INTEGER DEFAULT 0,
    structure       JSONB,
    added_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_adventures_user ON adventures(user_id);

-- Game Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id              VARCHAR(100) PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    character_id    VARCHAR(100) REFERENCES characters(id) ON DELETE SET NULL,
    adventure_id    VARCHAR(100) REFERENCES adventures(id) ON DELETE SET NULL,
    game_log        JSONB DEFAULT '[]'::jsonb,
    combat          JSONB,
    scene_state     JSONB,
    is_active       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Partial unique indexes: at most one active character / session per user
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_one_active_char') THEN
        CREATE UNIQUE INDEX idx_one_active_char ON characters(user_id) WHERE is_active = TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_one_active_session') THEN
        CREATE UNIQUE INDEX idx_one_active_session ON sessions(user_id) WHERE is_active = TRUE;
    END IF;
END $$;
