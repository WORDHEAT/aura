import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Trash2, Check, X, Pencil } from 'lucide-react'
import { useTableContext } from '../context/TableContext'

export function ProfileWorkspaceSelector() {
    const {
        profileWorkspaces,
        currentProfileWorkspace,
        currentProfileWorkspaceId,
        createProfileWorkspace,
        deleteProfileWorkspace,
        renameProfileWorkspace,
        switchProfileWorkspace,
    } = useTableContext()

    const [isOpen, setIsOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [newName, setNewName] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const [deletingId, setDeletingId] = useState<string | null>(null)
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
                setIsCreating(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const handleCreate = () => {
        if (newName.trim()) {
            createProfileWorkspace(newName.trim())
            setNewName('')
            setIsCreating(false)
        }
    }

    const handleRename = (id: string) => {
        if (editingName.trim()) {
            renameProfileWorkspace(id, editingName.trim())
        }
        setEditingId(null)
    }

    const handleSelect = (id: string) => {
        switchProfileWorkspace(id)
        setIsOpen(false)
    }

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#e3e3e3] hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
                <span className="truncate max-w-[150px]">
                    {currentProfileWorkspace?.name || 'Select Profile'}
                </span>
                <ChevronDown size={14} className={`text-[#6b6b6b] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div
                    ref={menuRef}
                    className="absolute left-0 top-full mt-1 w-64 bg-[#252525] border border-[#373737] rounded-lg shadow-xl z-[200] py-1 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                    {/* Profile Workspaces List */}
                    <div className="max-h-[300px] overflow-y-auto">
                        {profileWorkspaces.map((pw) => (
                            <div key={pw.id} className="group">
                                {editingId === pw.id ? (
                                    <div className="flex items-center gap-1 px-3 py-2">
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleRename(pw.id)
                                                if (e.key === 'Escape') setEditingId(null)
                                            }}
                                            className="flex-1 bg-[#191919] border border-[#373737] px-2 py-1 rounded text-sm outline-none focus:border-blue-500 text-[#e3e3e3]"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => handleRename(pw.id)}
                                            className="p-1 text-green-400 hover:bg-green-400/20 rounded"
                                        >
                                            <Check size={14} />
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="p-1 text-red-400 hover:bg-red-400/20 rounded"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => handleSelect(pw.id)}
                                        className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                                            pw.id === currentProfileWorkspaceId
                                                ? 'bg-teal-600/20 text-teal-300'
                                                : 'hover:bg-[#333] text-[#e3e3e3]'
                                        }`}
                                    >
                                        <span className="text-sm truncate">{pw.name}</span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setEditingId(pw.id)
                                                    setEditingName(pw.name)
                                                }}
                                                className="p-1 text-[#6b6b6b] hover:text-blue-400 rounded hover:bg-[#444]"
                                            >
                                                <Pencil size={12} />
                                            </button>
                                            {profileWorkspaces.length > 1 && (
                                                deletingId === pw.id ? (
                                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => {
                                                                deleteProfileWorkspace(pw.id)
                                                                setDeletingId(null)
                                                            }}
                                                            className="p-1 text-red-400 hover:bg-red-400/20 rounded text-[10px] font-medium"
                                                            title="Confirm delete"
                                                        >
                                                            <Check size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeletingId(null)}
                                                            className="p-1 text-[#6b6b6b] hover:text-[#e3e3e3] rounded hover:bg-[#444]"
                                                            title="Cancel"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setDeletingId(pw.id)
                                                        }}
                                                        className="p-1 text-[#6b6b6b] hover:text-red-400 rounded hover:bg-[#444]"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-[#373737] my-1" />

                    {/* Create New */}
                    {isCreating ? (
                        <div className="flex items-center gap-1 px-3 py-2">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreate()
                                    if (e.key === 'Escape') {
                                        setIsCreating(false)
                                        setNewName('')
                                    }
                                }}
                                placeholder="Profile name..."
                                className="flex-1 bg-[#191919] border border-[#373737] px-2 py-1 rounded text-sm outline-none focus:border-blue-500 text-[#e3e3e3] placeholder-[#6b6b6b]"
                                autoFocus
                            />
                            <button
                                onClick={handleCreate}
                                className="p-1 text-green-400 hover:bg-green-400/20 rounded"
                            >
                                <Check size={14} />
                            </button>
                            <button
                                onClick={() => {
                                    setIsCreating(false)
                                    setNewName('')
                                }}
                                className="p-1 text-red-400 hover:bg-red-400/20 rounded"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#9b9b9b] hover:text-[#e3e3e3] hover:bg-[#333] transition-colors"
                        >
                            <Plus size={14} />
                            New Profile Workspace
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
