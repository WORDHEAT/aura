import { useEffect, useState, useCallback } from 'react'
import { Command } from 'cmdk'
import { createPortal } from 'react-dom'
import { Search, Table2, FileText, FolderOpen, X } from 'lucide-react'
import { useTableContext } from '../context/TableContext'

interface SearchCommandProps {
    isOpen: boolean
    onClose: () => void
}

export function SearchCommand({ isOpen, onClose }: SearchCommandProps) {
    const { 
        workspaces, 
        switchTable, 
        switchNote 
    } = useTableContext()
    
    const [search, setSearch] = useState('')

    // Close on escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown)
            return () => document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, onClose])

    // Reset search when modal opens (use key prop pattern instead)

    // Build searchable items
    const items = useCallback(() => {
        const results: {
            id: string
            type: 'table' | 'note'
            name: string
            workspaceId: string
            workspaceName: string
        }[] = []

        workspaces.forEach(ws => {
            // Add tables (non-archived)
            ws.tables.filter(t => !t.isArchived).forEach(table => {
                results.push({
                    id: table.id,
                    type: 'table',
                    name: table.name,
                    workspaceId: ws.id,
                    workspaceName: ws.name
                })
            })
            
            // Add notes (non-archived)
            ws.notes.filter(n => !n.isArchived).forEach(note => {
                results.push({
                    id: note.id,
                    type: 'note',
                    name: note.name,
                    workspaceId: ws.id,
                    workspaceName: ws.name
                })
            })
        })

        return results
    }, [workspaces])

    const handleSelect = (item: { type: 'table' | 'note'; workspaceId: string; id: string }) => {
        if (item.type === 'table') {
            switchTable(item.workspaceId, item.id)
        } else {
            switchNote(item.workspaceId, item.id)
        }
        onClose()
    }

    if (!isOpen) return null

    const allItems = items()

    return createPortal(
        <div className="fixed inset-0 z-[60000] flex items-start justify-center pt-[20vh]">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Command Palette */}
            <div className="relative w-full max-w-xl animate-in zoom-in-95 fade-in duration-150">
                <Command 
                    className="bg-[#202020] border border-[#373737] rounded-xl shadow-2xl overflow-hidden"
                    shouldFilter={true}
                >
                    {/* Search Input */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#373737]">
                        <Search className="w-5 h-5 text-[#6b6b6b]" />
                        <Command.Input
                            value={search}
                            onValueChange={setSearch}
                            placeholder="Search tables and notes..."
                            className="flex-1 bg-transparent text-[#e3e3e3] placeholder-[#6b6b6b] outline-none text-base"
                            autoFocus
                        />
                        <button
                            onClick={onClose}
                            className="p-1 text-[#6b6b6b] hover:text-[#e3e3e3] transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Results */}
                    <Command.List className="max-h-[300px] overflow-y-auto custom-scrollbar p-2">
                        <Command.Empty className="py-8 text-center text-[#6b6b6b] text-sm">
                            No results found
                        </Command.Empty>

                        {/* Group by workspace */}
                        {workspaces.map(ws => {
                            const wsItems = allItems.filter(i => i.workspaceId === ws.id)
                            if (wsItems.length === 0) return null

                            return (
                                <Command.Group 
                                    key={ws.id}
                                    heading={
                                        <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-[#6b6b6b] uppercase tracking-wide">
                                            <FolderOpen size={12} />
                                            {ws.name}
                                        </div>
                                    }
                                >
                                    {wsItems.map(item => (
                                        <Command.Item
                                            key={item.id}
                                            value={`${item.name} ${item.workspaceName}`}
                                            onSelect={() => handleSelect(item)}
                                            className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-[#e3e3e3] hover:bg-[#2a2a2a] data-[selected=true]:bg-[#2a2a2a] transition-colors"
                                        >
                                            {item.type === 'table' ? (
                                                <Table2 className="w-4 h-4 text-blue-400" />
                                            ) : (
                                                <FileText className="w-4 h-4 text-amber-400" />
                                            )}
                                            <span className="flex-1 truncate">{item.name}</span>
                                            <span className="text-xs text-[#6b6b6b] capitalize">{item.type}</span>
                                        </Command.Item>
                                    ))}
                                </Command.Group>
                            )
                        })}
                    </Command.List>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-4 py-2 border-t border-[#373737] bg-[#191919]/50">
                        <div className="flex items-center gap-4 text-xs text-[#6b6b6b]">
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-[#2a2a2a] rounded text-[10px]">↑↓</kbd>
                                Navigate
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-[#2a2a2a] rounded text-[10px]">↵</kbd>
                                Open
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-[#2a2a2a] rounded text-[10px]">Esc</kbd>
                                Close
                            </span>
                        </div>
                    </div>
                </Command>
            </div>
        </div>,
        document.body
    )
}
