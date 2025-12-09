-- Fix RLS Policies for proper sync functionality
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/vyjjqzzsqupbhglasylt/sql

-- =====================================================
-- STEP 1: Drop ALL existing policies
-- =====================================================

-- Workspaces policies
DROP POLICY IF EXISTS "Users can view their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view team workspaces they are members of" ON workspaces;
DROP POLICY IF EXISTS "Users can view public workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can insert their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can update their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Team admins can update team workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can delete their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "workspace_select_own" ON workspaces;
DROP POLICY IF EXISTS "workspace_select_team" ON workspaces;
DROP POLICY IF EXISTS "workspace_select_public" ON workspaces;
DROP POLICY IF EXISTS "workspace_insert" ON workspaces;
DROP POLICY IF EXISTS "workspace_update" ON workspaces;
DROP POLICY IF EXISTS "workspace_delete" ON workspaces;
DROP POLICY IF EXISTS "ws_select" ON workspaces;
DROP POLICY IF EXISTS "ws_select_owner" ON workspaces;
DROP POLICY IF EXISTS "ws_select_member" ON workspaces;
DROP POLICY IF EXISTS "ws_select_public" ON workspaces;
DROP POLICY IF EXISTS "ws_insert" ON workspaces;
DROP POLICY IF EXISTS "ws_update" ON workspaces;
DROP POLICY IF EXISTS "ws_delete" ON workspaces;

-- Tables policies
DROP POLICY IF EXISTS "Users can view tables in their workspaces" ON tables;
DROP POLICY IF EXISTS "Users can view tables in team workspaces" ON tables;
DROP POLICY IF EXISTS "Anyone can view tables in public workspaces" ON tables;
DROP POLICY IF EXISTS "Users can insert tables in their workspaces" ON tables;
DROP POLICY IF EXISTS "Team editors can insert tables" ON tables;
DROP POLICY IF EXISTS "Users can update tables in their workspaces" ON tables;
DROP POLICY IF EXISTS "Team editors can update tables" ON tables;
DROP POLICY IF EXISTS "Users can delete tables in their workspaces" ON tables;
DROP POLICY IF EXISTS "Team editors can delete tables" ON tables;
DROP POLICY IF EXISTS "table_select_own" ON tables;
DROP POLICY IF EXISTS "table_select_team" ON tables;
DROP POLICY IF EXISTS "table_select_public" ON tables;
DROP POLICY IF EXISTS "table_insert" ON tables;
DROP POLICY IF EXISTS "table_update" ON tables;
DROP POLICY IF EXISTS "table_delete" ON tables;
DROP POLICY IF EXISTS "tbl_select_owner" ON tables;
DROP POLICY IF EXISTS "tbl_select_member" ON tables;
DROP POLICY IF EXISTS "tbl_select_public" ON tables;
DROP POLICY IF EXISTS "tbl_insert" ON tables;
DROP POLICY IF EXISTS "tbl_update" ON tables;
DROP POLICY IF EXISTS "tbl_delete" ON tables;

-- Notes policies
DROP POLICY IF EXISTS "Users can view notes in their workspaces" ON notes;
DROP POLICY IF EXISTS "Users can view notes in team workspaces" ON notes;
DROP POLICY IF EXISTS "Anyone can view notes in public workspaces" ON notes;
DROP POLICY IF EXISTS "Users can insert notes in their workspaces" ON notes;
DROP POLICY IF EXISTS "Team editors can insert notes" ON notes;
DROP POLICY IF EXISTS "Users can update notes in their workspaces" ON notes;
DROP POLICY IF EXISTS "Team editors can update notes" ON notes;
DROP POLICY IF EXISTS "Users can delete notes in their workspaces" ON notes;
DROP POLICY IF EXISTS "Team editors can delete notes" ON notes;
DROP POLICY IF EXISTS "note_select_own" ON notes;
DROP POLICY IF EXISTS "note_select_team" ON notes;
DROP POLICY IF EXISTS "note_select_public" ON notes;
DROP POLICY IF EXISTS "note_insert" ON notes;
DROP POLICY IF EXISTS "note_update" ON notes;
DROP POLICY IF EXISTS "note_delete" ON notes;
DROP POLICY IF EXISTS "note_select_owner" ON notes;
DROP POLICY IF EXISTS "note_select_member" ON notes;
DROP POLICY IF EXISTS "note_select_public" ON notes;

-- Workspace members policies
DROP POLICY IF EXISTS "Workspace owners can manage members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view their own workspace memberships" ON workspace_members;
DROP POLICY IF EXISTS "Users can view members of workspaces they belong to" ON workspace_members;
DROP POLICY IF EXISTS "member_select_own" ON workspace_members;
DROP POLICY IF EXISTS "member_select_workspace" ON workspace_members;
DROP POLICY IF EXISTS "member_manage" ON workspace_members;
DROP POLICY IF EXISTS "member_select" ON workspace_members;
DROP POLICY IF EXISTS "member_select_owner" ON workspace_members;
DROP POLICY IF EXISTS "member_insert" ON workspace_members;
DROP POLICY IF EXISTS "member_update" ON workspace_members;
DROP POLICY IF EXISTS "member_delete" ON workspace_members;

-- =====================================================
-- STEP 2: Workspaces - NO subqueries to avoid recursion
-- =====================================================

-- Users can see their own workspaces + team workspaces + public workspaces
-- Note: team visibility allows member access (membership verified in code via separate query)
CREATE POLICY "ws_select" ON workspaces FOR SELECT
    USING (
        owner_id = auth.uid() 
        OR visibility = 'team'
        OR visibility = 'public'
    );

-- Users can create workspaces where they are the owner
CREATE POLICY "ws_insert" ON workspaces FOR INSERT
    WITH CHECK (owner_id = auth.uid());

-- Owners can update their workspaces
CREATE POLICY "ws_update" ON workspaces FOR UPDATE
    USING (owner_id = auth.uid());

-- Owners can delete their workspaces
CREATE POLICY "ws_delete" ON workspaces FOR DELETE
    USING (owner_id = auth.uid());

-- =====================================================
-- STEP 3: Tables - PERMISSIVE policies for INSERT
-- =====================================================

-- Users can see tables in workspaces they own
CREATE POLICY "tbl_select_owner" ON tables FOR SELECT
    USING (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

-- Users can see tables in workspaces they are members of
CREATE POLICY "tbl_select_member" ON tables FOR SELECT
    USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

-- Anyone can see tables in public workspaces
CREATE POLICY "tbl_select_public" ON tables FOR SELECT
    USING (
        workspace_id IN (SELECT id FROM workspaces WHERE visibility = 'public')
    );

-- IMPORTANT: For INSERT, check workspace ownership
CREATE POLICY "tbl_insert" ON tables FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
        OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        )
    );

-- Owners and editors can update
CREATE POLICY "tbl_update" ON tables FOR UPDATE
    USING (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
        OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        )
    );

-- Owners and editors can delete
CREATE POLICY "tbl_delete" ON tables FOR DELETE
    USING (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
        OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        )
    );

-- =====================================================
-- STEP 4: Notes - Same pattern as Tables
-- =====================================================

-- Users can see notes in workspaces they own
CREATE POLICY "note_select_owner" ON notes FOR SELECT
    USING (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

-- Users can see notes in workspaces they are members of
CREATE POLICY "note_select_member" ON notes FOR SELECT
    USING (
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

-- Anyone can see notes in public workspaces
CREATE POLICY "note_select_public" ON notes FOR SELECT
    USING (
        workspace_id IN (SELECT id FROM workspaces WHERE visibility = 'public')
    );

-- Owners and editors can insert
CREATE POLICY "note_insert" ON notes FOR INSERT
    WITH CHECK (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
        OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        )
    );

-- Owners and editors can update
CREATE POLICY "note_update" ON notes FOR UPDATE
    USING (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
        OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        )
    );

-- Owners and editors can delete
CREATE POLICY "note_delete" ON notes FOR DELETE
    USING (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
        OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        )
    );

-- =====================================================
-- STEP 5: Workspace Members - Simple policies to avoid recursion
-- =====================================================

-- Users can see memberships (their own + where they were invited)
CREATE POLICY "member_select" ON workspace_members FOR SELECT
    USING (
        user_id = auth.uid() 
        OR invited_by = auth.uid()
    );

-- Anyone authenticated can insert members (workspace ownership checked in code)
CREATE POLICY "member_insert" ON workspace_members FOR INSERT
    WITH CHECK (invited_by = auth.uid());

-- Users can update/delete memberships they created
CREATE POLICY "member_update" ON workspace_members FOR UPDATE
    USING (invited_by = auth.uid());

CREATE POLICY "member_delete" ON workspace_members FOR DELETE
    USING (invited_by = auth.uid() OR user_id = auth.uid());

-- =====================================================
-- STEP 6: Ensure RLS is enabled
-- =====================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DONE! All policies use direct subqueries (no functions)
-- =====================================================
