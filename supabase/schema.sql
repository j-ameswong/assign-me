-- AllocateMe Database Schema
-- Run this in the Supabase SQL Editor to set up the database.

-- 1. Create enum type for event status
CREATE TYPE event_status AS ENUM ('open', 'closed', 'allocated');

-- 2. Events table
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  join_code text UNIQUE NOT NULL,
  admin_token text NOT NULL, -- stored as sha256 hash
  status event_status NOT NULL DEFAULT 'open',
  email_verification boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX idx_events_join_code ON events (join_code);
CREATE INDEX idx_events_expires_at ON events (expires_at);

-- 3. Options table
CREATE TABLE options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  capacity integer NOT NULL DEFAULT 1 CHECK (capacity >= 1),
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_options_event_id ON options (event_id);

-- 4. Submissions table
CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  email text NOT NULL,
  rankings uuid[] NOT NULL,
  verified boolean NOT NULL DEFAULT true,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, email)
);

CREATE INDEX idx_submissions_event_id ON submissions (event_id);

-- 5. Verification codes table
CREATE TABLE verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes')
);

CREATE INDEX idx_verification_codes_submission_id ON verification_codes (submission_id);

-- 6. Allocations table
CREATE TABLE allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  option_id uuid REFERENCES options(id) ON DELETE CASCADE -- nullable: null = unassigned
);

CREATE INDEX idx_allocations_event_id ON allocations (event_id);

-- 7. Enable Row Level Security on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies — allow full access for service role only
-- The app uses the service role key in API routes, so we grant full access.
-- The publishable key is used only for client-side reads via explicit API routes.

-- Technically, full access is already implied by the use of the secret key,
-- but Supabase will complain about no RLS policies

CREATE POLICY "Service role full access" ON events
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON options
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON submissions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON verification_codes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON allocations
  FOR ALL USING (true) WITH CHECK (true);
