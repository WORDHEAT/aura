import { supabase } from '../lib/supabase'
import type { Workspace, TableItem, NoteItem } from '../context/TableContext'
import type { WorkspaceVisibility, WorkspaceMemberRole } from '../lib/database.types'
import type { Column, Row } from '../components/Table/Table'
import { logger } from '../lib/logger'

export interface CloudWorkspace {
    id: string
    name: string
    owner_id: string
    profile_workspace_id: string | null
    visibility: WorkspaceVisibility
    is_expanded: boolean
    position: number
    created_at: string
    updated_at: string
}

export interface CloudProfileWorkspace {
    id: string
    user_id: string
    name: string
    is_default: boolean
    position: number
    created_at: string
    updated_at: string
}

export interface CloudTable {
    id: string
    workspace_id: string
    name: string
    columns: Column[]
    rows: Row[]
    appearance: TableItem['appearance']
    position: number
    created_at: string
    updated_at: string
}

export interface CloudNote {
    id: string
    workspace_id: string
    name: string
    content: string
    position: number
    created_at: string
    updated_at: string
}

export interface WorkspaceMember {
    id: string
    workspace_id: string
    user_id: string
    role: WorkspaceMemberRole
    invited_by: string | null
    joined_at: string
    profile?: {
        name: string
        email: string
        avatar_url: string | null
    }
}

// Convert cloud workspace to local format
const toLocalWorkspace = (
    cloudWs: CloudWorkspace,
    tables: TableItem[],
    notes: NoteItem[]
): Workspace => ({
    id: cloudWs.id,
    name: cloudWs.name,
    isExpanded: cloudWs.is_expanded,
    tables,
    notes,
    // Extended cloud fields
    ownerId: cloudWs.owner_id,
    visibility: cloudWs.visibility,
    profileWorkspaceId: cloudWs.profile_workspace_id || undefined,
    createdAt: cloudWs.created_at,
    updatedAt: cloudWs.updated_at
})

// Convert local workspace to cloud format
const toCloudWorkspace = (ws: Workspace, ownerId: string, position: number): Omit<CloudWorkspace, 'created_at' | 'updated_at'> => ({
    id: ws.id,
    name: ws.name,
    owner_id: ownerId,
    profile_workspace_id: ws.profileWorkspaceId || null,
    visibility: ws.visibility || 'private',
    is_expanded: ws.isExpanded !== false,
    position
})

export class SyncService {
    private userId: string | null = null
    private lastKnownTimestamps: Map<string, string> = new Map()

    setUserId(userId: string | null) {
        this.userId = userId
        this.lastKnownTimestamps.clear()
    }

    // Track known timestamps for conflict detection
    private trackTimestamp(entityId: string, timestamp: string) {
        this.lastKnownTimestamps.set(entityId, timestamp)
    }

    // Check if cloud version is newer than what we last knew
    async checkTableConflict(tableId: string): Promise<{ hasConflict: boolean; cloudUpdatedAt?: string }> {
        const { data } = await supabase
            .from('tables')
            .select('updated_at')
            .eq('id', tableId)
            .single()
        
        if (!data) return { hasConflict: false }
        
        const lastKnown = this.lastKnownTimestamps.get(tableId)
        if (lastKnown && new Date(data.updated_at) > new Date(lastKnown)) {
            return { hasConflict: true, cloudUpdatedAt: data.updated_at }
        }
        return { hasConflict: false }
    }

    async checkNoteConflict(noteId: string): Promise<{ hasConflict: boolean; cloudUpdatedAt?: string }> {
        const { data } = await supabase
            .from('notes')
            .select('updated_at')
            .eq('id', noteId)
            .single()
        
        if (!data) return { hasConflict: false }
        
        const lastKnown = this.lastKnownTimestamps.get(noteId)
        if (lastKnown && new Date(data.updated_at) > new Date(lastKnown)) {
            return { hasConflict: true, cloudUpdatedAt: data.updated_at }
        }
        return { hasConflict: false }
    }

    // Fetch all workspaces for current user
    async fetchWorkspaces(): Promise<Workspace[]> {
        if (!this.userId) return []

        // Fetch workspaces (owned + member of)
        const { data: ownedWorkspaces, error: ownedError } = await supabase
            .from('workspaces')
            .select('*')
            .eq('owner_id', this.userId)
            .order('position', { ascending: true })

        if (ownedError) {
            console.error('Error fetching owned workspaces:', ownedError)
            throw ownedError
        }

        // Fetch workspace IDs user is a member of (separate query to avoid JOIN RLS issues)
        const { data: memberships, error: memberError } = await supabase
            .from('workspace_members')
            .select('workspace_id, role')
            .eq('user_id', this.userId)

        if (memberError) {
            console.error('Error fetching memberships:', memberError)
        }

        // Fetch those workspaces directly
        let memberWsList: CloudWorkspace[] = []
        if (memberships && memberships.length > 0) {
            const workspaceIds = memberships.map(m => m.workspace_id)
            
            const { data: memberWsData, error: wsError } = await supabase
                .from('workspaces')
                .select('*')
                .in('id', workspaceIds)
            
            if (wsError) {
                console.error('Error fetching member workspaces:', wsError)
            }
            memberWsList = (memberWsData || []) as CloudWorkspace[]
        }

        const allCloudWorkspaces = [
            ...(ownedWorkspaces || []),
            ...memberWsList
        ]

        // Fetch tables and notes for each workspace
        const workspaces: Workspace[] = []
        for (const cloudWs of allCloudWorkspaces) {
            const [tables, notes] = await Promise.all([
                this.fetchTables(cloudWs.id),
                this.fetchNotes(cloudWs.id)
            ])
            workspaces.push(toLocalWorkspace(cloudWs, tables, notes))
        }

        return workspaces
    }

    // Fetch tables for a workspace
    async fetchTables(workspaceId: string): Promise<TableItem[]> {
        const { data, error } = await supabase
            .from('tables')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('position', { ascending: true })

        if (error) {
            console.error('Error fetching tables:', error)
            return []
        }

        return (data || []).map(t => {
            // Track timestamp for conflict detection
            this.trackTimestamp(t.id, t.updated_at)
            return {
                id: t.id,
                name: t.name,
                columns: t.columns as TableItem['columns'],
                rows: t.rows as TableItem['rows'],
                appearance: t.appearance as TableItem['appearance'],
                createdAt: t.created_at,
                updatedAt: t.updated_at
            }
        })
    }

    // Fetch notes for a workspace
    async fetchNotes(workspaceId: string): Promise<NoteItem[]> {
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('position', { ascending: true })

        if (error) {
            console.error('Error fetching notes:', error)
            return []
        }

        return (data || []).map(n => {
            // Track timestamp for conflict detection
            this.trackTimestamp(n.id, n.updated_at)
            return {
                id: n.id,
                name: n.name,
                content: n.content,
                isMonospace: n.is_monospace ?? false,
                wordWrap: n.word_wrap ?? true,
                createdAt: n.created_at,
                updatedAt: n.updated_at
            }
        })
    }

    // Create a new workspace
    async createWorkspace(workspace: Workspace, position: number): Promise<void> {
        if (!this.userId) return

        const { error } = await supabase
            .from('workspaces')
            .insert(toCloudWorkspace(workspace, this.userId, position))

        if (error) {
            console.error('Error creating workspace:', error)
            throw error
        }
    }

    // Update a workspace
    async updateWorkspace(workspace: Workspace, position: number): Promise<void> {
        const { data, error } = await supabase
            .from('workspaces')
            .update({
                name: workspace.name,
                is_expanded: workspace.isExpanded !== false,
                visibility: workspace.visibility || 'private',
                profile_workspace_id: workspace.profileWorkspaceId || null,
                position
            })
            .eq('id', workspace.id)
            .select()

        if (error) {
            console.error('Error updating workspace:', error)
            throw error
        }
        
        // Check if update actually affected a row
        if (!data || data.length === 0) {
            throw new Error('Workspace not found in database')
        }
    }
    
    // Reorder workspaces
    async reorderWorkspaces(workspaceIds: string[]): Promise<void> {
        if (!this.userId) return
        
        const updates = workspaceIds.map((id, index) => 
            supabase
                .from('workspaces')
                .update({ position: index })
                .eq('id', id)
                .eq('owner_id', this.userId)
        )

        await Promise.all(updates)
    }

    // Delete a workspace
    async deleteWorkspace(workspaceId: string): Promise<void> {
        const { error } = await supabase
            .from('workspaces')
            .delete()
            .eq('id', workspaceId)

        if (error) {
            console.error('Error deleting workspace:', error)
            throw error
        }
    }

    // Create or update a table (upsert)
    async createTable(workspaceId: string, table: TableItem, position: number): Promise<void> {
        const { error } = await supabase
            .from('tables')
            .upsert({
                id: table.id,
                workspace_id: workspaceId,
                name: table.name,
                columns: table.columns as unknown,
                rows: table.rows as unknown,
                appearance: table.appearance as unknown,
                position
            }, { onConflict: 'id' })

        if (error) {
            console.error('Error upserting table:', error)
            throw error
        }
    }

    // Update a table (throws if table doesn't exist to trigger creation)
    async updateTable(table: TableItem, position: number): Promise<void> {
        const { data, error } = await supabase
            .from('tables')
            .update({
                name: table.name,
                columns: table.columns as unknown,
                rows: table.rows as unknown,
                appearance: table.appearance as unknown,
                position
            })
            .eq('id', table.id)
            .select('id, updated_at')

        if (error) {
            console.error('Error updating table:', error)
            throw error
        }
        
        // If no rows were updated, the table doesn't exist - throw to trigger creation
        if (!data || data.length === 0) {
            logger.log('📋 Table not found in cloud, will be created')
            throw new Error('Table not found')
        }
        
        // Update tracked timestamp to prevent false conflicts on next push
        if (data[0]?.updated_at) {
            this.trackTimestamp(table.id, data[0].updated_at)
        }
    }

    // Delete a table
    async deleteTable(tableId: string): Promise<void> {
        const { error } = await supabase
            .from('tables')
            .delete()
            .eq('id', tableId)

        if (error) {
            console.error('Error deleting table:', error)
            throw error
        }
    }

    // Reorder tables in workspace
    async reorderTables(workspaceId: string, tableIds: string[]): Promise<void> {
        const updates = tableIds.map((id, index) => 
            supabase
                .from('tables')
                .update({ position: index })
                .eq('id', id)
                .eq('workspace_id', workspaceId)
        )

        await Promise.all(updates)
    }

    // Create or update a note (upsert)
    async createNote(workspaceId: string, note: NoteItem, position: number): Promise<void> {
        const { error } = await supabase
            .from('notes')
            .upsert({
                id: note.id,
                workspace_id: workspaceId,
                name: note.name,
                content: note.content,
                position,
                is_monospace: note.isMonospace ?? false,
                word_wrap: note.wordWrap ?? true
            }, { onConflict: 'id' })

        if (error) {
            console.error('Error upserting note:', error)
            throw error
        }
    }

    // Update a note (throws if note doesn't exist to trigger creation)
    async updateNote(note: NoteItem, position: number): Promise<void> {
        // First try to update
        const { data, error: updateError } = await supabase
            .from('notes')
            .update({
                name: note.name,
                content: note.content,
                position,
                is_monospace: note.isMonospace ?? false,
                word_wrap: note.wordWrap ?? true
            })
            .eq('id', note.id)
            .select('id, updated_at')

        if (updateError) {
            console.error('Error updating note:', updateError)
            throw updateError
        }
        
        // If no rows were updated, the note doesn't exist - need to create it
        if (!data || data.length === 0) {
            logger.log('📝 Note not found in cloud, will be created on next full sync')
            // Throw to trigger creation in the calling code
            throw new Error('Note not found')
        }
        
        // Update tracked timestamp to prevent false conflicts on next push
        if (data[0]?.updated_at) {
            this.trackTimestamp(note.id, data[0].updated_at)
        }
    }

    // Delete a note
    async deleteNote(noteId: string): Promise<void> {
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', noteId)

        if (error) {
            console.error('Error deleting note:', error)
            throw error
        }
    }

    // Reorder notes in workspace
    async reorderNotes(workspaceId: string, noteIds: string[]): Promise<void> {
        const updates = noteIds.map((id, index) => 
            supabase
                .from('notes')
                .update({ position: index })
                .eq('id', id)
                .eq('workspace_id', workspaceId)
        )

        await Promise.all(updates)
    }

    // Move table to another workspace
    async moveTable(tableId: string, toWorkspaceId: string): Promise<void> {
        const { error } = await supabase
            .from('tables')
            .update({ workspace_id: toWorkspaceId })
            .eq('id', tableId)

        if (error) {
            console.error('Error moving table:', error)
            throw error
        }
    }

    // Move note to another workspace
    async moveNote(noteId: string, toWorkspaceId: string): Promise<void> {
        const { error } = await supabase
            .from('notes')
            .update({ workspace_id: toWorkspaceId })
            .eq('id', noteId)

        if (error) {
            console.error('Error moving note:', error)
            throw error
        }
    }

    // ============ TEAM FEATURES ============

    // Get workspace members
    async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
        const { data, error } = await supabase
            .from('workspace_members')
            .select(`
                *,
                profile:profiles!user_id (name, email, avatar_url)
            `)
            .eq('workspace_id', workspaceId)

        if (error) {
            console.error('Error fetching members:', error)
            return []
        }

        return (data || []).map(m => ({
            ...m,
            profile: m.profile as WorkspaceMember['profile']
        }))
    }

    // Invite user to workspace
    async inviteToWorkspace(
        workspaceId: string, 
        userEmail: string, 
        role: WorkspaceMemberRole = 'viewer'
    ): Promise<{ success: boolean; error?: string }> {
        // Find user by email
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', userEmail)
            .single()

        if (profileError || !profile) {
            return { success: false, error: 'User not found' }
        }

        // Add as member
        const { error } = await supabase
            .from('workspace_members')
            .insert({
                workspace_id: workspaceId,
                user_id: profile.id,
                role,
                invited_by: this.userId
            })

        if (error) {
            if (error.code === '23505') {
                return { success: false, error: 'User is already a member' }
            }
            return { success: false, error: error.message }
        }

        return { success: true }
    }

    // Remove member from workspace
    async removeMember(workspaceId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('workspace_members')
            .delete()
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)

        if (error) {
            console.error('Error removing member:', error)
            throw error
        }
    }

    // Update member role
    async updateMemberRole(workspaceId: string, userId: string, role: WorkspaceMemberRole): Promise<void> {
        const { error } = await supabase
            .from('workspace_members')
            .update({ role })
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)

        if (error) {
            console.error('Error updating member role:', error)
            throw error
        }
    }

    // Change workspace visibility
    async setWorkspaceVisibility(workspaceId: string, visibility: WorkspaceVisibility): Promise<void> {
        const { error } = await supabase
            .from('workspaces')
            .update({ visibility })
            .eq('id', workspaceId)

        if (error) {
            console.error('Error updating visibility:', error)
            throw error
        }
    }

    // ============ SHARE LINKS ============

    // Generate a random token
    private generateToken(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        let token = ''
        for (let i = 0; i < 32; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return token
    }

    // Create a share link
    async createShareLink(
        workspaceId: string,
        options: {
            expiresIn?: number // hours, null = never
            allowEdit?: boolean
        } = {}
    ): Promise<{ token: string; expiresAt: string | null }> {
        if (!this.userId) throw new Error('Not authenticated')

        const token = this.generateToken()
        const expiresAt = options.expiresIn 
            ? new Date(Date.now() + options.expiresIn * 60 * 60 * 1000).toISOString()
            : null

        const { error } = await supabase
            .from('workspace_share_links')
            .insert({
                workspace_id: workspaceId,
                token,
                created_by: this.userId,
                expires_at: expiresAt,
                allow_edit: options.allowEdit || false
            })

        if (error) {
            console.error('Error creating share link:', error)
            throw error
        }

        return { token, expiresAt }
    }

    // Get share links for a workspace
    async getShareLinks(workspaceId: string): Promise<ShareLink[]> {
        const { data, error } = await supabase
            .from('workspace_share_links')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching share links:', error)
            return []
        }

        return (data || []).map(link => ({
            id: link.id,
            token: link.token,
            expiresAt: link.expires_at,
            isActive: link.is_active,
            allowEdit: link.allow_edit,
            createdAt: link.created_at,
            lastUsedAt: link.last_used_at
        }))
    }

    // Deactivate (revoke) a share link
    async revokeShareLink(linkId: string): Promise<void> {
        const { error } = await supabase
            .from('workspace_share_links')
            .update({ is_active: false })
            .eq('id', linkId)

        if (error) {
            console.error('Error revoking share link:', error)
            throw error
        }
    }

    // Delete a share link permanently
    async deleteShareLink(linkId: string): Promise<void> {
        const { error } = await supabase
            .from('workspace_share_links')
            .delete()
            .eq('id', linkId)

        if (error) {
            console.error('Error deleting share link:', error)
            throw error
        }
    }

    // Validate a share link (for accessing shared workspace)
    async validateShareLink(token: string): Promise<{
        valid: boolean
        workspaceId?: string
        allowEdit?: boolean
    }> {
        const { data, error } = await supabase
            .from('workspace_share_links')
            .select('workspace_id, allow_edit, is_active, expires_at')
            .eq('token', token)
            .single()

        if (error || !data) {
            return { valid: false }
        }

        // Check if active and not expired
        const isExpired = data.expires_at && new Date(data.expires_at) < new Date()
        if (!data.is_active || isExpired) {
            return { valid: false }
        }

        // Update last used
        await supabase
            .from('workspace_share_links')
            .update({ last_used_at: new Date().toISOString() })
            .eq('token', token)

        return {
            valid: true,
            workspaceId: data.workspace_id,
            allowEdit: data.allow_edit
        }
    }

    // ============ PROFILE WORKSPACES ============

    async fetchProfileWorkspaces(): Promise<CloudProfileWorkspace[]> {
        if (!this.userId) return []

        const { data, error } = await supabase
            .from('profile_workspaces')
            .select('*')
            .eq('user_id', this.userId)
            .order('position', { ascending: true })

        if (error) {
            console.error('Error fetching profile workspaces:', error)
            return []
        }

        return data || []
    }

    async createProfileWorkspace(profileWorkspace: { id: string; name: string; isDefault: boolean }, position: number): Promise<void> {
        if (!this.userId) throw new Error('Not authenticated')

        const { error } = await supabase
            .from('profile_workspaces')
            .insert({
                id: profileWorkspace.id,
                user_id: this.userId,
                name: profileWorkspace.name,
                is_default: profileWorkspace.isDefault,
                position
            })

        if (error) throw error
        logger.log('✅ Profile workspace created:', profileWorkspace.id)
    }

    async updateProfileWorkspace(profileWorkspace: { id: string; name: string; isDefault: boolean }, position: number): Promise<void> {
        if (!this.userId) throw new Error('Not authenticated')

        const { error } = await supabase
            .from('profile_workspaces')
            .update({
                name: profileWorkspace.name,
                is_default: profileWorkspace.isDefault,
                position
            })
            .eq('id', profileWorkspace.id)
            .eq('user_id', this.userId)

        if (error) throw error
        logger.log('✅ Profile workspace updated:', profileWorkspace.id)
    }

    async deleteProfileWorkspace(id: string): Promise<void> {
        if (!this.userId) throw new Error('Not authenticated')

        const { error } = await supabase
            .from('profile_workspaces')
            .delete()
            .eq('id', id)
            .eq('user_id', this.userId)

        if (error) throw error
        logger.log('🗑️ Profile workspace deleted:', id)
    }

    // ============ USER SETTINGS ============

    async fetchSettings(): Promise<Record<string, unknown> | null> {
        if (!this.userId) return null

        const { data, error } = await supabase
            .from('profiles')
            .select('settings')
            .eq('id', this.userId)
            .single()

        if (error) {
            console.error('Error fetching settings:', error)
            return null
        }

        return data?.settings || {}
    }

    async updateSettings(settings: Record<string, unknown>): Promise<void> {
        if (!this.userId) throw new Error('Not authenticated')

        const { error } = await supabase
            .from('profiles')
            .update({ settings })
            .eq('id', this.userId)

        if (error) throw error
        logger.log('✅ Settings synced to cloud')
    }
}

// Share link type for UI
export interface ShareLink {
    id: string
    token: string
    expiresAt: string | null
    isActive: boolean
    allowEdit: boolean
    createdAt: string
    lastUsedAt: string | null
}

// Singleton instance
export const syncService = new SyncService()
