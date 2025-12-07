-- Working RLS Policies (as of Dec 2025)
-- This file documents the ACTUAL working policies in production
-- The original schema.sql has circular dependencies that cause infinite recursion

-- ============================================
-- IMPORTANT: These policies REPLACE the ones in schema.sql
-- The key fix is that workspace_members policies do NOT reference workspaces
-- ============================================

-- WORKSPACE_MEMBERS POLICIES (simple, no circular references)
-- DROP existing problematic policies first:
-- DROP POLICY IF EXISTS "Workspace owners can manage members" ON workspace_members;
-- DROP POLICY IF EXISTS "members_select" ON workspace_members;
-- DROP POLICY IF EXISTS "members_insert" ON workspace_members;
-- DROP POLICY IF EXISTS "members_update" ON workspace_members;
-- DROP POLICY IF EXISTS "members_delete" ON workspace_members;

-- CREATE POLICY "Users can view their memberships"
--     ON workspace_members FOR SELECT
--     USING (user_id = auth.uid() OR invited_by = auth.uid());

-- CREATE POLICY "Users can manage memberships they created"
--     ON workspace_members FOR ALL
--     USING (invited_by = auth.uid());

-- WORKSPACES POLICIES (now safe to reference workspace_members)
-- CREATE POLICY "Team members can view workspaces"
--     ON workspaces FOR SELECT
--     USING (
--         id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
--     );

-- TABLES POLICIES FOR TEAM MEMBERS
-- CREATE POLICY "Team members can insert tables"
--     ON tables FOR INSERT
--     WITH CHECK (
--         workspace_id IN (
--             SELECT workspace_id FROM workspace_members 
--             WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
--         )
--     );

-- CREATE POLICY "Team members can update tables"
--     ON tables FOR UPDATE
--     USING (
--         workspace_id IN (
--             SELECT workspace_id FROM workspace_members 
--             WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
--         )
--     );

-- CREATE POLICY "Team members can delete tables"
--     ON tables FOR DELETE
--     USING (
--         workspace_id IN (
--             SELECT workspace_id FROM workspace_members 
--             WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
--         )
--     );

-- NOTES POLICIES FOR TEAM MEMBERS (same pattern)
-- CREATE POLICY "Team members can insert notes"
--     ON notes FOR INSERT
--     WITH CHECK (
--         workspace_id IN (
--             SELECT workspace_id FROM workspace_members 
--             WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
--         )
--     );

-- CREATE POLICY "Team members can update notes"
--     ON notes FOR UPDATE
--     USING (
--         workspace_id IN (
--             SELECT workspace_id FROM workspace_members 
--             WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
--         )
--     );

-- CREATE POLICY "Team members can delete notes"
--     ON notes FOR DELETE
--     USING (
--         workspace_id IN (
--             SELECT workspace_id FROM workspace_members 
--             WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
--         )
--     );

-- PROFILES POLICY (allows lookup by email for invites)
-- CREATE POLICY "Authenticated users can lookup profiles by email"
--     ON profiles FOR SELECT
--     USING (auth.uid() IS NOT NULL);
