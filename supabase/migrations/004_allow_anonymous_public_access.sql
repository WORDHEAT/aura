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

-- ============ SHARE LINKS POLICIES ============

-- Allow anyone to validate share links
DROP POLICY IF EXISTS "Anyone can validate share links" ON workspace_share_links;
CREATE POLICY "Anyone can validate share links"
    ON workspace_share_links FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

-- Allow anyone to update last_used_at on share links
DROP POLICY IF EXISTS "Anyone can update share link usage" ON workspace_share_links;
CREATE POLICY "Anyone can update share link usage"
    ON workspace_share_links FOR UPDATE
    TO anon, authenticated
    USING (is_active = true)
    WITH CHECK (is_active = true);

-- Allow access to workspaces via valid share links
DROP POLICY IF EXISTS "Anyone can view workspaces via share link" ON workspaces;
CREATE POLICY "Anyone can view workspaces via share link"
    ON workspaces FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspace_share_links
            WHERE workspace_id = workspaces.id
            AND is_active = true
            AND (expires_at IS NULL OR expires_at > NOW())
        )
    );

-- Allow access to tables via valid share links
DROP POLICY IF EXISTS "Anyone can view tables via share link" ON tables;
CREATE POLICY "Anyone can view tables via share link"
    ON tables FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspace_share_links
            WHERE workspace_id = tables.workspace_id
            AND is_active = true
            AND (expires_at IS NULL OR expires_at > NOW())
        )
    );

-- Allow access to notes via valid share links
DROP POLICY IF EXISTS "Anyone can view notes via share link" ON notes;
CREATE POLICY "Anyone can view notes via share link"
    ON notes FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspace_share_links
            WHERE workspace_id = notes.workspace_id
            AND is_active = true
            AND (expires_at IS NULL OR expires_at > NOW())
        )
    );
