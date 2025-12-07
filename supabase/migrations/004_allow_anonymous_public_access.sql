-- Allow anonymous users to view public workspaces
-- The anon role is used when no user is logged in

-- Drop and recreate public workspace policies with explicit anonymous access
DROP POLICY IF EXISTS "Users can view public workspaces" ON workspaces;
DROP POLICY IF EXISTS "Anyone can view public workspaces" ON workspaces;

CREATE POLICY "Anyone can view public workspaces"
    ON workspaces FOR SELECT
    TO anon, authenticated
    USING (visibility = 'public');

-- Allow anonymous access to tables in public workspaces
DROP POLICY IF EXISTS "Anyone can view tables in public workspaces" ON tables;

CREATE POLICY "Anyone can view tables in public workspaces"
    ON tables FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE id = tables.workspace_id AND visibility = 'public'
        )
    );

-- Allow anonymous access to notes in public workspaces
DROP POLICY IF EXISTS "Anyone can view notes in public workspaces" ON notes;

CREATE POLICY "Anyone can view notes in public workspaces"
    ON notes FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE id = notes.workspace_id AND visibility = 'public'
        )
    );
