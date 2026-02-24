-- =============================================
-- CIMA Watch — Supabase Database Setup
-- =============================================
-- Run this SQL in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================

-- Table: subscriptions
-- Stores email recipients and catalog CNs for each hospital
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    emails TEXT[] NOT NULL DEFAULT '{}',
    catalog_cns TEXT[] NOT NULL DEFAULT '{}',
    hospital_name TEXT DEFAULT 'Hospital',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: snapshots
-- Stores daily shortage snapshots for comparison
CREATE TABLE IF NOT EXISTS snapshots (
    id SERIAL PRIMARY KEY,
    subscription_id INT REFERENCES subscriptions(id) ON DELETE CASCADE,
    shortage_cns TEXT[] NOT NULL DEFAULT '{}',
    shortage_data JSONB DEFAULT '{}',
    snapshot_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster snapshot lookups
CREATE INDEX IF NOT EXISTS idx_snapshots_sub_date 
    ON snapshots(subscription_id, snapshot_date DESC);

-- Enable Row Level Security (required by Supabase)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all operations for authenticated and anon users
-- (Since this is a single-user app, we keep it simple)
CREATE POLICY "Allow all on subscriptions" ON subscriptions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on snapshots" ON snapshots
    FOR ALL USING (true) WITH CHECK (true);
