// Database types for Supabase
// These will be auto-generated once tables are created, but we define them manually for now

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type WorkspaceVisibility = 'private' | 'team' | 'public'
export type WorkspaceMemberRole = 'owner' | 'admin' | 'editor' | 'viewer'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          telegram_chat_id: string | null
          timezone: string
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          telegram_chat_id?: string | null
          timezone?: string
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          telegram_chat_id?: string | null
          timezone?: string
          settings?: Json
          updated_at?: string
        }
      }
      workspaces: {
        Row: {
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
        Insert: {
          id?: string
          name: string
          owner_id: string
          profile_workspace_id?: string | null
          visibility?: WorkspaceVisibility
          is_expanded?: boolean
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          profile_workspace_id?: string | null
          visibility?: WorkspaceVisibility
          is_expanded?: boolean
          position?: number
          updated_at?: string
        }
      }
      profile_workspaces: {
        Row: {
          id: string
          user_id: string
          name: string
          is_default: boolean
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          is_default?: boolean
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          is_default?: boolean
          position?: number
          updated_at?: string
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: WorkspaceMemberRole
          invited_by: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: WorkspaceMemberRole
          invited_by?: string | null
          joined_at?: string
        }
        Update: {
          role?: WorkspaceMemberRole
        }
      }
      tables: {
        Row: {
          id: string
          workspace_id: string
          name: string
          columns: Json
          rows: Json
          appearance: Json | null
          position: number
          is_archived: boolean
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          columns?: Json
          rows?: Json
          appearance?: Json | null
          position?: number
          is_archived?: boolean
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          columns?: Json
          rows?: Json
          appearance?: Json | null
          position?: number
          is_archived?: boolean
          archived_at?: string | null
          updated_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          workspace_id: string
          name: string
          content: string
          position: number
          is_monospace: boolean
          word_wrap: boolean
          spell_check: boolean
          is_archived: boolean
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          content?: string
          position?: number
          is_monospace?: boolean
          word_wrap?: boolean
          spell_check?: boolean
          is_archived?: boolean
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          content?: string
          position?: number
          is_monospace?: boolean
          word_wrap?: boolean
          spell_check?: boolean
          is_archived?: boolean
          archived_at?: string | null
          updated_at?: string
        }
      }
      workspace_share_links: {
        Row: {
          id: string
          workspace_id: string
          token: string
          created_by: string
          expires_at: string | null
          is_active: boolean
          allow_edit: boolean
          created_at: string
          last_used_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          token: string
          created_by: string
          expires_at?: string | null
          is_active?: boolean
          allow_edit?: boolean
          created_at?: string
          last_used_at?: string | null
        }
        Update: {
          is_active?: boolean
          allow_edit?: boolean
          last_used_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      workspace_visibility: WorkspaceVisibility
      workspace_member_role: WorkspaceMemberRole
    }
  }
}

// Share link type
export interface WorkspaceShareLink {
  id: string
  workspace_id: string
  token: string
  created_by: string
  expires_at: string | null
  is_active: boolean
  allow_edit: boolean
  created_at: string
  last_used_at: string | null
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Workspace = Database['public']['Tables']['workspaces']['Row']
export type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row']
export type TableRow = Database['public']['Tables']['tables']['Row']
export type NoteRow = Database['public']['Tables']['notes']['Row']
