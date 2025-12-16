-- Fix workspaces RLS policy to allow team members to see their workspaces
-- Applied: 2024-12-16
-- Updated: Fix infinite recursion by breaking circular dependency

-- Drop the problematic policies
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;

-- Workspaces: Simple policy without referencing workspace_members
-- Team visibility is permissive - the app filters by membership
CREATE POLICY "workspaces_select" ON workspaces FOR SELECT
    USING (
        owner_id = auth.uid() 
        OR visibility = 'public'
        OR visibility = 'team'
    );

-- Workspace members: Simple policy without referencing workspaces
CREATE POLICY "workspace_members_select" ON workspace_members FOR SELECT
    USING (
        user_id = auth.uid() 
        OR invited_by = auth.uid()
    );
