/**
 * Shared TypeScript types for the Aura application
 * 
 * This file re-exports types from various modules for convenient access.
 * Import from '@/types' instead of individual module paths.
 */

// Re-export table types
export type { Column, Row, ColumnType, SummaryType } from '../components/Table/Table'

// Re-export context types
export type { 
    Workspace, 
    TableItem, 
    NoteItem 
} from '../context/TableContext'

// Re-export database types
export type {
    Json,
    WorkspaceVisibility,
    WorkspaceMemberRole,
    Profile,
    TableRow,
    NoteRow
} from '../lib/database.types'

// Re-export sync service types
export type {
    CloudWorkspace,
    CloudTable,
    CloudNote,
    WorkspaceMember
} from '../services/SyncService'
