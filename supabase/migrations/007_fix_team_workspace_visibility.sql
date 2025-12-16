-- Fix workspaces RLS policy to allow team members to see their workspaces
-- Applied: 2024-12-16

-- Drop existing select policy
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;

-- Create new select policy that includes team member access
CREATE POLICY "workspaces_select" ON workspaces FOR SELECT
    USING (
        owner_id = auth.uid() 
        OR visibility = 'public'
        OR (
            visibility = 'team' 
            AND EXISTS (
                SELECT 1 FROM workspace_members wm 
                WHERE wm.workspace_id = workspaces.id 
                AND wm.user_id = auth.uid()
            )
        )
    );
