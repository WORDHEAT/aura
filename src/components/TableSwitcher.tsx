import { useState, useRef, useCallback } from 'react'
import { Plus, Check, X, LayoutGrid, ChevronDown, ChevronRight, Folder, FolderOpen, Table as TableIcon, Trash2, Copy, FileText, Settings, Users, Globe } from 'lucide-react'
import { useTableContext, type Workspace, type TableItem, type NoteItem } from '../context/TableContext'
import { useSettings } from '../context/SettingsContext'
import { SyncIndicator } from './SyncIndicator'
import { WorkspaceSettingsModal } from './WorkspaceSettingsModal'
import {
    DndContext, 
    pointerWithin,
    KeyboardSensor,
    PointerSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    useDroppable,
    type DragEndEvent,
    type DragStartEvent,
    type DragOverEvent
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Droppable Workspace Header for cross-workspace moves
interface DroppableHeaderProps {
    workspaceId: string
    isOver: boolean
    disabled?: boolean
    children: React.ReactNode
}

function DroppableHeader({ workspaceId, isOver, disabled, children }: DroppableHeaderProps) {
    const { setNodeRef, isOver: isOverThis } = useDroppable({
        id: `workspace-drop-${workspaceId}`,
        data: { type: 'workspace', workspaceId },
        disabled: disabled
    })

    const showDropIndicator = !disabled && (isOver || isOverThis)

    return (
        <div ref={disabled ? undefined : setNodeRef} className="relative">
            {children}
            {showDropIndicator && (
                <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-500 rounded-lg pointer-events-none z-10 flex items-center justify-center">
                    <span className="text-blue-400 text-xs font-medium bg-[#191919] px-2 py-1 rounded">Drop here</span>
                </div>
            )}
        </div>
    )
}

// Sortable Workspace Wrapper for reordering workspaces
interface SortableWorkspaceProps {
    workspaceId: string
    children: React.ReactNode
}

function SortableWorkspaceWrapper({ workspaceId, children }: SortableWorkspaceProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: `workspace-sortable-${workspaceId}` })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {children}
        </div>
    )
}

// Sortable Table Row Component
interface SortableTableRowProps {
    table: TableItem
    workspace: Workspace
    currentTableId: string
    selectedTableIds: string[]
    editingId: string | null
    editingName: string
    deleteConfirm: { type: 'workspace' | 'table' | 'note', id: string, workspaceId?: string } | null
    duplicateOptions: { type: 'table' | 'note', id: string, workspaceId: string } | null
    onTableClick: (e: React.MouseEvent, workspaceId: string, tableId: string) => void
    onLongPress: (workspaceId: string, tableId: string) => void
    onStartRename: (id: string, name: string) => void
    onRenameTable: (tableId: string) => void
    setEditingId: (id: string | null) => void
    setEditingName: (name: string) => void
    onShowDuplicateOptions: (workspaceId: string, tableId: string) => void
    onDuplicate: (workspaceId: string, tableId: string, withContent: boolean) => void
    onCancelDuplicate: () => void
    onDelete: (id: string) => void
    onConfirmDelete: () => void
    onCancelDelete: () => void
}

function SortableTableRow({
    table,
    workspace,
    currentTableId,
    selectedTableIds,
    editingId,
    editingName,
    deleteConfirm,
    duplicateOptions,
    onTableClick,
    onLongPress,
    onStartRename,
    onRenameTable,
    setEditingId,
    setEditingName,
    onShowDuplicateOptions,
    onDuplicate,
    onCancelDuplicate,
    onDelete,
    onConfirmDelete,
    onCancelDelete,
}: SortableTableRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: table.id })

    // Long press for selection (works on both desktop and mobile)
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isLongPressRef = useRef(false)

    const startLongPress = useCallback(() => {
        isLongPressRef.current = false
        longPressTimerRef.current = setTimeout(() => {
            isLongPressRef.current = true
            onLongPress(workspace.id, table.id)
            if (navigator.vibrate) navigator.vibrate(50)
        }, 500)
    }, [onLongPress, workspace.id, table.id])

    const cancelLongPress = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }
    }, [])

    const handleClick = useCallback((e: React.MouseEvent) => {
        if (isLongPressRef.current) {
            isLongPressRef.current = false
            return
        }
        onTableClick(e, workspace.id, table.id)
    }, [onTableClick, workspace.id, table.id])

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 'auto',
    }

    return (
        <div ref={setNodeRef} style={style}>
            <div
                {...attributes}
                {...listeners}
                onClick={handleClick}
                onMouseDown={startLongPress}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={startLongPress}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all group cursor-grab active:cursor-grabbing select-none ${
                    selectedTableIds.includes(table.id)
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : currentTableId === table.id
                            ? 'bg-[#333] text-[#e3e3e3]'
                            : 'text-[#9b9b9b] hover:bg-[#2a2a2a] hover:text-[#e3e3e3]'
                }`}
            >
                <TableIcon size={12} className={selectedTableIds.includes(table.id) || currentTableId === table.id ? 'text-blue-400' : 'text-[#6b6b6b]'} />
                
                {editingId === table.id ? (
                    <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => onRenameTable(table.id)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onRenameTable(table.id)
                            if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="flex-1 bg-[#191919] border border-[#373737] px-2 py-0.5 rounded text-xs outline-none focus:border-blue-500 text-[#e3e3e3] min-w-0"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span 
                        className="flex-1 text-xs truncate"
                        onDoubleClick={(e) => {
                            e.stopPropagation()
                            onStartRename(table.id, table.name)
                        }}
                    >
                        {table.name}
                    </span>
                )}
                
                <div className="flex items-center gap-0.5 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onShowDuplicateOptions(workspace.id, table.id)
                        }}
                        className="text-[#6b6b6b] hover:text-blue-400 p-1.5 rounded hover:bg-[#333]"
                        title="Duplicate table"
                    >
                        <Copy size={12} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete(table.id)
                        }}
                        className="text-[#6b6b6b] hover:text-red-400 p-1.5 rounded hover:bg-[#333]"
                        title="Delete table"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>

            {/* Duplicate Options */}
            {duplicateOptions?.type === 'table' && duplicateOptions.id === table.id && (
                <div className="ml-4 mt-1 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg animate-in fade-in text-xs">
                    <div className="text-blue-300 mb-2">Duplicate with content?</div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => onDuplicate(workspace.id, table.id, true)}
                            className="flex-1 px-2 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded border border-blue-500/30 transition-colors"
                        >
                            With content
                        </button>
                        <button 
                            onClick={() => onDuplicate(workspace.id, table.id, false)}
                            className="flex-1 px-2 py-1.5 bg-[#2a2a2a] hover:bg-[#333] text-[#e3e3e3] rounded border border-[#373737] transition-colors"
                        >
                            Empty cells
                        </button>
                        <button 
                            onClick={onCancelDuplicate}
                            className="p-1.5 text-[#6b6b6b] hover:text-[#e3e3e3]"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirm?.type === 'table' && deleteConfirm.id === table.id && (
                <div className="ml-4 mt-1 p-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between animate-in fade-in text-xs">
                    <span className="text-red-300">Delete table?</span>
                    <div className="flex gap-1">
                        <button onClick={onConfirmDelete} className="text-red-400 hover:text-red-300 p-1">
                            <Check size={12} />
                        </button>
                        <button onClick={onCancelDelete} className="text-[#9b9b9b] hover:text-[#e3e3e3] p-1">
                            <X size={12} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// Sortable Note Row Component
interface SortableNoteRowProps {
    note: NoteItem
    workspace: Workspace
    currentNoteId: string | null
    selectedTableIds: string[]
    editingId: string | null
    editingName: string
    deleteConfirm: { type: 'workspace' | 'table' | 'note', id: string, workspaceId?: string } | null
    duplicateOptions: { type: 'table' | 'note', id: string, workspaceId: string } | null
    onNoteClick: (e: React.MouseEvent, workspaceId: string, noteId: string) => void
    onLongPress: (workspaceId: string, noteId: string) => void
    onStartRename: (id: string, name: string) => void
    onRenameNote: (noteId: string) => void
    setEditingId: (id: string | null) => void
    setEditingName: (name: string) => void
    onShowDuplicateOptions: (workspaceId: string, noteId: string) => void
    onDuplicate: (workspaceId: string, noteId: string, withContent: boolean) => void
    onCancelDuplicate: () => void
    onDelete: (id: string) => void
    onConfirmDelete: () => void
    onCancelDelete: () => void
}

function SortableNoteRow({
    note,
    workspace,
    currentNoteId,
    selectedTableIds,
    editingId,
    editingName,
    deleteConfirm,
    duplicateOptions,
    onNoteClick,
    onLongPress,
    onStartRename,
    onRenameNote,
    setEditingId,
    setEditingName,
    onShowDuplicateOptions,
    onDuplicate,
    onCancelDuplicate,
    onDelete,
    onConfirmDelete,
    onCancelDelete,
}: SortableNoteRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: note.id })

    // Long press for selection (works on both desktop and mobile)
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isLongPressRef = useRef(false)

    const startLongPress = useCallback(() => {
        isLongPressRef.current = false
        longPressTimerRef.current = setTimeout(() => {
            isLongPressRef.current = true
            onLongPress(workspace.id, note.id)
            if (navigator.vibrate) navigator.vibrate(50)
        }, 500)
    }, [onLongPress, workspace.id, note.id])

    const cancelLongPress = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
        }
    }, [])

    const handleClick = useCallback((e: React.MouseEvent) => {
        if (isLongPressRef.current) {
            isLongPressRef.current = false
            return
        }
        onNoteClick(e, workspace.id, note.id)
    }, [onNoteClick, workspace.id, note.id])

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div ref={setNodeRef} style={style}>
            <div
                {...attributes}
                {...listeners}
                onClick={handleClick}
                onMouseDown={startLongPress}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={startLongPress}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all group cursor-grab active:cursor-grabbing select-none ${
                    selectedTableIds.includes(note.id)
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : currentNoteId === note.id
                            ? 'bg-[#333] text-[#e3e3e3]'
                            : 'text-[#9b9b9b] hover:bg-[#2a2a2a] hover:text-[#e3e3e3]'
                }`}
            >
                <FileText size={12} className={selectedTableIds.includes(note.id) || currentNoteId === note.id ? 'text-green-400' : 'text-[#6b6b6b]'} />
                
                {editingId === note.id ? (
                    <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => onRenameNote(note.id)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onRenameNote(note.id)
                            if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="flex-1 bg-[#191919] border border-[#373737] px-2 py-0.5 rounded text-xs outline-none focus:border-blue-500 text-[#e3e3e3] min-w-0"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span 
                        className="flex-1 text-xs truncate"
                        onDoubleClick={(e) => {
                            e.stopPropagation()
                            onStartRename(note.id, note.name)
                        }}
                    >
                        {note.name}
                    </span>
                )}
                
                <div className="flex items-center gap-0.5 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onShowDuplicateOptions(workspace.id, note.id)
                        }}
                        className="text-[#6b6b6b] hover:text-blue-400 p-1.5 rounded hover:bg-[#333]"
                        title="Duplicate note"
                    >
                        <Copy size={12} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete(note.id)
                        }}
                        className="text-[#6b6b6b] hover:text-red-400 p-1.5 rounded hover:bg-[#333]"
                        title="Delete note"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>

            {/* Duplicate Options */}
            {duplicateOptions?.type === 'note' && duplicateOptions.id === note.id && (
                <div className="ml-4 mt-1 p-2 bg-green-500/10 border border-green-500/30 rounded-lg animate-in fade-in text-xs">
                    <div className="text-green-300 mb-2">Duplicate with content?</div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => onDuplicate(workspace.id, note.id, true)}
                            className="flex-1 px-2 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded border border-green-500/30 transition-colors"
                        >
                            With content
                        </button>
                        <button 
                            onClick={() => onDuplicate(workspace.id, note.id, false)}
                            className="flex-1 px-2 py-1.5 bg-[#2a2a2a] hover:bg-[#333] text-[#e3e3e3] rounded border border-[#373737] transition-colors"
                        >
                            Empty
                        </button>
                        <button 
                            onClick={onCancelDuplicate}
                            className="p-1.5 text-[#6b6b6b] hover:text-[#e3e3e3]"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirm?.type === 'note' && deleteConfirm.id === note.id && (
                <div className="ml-4 mt-1 p-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between animate-in fade-in text-xs">
                    <span className="text-red-300">Delete note?</span>
                    <div className="flex gap-1">
                        <button onClick={onConfirmDelete} className="text-red-400 hover:text-red-300 p-1">
                            <Check size={12} />
                        </button>
                        <button onClick={onCancelDelete} className="text-[#9b9b9b] hover:text-[#e3e3e3] p-1">
                            <X size={12} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

interface TableSwitcherProps {
    isCollapsed: boolean
    setIsCollapsed: (collapsed: boolean) => void
    onItemSelect?: () => void  // Called when an item is selected (for closing mobile drawer)
}

export function TableSwitcher({ isCollapsed, setIsCollapsed, onItemSelect }: TableSwitcherProps) {
    const { 
        workspaces, 
        currentTableId,
        currentNoteId,
        currentWorkspaceId,
        selectedTableIds, 
        switchTable, 
        createWorkspace,
        deleteWorkspace,
        renameWorkspace,
        toggleWorkspaceExpanded,
        createTable,
        duplicateTable,
        deleteTable, 
        renameTable,
        reorderTablesInWorkspace,
        reorderWorkspaces,
        toggleTableSelection,
        // Note operations
        createNote,
        duplicateNote,
        deleteNote,
        renameNote,
        switchNote,
        reorderNotesInWorkspace,
        // Move operations
        moveTableToWorkspace,
        moveNoteToWorkspace,
    } = useTableContext()
    
    // DnD Sensors - use both Mouse and Touch for better Electron compatibility
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 200, tolerance: 5 },
        }),
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // State for cross-workspace drag
    const { settings } = useSettings()
    const [dragOverWorkspaceId, setDragOverWorkspaceId] = useState<string | null>(null)
    const [activeDragItem, setActiveDragItem] = useState<{ type: 'table' | 'note' | 'workspace', id: string, workspaceId: string } | null>(null)
    
    const [showNewWorkspaceInput, setShowNewWorkspaceInput] = useState(false)
    const [newWorkspaceName, setNewWorkspaceName] = useState('')
    const [addingTableToWorkspace, setAddingTableToWorkspace] = useState<string | null>(null)
    const [newTableName, setNewTableName] = useState('')
    const [addingNoteToWorkspace, setAddingNoteToWorkspace] = useState<string | null>(null)
    const [newNoteName, setNewNoteName] = useState('')
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'workspace' | 'table' | 'note', id: string, workspaceId?: string } | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const [duplicateOptions, setDuplicateOptions] = useState<{ type: 'table' | 'note', id: string, workspaceId: string } | null>(null)
    const [workspaceSettingsId, setWorkspaceSettingsId] = useState<string | null>(null)

    const handleCreateWorkspace = () => {
        if (newWorkspaceName.trim()) {
            createWorkspace(newWorkspaceName.trim())
            setShowNewWorkspaceInput(false)
            setNewWorkspaceName('')
        }
    }

    const handleCreateTable = (workspaceId: string) => {
        if (newTableName.trim()) {
            createTable(workspaceId, newTableName.trim())
            setAddingTableToWorkspace(null)
            setNewTableName('')
        }
    }

    const handleStartRename = (id: string, name: string) => {
        setEditingId(id)
        setEditingName(name)
        setDeleteConfirm(null)
    }

    const handleRenameWorkspace = (id: string) => {
        if (editingName.trim()) {
            renameWorkspace(id, editingName.trim())
        }
        setEditingId(null)
    }

    const handleRenameTable = (tableId: string) => {
        if (editingName.trim()) {
            renameTable(tableId, editingName.trim())
        }
        setEditingId(null)
    }

    const handleCreateNote = (workspaceId: string) => {
        if (newNoteName.trim()) {
            createNote(workspaceId, newNoteName.trim())
            setAddingNoteToWorkspace(null)
            setNewNoteName('')
        }
    }

    const handleRenameNote = (noteId: string) => {
        if (editingName.trim()) {
            renameNote(noteId, editingName.trim())
        }
        setEditingId(null)
    }

    const handleTableClick = (e: React.MouseEvent, workspaceId: string, tableId: string) => {
        if (e.ctrlKey || e.metaKey) {
            toggleTableSelection(tableId)
        } else {
            switchTable(workspaceId, tableId)
            onItemSelect?.()  // Close mobile drawer
        }
    }

    const handleNoteClick = (e: React.MouseEvent, workspaceId: string, noteId: string) => {
        if (e.ctrlKey || e.metaKey) {
            toggleTableSelection(noteId)
        } else {
            switchNote(workspaceId, noteId)
            onItemSelect?.()  // Close mobile drawer
        }
    }

    // Long press handler for mobile selection
    const handleLongPress = useCallback((_workspaceId: string, itemId: string) => {
        toggleTableSelection(itemId)
    }, [toggleTableSelection])

    const handleConfirmDelete = () => {
        if (!deleteConfirm) return
        if (deleteConfirm.type === 'workspace') {
            deleteWorkspace(deleteConfirm.id)
        } else if (deleteConfirm.type === 'table' && deleteConfirm.workspaceId) {
            deleteTable(deleteConfirm.workspaceId, deleteConfirm.id)
        } else if (deleteConfirm.type === 'note' && deleteConfirm.workspaceId) {
            deleteNote(deleteConfirm.workspaceId, deleteConfirm.id)
        }
        setDeleteConfirm(null)
    }

    // Handle delete with optional confirmation based on settings
    const handleDeleteItem = (type: 'workspace' | 'table' | 'note', id: string, workspaceId?: string) => {
        if (settings.confirmBeforeDelete) {
            // Show inline confirmation
            setDeleteConfirm({ type, id, workspaceId })
        } else {
            // Delete immediately
            if (type === 'workspace') {
                deleteWorkspace(id)
            } else if (type === 'table' && workspaceId) {
                deleteTable(workspaceId, id)
            } else if (type === 'note' && workspaceId) {
                deleteNote(workspaceId, id)
            }
        }
    }

    // Global drag handlers for cross-workspace moves
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        const activeId = active.id as string
        
        // Check if it's a workspace being dragged
        if (activeId.startsWith('workspace-sortable-')) {
            const workspaceId = activeId.replace('workspace-sortable-', '')
            setActiveDragItem({ type: 'workspace', id: workspaceId, workspaceId })
            return
        }
        
        // Find which workspace and type this item belongs to
        for (const ws of workspaces) {
            const table = ws.tables.find(t => t.id === activeId)
            if (table) {
                setActiveDragItem({ type: 'table', id: activeId, workspaceId: ws.id })
                return
            }
            const note = ws.notes.find(n => n.id === activeId)
            if (note) {
                setActiveDragItem({ type: 'note', id: activeId, workspaceId: ws.id })
                return
            }
        }
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event
        if (over?.id && typeof over.id === 'string' && over.id.startsWith('workspace-drop-')) {
            const targetWorkspaceId = over.id.replace('workspace-drop-', '')
            setDragOverWorkspaceId(targetWorkspaceId)
        } else {
            setDragOverWorkspaceId(null)
        }
    }

    // Global drag end handler for all drag operations
    const handleGlobalDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        setDragOverWorkspaceId(null)
        
        if (!activeDragItem || !over) {
            setActiveDragItem(null)
            return
        }

        const activeId = active.id as string
        const overId = over.id as string

        // Check if dropped on a different workspace (cross-workspace move)
        if (overId.startsWith('workspace-drop-')) {
            const targetWorkspaceId = overId.replace('workspace-drop-', '')
            
            // Don't move to same workspace
            if (targetWorkspaceId !== activeDragItem.workspaceId) {
                if (activeDragItem.type === 'table') {
                    moveTableToWorkspace(activeId, activeDragItem.workspaceId, targetWorkspaceId)
                } else if (activeDragItem.type === 'note') {
                    moveNoteToWorkspace(activeId, activeDragItem.workspaceId, targetWorkspaceId)
                }
            }
            setActiveDragItem(null)
            return
        }

        // Handle workspace reordering
        if (activeDragItem.type === 'workspace') {
            const activeWsId = activeId.replace('workspace-sortable-', '')
            const overWsId = overId.replace('workspace-sortable-', '')
            if (activeWsId !== overWsId) {
                const oldIndex = workspaces.findIndex(ws => ws.id === activeWsId)
                const newIndex = workspaces.findIndex(ws => ws.id === overWsId)
                if (oldIndex !== -1 && newIndex !== -1) {
                    const newOrder = arrayMove(workspaces, oldIndex, newIndex)
                    reorderWorkspaces(newOrder)
                }
            }
            setActiveDragItem(null)
            return
        }

        // Handle within-workspace reordering (tables/notes)
        if (activeId !== overId) {
            const sourceWorkspace = workspaces.find(ws => ws.id === activeDragItem.workspaceId)
            if (!sourceWorkspace) {
                setActiveDragItem(null)
                return
            }

            if (activeDragItem.type === 'table') {
                const tables = sourceWorkspace.tables
                const oldIndex = tables.findIndex(t => t.id === activeId)
                const newIndex = tables.findIndex(t => t.id === overId)
                if (oldIndex !== -1 && newIndex !== -1) {
                    const newOrder = arrayMove(tables, oldIndex, newIndex)
                    reorderTablesInWorkspace(activeDragItem.workspaceId, newOrder.map(t => t.id))
                }
            } else if (activeDragItem.type === 'note') {
                const notes = sourceWorkspace.notes
                const oldIndex = notes.findIndex(n => n.id === activeId)
                const newIndex = notes.findIndex(n => n.id === overId)
                if (oldIndex !== -1 && newIndex !== -1) {
                    const newOrder = arrayMove(notes, oldIndex, newIndex)
                    reorderNotesInWorkspace(activeDragItem.workspaceId, newOrder.map(n => n.id))
                }
            }
        }
        
        setActiveDragItem(null)
    }

    const renderWorkspace = (workspace: Workspace) => {
        const isExpanded = workspace.isExpanded !== false
        const isCurrentWorkspace = workspace.id === currentWorkspaceId
        const isDraggingWorkspace = activeDragItem?.type === 'workspace'
        // Only show drop target when dragging tables/notes, not when dragging workspaces
        const isDropTarget = dragOverWorkspaceId === workspace.id 
            && activeDragItem?.workspaceId !== workspace.id 
            && !isDraggingWorkspace
        
        return (
            <SortableWorkspaceWrapper key={workspace.id} workspaceId={workspace.id}>
                <div className="mb-2">
                    {/* Workspace Header - Droppable zone for cross-workspace moves (disabled when dragging workspaces) */}
                    <DroppableHeader workspaceId={workspace.id} isOver={isDropTarget} disabled={isDraggingWorkspace}>
                        <div className={`flex items-center gap-2 px-2 py-2 rounded-lg transition-all group cursor-grab active:cursor-grabbing ${
                            isCurrentWorkspace ? 'bg-[#2a2a2a]' : 'hover:bg-[#2a2a2a]/50'
                        }`}>
                    <button
                        onClick={() => toggleWorkspaceExpanded(workspace.id)}
                        className="text-[#6b6b6b] hover:text-[#e3e3e3] transition-colors"
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    
                    {isExpanded ? (
                        <FolderOpen size={14} className="text-blue-400" />
                    ) : (
                        <Folder size={14} className="text-[#6b6b6b]" />
                    )}
                    
                    {editingId === workspace.id ? (
                        <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => handleRenameWorkspace(workspace.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameWorkspace(workspace.id)
                                if (e.key === 'Escape') setEditingId(null)
                            }}
                            className="flex-1 bg-[#191919] border border-[#373737] px-2 py-0.5 rounded text-sm outline-none focus:border-blue-500 text-[#e3e3e3] min-w-0"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span 
                            className="flex-1 text-sm font-medium text-[#e3e3e3] truncate hover:text-blue-400 transition-colors"
                            onDoubleClick={() => handleStartRename(workspace.id, workspace.name)}
                        >
                            {workspace.name}
                        </span>
                    )}

                    {/* Visibility indicator */}
                    {workspace.visibility && workspace.visibility !== 'private' && (
                        <span className="flex items-center" title={workspace.visibility === 'team' ? 'Team workspace' : 'Public workspace'}>
                            {workspace.visibility === 'team' ? (
                                <Users size={12} className="text-blue-400" />
                            ) : (
                                <Globe size={12} className="text-green-400" />
                            )}
                        </span>
                    )}
                    
                    <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setWorkspaceSettingsId(workspace.id)
                            }}
                            className="text-[#6b6b6b] hover:text-[#e3e3e3] p-1.5 rounded hover:bg-[#333] transition-colors"
                            title="Workspace settings"
                        >
                            <Settings size={14} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setAddingTableToWorkspace(workspace.id)
                                setNewTableName('')
                            }}
                            className="text-[#6b6b6b] hover:text-blue-400 p-1.5 rounded hover:bg-[#333] transition-colors"
                            title="Add table"
                        >
                            <TableIcon size={14} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setAddingNoteToWorkspace(workspace.id)
                                setNewNoteName('')
                            }}
                            className="text-[#6b6b6b] hover:text-green-400 p-1.5 rounded hover:bg-[#333] transition-colors"
                            title="Add note"
                        >
                            <FileText size={14} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteItem('workspace', workspace.id)
                            }}
                            className="text-[#6b6b6b] hover:text-red-400 p-1.5 rounded hover:bg-[#333] transition-colors"
                            title="Delete workspace"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                    </div>
                </DroppableHeader>

                {/* Delete Confirmation for Workspace */}
                {deleteConfirm?.type === 'workspace' && deleteConfirm.id === workspace.id && (
                    <div className="ml-6 mt-1 p-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between animate-in fade-in">
                        <span className="text-xs text-red-300">Delete workspace?</span>
                        <div className="flex gap-1">
                            <button onClick={handleConfirmDelete} className="text-red-400 hover:text-red-300 p-1">
                                <Check size={14} />
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-[#9b9b9b] hover:text-[#e3e3e3] p-1">
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Tables List */}
                {isExpanded && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l border-[#373737] pl-2">
                        {/* New Table Input */}
                        {addingTableToWorkspace === workspace.id && (
                            <div className="flex items-center gap-1 p-1 bg-[#191919] rounded-md border border-[#373737] animate-in fade-in">
                                <TableIcon size={12} className="text-blue-400 ml-1 flex-shrink-0" />
                                <input
                                    type="text"
                                    value={newTableName}
                                    onChange={(e) => setNewTableName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreateTable(workspace.id)
                                        if (e.key === 'Escape') setAddingTableToWorkspace(null)
                                    }}
                                    placeholder="Table name..."
                                    className="flex-1 min-w-0 bg-transparent px-2 py-1 text-sm outline-none text-[#e3e3e3] placeholder-[#6b6b6b]"
                                    autoFocus
                                />
                                <button onClick={() => handleCreateTable(workspace.id)} className="text-green-400 hover:bg-green-400/20 p-1.5 rounded transition-colors flex-shrink-0">
                                    <Check size={14} />
                                </button>
                                <button onClick={() => setAddingTableToWorkspace(null)} className="text-red-400 hover:bg-red-400/20 p-1.5 rounded transition-colors flex-shrink-0">
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        {/* Tables with Drag & Drop - uses global DndContext */}
                        <SortableContext
                            items={workspace.tables.filter(t => !t.isArchived).map(t => t.id)}
                            strategy={verticalListSortingStrategy}
                        >
                        {workspace.tables.filter(t => !t.isArchived).map((table) => (
                            <SortableTableRow
                                key={table.id}
                                table={table}
                                workspace={workspace}
                                currentTableId={currentTableId}
                                selectedTableIds={selectedTableIds}
                                editingId={editingId}
                                editingName={editingName}
                                deleteConfirm={deleteConfirm}
                                duplicateOptions={duplicateOptions}
                                onTableClick={handleTableClick}
                                onLongPress={handleLongPress}
                                onStartRename={handleStartRename}
                                onRenameTable={handleRenameTable}
                                setEditingId={setEditingId}
                                setEditingName={setEditingName}
                                onShowDuplicateOptions={(wsId, tblId) => setDuplicateOptions({ type: 'table', id: tblId, workspaceId: wsId })}
                                onDuplicate={(wsId, tblId, withContent) => {
                                    duplicateTable(wsId, tblId, withContent)
                                    setDuplicateOptions(null)
                                }}
                                onCancelDuplicate={() => setDuplicateOptions(null)}
                                onDelete={(id: string) => handleDeleteItem('table', id, workspace.id)}
                                onConfirmDelete={handleConfirmDelete}
                                onCancelDelete={() => setDeleteConfirm(null)}
                            />
                        ))}
                        </SortableContext>

                        {/* Notes Section with Drag & Drop - uses global DndContext */}
                        {workspace.notes.filter(n => !n.isArchived).length > 0 && (
                            <div className="mt-2 pt-2 border-t border-[#373737]/50">
                                <div className="text-[10px] uppercase tracking-wider text-[#6b6b6b] mb-1 px-1">Notes</div>
                                <SortableContext
                                    items={workspace.notes.filter(n => !n.isArchived).map(n => n.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                {workspace.notes.filter(n => !n.isArchived).map((note) => (
                                    <SortableNoteRow
                                        key={note.id}
                                        note={note}
                                        workspace={workspace}
                                        currentNoteId={currentNoteId}
                                        selectedTableIds={selectedTableIds}
                                        editingId={editingId}
                                        editingName={editingName}
                                        deleteConfirm={deleteConfirm}
                                        duplicateOptions={duplicateOptions}
                                        onNoteClick={handleNoteClick}
                                        onLongPress={handleLongPress}
                                        onStartRename={handleStartRename}
                                        onRenameNote={handleRenameNote}
                                        setEditingId={setEditingId}
                                        setEditingName={setEditingName}
                                        onShowDuplicateOptions={(wsId, noteId) => setDuplicateOptions({ type: 'note', id: noteId, workspaceId: wsId })}
                                        onDuplicate={(wsId, noteId, withContent) => {
                                            duplicateNote(wsId, noteId, withContent)
                                            setDuplicateOptions(null)
                                        }}
                                        onCancelDuplicate={() => setDuplicateOptions(null)}
                                        onDelete={(id: string) => handleDeleteItem('note', id, workspace.id)}
                                        onConfirmDelete={handleConfirmDelete}
                                        onCancelDelete={() => setDeleteConfirm(null)}
                                    />
                                ))}
                                </SortableContext>
                            </div>
                        )}

                        {/* Add Note Input */}
                        {addingNoteToWorkspace === workspace.id && (
                            <div className="flex items-center gap-1 p-1 mt-2 bg-[#191919] rounded-md border border-[#373737] animate-in fade-in">
                                <FileText size={12} className="text-green-400 ml-1 flex-shrink-0" />
                                <input
                                    type="text"
                                    value={newNoteName}
                                    onChange={(e) => setNewNoteName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreateNote(workspace.id)
                                        if (e.key === 'Escape') setAddingNoteToWorkspace(null)
                                    }}
                                    placeholder="Note name..."
                                    className="flex-1 min-w-0 bg-transparent px-2 py-1 text-sm outline-none text-[#e3e3e3] placeholder-[#6b6b6b]"
                                    autoFocus
                                />
                                <button onClick={() => handleCreateNote(workspace.id)} className="text-green-400 hover:bg-green-400/20 p-1.5 rounded transition-colors flex-shrink-0">
                                    <Check size={14} />
                                </button>
                                <button onClick={() => setAddingNoteToWorkspace(null)} className="text-red-400 hover:bg-red-400/20 p-1.5 rounded transition-colors flex-shrink-0">
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
                </div>
            </SortableWorkspaceWrapper>
        )
    }

    return (
        <div className={`bg-[#202020] border border-[#373737] rounded-xl shadow-lg flex flex-col gap-4 h-full max-h-full lg:max-h-[calc(100vh-120px)] transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-4'}`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`flex items-center gap-2 text-[#e3e3e3] hover:text-blue-400 transition-colors group ${isCollapsed ? 'justify-center w-full' : ''}`}
                    title={isCollapsed ? "Expand workspaces" : "Collapse workspaces"}
                >
                    {isCollapsed ? (
                        <ChevronRight size={20} className="text-[#6b6b6b] group-hover:text-blue-400" />
                    ) : (
                        <>
                            <ChevronDown size={16} className="text-[#6b6b6b] group-hover:text-blue-400" />
                            <LayoutGrid size={18} className="text-blue-400" />
                            <span className="text-sm font-medium">Workspaces</span>
                        </>
                    )}
                </button>
                {!isCollapsed && (
                    <div className="flex items-center gap-1">
                        <SyncIndicator />
                        <button
                            onClick={() => {
                                setShowNewWorkspaceInput(true)
                                setIsCollapsed(false)
                            }}
                            className="text-[#9b9b9b] hover:text-blue-400 transition-colors bg-[#2a2a2a] hover:bg-[#333] p-1.5 rounded-md"
                            title="Create new workspace"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                )}
            </div>

            {!isCollapsed && (
                <>
                    {showNewWorkspaceInput && (
                        <div className="flex items-center gap-1 p-1 bg-[#191919] rounded-md border border-[#373737] animate-in fade-in slide-in-from-top-2 focus-within:border-blue-500">
                            <input
                                type="text"
                                value={newWorkspaceName}
                                onChange={(e) => setNewWorkspaceName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateWorkspace()
                                    if (e.key === 'Escape') {
                                        setShowNewWorkspaceInput(false)
                                        setNewWorkspaceName('')
                                    }
                                }}
                                placeholder="Workspace name..."
                                className="flex-1 bg-transparent border-none px-2 py-1 text-sm outline-none text-[#e3e3e3] placeholder-[#6b6b6b]"
                                autoFocus
                            />
                            <button onClick={handleCreateWorkspace} className="text-green-400 hover:text-green-300 p-1.5 rounded hover:bg-[#2a2a2a] transition-colors">
                                <Check size={14} />
                            </button>
                            <button
                                onClick={() => {
                                    setShowNewWorkspaceInput(false)
                                    setNewWorkspaceName('')
                                }}
                                className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-[#2a2a2a] transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    <div className="overflow-y-auto custom-scrollbar pr-1 flex-1 animate-in fade-in slide-in-from-top-2 duration-200">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={pointerWithin}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={handleGlobalDragEnd}
                        >
                            <SortableContext
                                items={workspaces.map(ws => `workspace-sortable-${ws.id}`)}
                                strategy={verticalListSortingStrategy}
                            >
                                {workspaces.map(renderWorkspace)}
                            </SortableContext>
                        </DndContext>
                    </div>
                </>
            )}

            {/* Workspace Settings Modal */}
            {workspaceSettingsId && (
                <WorkspaceSettingsModal
                    isOpen={!!workspaceSettingsId}
                    onClose={() => setWorkspaceSettingsId(null)}
                    workspaceId={workspaceSettingsId}
                />
            )}
        </div>
    )
}
