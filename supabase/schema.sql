-- Aura Database Schema for Supabase
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/vyjjqzzsqupbhglasylt/sql)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE workspace_visibility AS ENUM ('private', 'team', 'public');
CREATE TYPE workspace_member_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    telegram_chat_id TEXT,
    timezone TEXT DEFAULT 'UTC',
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profile workspaces table (top-level containers for organizing workspaces)
CREATE TABLE IF NOT EXISTS profile_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    profile_workspace_id UUID REFERENCES profile_workspaces(id) ON DELETE SET NULL,
    visibility workspace_visibility DEFAULT 'private',
    is_expanded BOOLEAN DEFAULT true,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace members table (for team workspaces)
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role workspace_member_role DEFAULT 'viewer',
    invited_by UUID REFERENCES profiles(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Tables table (stores table data within workspaces)
CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    columns JSONB DEFAULT '[]'::jsonb,
    rows JSONB DEFAULT '[]'::jsonb,
    appearance JSONB,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes table (stores notes within workspaces)
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT DEFAULT '',
    position INTEGER DEFAULT 0,
    is_monospace BOOLEAN DEFAULT false,
    word_wrap BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_profile ON workspaces(profile_workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tables_workspace ON tables(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notes_workspace ON notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_profile_workspaces_user ON profile_workspaces(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Authenticated users can lookup profiles by email"
    ON profiles FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Profile workspaces policies
CREATE POLICY "Users can view their own profile workspaces"
    ON profile_workspaces FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile workspaces"
    ON profile_workspaces FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile workspaces"
    ON profile_workspaces FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own profile workspaces"
    ON profile_workspaces FOR DELETE
    USING (user_id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Workspaces policies
CREATE POLICY "Users can view their own workspaces"
    ON workspaces FOR SELECT
    USING (owner_id = auth.uid());

CREATE POLICY "Users can view team workspaces they are members of"
    ON workspaces FOR SELECT
    USING (
        visibility = 'team' AND
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = workspaces.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view public workspaces"
    ON workspaces FOR SELECT
    USING (visibility = 'public');

CREATE POLICY "Users can insert their own workspaces"
    ON workspaces FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own workspaces"
    ON workspaces FOR UPDATE
    USING (owner_id = auth.uid());

CREATE POLICY "Team admins can update team workspaces"
    ON workspaces FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = workspaces.id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can delete their own workspaces"
    ON workspaces FOR DELETE
    USING (owner_id = auth.uid());

-- Workspace members policies
CREATE POLICY "Workspace owners can manage members"
    ON workspace_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE id = workspace_members.workspace_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own workspace memberships"
    ON workspace_members FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can view members of workspaces they belong to"
    ON workspace_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid()
        )
    );

-- Tables policies
CREATE POLICY "Users can view tables in their workspaces"
    ON tables FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE id = tables.workspace_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view tables in team workspaces"
    ON tables FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = tables.workspace_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can view tables in public workspaces"
    ON tables FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE id = tables.workspace_id AND visibility = 'public'
        )
    );

CREATE POLICY "Users can insert tables in their workspaces"
    ON tables FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE id = tables.workspace_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Team editors can insert tables"
    ON tables FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = tables.workspace_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'editor')
        )
    );

CREATE POLICY "Users can update tables in their workspaces"
    ON tables FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE id = tables.workspace_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Team editors can update tables"
    ON tables FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = tables.workspace_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'editor')
        )
    );

CREATE POLICY "Users can delete tables in their workspaces"
    ON tables FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE id = tables.workspace_id AND owner_id = auth.uid()
        )
    );

-- Notes policies (same as tables)
CREATE POLICY "Users can view notes in their workspaces"
    ON notes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE id = notes.workspace_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view notes in team workspaces"
    ON notes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = notes.workspace_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can view notes in public workspaces"
    ON notes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE id = notes.workspace_id AND visibility = 'public'
        )
    );

CREATE POLICY "Users can insert notes in their workspaces"
    ON notes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE id = notes.workspace_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Team editors can insert notes"
    ON notes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = notes.workspace_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'editor')
        )
    );

CREATE POLICY "Users can update notes in their workspaces"
    ON notes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE id = notes.workspace_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Team editors can update notes"
    ON notes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_id = notes.workspace_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'editor')
        )
    );

CREATE POLICY "Users can delete notes in their workspaces"
    ON notes FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE id = notes.workspace_id AND owner_id = auth.uid()
        )
    );

-- Workspace share links table (for public/expiring links)
CREATE TABLE IF NOT EXISTS workspace_share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    expires_at TIMESTAMPTZ,  -- NULL = never expires
    is_active BOOLEAN DEFAULT true,
    allow_edit BOOLEAN DEFAULT false,  -- false = view only, true = can edit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_share_links_token ON workspace_share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_workspace ON workspace_share_links(workspace_id);

-- RLS for share links
ALTER TABLE workspace_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners can manage share links"
    ON workspace_share_links FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE id = workspace_share_links.workspace_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can view active share links by token"
    ON workspace_share_links FOR SELECT
    USING (
        is_active = true 
        AND (expires_at IS NULL OR expires_at > NOW())
    );

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tables_updated_at
    BEFORE UPDATE ON tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============ REALTIME ============
-- Enable realtime for sync across devices
-- Run this in Supabase Dashboard: Database → Replication → Enable for these tables:
-- workspaces, tables, notes, profile_workspaces

-- Or run these SQL commands (ignore errors if tables already in publication):
-- ALTER PUBLICATION supabase_realtime ADD TABLE workspaces;
-- ALTER PUBLICATION supabase_realtime ADD TABLE tables;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notes;
-- ALTER PUBLICATION supabase_realtime ADD TABLE profile_workspaces;
