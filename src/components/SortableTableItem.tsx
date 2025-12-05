import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Table as TableIcon, Trash2, Check, X } from 'lucide-react'
import type { TableData } from '../context/TableContext'

interface SortableTableItemProps {
    table: TableData
    selectedTableIds: string[]
    currentTableId: string
    editingTableId: string | null
    deleteConfirm: string | null
    editingName: string
    onTableClick: (e: React.MouseEvent, id: string) => void
    onPointerDown: (id: string) => void
    onPointerUp: () => void
    onPointerLeave: () => void
    onStartRename: (table: { id: string; name: string }) => void
    onDelete: (id: string) => void
    onConfirmDelete: (id: string, e: React.MouseEvent) => void
    onCancelDelete: () => void
    setEditingName: (name: string) => void
    onRename: (id: string, name: string) => void
    setEditingTableId: (id: string | null) => void
}

export function SortableTableItem({
    table,
    selectedTableIds,
    currentTableId,
    editingTableId,
    deleteConfirm,
    editingName,
    onTableClick,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onStartRename,
    onDelete,
    onConfirmDelete,
    onCancelDelete,
    setEditingName,
    onRename,
    setEditingTableId
}: SortableTableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: table.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 'auto',
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as const,
    }

    // Combine our custom handlers with dnd-kit listeners
    const handlePointerDownCombined = (e: React.PointerEvent) => {
        onPointerDown(table.id)
        listeners?.onPointerDown?.(e)
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group border border-transparent cursor-pointer select-none touch-none ${
                selectedTableIds.includes(table.id)
                    ? 'bg-[#2a2a2a] text-[#e3e3e3] border-[#373737] shadow-sm'
                    : 'text-[#9b9b9b] hover:bg-[#2a2a2a]/50 hover:text-[#e3e3e3]'
            }`}
            onClick={(e) => {
                // Prevent click if we were dragging (dnd-kit usually handles this but...)
                if (!isDragging) {
                    onTableClick(e, table.id)
                }
            }}
            onPointerDown={handlePointerDownCombined}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
        >
            {editingTableId === table.id ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => {
                            if (editingName.trim()) {
                                onRename(table.id, editingName.trim())
                            }
                            setEditingTableId(null)
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.currentTarget.blur()
                            }
                            if (e.key === 'Escape') {
                                setEditingTableId(null)
                                setEditingName(table.name)
                            }
                        }}
                        className="flex-1 bg-[#191919] border border-[#373737] px-2 py-1 rounded text-sm outline-none focus:border-blue-500 text-[#e3e3e3] min-w-0"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on input
                    />
                </div>
            ) : (
                <>
                    <div
                        onDoubleClick={() => onStartRename(table)}
                        className="flex items-center gap-3 flex-1 text-left text-sm font-medium truncate min-w-0"
                        title="Double-click to rename"
                    >
                        <TableIcon 
                            size={14} 
                            className={selectedTableIds.includes(table.id) ? 'text-blue-400' : 'text-[#6b6b6b] group-hover:text-[#9b9b9b]'} 
                        />
                        <span 
                            className="truncate hover:text-blue-400 transition-colors"
                            onClick={(e) => {
                                if (table.id === currentTableId) {
                                    e.stopPropagation()
                                    onStartRename(table)
                                }
                            }}
                        >
                            {table.name}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onDelete(table.id)
                            }}
                            className="text-[#6b6b6b] hover:text-red-400 p-1.5 rounded hover:bg-[#333] transition-colors"
                            title="Delete table"
                            onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on delete
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                </>
            )}
            {deleteConfirm === table.id && editingTableId !== table.id && (
                <div className="absolute inset-0 bg-[#2a2a2a] flex items-center justify-between px-3 rounded-lg border border-red-500/30 animate-in fade-in zoom-in-95"
                     onPointerDown={(e) => e.stopPropagation()}
                >
                    <span className="text-xs text-red-300 font-medium">Delete "{table.name}"?</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => onConfirmDelete(table.id, e)}
                            className="text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 p-1 rounded transition-colors"
                        >
                            <Check size={14} />
                        </button>
                        <button
                            onClick={onCancelDelete}
                            className="text-[#9b9b9b] hover:text-[#e3e3e3] hover:bg-[#333] p-1 rounded transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
