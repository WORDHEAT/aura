-- Migration: Add profile_workspaces table and settings to profiles
-- Run this in Supabase SQL Editor to add cloud sync for profiles and settings

-- Add settings column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Create profile_workspaces table
CREATE TABLE IF NOT EXISTS profile_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add profile_workspace_id to workspaces if it doesn't exist
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS profile_workspace_id UUID REFERENCES profile_workspaces(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profile_workspaces_user ON profile_workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_profile ON workspaces(profile_workspace_id);

-- Enable RLS
ALTER TABLE profile_workspaces ENABLE ROW LEVEL SECURITY;

-- RLS policies for profile_workspaces
DROP POLICY IF EXISTS "Users can view their own profile workspaces" ON profile_workspaces;
CREATE POLICY "Users can view their own profile workspaces"
    ON profile_workspaces FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own profile workspaces" ON profile_workspaces;
CREATE POLICY "Users can insert their own profile workspaces"
    ON profile_workspaces FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile workspaces" ON profile_workspaces;
CREATE POLICY "Users can update their own profile workspaces"
    ON profile_workspaces FOR UPDATE
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own profile workspaces" ON profile_workspaces;
CREATE POLICY "Users can delete their own profile workspaces"
    ON profile_workspaces FOR DELETE
    USING (user_id = auth.uid());

-- Add updated_at trigger for profile_workspaces
CREATE TRIGGER update_profile_workspaces_updated_at
    BEFORE UPDATE ON profile_workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add profile_workspaces to realtime (optional - skip if errors occur)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE profile_workspaces;
            RAISE NOTICE 'Added profile_workspaces to supabase_realtime publication';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE 'profile_workspaces already in publication';
        END;
    END IF;
END $$;
