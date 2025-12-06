import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import type { Column, Row } from '../components/Table/Table'
import { useAuth } from './AuthContext'
import { syncService } from '../services/SyncService'
import { supabase } from '../lib/supabase'
import { updateRowInTree, deleteRowFromTree, addSiblingToTree, addChildToRowInTree } from '../utils/treeUtils'

// A single table within a workspace
export interface TableItem {
    id: string
    name: string
    columns: Column[]
    rows: Row[]
    createdAt?: string
    updatedAt?: string
    // Per-table appearance settings (undefined = use global)
    appearance?: {
        compactMode?: boolean
        showGridLines?: boolean
        zebraStriping?: boolean
    }
}

// A note within a workspace
export interface NoteItem {
    id: string
    name: string
    content: string
    createdAt: string
    updatedAt: string
    isMonospace?: boolean  // Toggle for code mode
    wordWrap?: boolean
}

// Union type for workspace items
export type WorkspaceItem = 
    | { type: 'table'; id: string }
    | { type: 'note'; id: string }

// Workspace visibility for cloud sync
export type WorkspaceVisibility = 'private' | 'team' | 'public'

// A workspace containing tables and notes
export interface Workspace {
    id: string
    name: string
    createdAt: string
    tables: TableItem[]
    notes: NoteItem[]
    isExpanded?: boolean
    // Cloud sync fields (optional - only present when synced)
    ownerId?: string
    visibility?: WorkspaceVisibility
    updatedAt?: string
    isSynced?: boolean
}

// Legacy support - alias for compatibility
export type TableData = TableItem & { createdAt?: string }

interface TableContextType {
    workspaces: Workspace[]
    currentWorkspaceId: string
    currentTableId: string
    currentNoteId: string | null
    currentItemType: 'table' | 'note'
    currentWorkspace: Workspace
    currentTable: TableItem
    currentNote: NoteItem | null
    selectedTableIds: string[]
    // Workspace operations
    createWorkspace: (name: string) => void
    deleteWorkspace: (id: string) => void
    renameWorkspace: (id: string, name: string) => void
    toggleWorkspaceExpanded: (id: string) => void
    reorderWorkspaces: (newWorkspaces: Workspace[]) => void
    // Table operations within workspace
    createTable: (workspaceId: string, name: string) => void
    duplicateTable: (workspaceId: string, tableId: string, withContent?: boolean) => void
    deleteTable: (workspaceId: string, tableId: string) => void
    renameTable: (tableId: string, name: string) => void
    reorderTablesInWorkspace: (workspaceId: string, tableIds: string[]) => void
    moveTableToWorkspace: (tableId: string, fromWorkspaceId: string, toWorkspaceId: string) => Promise<void>
    switchTable: (workspaceId: string, tableId: string) => void
    toggleTableSelection: (tableId: string) => void
    setSelectedTables: (ids: string[]) => void
    updateTable: (data: { columns: Column[]; rows: Row[] }) => void
    updateTableById: (id: string, data: { columns: Column[]; rows: Row[] }) => void
    updateTableColumns: (id: string, columns: Column[]) => void
    updateTableAppearance: (tableId: string, appearance: Partial<TableItem['appearance']>) => void
    updateTableCell: (tableId: string, rowId: string, colId: string, value: string) => void
    updateTableCellColor: (tableId: string, rowId: string, colId: string, color: string) => void
    updateTableRowColor: (tableId: string, rowId: string, color: string) => void
    deleteTableRow: (tableId: string, rowId: string) => void
    addTableRowSibling: (tableId: string, siblingId: string) => void
    addTableRowChild: (tableId: string, parentId: string) => void
    addTableRow: (tableId: string) => void
    toggleTableRow: (tableId: string, rowId: string) => void
    // Note operations within workspace
    createNote: (workspaceId: string, name: string) => void
    duplicateNote: (workspaceId: string, noteId: string, withContent?: boolean) => void
    deleteNote: (workspaceId: string, noteId: string) => void
    renameNote: (noteId: string, name: string) => void
    updateNoteContent: (noteId: string, content: string) => void
    updateNoteSettings: (noteId: string, settings: Partial<Pick<NoteItem, 'isMonospace' | 'wordWrap'>>) => void
    switchNote: (workspaceId: string, noteId: string) => void
    reorderNotesInWorkspace: (workspaceId: string, noteIds: string[]) => void
    moveNoteToWorkspace: (noteId: string, fromWorkspaceId: string, toWorkspaceId: string) => Promise<void>
    // Helpers
    getTableById: (tableId: string) => TableItem | undefined
    getNoteById: (noteId: string) => NoteItem | undefined
    getWorkspaceByTableId: (tableId: string) => Workspace | undefined
    getWorkspaceByNoteId: (noteId: string) => Workspace | undefined
    // Undo/Redo
    undo: () => void
    redo: () => void
    canUndo: boolean
    canRedo: boolean
    // Cloud sync
    isSyncing: boolean
    syncError: string | null
    syncWorkspaces: () => Promise<void>
    setWorkspaceVisibility: (workspaceId: string, visibility: WorkspaceVisibility) => Promise<void>
}

const TableContext = createContext<TableContextType | undefined>(undefined)

export function TableProvider({ children }: { children: React.ReactNode }) {
    const getDefaultWorkspaces = (): Workspace[] => [{
        id: crypto.randomUUID(),
        name: 'My Workspace',
        createdAt: new Date().toISOString(),
        isExpanded: true,
        tables: [{
            id: crypto.randomUUID(),
            name: 'My First Table',
            columns: [
                { id: crypto.randomUUID(), title: 'Name', type: 'text' },
                { id: crypto.randomUUID(), title: 'Status', type: 'text' },
                { id: crypto.randomUUID(), title: 'Due Date', type: 'reminder' },
            ],
            rows: [
                { id: crypto.randomUUID(), cells: {} },
            ],
        }],
        notes: []
    }]

    // Migration helper: convert old format to new format
    const migrateOldData = (oldData: unknown[]): Workspace[] => {
        const data = oldData as Record<string, unknown>[]
        // Check if it's already in new format (has tables array)
        if (data[0]?.tables) {
            // Ensure notes array exists in each workspace
            return (data as unknown as Workspace[]).map(ws => ({
                ...ws,
                notes: ws.notes || []
            }))
        }
        // Migrate old TableData[] to Workspace[]
        return [{
            id: crypto.randomUUID(),
            name: 'My Workspace',
            createdAt: new Date().toISOString(),
            isExpanded: true,
            tables: data.map(t => ({
                id: t.id as string,
                name: t.name as string,
                columns: t.columns as Column[],
                rows: t.rows as Row[],
            })),
            notes: []
        }]
    }

    const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
        const saved = localStorage.getItem('aura-workspaces') || localStorage.getItem('aura-tables')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return migrateOldData(parsed)
                }
            } catch (error) {
                console.error('Failed to parse saved workspaces:', error)
            }
        }
        return getDefaultWorkspaces()
    })

    const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>(() => {
        return workspaces[0]?.id || '1'
    })

    const [currentTableId, setCurrentTableId] = useState<string>(() => {
        const saved = localStorage.getItem('aura-current-table-id')
        // Validate that saved ID exists
        const allTables = workspaces.flatMap(w => w.tables)
        if (saved && allTables.some(t => t.id === saved)) {
            return saved
        }
        return workspaces[0]?.tables[0]?.id || '1-1'
    })

    const [selectedTableIds, setSelectedTables] = useState<string[]>([currentTableId])

    const [currentNoteId, setCurrentNoteId] = useState<string | null>(null)
    const [currentItemType, setCurrentItemType] = useState<'table' | 'note'>('table')

    // Cloud sync state
    const { user, isAuthenticated } = useAuth()
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncError, setSyncError] = useState<string | null>(null)
    
    // Track pending local changes to prevent sync from overwriting
    const hasPendingChangesRef = useRef(false)
    const initialSyncDoneRef = useRef(false)
    const lastSyncTimeRef = useRef<number>(0)
    
    // Ref to always access latest workspaces (fixes stale closure in real-time listener)
    const workspacesRef = useRef(workspaces)
    workspacesRef.current = workspaces

    // Set user ID for sync service when auth changes
    useEffect(() => {
        syncService.setUserId(user?.id || null)
        // Reset sync state when user changes
        initialSyncDoneRef.current = false
        hasPendingChangesRef.current = false
    }, [user])

    // Sync workspaces from cloud (only overwrites if no pending local changes)
    // Uses workspacesRef to always access latest workspaces (fixes stale closure issue)
    const syncWorkspaces = useCallback(async (forceOverwrite = false) => {
        if (!isAuthenticated || !user) return
        
        // Skip if there are pending local changes (unless forced or initial sync)
        if (hasPendingChangesRef.current && !forceOverwrite && initialSyncDoneRef.current) {
            console.log('⏸️ Skipping sync - pending local changes will be pushed instead')
            return
        }
        
        setIsSyncing(true)
        setSyncError(null)
        
        try {
            const cloudWorkspaces = await syncService.fetchWorkspaces()
            // Always read latest workspaces from ref (not stale closure)
            const currentWorkspaces = workspacesRef.current
            
            if (cloudWorkspaces.length > 0) {
                let finalWorkspaces: Workspace[]
                
                if (!initialSyncDoneRef.current) {
                    // INITIAL SYNC: Just take cloud data as-is (no merge)
                    // This is the source of truth when starting fresh
                    console.log('📥 Initial sync - loading', cloudWorkspaces.length, 'workspaces from cloud')
                    finalWorkspaces = cloudWorkspaces
                } else {
                    // SMART MERGE: Use timestamps to resolve conflicts
                    // Cloud is authoritative for item LOCATION (which workspace)
                    // Compare updatedAt for content conflicts
                    console.log('� Smart merge - reconciling local and cloud state')
                    
                    // Build maps of ALL items across ALL workspaces for proper deduplication
                    const allCloudTables = new Map<string, { table: TableItem, workspaceId: string }>()
                    const allCloudNotes = new Map<string, { note: NoteItem, workspaceId: string }>()
                    
                    for (const ws of cloudWorkspaces) {
                        for (const t of ws.tables) {
                            allCloudTables.set(t.id, { table: t, workspaceId: ws.id })
                        }
                        for (const n of ws.notes) {
                            allCloudNotes.set(n.id, { note: n, workspaceId: ws.id })
                        }
                    }
                    
                    const allLocalTables = new Map<string, { table: TableItem, workspaceId: string }>()
                    const allLocalNotes = new Map<string, { note: NoteItem, workspaceId: string }>()
                    
                    for (const ws of currentWorkspaces) {
                        for (const t of ws.tables) {
                            allLocalTables.set(t.id, { table: t, workspaceId: ws.id })
                        }
                        for (const n of ws.notes) {
                            allLocalNotes.set(n.id, { note: n, workspaceId: ws.id })
                        }
                    }
                    
                    // Start with cloud structure (authoritative for positions/moves)
                    // But use local content if it's newer
                    finalWorkspaces = cloudWorkspaces.map(cloudWs => {
                        const localWs = currentWorkspaces.find(ws => ws.id === cloudWs.id)
                        
                        // Merge tables: cloud positions, but check timestamps for content
                        const mergedTables = cloudWs.tables.map(cloudTable => {
                            const localEntry = allLocalTables.get(cloudTable.id)
                            if (!localEntry) return cloudTable
                            
                            // Use newer version based on updatedAt
                            const cloudTime = new Date(cloudTable.updatedAt || 0).getTime()
                            const localTime = new Date(localEntry.table.updatedAt || 0).getTime()
                            return localTime > cloudTime ? localEntry.table : cloudTable
                        })
                        
                        // Merge notes: cloud positions, but check timestamps for content
                        const mergedNotes = cloudWs.notes.map(cloudNote => {
                            const localEntry = allLocalNotes.get(cloudNote.id)
                            if (!localEntry) return cloudNote
                            
                            // Use newer version based on updatedAt
                            const cloudTime = new Date(cloudNote.updatedAt || 0).getTime()
                            const localTime = new Date(localEntry.note.updatedAt || 0).getTime()
                            return localTime > cloudTime ? localEntry.note : cloudNote
                        })
                        
                        // Add local-only items (new, not yet pushed to cloud)
                        if (localWs) {
                            const cloudTableIds = new Set(cloudWs.tables.map(t => t.id))
                            const cloudNoteIds = new Set(cloudWs.notes.map(n => n.id))
                            
                            // Local tables not in ANY cloud workspace = truly new
                            const newLocalTables = localWs.tables.filter(t => 
                                !cloudTableIds.has(t.id) && !allCloudTables.has(t.id)
                            )
                            // Local notes not in ANY cloud workspace = truly new
                            const newLocalNotes = localWs.notes.filter(n => 
                                !cloudNoteIds.has(n.id) && !allCloudNotes.has(n.id)
                            )
                            
                            mergedTables.push(...newLocalTables)
                            mergedNotes.push(...newLocalNotes)
                        }
                        
                        return {
                            ...cloudWs,
                            tables: mergedTables,
                            notes: mergedNotes,
                            // Keep local expansion state
                            isExpanded: localWs?.isExpanded ?? cloudWs.isExpanded
                        }
                    })
                    
                    // Add local-only workspaces (new, not yet pushed)
                    const cloudWsIds = new Set(cloudWorkspaces.map(ws => ws.id))
                    const newLocalWorkspaces = currentWorkspaces.filter(ws => 
                        !cloudWsIds.has(ws.id) && !ws.ownerId // Never synced = truly new
                    )
                    finalWorkspaces.push(...newLocalWorkspaces)
                    
                    console.log('🔀 Smart merge complete:', finalWorkspaces.length, 'workspaces')
                }
                
                setWorkspaces(finalWorkspaces)
                
                // Update current workspace/table if needed
                if (!finalWorkspaces.some(ws => ws.id === currentWorkspaceId)) {
                    setCurrentWorkspaceId(finalWorkspaces[0].id)
                    if (finalWorkspaces[0].tables.length > 0) {
                        setCurrentTableId(finalWorkspaces[0].tables[0].id)
                    }
                }
                console.log('✅ Sync complete:', finalWorkspaces.length, 'workspaces')
            } else {
                // Cloud is empty - push current local data to cloud
                console.log('☁️ Cloud is empty, pushing local data...')
                for (let wsIndex = 0; wsIndex < currentWorkspaces.length; wsIndex++) {
                    const workspace = currentWorkspaces[wsIndex]
                    try {
                        await syncService.createWorkspace(workspace, wsIndex)
                        // Create tables
                        for (let i = 0; i < workspace.tables.length; i++) {
                            await syncService.createTable(workspace.id, workspace.tables[i], i)
                        }
                        // Create notes
                        for (let i = 0; i < workspace.notes.length; i++) {
                            await syncService.createNote(workspace.id, workspace.notes[i], i)
                        }
                    } catch (err) {
                        console.error('Error pushing workspace to cloud:', err)
                    }
                }
                console.log('✅ Pushed local data to cloud')
            }
        } catch (error) {
            console.error('Sync error:', error)
            setSyncError(error instanceof Error ? error.message : 'Failed to sync')
        } finally {
            setIsSyncing(false)
            initialSyncDoneRef.current = true
            lastSyncTimeRef.current = Date.now()
        }
    }, [isAuthenticated, user, currentWorkspaceId]) // Removed workspaces - using ref instead

    // Set workspace visibility
    const setWorkspaceVisibility = useCallback(async (workspaceId: string, visibility: WorkspaceVisibility) => {
        if (!isAuthenticated) return

        try {
            await syncService.setWorkspaceVisibility(workspaceId, visibility)
            // Update local state
            setWorkspaces(prev => prev.map(ws => 
                ws.id === workspaceId ? { ...ws, visibility } : ws
            ))
        } catch (error) {
            console.error('Error setting visibility:', error)
            throw error
        }
    }, [isAuthenticated])

    // Auto-sync when user logs in (but wait for pending sync first)
    useEffect(() => {
        if (!isAuthenticated || !user) return
        
        const pendingSync = localStorage.getItem('aura-pending-sync')
        if (pendingSync) {
            // Has pending changes from previous session - push them first
            try {
                const { workspaces: pendingWorkspaces } = JSON.parse(pendingSync)
                console.log('📤 Found pending sync from previous session, pushing first...')
                pushToCloud(pendingWorkspaces).then(() => {
                    localStorage.removeItem('aura-pending-sync')
                    console.log('✅ Pending sync completed, now syncing...')
                    syncWorkspaces()
                }).catch(err => {
                    console.error('Failed to push pending sync:', err)
                    localStorage.removeItem('aura-pending-sync')
                    syncWorkspaces()
                })
            } catch (e) {
                console.error('Failed to parse pending sync:', e)
                localStorage.removeItem('aura-pending-sync')
                syncWorkspaces()
            }
        } else {
            // No pending changes, just sync normally
            syncWorkspaces()
        }
    }, [isAuthenticated, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    // Real-time sync - EVENT-BASED approach (like Notion/Google Docs)
    // Instead of fetching full state, apply individual changes directly
    useEffect(() => {
        if (!isAuthenticated || !user) return

        console.log('📡 Setting up event-based real-time sync for user:', user.id)
        
        // Check if this is our own echo (within 1 second of our push)
        const isOwnEcho = () => Date.now() - lastSyncTimeRef.current < 1000

        // Handle NOTE changes - most common operation
        const handleNoteChange = (payload: { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null }) => {
            if (isOwnEcho()) {
                console.log('📡 Ignoring own note echo')
                return
            }
            
            const { eventType } = payload
            console.log(`📡 Note ${eventType} from another device`)
            
            if (eventType === 'INSERT' && payload.new) {
                const n = payload.new
                const newNote: NoteItem = {
                    id: n.id as string,
                    name: n.name as string,
                    content: n.content as string || '',
                    createdAt: n.created_at as string,
                    updatedAt: n.updated_at as string,
                    isMonospace: n.is_monospace as boolean ?? false,
                    wordWrap: n.word_wrap as boolean ?? true
                }
                const workspaceId = n.workspace_id as string
                setWorkspaces(prev => prev.map(ws => 
                    ws.id === workspaceId 
                        ? { ...ws, notes: [...ws.notes.filter(x => x.id !== newNote.id), newNote] }
                        : ws
                ))
            } else if (eventType === 'UPDATE' && payload.new) {
                const n = payload.new
                const updatedNote: NoteItem = {
                    id: n.id as string,
                    name: n.name as string,
                    content: n.content as string || '',
                    createdAt: n.created_at as string,
                    updatedAt: n.updated_at as string,
                    isMonospace: n.is_monospace as boolean ?? false,
                    wordWrap: n.word_wrap as boolean ?? true
                }
                const newWorkspaceId = n.workspace_id as string
                // Remove from old workspace, add to new (handles moves)
                setWorkspaces(prev => prev.map(ws => {
                    // Remove from any workspace that has this note
                    const filtered = ws.notes.filter(x => x.id !== updatedNote.id)
                    // Add to target workspace
                    if (ws.id === newWorkspaceId) {
                        return { ...ws, notes: [...filtered, updatedNote] }
                    }
                    return { ...ws, notes: filtered }
                }))
            } else if (eventType === 'DELETE' && payload.old) {
                const noteId = payload.old.id as string
                setWorkspaces(prev => prev.map(ws => ({
                    ...ws,
                    notes: ws.notes.filter(n => n.id !== noteId)
                })))
            }
        }

        // Handle TABLE changes
        const handleTableChange = (payload: { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null }) => {
            if (isOwnEcho()) {
                console.log('📡 Ignoring own table echo')
                return
            }
            
            const { eventType } = payload
            console.log(`📡 Table ${eventType} from another device`)
            
            if (eventType === 'INSERT' && payload.new) {
                const t = payload.new
                const newTable: TableItem = {
                    id: t.id as string,
                    name: t.name as string,
                    columns: t.columns as TableItem['columns'] || [],
                    rows: t.rows as TableItem['rows'] || [],
                    appearance: t.appearance as TableItem['appearance'],
                    createdAt: t.created_at as string,
                    updatedAt: t.updated_at as string
                }
                const workspaceId = t.workspace_id as string
                setWorkspaces(prev => prev.map(ws => 
                    ws.id === workspaceId 
                        ? { ...ws, tables: [...ws.tables.filter(x => x.id !== newTable.id), newTable] }
                        : ws
                ))
            } else if (eventType === 'UPDATE' && payload.new) {
                const t = payload.new
                const updatedTable: TableItem = {
                    id: t.id as string,
                    name: t.name as string,
                    columns: t.columns as TableItem['columns'] || [],
                    rows: t.rows as TableItem['rows'] || [],
                    appearance: t.appearance as TableItem['appearance'],
                    createdAt: t.created_at as string,
                    updatedAt: t.updated_at as string
                }
                const newWorkspaceId = t.workspace_id as string
                // Remove from old workspace, add to new (handles moves)
                setWorkspaces(prev => prev.map(ws => {
                    const filtered = ws.tables.filter(x => x.id !== updatedTable.id)
                    if (ws.id === newWorkspaceId) {
                        return { ...ws, tables: [...filtered, updatedTable] }
                    }
                    return { ...ws, tables: filtered }
                }))
            } else if (eventType === 'DELETE' && payload.old) {
                const tableId = payload.old.id as string
                setWorkspaces(prev => prev.map(ws => ({
                    ...ws,
                    tables: ws.tables.filter(t => t.id !== tableId)
                })))
            }
        }

        // Handle WORKSPACE changes
        const handleWorkspaceChange = (payload: { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null }) => {
            if (isOwnEcho()) {
                console.log('📡 Ignoring own workspace echo')
                return
            }
            
            const { eventType } = payload
            console.log(`📡 Workspace ${eventType} from another device`)
            
            if (eventType === 'INSERT' && payload.new) {
                const w = payload.new
                const newWorkspace: Workspace = {
                    id: w.id as string,
                    name: w.name as string,
                    createdAt: w.created_at as string,
                    tables: [],
                    notes: [],
                    isExpanded: w.is_expanded as boolean ?? true,
                    ownerId: w.owner_id as string,
                    visibility: w.visibility as WorkspaceVisibility ?? 'private',
                    updatedAt: w.updated_at as string
                }
                setWorkspaces(prev => [...prev.filter(ws => ws.id !== newWorkspace.id), newWorkspace])
            } else if (eventType === 'UPDATE' && payload.new) {
                const w = payload.new
                setWorkspaces(prev => prev.map(ws => 
                    ws.id === w.id 
                        ? { 
                            ...ws, 
                            name: w.name as string,
                            visibility: w.visibility as WorkspaceVisibility ?? ws.visibility,
                            updatedAt: w.updated_at as string
                          }
                        : ws
                ))
            } else if (eventType === 'DELETE' && payload.old) {
                const workspaceId = payload.old.id as string
                setWorkspaces(prev => prev.filter(ws => ws.id !== workspaceId))
            }
        }

        // Subscribe with specific event handlers
        const channel = supabase
            .channel('realtime-sync')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'notes' },
                (payload) => handleNoteChange({ eventType: 'INSERT', new: payload.new, old: null })
            )
            .on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'notes' },
                (payload) => handleNoteChange({ eventType: 'UPDATE', new: payload.new, old: payload.old })
            )
            .on('postgres_changes', 
                { event: 'DELETE', schema: 'public', table: 'notes' },
                (payload) => handleNoteChange({ eventType: 'DELETE', new: null, old: payload.old })
            )
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'tables' },
                (payload) => handleTableChange({ eventType: 'INSERT', new: payload.new, old: null })
            )
            .on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'tables' },
                (payload) => handleTableChange({ eventType: 'UPDATE', new: payload.new, old: payload.old })
            )
            .on('postgres_changes', 
                { event: 'DELETE', schema: 'public', table: 'tables' },
                (payload) => handleTableChange({ eventType: 'DELETE', new: null, old: payload.old })
            )
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'workspaces' },
                (payload) => handleWorkspaceChange({ eventType: 'INSERT', new: payload.new, old: null })
            )
            .on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'workspaces' },
                (payload) => handleWorkspaceChange({ eventType: 'UPDATE', new: payload.new, old: payload.old })
            )
            .on('postgres_changes', 
                { event: 'DELETE', schema: 'public', table: 'workspaces' },
                (payload) => handleWorkspaceChange({ eventType: 'DELETE', new: null, old: payload.old })
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Real-time sync connected (event-based)')
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Real-time sync error:', err)
                } else if (status === 'TIMED_OUT') {
                    console.warn('⚠️ Real-time sync timed out')
                }
            })

        return () => {
            console.log('📡 Removing real-time sync listener')
            supabase.removeChannel(channel)
        }
    }, [isAuthenticated, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    // Track previous workspaces for change detection
    const prevWorkspacesRef = useRef<string>('')
    const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isInitialLoadRef = useRef(true)

    // Push changes to cloud (debounced) - returns true if ALL operations succeeded
    const pushToCloud = useCallback(async (workspacesToPush: Workspace[]): Promise<boolean> => {
        if (!isAuthenticated || !user) return false
        
        let allSucceeded = true
        try {
            // Get existing cloud workspace IDs
            const cloudWorkspaces = await syncService.fetchWorkspaces()
            const cloudWorkspaceIds = new Set(cloudWorkspaces.map(ws => ws.id))
            const localWorkspaceIds = new Set(workspacesToPush.map(ws => ws.id))

            // Create or update workspaces
            for (let wsIndex = 0; wsIndex < workspacesToPush.length; wsIndex++) {
                const workspace = workspacesToPush[wsIndex]
                if (!cloudWorkspaceIds.has(workspace.id)) {
                    // New workspace - create it first
                    try {
                        await syncService.createWorkspace(workspace, wsIndex)
                        console.log('✅ Created workspace:', workspace.id, workspace.name)
                        
                        // Only create tables/notes if workspace creation succeeded
                        for (let i = 0; i < workspace.tables.length; i++) {
                            await syncService.createTable(workspace.id, workspace.tables[i], i)
                        }
                        for (let i = 0; i < workspace.notes.length; i++) {
                            await syncService.createNote(workspace.id, workspace.notes[i], i)
                        }
                    } catch (createError) {
                        console.error('❌ Failed to create workspace:', workspace.id, createError)
                        allSucceeded = false
                        continue
                    }
                } else {
                    // Existing workspace - update it (with position)
                    try {
                        await syncService.updateWorkspace(workspace, wsIndex)
                    } catch (updateError) {
                        console.error('❌ Failed to update workspace:', workspace.id, updateError)
                        allSucceeded = false
                        continue
                    }
                    
                    // Get cloud tables/notes for this workspace to detect deletions
                    const cloudWs = cloudWorkspaces.find(cw => cw.id === workspace.id)
                    const cloudTableIds = new Set(cloudWs?.tables.map(t => t.id) || [])
                    const cloudNoteIds = new Set(cloudWs?.notes.map(n => n.id) || [])
                    const localTableIds = new Set(workspace.tables.map(t => t.id))
                    const localNoteIds = new Set(workspace.notes.map(n => n.id))
                    
                    // Update or create tables (with position for reordering)
                    for (let tableIdx = 0; tableIdx < workspace.tables.length; tableIdx++) {
                        const table = workspace.tables[tableIdx]
                        try {
                            await syncService.updateTable(table, tableIdx)
                        } catch {
                            // Table might not exist, create it
                            await syncService.createTable(workspace.id, table, tableIdx)
                        }
                    }
                    
                    // Delete removed tables
                    for (const cloudTableId of cloudTableIds) {
                        if (!localTableIds.has(cloudTableId)) {
                            console.log('🗑️ Deleting table from cloud:', cloudTableId)
                            try {
                                await syncService.deleteTable(cloudTableId)
                                console.log('✅ Table deleted successfully:', cloudTableId)
                            } catch (deleteError) {
                                console.error('❌ Failed to delete table:', cloudTableId, deleteError)
                                allSucceeded = false
                            }
                        }
                    }
                    
                    // Update or create notes (with position for reordering)
                    for (let noteIdx = 0; noteIdx < workspace.notes.length; noteIdx++) {
                        const note = workspace.notes[noteIdx]
                        try {
                            await syncService.updateNote(note, noteIdx)
                        } catch {
                            // Note might not exist, create it
                            await syncService.createNote(workspace.id, note, noteIdx)
                        }
                    }
                    
                    // Delete removed notes
                    for (const cloudNoteId of cloudNoteIds) {
                        if (!localNoteIds.has(cloudNoteId)) {
                            console.log('🗑️ Deleting note from cloud:', cloudNoteId)
                            try {
                                await syncService.deleteNote(cloudNoteId)
                                console.log('✅ Note deleted successfully:', cloudNoteId)
                            } catch (deleteError) {
                                console.error('❌ Failed to delete note:', cloudNoteId, deleteError)
                                allSucceeded = false
                            }
                        }
                    }
                }
            }

            // Delete removed workspaces
            for (const cloudWs of cloudWorkspaces) {
                if (!localWorkspaceIds.has(cloudWs.id)) {
                    console.log('🗑️ Deleting workspace from cloud:', cloudWs.id, cloudWs.name)
                    try {
                        await syncService.deleteWorkspace(cloudWs.id)
                        console.log('✅ Workspace deleted successfully:', cloudWs.id)
                    } catch (deleteError) {
                        console.error('❌ Failed to delete workspace:', cloudWs.id, deleteError)
                        allSucceeded = false
                    }
                }
            }

            // Mark that we just pushed to ignore incoming real-time notifications
            lastSyncTimeRef.current = Date.now()
            console.log('✅ Synced to cloud - local:', workspacesToPush.length, 'cloud:', cloudWorkspaces.length)
            return allSucceeded
        } catch (error) {
            console.error('Push to cloud error:', error)
            return false
        }
    }, [isAuthenticated, user])

    // Auto-push changes to cloud (debounced)
    useEffect(() => {
        // Skip if not authenticated
        if (!isAuthenticated || !user) {
            prevWorkspacesRef.current = JSON.stringify(workspaces)
            return
        }
        
        // Skip initial load
        if (isInitialLoadRef.current) {
            isInitialLoadRef.current = false
            prevWorkspacesRef.current = JSON.stringify(workspaces)
            return
        }
        
        // Skip if we just synced from cloud (prevents pushing cloud data back to cloud)
        if (Date.now() - lastSyncTimeRef.current < 1000) {
            prevWorkspacesRef.current = JSON.stringify(workspaces)
            return
        }

        // Check if workspaces actually changed
        const currentWorkspacesJson = JSON.stringify(workspaces)
        if (currentWorkspacesJson === prevWorkspacesRef.current) {
            return
        }
        prevWorkspacesRef.current = currentWorkspacesJson
        
        // Mark that we have pending local changes
        hasPendingChangesRef.current = true

        // Debounce the sync (wait 1.5 seconds after last change)
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current)
        }

        syncTimeoutRef.current = setTimeout(async () => {
            // Use ref to get latest workspaces (not stale closure)
            const latestWorkspaces = workspacesRef.current
            const success = await pushToCloud(latestWorkspaces)
            // Only clear pending flag if ALL operations succeeded
            if (success) {
                hasPendingChangesRef.current = false
            }
        }, 1500)

        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current)
            }
        }
    }, [workspaces, pushToCloud, isAuthenticated, user])

    // Flush pending changes when leaving the page (prevents losing deletions on refresh)
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (hasPendingChangesRef.current && isAuthenticated && user) {
                // Cancel the debounced push
                if (syncTimeoutRef.current) {
                    clearTimeout(syncTimeoutRef.current)
                }
                // Synchronously push to cloud using sendBeacon for reliability
                const workspacesData = JSON.stringify({
                    workspaces: workspacesRef.current,
                    userId: user.id
                })
                // Store in localStorage as backup - will be pushed on next load
                localStorage.setItem('aura-pending-sync', workspacesData)
                console.log('💾 Saved pending changes for next session')
            }
        }
        
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isAuthenticated, user])
    
    // Save to localStorage
    useEffect(() => {
        localStorage.setItem('aura-workspaces', JSON.stringify(workspaces))
    }, [workspaces])

    useEffect(() => {
        localStorage.setItem('aura-current-table-id', currentTableId)
    }, [currentTableId])

    // Helper functions
    const getTableById = useCallback((tableId: string): TableItem | undefined => {
        for (const ws of workspaces) {
            const table = ws.tables.find(t => t.id === tableId)
            if (table) return table
        }
        return undefined
    }, [workspaces])

    const getWorkspaceByTableId = useCallback((tableId: string): Workspace | undefined => {
        return workspaces.find(ws => ws.tables.some(t => t.id === tableId))
    }, [workspaces])

    const getNoteById = useCallback((noteId: string): NoteItem | undefined => {
        for (const ws of workspaces) {
            const note = ws.notes.find(n => n.id === noteId)
            if (note) return note
        }
        return undefined
    }, [workspaces])

    const getWorkspaceByNoteId = useCallback((noteId: string): Workspace | undefined => {
        return workspaces.find(ws => ws.notes.some(n => n.id === noteId))
    }, [workspaces])

    const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) || workspaces[0]
    const currentTable = getTableById(currentTableId) || workspaces[0]?.tables[0]
    const currentNote = currentNoteId ? (getNoteById(currentNoteId) || null) : null

    // Undo/Redo history management
    const MAX_HISTORY = 50
    const historyRef = useRef<Workspace[][]>([])
    const futureRef = useRef<Workspace[][]>([])
    const isUndoRedoRef = useRef(false)

    // Wrapper to update workspaces with history tracking
    const setWorkspacesWithHistory = useCallback((newWorkspaces: Workspace[] | ((prev: Workspace[]) => Workspace[])) => {
        setWorkspaces(prev => {
            const nextWorkspaces = typeof newWorkspaces === 'function' ? newWorkspaces(prev) : newWorkspaces
            
            if (!isUndoRedoRef.current) {
                historyRef.current = [...historyRef.current.slice(-MAX_HISTORY + 1), prev]
                futureRef.current = []
            }
            
            return nextWorkspaces
        })
    }, [])

    const undo = useCallback(() => {
        if (historyRef.current.length === 0) return
        
        const previous = historyRef.current[historyRef.current.length - 1]
        historyRef.current = historyRef.current.slice(0, -1)
        
        setWorkspaces(current => {
            futureRef.current = [...futureRef.current, current]
            return previous
        })
        
        isUndoRedoRef.current = true
        setTimeout(() => { isUndoRedoRef.current = false }, 0)
    }, [])

    const redo = useCallback(() => {
        if (futureRef.current.length === 0) return
        
        const next = futureRef.current[futureRef.current.length - 1]
        futureRef.current = futureRef.current.slice(0, -1)
        
        setWorkspaces(current => {
            historyRef.current = [...historyRef.current, current]
            return next
        })
        
        isUndoRedoRef.current = true
        setTimeout(() => { isUndoRedoRef.current = false }, 0)
    }, [])

    const [canUndo, setCanUndo] = useState(false)
    const [canRedo, setCanRedo] = useState(false)

    useEffect(() => {
        const checkHistory = () => {
            setCanUndo(historyRef.current.length > 0)
            setCanRedo(futureRef.current.length > 0)
        }
        checkHistory()
        const interval = setInterval(checkHistory, 100)
        return () => clearInterval(interval)
    }, [workspaces])

    // Helper to update a table within workspaces
    const updateTableInWorkspaces = useCallback((tableId: string, updateFn: (table: TableItem) => TableItem) => {
        setWorkspacesWithHistory(workspaces.map(ws => ({
            ...ws,
            tables: ws.tables.map(t => t.id === tableId ? updateFn(t) : t)
        })))
    }, [workspaces, setWorkspacesWithHistory])

    // Helper to update a note within workspaces
    const updateNoteInWorkspaces = useCallback((noteId: string, updateFn: (note: NoteItem) => NoteItem) => {
        setWorkspacesWithHistory(workspaces.map(ws => ({
            ...ws,
            notes: ws.notes.map(n => n.id === noteId ? updateFn(n) : n)
        })))
    }, [workspaces, setWorkspacesWithHistory])

    // ===== WORKSPACE OPERATIONS =====
    const createWorkspace = (name: string) => {
        const newWorkspace: Workspace = {
            id: crypto.randomUUID(),
            name,
            createdAt: new Date().toISOString(),
            isExpanded: true,
            tables: [],
            notes: []
        }
        setWorkspacesWithHistory([...workspaces, newWorkspace])
        setCurrentWorkspaceId(newWorkspace.id)
    }

    const deleteWorkspace = (id: string) => {
        if (workspaces.length === 1) {
            alert('Cannot delete the last workspace')
            return
        }
        const newWorkspaces = workspaces.filter(w => w.id !== id)
        setWorkspacesWithHistory(newWorkspaces)
        
        // If current workspace was deleted, switch to first available
        if (currentWorkspaceId === id) {
            const nextWs = newWorkspaces[0]
            setCurrentWorkspaceId(nextWs.id)
            setCurrentTableId(nextWs.tables[0]?.id || '')
            setSelectedTables([nextWs.tables[0]?.id || ''])
        }
    }

    const renameWorkspace = (id: string, name: string) => {
        if (!name.trim()) return
        setWorkspacesWithHistory(workspaces.map(w =>
            w.id === id ? { ...w, name: name.trim() } : w
        ))
    }

    const toggleWorkspaceExpanded = (id: string) => {
        setWorkspaces(workspaces.map(w =>
            w.id === id ? { ...w, isExpanded: !w.isExpanded } : w
        ))
    }

    const reorderWorkspaces = (newWorkspaces: Workspace[]) => {
        setWorkspacesWithHistory(newWorkspaces)
    }

    // ===== TABLE OPERATIONS WITHIN WORKSPACE =====
    const createTable = (workspaceId: string, name: string) => {
        const newTable: TableItem = {
            id: crypto.randomUUID(),
            name,
            columns: [{ id: crypto.randomUUID(), title: 'Column 1', type: 'text' }],
            rows: [],
        }
        setWorkspacesWithHistory(workspaces.map(ws =>
            ws.id === workspaceId
                ? { ...ws, tables: [...ws.tables, newTable], isExpanded: true }
                : ws
        ))
        setCurrentWorkspaceId(workspaceId)
        setCurrentTableId(newTable.id)
        setSelectedTables([newTable.id])
    }

    const duplicateTable = (workspaceId: string, tableId: string, withContent: boolean = true) => {
        const workspace = workspaces.find(w => w.id === workspaceId)
        const sourceTable = workspace?.tables.find(t => t.id === tableId)
        if (!sourceTable) return

        // Create new column IDs
        const newColumns = sourceTable.columns.map(col => ({
            ...col,
            id: crypto.randomUUID(),
        }))

        // Remap column IDs
        const columnIdMap: Record<string, string> = {}
        sourceTable.columns.forEach((col, idx) => {
            columnIdMap[col.id] = newColumns[idx].id
        })

        // Helper to clone row structure (with or without content)
        const cloneRow = (row: Row): Row => ({
            id: crypto.randomUUID(),
            cells: withContent 
                ? Object.fromEntries(
                    Object.entries(row.cells).map(([oldColId, value]) => [
                        columnIdMap[oldColId] || oldColId,
                        value
                    ])
                )
                : {}, // Empty cells if not copying content
            colors: withContent && row.colors 
                ? Object.fromEntries(
                    Object.entries(row.colors).map(([oldColId, value]) => [
                        columnIdMap[oldColId] || oldColId,
                        value
                    ])
                ) 
                : undefined,
            rowColor: withContent ? row.rowColor : undefined,
            isExpanded: row.isExpanded,
            children: row.children?.map(cloneRow) || [],
        })

        // Deep clone the table with new IDs
        const duplicatedTable: TableItem = {
            id: crypto.randomUUID(),
            name: `${sourceTable.name} (Copy)`,
            columns: newColumns,
            rows: sourceTable.rows.map(cloneRow),
        }

        setWorkspacesWithHistory(workspaces.map(ws =>
            ws.id === workspaceId
                ? { ...ws, tables: [...ws.tables, duplicatedTable], isExpanded: true }
                : ws
        ))
        setCurrentWorkspaceId(workspaceId)
        setCurrentTableId(duplicatedTable.id)
        setSelectedTables([duplicatedTable.id])
    }

    const deleteTable = (workspaceId: string, tableId: string) => {
        const workspace = workspaces.find(w => w.id === workspaceId)
        if (!workspace) return
        
        // Check if this is the last table and there are no notes
        if (workspace.tables.length === 1 && workspace.notes.length === 0) {
            alert('Cannot delete the last item in a workspace. Add a note first or delete the workspace.')
            return
        }
        
        const newTables = workspace.tables.filter(t => t.id !== tableId)
        setWorkspacesWithHistory(workspaces.map(ws =>
            ws.id === workspaceId ? { ...ws, tables: newTables } : ws
        ))
        
        // Update selection if needed
        if (currentTableId === tableId) {
            if (newTables.length > 0) {
                setCurrentTableId(newTables[0].id)
                setSelectedTables([newTables[0].id])
            } else if (workspace.notes.length > 0) {
                // Switch to first note if no tables left
                setCurrentNoteId(workspace.notes[0].id)
                setCurrentItemType('note')
                setCurrentTableId('')
                setSelectedTables([])
            }
        }
    }

    const switchTable = (workspaceId: string, tableId: string) => {
        setCurrentWorkspaceId(workspaceId)
        setCurrentTableId(tableId)
        setSelectedTables([tableId])
        setCurrentItemType('table')
        setCurrentNoteId(null)
    }

    const reorderTablesInWorkspace = (workspaceId: string, tableIds: string[]) => {
        setWorkspacesWithHistory(workspaces.map(ws => {
            if (ws.id !== workspaceId) return ws
            // Reorder tables based on new order of IDs
            const reorderedTables = tableIds
                .map(id => ws.tables.find(t => t.id === id))
                .filter((t): t is TableItem => t !== undefined)
            return { ...ws, tables: reorderedTables }
        }))
    }

    const moveTableToWorkspace = async (tableId: string, fromWorkspaceId: string, toWorkspaceId: string) => {
        if (fromWorkspaceId === toWorkspaceId) return

        // 1. Optimistic update - update local state immediately
        setWorkspacesWithHistory(prev => {
            const fromWorkspace = prev.find(ws => ws.id === fromWorkspaceId)
            const tableToMove = fromWorkspace?.tables.find(t => t.id === tableId)
            if (!tableToMove) {
                console.warn('moveTableToWorkspace: table not found', tableId)
                return prev
            }

            return prev.map(ws => {
                if (ws.id === fromWorkspaceId) {
                    return { ...ws, tables: ws.tables.filter(t => t.id !== tableId) }
                }
                if (ws.id === toWorkspaceId) {
                    return { ...ws, tables: [...ws.tables, tableToMove] }
                }
                return ws
            })
        })

        // Update current workspace if needed
        if (currentTableId === tableId) {
            setCurrentWorkspaceId(toWorkspaceId)
        }

        // 2. Immediately sync to cloud (no debounce for moves)
        if (isAuthenticated) {
            try {
                await syncService.moveTable(tableId, toWorkspaceId)
                lastSyncTimeRef.current = Date.now() // Mark as our own change
                console.log('✅ Table moved and synced:', tableId, '→', toWorkspaceId)
            } catch (error) {
                console.error('Failed to sync table move:', error)
                // Could rollback here, but for now just log
            }
        }
    }

    const toggleTableSelection = (tableId: string) => {
        const ws = getWorkspaceByTableId(tableId)
        setSelectedTables(prev => {
            if (prev.includes(tableId)) {
                // Allow deselecting even the last item
                const newSelection = prev.filter(sid => sid !== tableId)
                if (tableId === currentTableId && newSelection.length > 0) {
                    setCurrentTableId(newSelection[0])
                }
                return newSelection
            } else {
                if (ws) setCurrentWorkspaceId(ws.id)
                setCurrentTableId(tableId)
                return [...prev, tableId]
            }
        })
    }

    const renameTable = (tableId: string, name: string) => {
        if (!name.trim()) return
        updateTableInWorkspaces(tableId, t => ({ ...t, name: name.trim() }))
    }

    const updateTable = (data: { columns: Column[]; rows: Row[] }) => {
        updateTableInWorkspaces(currentTableId, t => ({
            ...t,
            columns: data.columns,
            rows: data.rows
        }))
    }

    const updateTableById = (id: string, data: { columns: Column[]; rows: Row[] }) => {
        updateTableInWorkspaces(id, t => ({
            ...t,
            columns: data.columns,
            rows: data.rows
        }))
    }

    const updateTableColumns = (id: string, columns: Column[]) => {
        updateTableInWorkspaces(id, t => ({ ...t, columns }))
    }

    const updateTableAppearance = (tableId: string, appearance: Partial<TableItem['appearance']>) => {
        updateTableInWorkspaces(tableId, t => ({
            ...t,
            appearance: { ...t.appearance, ...appearance }
        }))
    }

    const updateTableCell = (tableId: string, rowId: string, colId: string, value: string) => {
        updateTableInWorkspaces(tableId, t => ({
            ...t,
            rows: updateRowInTree(t.rows, rowId, (row) => ({
                ...row,
                cells: { ...row.cells, [colId]: value }
            }))
        }))
    }

    const updateTableCellColor = (tableId: string, rowId: string, colId: string, color: string) => {
        updateTableInWorkspaces(tableId, t => ({
            ...t,
            rows: updateRowInTree(t.rows, rowId, (row) => ({
                ...row,
                colors: { ...row.colors, [colId]: color }
            }))
        }))
    }

    const updateTableRowColor = (tableId: string, rowId: string, color: string) => {
        updateTableInWorkspaces(tableId, t => ({
            ...t,
            rows: updateRowInTree(t.rows, rowId, (row) => ({
                ...row,
                rowColor: color
            }))
        }))
    }

    const deleteTableRow = (tableId: string, rowId: string) => {
        updateTableInWorkspaces(tableId, t => ({
            ...t,
            rows: deleteRowFromTree(t.rows, rowId)
        }))
    }

    const addTableRowSibling = (tableId: string, siblingId: string) => {
        const newRow: Row = { id: crypto.randomUUID(), cells: {}, children: [] }
        updateTableInWorkspaces(tableId, t => ({
            ...t,
            rows: addSiblingToTree(t.rows, siblingId, newRow)
        }))
    }

    const addTableRowChild = (tableId: string, parentId: string) => {
        const newRow: Row = { id: crypto.randomUUID(), cells: {}, children: [] }
        updateTableInWorkspaces(tableId, t => ({
            ...t,
            rows: addChildToRowInTree(t.rows, parentId, newRow)
        }))
    }

    const addTableRow = (tableId: string) => {
        const newRow: Row = { id: crypto.randomUUID(), cells: {}, children: [] }
        updateTableInWorkspaces(tableId, t => ({
            ...t,
            rows: [...t.rows, newRow]
        }))
    }

    const toggleTableRow = (tableId: string, rowId: string) => {
        updateTableInWorkspaces(tableId, t => ({
            ...t,
            rows: updateRowInTree(t.rows, rowId, (row) => ({
                ...row,
                isExpanded: !row.isExpanded
            }))
        }))
    }

    // ===== NOTE OPERATIONS WITHIN WORKSPACE =====
    const createNote = (workspaceId: string, name: string) => {
        const now = new Date().toISOString()
        const newNote: NoteItem = {
            id: crypto.randomUUID(),
            name,
            content: '',
            createdAt: now,
            updatedAt: now,
            isMonospace: false,
            wordWrap: true,
        }
        setWorkspacesWithHistory(workspaces.map(ws =>
            ws.id === workspaceId
                ? { ...ws, notes: [...ws.notes, newNote], isExpanded: true }
                : ws
        ))
        setCurrentWorkspaceId(workspaceId)
        setCurrentNoteId(newNote.id)
        setCurrentItemType('note')
    }

    const duplicateNote = (workspaceId: string, noteId: string, withContent: boolean = true) => {
        const workspace = workspaces.find(w => w.id === workspaceId)
        const sourceNote = workspace?.notes.find(n => n.id === noteId)
        if (!sourceNote) return

        const now = new Date().toISOString()
        const duplicatedNote: NoteItem = {
            ...sourceNote,
            id: crypto.randomUUID(),
            name: `${sourceNote.name} (Copy)`,
            content: withContent ? sourceNote.content : '', // Empty content if not copying
            createdAt: now,
            updatedAt: now,
        }

        setWorkspacesWithHistory(workspaces.map(ws =>
            ws.id === workspaceId
                ? { ...ws, notes: [...ws.notes, duplicatedNote], isExpanded: true }
                : ws
        ))
        setCurrentWorkspaceId(workspaceId)
        setCurrentNoteId(duplicatedNote.id)
        setCurrentItemType('note')
    }

    const deleteNote = (workspaceId: string, noteId: string) => {
        const workspace = workspaces.find(w => w.id === workspaceId)
        if (!workspace) return
        
        // Check if this is the last note and there are no tables
        if (workspace.notes.length === 1 && workspace.tables.length === 0) {
            alert('Cannot delete the last item in a workspace. Add a table first or delete the workspace.')
            return
        }
        
        setWorkspacesWithHistory(workspaces.map(ws =>
            ws.id === workspaceId
                ? { ...ws, notes: ws.notes.filter(n => n.id !== noteId) }
                : ws
        ))
        
        // If current note was deleted, switch to a table or another note
        if (currentNoteId === noteId) {
            const remainingNotes = workspace.notes.filter(n => n.id !== noteId)
            if (remainingNotes.length > 0) {
                setCurrentNoteId(remainingNotes[0].id)
            } else if (workspace.tables.length > 0) {
                setCurrentNoteId(null)
                setCurrentTableId(workspace.tables[0].id)
                setCurrentItemType('table')
                setSelectedTables([workspace.tables[0].id])
            }
        }
    }

    const renameNote = (noteId: string, name: string) => {
        if (!name.trim()) return
        updateNoteInWorkspaces(noteId, n => ({ ...n, name: name.trim() }))
    }

    const updateNoteContent = (noteId: string, content: string) => {
        updateNoteInWorkspaces(noteId, n => ({
            ...n,
            content,
            updatedAt: new Date().toISOString()
        }))
    }

    const updateNoteSettings = (noteId: string, settings: Partial<Pick<NoteItem, 'isMonospace' | 'wordWrap'>>) => {
        updateNoteInWorkspaces(noteId, n => ({ ...n, ...settings }))
    }

    const switchNote = (workspaceId: string, noteId: string) => {
        setCurrentWorkspaceId(workspaceId)
        setCurrentNoteId(noteId)
        setCurrentItemType('note')
        setSelectedTables([])  // Clear table selection when switching to note
        setCurrentTableId('')  // Clear current table
    }

    const reorderNotesInWorkspace = (workspaceId: string, noteIds: string[]) => {
        setWorkspacesWithHistory(workspaces.map(ws => {
            if (ws.id !== workspaceId) return ws
            const reorderedNotes = noteIds
                .map(id => ws.notes.find(n => n.id === id))
                .filter((n): n is NoteItem => n !== undefined)
            return { ...ws, notes: reorderedNotes }
        }))
    }

    const moveNoteToWorkspace = async (noteId: string, fromWorkspaceId: string, toWorkspaceId: string) => {
        if (fromWorkspaceId === toWorkspaceId) return

        // 1. Optimistic update - update local state immediately
        setWorkspacesWithHistory(prev => {
            const fromWorkspace = prev.find(ws => ws.id === fromWorkspaceId)
            const noteToMove = fromWorkspace?.notes.find(n => n.id === noteId)
            if (!noteToMove) {
                console.warn('moveNoteToWorkspace: note not found', noteId)
                return prev
            }

            return prev.map(ws => {
                if (ws.id === fromWorkspaceId) {
                    return { ...ws, notes: ws.notes.filter(n => n.id !== noteId) }
                }
                if (ws.id === toWorkspaceId) {
                    return { ...ws, notes: [...ws.notes, noteToMove] }
                }
                return ws
            })
        })

        // Update current workspace if needed
        if (currentNoteId === noteId) {
            setCurrentWorkspaceId(toWorkspaceId)
        }

        // 2. Immediately sync to cloud (no debounce for moves)
        if (isAuthenticated) {
            try {
                await syncService.moveNote(noteId, toWorkspaceId)
                lastSyncTimeRef.current = Date.now() // Mark as our own change
                console.log('✅ Note moved and synced:', noteId, '→', toWorkspaceId)
            } catch (error) {
                console.error('Failed to sync note move:', error)
                // Could rollback here, but for now just log
            }
        }
    }

    return (
        <TableContext.Provider value={{
            workspaces,
            currentWorkspaceId,
            currentTableId,
            currentNoteId,
            currentItemType,
            currentWorkspace,
            currentTable,
            currentNote,
            selectedTableIds,
            createWorkspace,
            deleteWorkspace,
            renameWorkspace,
            toggleWorkspaceExpanded,
            reorderWorkspaces,
            createTable,
            duplicateTable,
            deleteTable,
            renameTable,
            reorderTablesInWorkspace,
            moveTableToWorkspace,
            switchTable,
            toggleTableSelection,
            setSelectedTables,
            updateTable,
            updateTableById,
            updateTableColumns,
            updateTableAppearance,
            updateTableCell,
            updateTableCellColor,
            updateTableRowColor,
            deleteTableRow,
            addTableRowSibling,
            addTableRowChild,
            addTableRow,
            toggleTableRow,
            createNote,
            duplicateNote,
            deleteNote,
            renameNote,
            updateNoteContent,
            updateNoteSettings,
            switchNote,
            reorderNotesInWorkspace,
            moveNoteToWorkspace,
            getTableById,
            getNoteById,
            getWorkspaceByTableId,
            getWorkspaceByNoteId,
            undo,
            redo,
            canUndo,
            canRedo,
            // Cloud sync
            isSyncing,
            syncError,
            syncWorkspaces,
            setWorkspaceVisibility,
        }}>
            {children}
        </TableContext.Provider>
    )
}

export function useTableContext() {
    const context = useContext(TableContext)
    if (!context) {
        throw new Error('useTableContext must be used within TableProvider')
    }
    return context
}
