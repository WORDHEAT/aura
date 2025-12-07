import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, X, Undo2, Trash, Table2, FileText, Search, AlertTriangle } from 'lucide-react'
import { useTableContext } from '../context/TableContext'
import { formatDistanceToNow } from 'date-fns'

interface TrashModalProps {
    isOpen: boolean
    onClose: () => void
}

export function TrashModal({ isOpen, onClose }: TrashModalProps) {
    const { 
        getArchivedItems, 
        restoreTable, 
        restoreNote, 
        permanentlyDeleteTable, 
        permanentlyDeleteNote,
        emptyTrash,
        switchTable,
        switchNote
    } = useTableContext()
    
    const [search, setSearch] = useState('')
    const [confirmEmpty, setConfirmEmpty] = useState(false)
    
    const { tables, notes } = getArchivedItems()
    
    // Filter by search
    const filteredTables = tables.filter(t => 
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.workspaceName.toLowerCase().includes(search.toLowerCase())
    )
    const filteredNotes = notes.filter(n => 
        n.name.toLowerCase().includes(search.toLowerCase()) ||
        n.workspaceName.toLowerCase().includes(search.toLowerCase())
    )
    
    const totalItems = tables.length + notes.length
    const hasItems = totalItems > 0

    const handleRestore = (type: 'table' | 'note', workspaceId: string, itemId: string) => {
        if (type === 'table') {
            restoreTable(workspaceId, itemId)
            switchTable(workspaceId, itemId)
        } else {
            restoreNote(workspaceId, itemId)
            switchNote(workspaceId, itemId)
        }
        onClose()
    }

    const handlePermanentDelete = (type: 'table' | 'note', workspaceId: string, itemId: string) => {
        if (type === 'table') {
            permanentlyDeleteTable(workspaceId, itemId)
        } else {
            permanentlyDeleteNote(workspaceId, itemId)
        }
    }

    const handleEmptyTrash = () => {
        if (confirmEmpty) {
            emptyTrash()
            setConfirmEmpty(false)
            onClose()
        } else {
            setConfirmEmpty(true)
            setTimeout(() => setConfirmEmpty(false), 3000) // Reset after 3s
        }
    }

    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-[50000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-[#202020] border border-[#373737] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#373737]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-lg">
                            <Trash2 className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[#e3e3e3]">Trash</h2>
                            <p className="text-xs text-[#6b6b6b]">{totalItems} item{totalItems !== 1 ? 's' : ''} in trash</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasItems && (
                            <button
                                onClick={handleEmptyTrash}
                                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                    confirmEmpty 
                                        ? 'bg-red-500 text-white' 
                                        : 'text-red-400 hover:bg-red-500/10'
                                }`}
                            >
                                {confirmEmpty ? 'Click again to confirm' : 'Empty Trash'}
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Search */}
                {hasItems && (
                    <div className="p-4 border-b border-[#373737]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b6b]" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search trash..."
                                className="w-full bg-[#2a2a2a] border border-[#373737] rounded-lg py-2 pl-10 pr-4 text-sm text-[#e3e3e3] placeholder-[#6b6b6b] focus:outline-none focus:border-blue-500/50"
                            />
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[50vh] custom-scrollbar">
                    {!hasItems ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Trash2 className="w-12 h-12 text-[#4a4a4a] mb-4" />
                            <p className="text-[#6b6b6b] text-sm">Trash is empty</p>
                            <p className="text-[#4a4a4a] text-xs mt-1">Deleted items will appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Tables */}
                            {filteredTables.map(table => (
                                <div 
                                    key={table.id}
                                    className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg border border-[#373737] hover:border-[#4a4a4a] transition-colors group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Table2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-[#e3e3e3] truncate">{table.name}</p>
                                            <p className="text-xs text-[#6b6b6b]">
                                                {table.workspaceName} • {table.archivedAt && formatDistanceToNow(new Date(table.archivedAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleRestore('table', table.workspaceId, table.id)}
                                            className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                                            title="Restore"
                                        >
                                            <Undo2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handlePermanentDelete('table', table.workspaceId, table.id)}
                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Delete permanently"
                                        >
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            
                            {/* Notes */}
                            {filteredNotes.map(note => (
                                <div 
                                    key={note.id}
                                    className="flex items-center justify-between p-3 bg-[#2a2a2a] rounded-lg border border-[#373737] hover:border-[#4a4a4a] transition-colors group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <FileText className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-[#e3e3e3] truncate">{note.name}</p>
                                            <p className="text-xs text-[#6b6b6b]">
                                                {note.workspaceName} • {note.archivedAt && formatDistanceToNow(new Date(note.archivedAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleRestore('note', note.workspaceId, note.id)}
                                            className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                                            title="Restore"
                                        >
                                            <Undo2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handlePermanentDelete('note', note.workspaceId, note.id)}
                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Delete permanently"
                                        >
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            
                            {filteredTables.length === 0 && filteredNotes.length === 0 && search && (
                                <div className="text-center py-8 text-[#6b6b6b] text-sm">
                                    No items match "{search}"
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                {hasItems && (
                    <div className="p-3 border-t border-[#373737] bg-[#191919]/50">
                        <div className="flex items-center gap-2 text-xs text-[#6b6b6b]">
                            <AlertTriangle size={12} />
                            <span>Items in trash will be permanently deleted when you empty the trash</span>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}
