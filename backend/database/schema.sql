-- Firstchapter.ai Database Schema
-- Run this in your Supabase SQL editor

-- Institutions table
CREATE TABLE institutions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  type            TEXT DEFAULT 'university',
  queries_allocated INTEGER DEFAULT 10000,
  queries_used    INTEGER DEFAULT 0,
  subscription_start TIMESTAMPTZ DEFAULT NOW(),
  subscription_end   TIMESTAMPTZ,
  contact_email   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
  id              TEXT PRIMARY KEY,
  email           TEXT UNIQUE NOT NULL,
  institution_id  UUID REFERENCES institutions(id),
  queries_used    INTEGER DEFAULT 0,
  queries_limit   INTEGER DEFAULT 100,
  plan_type       TEXT DEFAULT 'free',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Books table
CREATE TABLE books (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  author          TEXT NOT NULL,
  publisher       TEXT,
  category        TEXT DEFAULT 'General',
  cover_url       TEXT,
  description     TEXT,
  license_type    TEXT DEFAULT 'open',
  status          TEXT DEFAULT 'active',
  total_queries   INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Queries / Chat history table
CREATE TABLE queries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT REFERENCES users(id),
  session_id      UUID NOT NULL,
  question        TEXT NOT NULL,
  answer          TEXT NOT NULL,
  sources         JSONB DEFAULT '[]',
  book_ids        JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Saved answers table
CREATE TABLE saved_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT REFERENCES users(id),
  query_id        UUID REFERENCES queries(id),
  title           TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Share links table
CREATE TABLE share_links (
  id              TEXT PRIMARY KEY,
  query_id        UUID REFERENCES queries(id),
  session_id      UUID,
  created_by      TEXT REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Group sessions table
CREATE TABLE group_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  created_by      TEXT REFERENCES users(id),
  book_ids        JSONB DEFAULT '[]',
  participants    JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_queries_user_id    ON queries(user_id);
CREATE INDEX idx_queries_session_id ON queries(session_id);
CREATE INDEX idx_users_institution  ON users(institution_id);

-- Row Level Security (enable for production)
ALTER TABLE users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
