import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import type { Column, Row } from '../components/Table/Table'
import { useAuth } from './AuthContext'
import { syncService } from '../services/SyncService'
import { updateRowInTree, deleteRowFromTree, addSiblingToTree, addChildToRowInTree } from '../utils/treeUtils'

// Pending operation for offline queue
interface PendingOperation {
    id: string
    type: 'delete'
    entityType: 'workspace' | 'table' | 'note'
    entityId: string
    workspaceId?: string
    timestamp: number
}

// Helper to get/set pending operations from localStorage
const PENDING_OPS_KEY = 'aura-pending-operations'
const getPendingOps = (): PendingOperation[] => {
    try {
        return JSON.parse(localStorage.getItem(PENDING_OPS_KEY) || '[]')
    } catch { return [] }
}
const savePendingOps = (ops: PendingOperation[]) => {
    localStorage.setItem(PENDING_OPS_KEY, JSON.stringify(ops))
}
const addPendingDelete = (entityType: 'workspace' | 'table' | 'note', entityId: string, workspaceId?: string) => {
    const ops = getPendingOps()
    ops.push({
        id: crypto.randomUUID(),
        type: 'delete',
        entityType,
        entityId,
        workspaceId,
        timestamp: Date.now()
    })
    savePendingOps(ops)
}

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
    // Trash/Archive support
    isArchived?: boolean
    archivedAt?: string
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
    // Trash/Archive support
    isArchived?: boolean
    archivedAt?: string
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
    // Trash/Archive
    getArchivedItems: () => { tables: (TableItem & { workspaceId: string; workspaceName: string })[]; notes: (NoteItem & { workspaceId: string; workspaceName: string })[] }
    restoreTable: (workspaceId: string, tableId: string) => void
    restoreNote: (workspaceId: string, noteId: string) => void
    permanentlyDeleteTable: (workspaceId: string, tableId: string) => void
    permanentlyDeleteNote: (workspaceId: string, noteId: string) => void
    emptyTrash: () => void
    // Undo/Redo
    undo: () => void
    redo: () => void
    canUndo: boolean
    canRedo: boolean
    // Cloud sync
    isSyncing: boolean
    syncError: string | null
    pendingOpsCount: number
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
    const [pendingOpsCount, setPendingOpsCount] = useState(() => getPendingOps().length)
    
    // Simple flags for sync
    const initialSyncDoneRef = useRef(false)
    const isLoadingFromCloudRef = useRef(false)
    
    // Ref to always access latest workspaces
    const workspacesRef = useRef(workspaces)
    workspacesRef.current = workspaces

    // Set user ID for sync service when auth changes
    useEffect(() => {
        syncService.setUserId(user?.id || null)
        initialSyncDoneRef.current = false
    }, [user])

    // Fetch workspaces from cloud on app load
    const syncWorkspaces = useCallback(async () => {
        if (!isAuthenticated || !user) return
        
        setIsSyncing(true)
        setSyncError(null)
        
        try {
            const cloudWorkspaces = await syncService.fetchWorkspaces()
            const currentWorkspaces = workspacesRef.current
            
            if (cloudWorkspaces.length > 0) {
                console.log('📥 Loaded', cloudWorkspaces.length, 'workspaces from cloud')
                
                // Preserve local expansion state only
                const finalWorkspaces = cloudWorkspaces.map(cloudWs => {
                    const localWs = currentWorkspaces.find(ws => ws.id === cloudWs.id)
                    return {
                        ...cloudWs,
                        isExpanded: localWs?.isExpanded ?? cloudWs.isExpanded
                    }
                })
                
                // Mark as loading from cloud to prevent triggering push
                isLoadingFromCloudRef.current = true
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

    // Auto-sync when user logs in - ONLY on initial load
    useEffect(() => {
        if (!isAuthenticated || !user) return
        
        // Only sync once on login
        if (initialSyncDoneRef.current) return
        
        const pendingSync = localStorage.getItem('aura-pending-sync')
        if (pendingSync) {
            try {
                const { workspaces: pendingWorkspaces, userId: pendingUserId } = JSON.parse(pendingSync)
                
                // Only push if pending sync belongs to current user
                if (pendingUserId === user.id) {
                    console.log('📤 Found pending sync from previous session, pushing first...')
                    pushToCloud(pendingWorkspaces).then(() => {
                        localStorage.removeItem('aura-pending-sync')
                        console.log('✅ Pending sync completed')
                        initialSyncDoneRef.current = true
                    }).catch(err => {
                        console.error('Failed to push pending sync:', err)
                        localStorage.removeItem('aura-pending-sync')
                        syncWorkspaces()
                    })
                } else {
                    // Pending sync belongs to different user - discard it
                    console.log('🗑️ Discarding pending sync from different user')
                    localStorage.removeItem('aura-pending-sync')
                    syncWorkspaces()
                }
            } catch (e) {
                console.error('Failed to parse pending sync:', e)
                localStorage.removeItem('aura-pending-sync')
                syncWorkspaces()
            }
        } else {
            // No pending changes, sync from cloud
            syncWorkspaces()
        }
    }, [isAuthenticated, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    // Track previous workspaces for change detection
    const prevWorkspacesRef = useRef<string>('')
    const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Push changes to cloud - returns true if ALL operations succeeded
    const pushToCloud = useCallback(async (workspacesToPush: Workspace[]): Promise<boolean> => {
        if (!isAuthenticated || !user) return false
        
        let hasErrors = false
        
        try {
            // Helper to update or create
            const upsertTable = async (workspaceId: string, table: TableItem, position: number) => {
                try {
                    await syncService.updateTable(table, position)
                } catch {
                    try {
                        await syncService.createTable(workspaceId, table, position)
                    } catch (err) {
                        console.error('❌ Table sync failed:', table.id, err)
                        hasErrors = true
                    }
                }
            }
            
            const upsertNote = async (workspaceId: string, note: NoteItem, position: number) => {
                try {
                    await syncService.updateNote(note, position)
                } catch {
                    try {
                        await syncService.createNote(workspaceId, note, position)
                    } catch (err) {
                        console.error('❌ Note sync failed:', note.id, err)
                        hasErrors = true
                    }
                }
            }
            
            // Process all workspaces
            const allPromises: Promise<void>[] = []
            
            for (const workspace of workspacesToPush) {
                const isOwner = workspace.ownerId === user.id || !workspace.ownerId
                const wsIndex = workspacesToPush.indexOf(workspace)
                
                // Only owners can create/update workspaces
                if (isOwner) {
                    allPromises.push(
                        syncService.updateWorkspace(workspace, wsIndex)
                            .catch(() => syncService.createWorkspace(workspace, wsIndex))
                            .catch(err => {
                                console.error('❌ Workspace sync failed:', workspace.id, err)
                                hasErrors = true
                            })
                    )
                }
                
                // Update tables in parallel
                for (let i = 0; i < workspace.tables.length; i++) {
                    allPromises.push(upsertTable(workspace.id, workspace.tables[i], i))
                }
                
                // Update notes in parallel
                for (let i = 0; i < workspace.notes.length; i++) {
                    allPromises.push(upsertNote(workspace.id, workspace.notes[i], i))
                }
            }
            
            await Promise.all(allPromises)
            
            // Process pending deletions
            const pendingOps = getPendingOps()
            const successfulDeletes: string[] = []
            
            for (const op of pendingOps) {
                if (op.type === 'delete') {
                    try {
                        if (op.entityType === 'workspace') {
                            await syncService.deleteWorkspace(op.entityId)
                            console.log('🗑️ Deleted workspace from cloud:', op.entityId)
                        } else if (op.entityType === 'table') {
                            await syncService.deleteTable(op.entityId)
                            console.log('🗑️ Deleted table from cloud:', op.entityId)
                        } else if (op.entityType === 'note') {
                            await syncService.deleteNote(op.entityId)
                            console.log('🗑️ Deleted note from cloud:', op.entityId)
                        }
                        successfulDeletes.push(op.id)
                    } catch (err) {
                        // Might already be deleted or user lacks permission - mark as successful anyway
                        console.warn('Delete operation failed (might already be deleted):', op.entityId, err)
                        successfulDeletes.push(op.id)
                    }
                }
            }
            
            // Remove processed operations from queue
            if (successfulDeletes.length > 0) {
                const remainingOps = pendingOps.filter(op => !successfulDeletes.includes(op.id))
                savePendingOps(remainingOps)
                setPendingOpsCount(remainingOps.length)
            }
            
            if (hasErrors) {
                console.warn('⚠️ Push completed with some errors')
                setSyncError('Some items failed to sync')
            } else {
                console.log('✅ Push complete')
                setSyncError(null)
            }
            
            return !hasErrors
        } catch (error) {
            console.error('Push to cloud error:', error)
            setSyncError('Sync failed')
            return false
        }
    }, [isAuthenticated, user])

    // Auto-push changes to cloud (500ms debounce to batch rapid changes)
    useEffect(() => {
        // Skip if not authenticated or loading from cloud
        if (!isAuthenticated || !user) {
            prevWorkspacesRef.current = JSON.stringify(workspaces)
            return
        }
        
        // Skip if we just loaded from cloud
        if (isLoadingFromCloudRef.current) {
            isLoadingFromCloudRef.current = false
            prevWorkspacesRef.current = JSON.stringify(workspaces)
            return
        }

        // Check if workspaces actually changed
        const currentWorkspacesJson = JSON.stringify(workspaces)
        if (currentWorkspacesJson === prevWorkspacesRef.current) {
            return
        }
        prevWorkspacesRef.current = currentWorkspacesJson

        // Debounce push (500ms)
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current)
        }

        syncTimeoutRef.current = setTimeout(async () => {
            const latestWorkspaces = workspacesRef.current
            console.log('⚡ Pushing changes to cloud...')
            await pushToCloud(latestWorkspaces)
        }, 500)

        return () => {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current)
            }
        }
    }, [workspaces, pushToCloud, isAuthenticated, user])

    // Save pending changes when leaving the page
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (syncTimeoutRef.current && isAuthenticated && user) {
                clearTimeout(syncTimeoutRef.current)
                // Store in localStorage as backup - will be pushed on next load
                const workspacesData = JSON.stringify({
                    workspaces: workspacesRef.current,
                    userId: user.id
                })
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
        
        // Track deletion for cloud sync
        const workspace = workspaces.find(w => w.id === id)
        if (workspace?.ownerId === user?.id || !workspace?.ownerId) {
            addPendingDelete('workspace', id)
            setPendingOpsCount(getPendingOps().length)
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
        
        // Archive instead of delete (soft delete)
        setWorkspacesWithHistory(workspaces.map(ws =>
            ws.id === workspaceId 
                ? { 
                    ...ws, 
                    tables: ws.tables.map(t => 
                        t.id === tableId 
                            ? { ...t, isArchived: true, archivedAt: new Date().toISOString() } 
                            : t
                    ) 
                } 
                : ws
        ))
        
        // Count non-archived items for selection logic
        const activeTables = workspace.tables.filter(t => t.id !== tableId && !t.isArchived)
        const activeNotes = workspace.notes.filter(n => !n.isArchived)
        
        // Update selection if needed
        if (currentTableId === tableId) {
            if (activeTables.length > 0) {
                setCurrentTableId(activeTables[0].id)
                setSelectedTables([activeTables[0].id])
            } else if (activeNotes.length > 0) {
                // Switch to first note if no tables left
                setCurrentNoteId(activeNotes[0].id)
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
        
        // Archive instead of delete (soft delete)
        setWorkspacesWithHistory(workspaces.map(ws =>
            ws.id === workspaceId
                ? { 
                    ...ws, 
                    notes: ws.notes.map(n => 
                        n.id === noteId 
                            ? { ...n, isArchived: true, archivedAt: new Date().toISOString() } 
                            : n
                    ) 
                }
                : ws
        ))
        
        // Count non-archived items for selection logic
        const activeNotes = workspace.notes.filter(n => n.id !== noteId && !n.isArchived)
        const activeTables = workspace.tables.filter(t => !t.isArchived)
        
        // If current note was deleted, switch to another note or table
        if (currentNoteId === noteId) {
            if (activeNotes.length > 0) {
                setCurrentNoteId(activeNotes[0].id)
            } else if (activeTables.length > 0) {
                setCurrentNoteId(null)
                setCurrentTableId(activeTables[0].id)
                setCurrentItemType('table')
                setSelectedTables([activeTables[0].id])
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
                console.log('✅ Note moved and synced:', noteId, '→', toWorkspaceId)
            } catch (error) {
                console.error('Failed to sync note move:', error)
                // Could rollback here, but for now just log
            }
        }
    }

    // ===== TRASH/ARCHIVE FUNCTIONS =====
    const getArchivedItems = () => {
        const tables: (TableItem & { workspaceId: string; workspaceName: string })[] = []
        const notes: (NoteItem & { workspaceId: string; workspaceName: string })[] = []
        
        workspaces.forEach(ws => {
            ws.tables.filter(t => t.isArchived).forEach(t => {
                tables.push({ ...t, workspaceId: ws.id, workspaceName: ws.name })
            })
            ws.notes.filter(n => n.isArchived).forEach(n => {
                notes.push({ ...n, workspaceId: ws.id, workspaceName: ws.name })
            })
        })
        
        // Sort by archived date (most recent first)
        tables.sort((a, b) => (b.archivedAt || '').localeCompare(a.archivedAt || ''))
        notes.sort((a, b) => (b.archivedAt || '').localeCompare(a.archivedAt || ''))
        
        return { tables, notes }
    }

    const restoreTable = (workspaceId: string, tableId: string) => {
        setWorkspacesWithHistory(workspaces.map(ws =>
            ws.id === workspaceId
                ? {
                    ...ws,
                    tables: ws.tables.map(t =>
                        t.id === tableId
                            ? { ...t, isArchived: false, archivedAt: undefined }
                            : t
                    )
                }
                : ws
        ))
    }

    const restoreNote = (workspaceId: string, noteId: string) => {
        setWorkspacesWithHistory(workspaces.map(ws =>
            ws.id === workspaceId
                ? {
                    ...ws,
                    notes: ws.notes.map(n =>
                        n.id === noteId
                            ? { ...n, isArchived: false, archivedAt: undefined }
                            : n
                    )
                }
                : ws
        ))
    }

    const permanentlyDeleteTable = (workspaceId: string, tableId: string) => {
        // Track deletion for cloud sync
        addPendingDelete('table', tableId, workspaceId)
        setPendingOpsCount(getPendingOps().length)
        
        setWorkspacesWithHistory(workspaces.map(ws =>
            ws.id === workspaceId
                ? { ...ws, tables: ws.tables.filter(t => t.id !== tableId) }
                : ws
        ))
    }

    const permanentlyDeleteNote = (workspaceId: string, noteId: string) => {
        // Track deletion for cloud sync
        addPendingDelete('note', noteId, workspaceId)
        setPendingOpsCount(getPendingOps().length)
        
        setWorkspacesWithHistory(workspaces.map(ws =>
            ws.id === workspaceId
                ? { ...ws, notes: ws.notes.filter(n => n.id !== noteId) }
                : ws
        ))
    }

    const emptyTrash = () => {
        const { tables, notes } = getArchivedItems()
        
        // Track all deletions for cloud sync
        tables.forEach(t => {
            addPendingDelete('table', t.id, t.workspaceId)
        })
        notes.forEach(n => {
            addPendingDelete('note', n.id, n.workspaceId)
        })
        setPendingOpsCount(getPendingOps().length)
        
        // Remove all archived items
        setWorkspacesWithHistory(workspaces.map(ws => ({
            ...ws,
            tables: ws.tables.filter(t => !t.isArchived),
            notes: ws.notes.filter(n => !n.isArchived)
        })))
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
            // Trash/Archive
            getArchivedItems,
            restoreTable,
            restoreNote,
            permanentlyDeleteTable,
            permanentlyDeleteNote,
            emptyTrash,
            undo,
            redo,
            canUndo,
            canRedo,
            // Cloud sync
            isSyncing,
            syncError,
            pendingOpsCount,
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
