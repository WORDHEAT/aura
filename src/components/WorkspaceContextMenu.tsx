import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal, Table as TableIcon, FileText, Settings, Trash2 } from 'lucide-react'

interface WorkspaceContextMenuProps {
    workspaceId: string
    onAddTable: () => void
    onAddNote: () => void
    onOpenSettings: () => void
    onDelete: () => void
}

export function WorkspaceContextMenu({
    onAddTable,
    onAddNote,
    onOpenSettings,
    onDelete
}: WorkspaceContextMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current && 
                !menuRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false)
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            return () => document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen])

    const handleAction = (action: () => void) => {
        action()
        setIsOpen(false)
    }

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen(!isOpen)
                }}
                className="text-[#6b6b6b] hover:text-[#e3e3e3] p-1 rounded hover:bg-[#333] transition-colors"
                title="Workspace options"
            >
                <MoreHorizontal size={14} />
            </button>

            {isOpen && (
                <div 
                    ref={menuRef}
                    className="absolute right-0 top-full mt-1 w-44 bg-[#252525] border border-[#373737] rounded-lg shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                    <button
                        onClick={() => handleAction(onAddTable)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#e3e3e3] hover:bg-[#333] transition-colors"
                    >
                        <TableIcon size={14} className="text-blue-400" />
                        Add Table
                    </button>
                    <button
                        onClick={() => handleAction(onAddNote)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#e3e3e3] hover:bg-[#333] transition-colors"
                    >
                        <FileText size={14} className="text-green-400" />
                        Add Note
                    </button>
                    <div className="h-px bg-[#373737] my-1" />
                    <button
                        onClick={() => handleAction(onOpenSettings)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#e3e3e3] hover:bg-[#333] transition-colors"
                    >
                        <Settings size={14} className="text-[#9b9b9b]" />
                        Workspace Settings
                    </button>
                    <div className="h-px bg-[#373737] my-1" />
                    <button
                        onClick={() => handleAction(onDelete)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <Trash2 size={14} />
                        Delete Workspace
                    </button>
                </div>
            )}
        </div>
    )
}
