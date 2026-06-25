-- Chatify Facebook Webhooks Migration

-- 1. Connected Pages (To store the infinite Page Access Tokens)
CREATE TABLE IF NOT EXISTS connected_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id TEXT UNIQUE NOT NULL,
  page_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Pending Comments (The 2-minute Queue)
CREATE TABLE IF NOT EXISTS pending_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id TEXT NOT NULL REFERENCES connected_pages(page_id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  comment_id TEXT UNIQUE NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED', 'HATER_DELETED')),
  process_after TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Index for the Cron Job to quickly find pending messages
CREATE INDEX IF NOT EXISTS idx_pending_comments_status_time 
ON pending_comments(status, process_after);
