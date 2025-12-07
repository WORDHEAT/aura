-- Migration: Fix team invite and public sharing
-- Run this in Supabase SQL Editor

-- ============================================
-- FIX 1: Allow authenticated users to lookup profiles by email (for invites)
-- ============================================
CREATE POLICY "Authenticated users can lookup profiles by email"
    ON profiles FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- ============================================
-- FIX 2: Allow workspace members to view the member list
-- (already exists but ensure it's there)
-- ============================================
-- Already covered by "Users can view members of workspaces they belong to"

-- ============================================
-- FIX 3: Ensure tables/notes policies allow public workspace access
-- ============================================

-- Tables in public workspaces
CREATE POLICY "Anyone can view tables in public workspaces"
    ON tables FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE id = tables.workspace_id AND visibility = 'public'
        )
    );

-- Notes in public workspaces  
CREATE POLICY "Anyone can view notes in public workspaces"
    ON notes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE id = notes.workspace_id AND visibility = 'public'
        )
    );

-- ============================================
-- VERIFICATION: Check policies are applied
-- ============================================
-- Run this to verify:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
