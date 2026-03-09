-- ============================================================================
-- PHASE 4: Chat System Between Professionals
-- Adds conversations, participants and messages tables
-- ============================================================================

BEGIN;

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_patient_id ON conversations (patient_id);

-- Create conversation_participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants (conversation_id);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES users(id),
    content         TEXT NOT NULL,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages (conversation_id, sender_id) WHERE read_at IS NULL;

COMMIT;
