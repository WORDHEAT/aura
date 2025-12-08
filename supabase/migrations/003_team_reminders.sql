-- Team Reminders Table
-- Stores reminders that should notify all team members
CREATE TABLE IF NOT EXISTS team_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    table_id TEXT NOT NULL,
    row_id TEXT NOT NULL,
    column_id TEXT NOT NULL,
    title TEXT NOT NULL,
    reminder_time TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ
);

-- Team Notifications Table
-- Stores notifications for team members (for when they're offline)
CREATE TABLE IF NOT EXISTS team_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    reminder_id UUID REFERENCES team_reminders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_reminders_workspace ON team_reminders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_reminders_time ON team_reminders(reminder_time) WHERE is_sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_team_notifications_user ON team_notifications(user_id) WHERE is_read = FALSE;

-- Enable RLS
ALTER TABLE team_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_reminders
-- Users can view reminders for workspaces they have access to
CREATE POLICY "Users can view team reminders for their workspaces"
    ON team_reminders FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM workspaces 
            WHERE owner_id = auth.uid() 
            OR visibility IN ('team', 'public')
        )
    );

-- Users can create reminders in workspaces they own or have team access
CREATE POLICY "Users can create team reminders"
    ON team_reminders FOR INSERT
    WITH CHECK (
        created_by = auth.uid() AND
        workspace_id IN (
            SELECT id FROM workspaces 
            WHERE owner_id = auth.uid() 
            OR visibility IN ('team', 'public')
        )
    );

-- Users can update their own reminders
CREATE POLICY "Users can update own reminders"
    ON team_reminders FOR UPDATE
    USING (created_by = auth.uid());

-- Users can delete their own reminders
CREATE POLICY "Users can delete own reminders"
    ON team_reminders FOR DELETE
    USING (created_by = auth.uid());

-- RLS Policies for team_notifications
-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
    ON team_notifications FOR SELECT
    USING (user_id = auth.uid());

-- Service role can create notifications (for the cron function)
CREATE POLICY "Service can create notifications"
    ON team_notifications FOR INSERT
    WITH CHECK (true);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
    ON team_notifications FOR UPDATE
    USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
    ON team_notifications FOR DELETE
    USING (user_id = auth.uid());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE team_notifications;

-- Function to get team members for a workspace
CREATE OR REPLACE FUNCTION get_workspace_team_members(workspace_uuid UUID)
RETURNS TABLE(user_id UUID, email TEXT) AS $$
BEGIN
    -- For team workspaces, return all users who have accessed this workspace
    -- For now, we return the owner and any user who has synced this workspace
    RETURN QUERY
    SELECT DISTINCT p.id as user_id, p.email
    FROM profiles p
    WHERE p.id IN (
        -- Workspace owner
        SELECT w.owner_id FROM workspaces w WHERE w.id = workspace_uuid
        UNION
        -- Users who have this workspace in their synced data (simplified - returns all authenticated users for team workspaces)
        SELECT au.id FROM auth.users au 
        WHERE EXISTS (
            SELECT 1 FROM workspaces w 
            WHERE w.id = workspace_uuid 
            AND w.visibility IN ('team', 'public')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
