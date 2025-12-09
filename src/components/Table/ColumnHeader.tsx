import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
    Check,
    Type, Hash, CheckSquare, Calendar,
    List, Tags, Link, Mail, Phone,
    Star, BarChart2, Paperclip, Bell,
    Trash2, Lock, Copy, CopyPlus,
    MessageSquare, User
} from 'lucide-react'
import type { Column, ColumnType } from './Table'

interface ColumnHeaderProps {
    column: Column
    onUpdate: (column: Column) => void
    onDelete: () => void
    onDuplicate?: (withContent: boolean) => void
    cellValues?: string[]  // All cell values in this column
    dragHandleProps?: { attributes: object; listeners: object | undefined }
}

const MIN_COLUMN_WIDTH = 80

// Map column types to icons and labels
const getTypeConfig = (type: ColumnType) => {
    switch (type) {
        case 'text': return { icon: Type, label: 'Text', color: 'text-gray-400' }
        case 'number': return { icon: Hash, label: 'Number', color: 'text-blue-400' }
        case 'checkbox': return { icon: CheckSquare, label: 'Checkbox', color: 'text-green-400' }
        case 'date': return { icon: Calendar, label: 'Date', color: 'text-pink-400' }
        case 'select': return { icon: List, label: 'Select', color: 'text-purple-400' }
        case 'multi-select': return { icon: Tags, label: 'Multi-Select', color: 'text-indigo-400' }
        case 'url': return { icon: Link, label: 'URL', color: 'text-cyan-400' }
        case 'email': return { icon: Mail, label: 'Email', color: 'text-yellow-400' }
        case 'phone': return { icon: Phone, label: 'Phone', color: 'text-orange-400' }
        case 'rating': return { icon: Star, label: 'Rating', color: 'text-yellow-500' }
        case 'progress': return { icon: BarChart2, label: 'Progress', color: 'text-emerald-400' }
        case 'reminder': return { icon: Bell, label: 'Reminder', color: 'text-red-400' }
        case 'file': return { icon: Paperclip, label: 'File', color: 'text-blue-300' }
        case 'password': return { icon: Lock, label: 'Password', color: 'text-purple-300' }
        case 'username': return { icon: User, label: 'Username', color: 'text-sky-400' }
        case 'comment': return { icon: MessageSquare, label: 'Comment', color: 'text-teal-400' }
        default: return { icon: Type, label: 'Text', color: 'text-gray-400' }
    }
}

export function ColumnHeader({ column, onUpdate, onDelete, onDuplicate, cellValues = [], dragHandleProps }: ColumnHeaderProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(column.title)
    const [showTypeMenu, setShowTypeMenu] = useState(false)
    const [showDuplicateOptions, setShowDuplicateOptions] = useState(false)
    const [copySuccess, setCopySuccess] = useState(false)
    const typeButtonRef = useRef<HTMLButtonElement>(null)
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })

    const typeConfig = getTypeConfig(column.type)
    const TypeIcon = typeConfig.icon

    const handleCopyColumn = async () => {
        const nonEmptyValues = cellValues.filter(v => v && v.trim())
        if (nonEmptyValues.length === 0) return
        
        const textToCopy = nonEmptyValues.join('\n')
        try {
            await navigator.clipboard.writeText(textToCopy)
            setCopySuccess(true)
            setTimeout(() => setCopySuccess(false), 1500)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const handleTypeMenuToggle = () => {
        if (!showTypeMenu && typeButtonRef.current) {
            // Calculate position BEFORE showing menu
            const rect = typeButtonRef.current.getBoundingClientRect()
            setMenuPosition({
                top: rect.bottom + 4,
                left: rect.left
            })
        }
        setShowTypeMenu(!showTypeMenu)
    }

    const handleTypeChange = (type: ColumnType) => {
        onUpdate({ ...column, type })
        setShowTypeMenu(false)
    }

    return (
        <div 
            className="flex items-center gap-1.5 relative h-full group/header cursor-grab active:cursor-grabbing touch-none" 
            style={{ minWidth: MIN_COLUMN_WIDTH }}
            {...(dragHandleProps ? {
                ...(dragHandleProps.attributes as React.HTMLAttributes<HTMLDivElement>),
                ...(dragHandleProps.listeners as React.HTMLAttributes<HTMLDivElement>),
            } : {})}
        >
            {/* Type Trigger */}
            <button
                ref={typeButtonRef}
                onClick={(e) => {
                    e.stopPropagation()
                    handleTypeMenuToggle()
                }}
                className={`p-0.5 rounded hover:bg-[#333] transition-colors flex-shrink-0 ${typeConfig.color}`}
                title={`Type: ${typeConfig.label} (drag header to reorder)`}
            >
                <TypeIcon size={14} />
            </button>

            {/* Title Row */}
            {isEditing ? (
                <div className="flex items-center flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => {
                            if (editValue.trim()) {
                                onUpdate({ ...column, title: editValue.trim() })
                            } else {
                                setEditValue(column.title)
                            }
                            setIsEditing(false)
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.currentTarget.blur() // Triggers onBlur to save
                            }
                            if (e.key === 'Escape') {
                                setEditValue(column.title)
                                setIsEditing(false)
                            }
                        }}
                        className="bg-[#191919] border border-[#373737] px-1.5 py-0.5 rounded text-sm flex-1 outline-none focus:border-blue-500 text-[#e3e3e3] min-w-0 h-6"
                        autoFocus
                    />
                </div>
            ) : (
                <div 
                    className="flex items-center flex-1 min-w-0 overflow-hidden cursor-grab active:cursor-grabbing"
                    title={`${column.title} (drag to reorder)`}
                >
                    <span 
                        className="font-medium text-[#e3e3e3] truncate text-xs cursor-text hover:text-blue-400 transition-colors" 
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsEditing(true)
                        }}
                    >
                        {column.title}
                    </span>
                </div>
            )}

            {/* Type Menu Dropdown */}
            {showTypeMenu && createPortal(
                <>
                    <div className="fixed inset-0 z-[9999]" onClick={() => setShowTypeMenu(false)} />
                    <div 
                        className="fixed z-[10000] bg-[#202020] border border-[#373737] rounded-xl shadow-2xl min-w-[180px] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                        style={{
                            top: `${menuPosition.top}px`,
                            left: `${menuPosition.left}px`
                        }}
                    >
                        <div className="p-1.5 border-b border-[#373737] mb-1">
                            <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => {
                                    if (editValue.trim() && editValue !== column.title) {
                                        onUpdate({ ...column, title: editValue.trim() })
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        if (editValue.trim()) {
                                            onUpdate({ ...column, title: editValue.trim() })
                                        }
                                        setShowTypeMenu(false)
                                    }
                                }}
                                className="w-full bg-[#191919] border border-[#373737] px-2 py-1 rounded text-sm outline-none focus:border-blue-500 text-[#e3e3e3]"
                                placeholder="Column name"
                                autoFocus
                            />
                        </div>

                        <div className="p-1.5 grid gap-0.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                            <button
                                onClick={() => {
                                    handleCopyColumn()
                                    setShowTypeMenu(false)
                                }}
                                disabled={cellValues.filter(v => v?.trim()).length === 0}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded w-full text-left transition-colors ${
                                    cellValues.filter(v => v?.trim()).length === 0
                                        ? 'text-[#4a4a4a] cursor-not-allowed'
                                        : 'hover:bg-blue-500/10 text-blue-400 hover:text-blue-300'
                                }`}
                            >
                                <Copy size={14} />
                                <span className="text-sm">
                                    {copySuccess ? 'Copied!' : `Copy Column (${cellValues.filter(v => v?.trim()).length})`}
                                </span>
                            </button>
                            
                            {/* Duplicate Column */}
                            {onDuplicate && !showDuplicateOptions && (
                                <button
                                    onClick={() => setShowDuplicateOptions(true)}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-green-500/10 w-full text-left transition-colors text-green-400 hover:text-green-300"
                                >
                                    <CopyPlus size={14} />
                                    <span className="text-sm">Duplicate Column</span>
                                </button>
                            )}
                            
                            {/* Duplicate Options */}
                            {onDuplicate && showDuplicateOptions && (
                                <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-lg animate-in fade-in">
                                    <div className="text-green-300 text-xs mb-2">Duplicate with content?</div>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => {
                                                onDuplicate(true)
                                                setShowTypeMenu(false)
                                                setShowDuplicateOptions(false)
                                            }}
                                            className="flex-1 px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded text-xs border border-green-500/30 transition-colors"
                                        >
                                            With content
                                        </button>
                                        <button 
                                            onClick={() => {
                                                onDuplicate(false)
                                                setShowTypeMenu(false)
                                                setShowDuplicateOptions(false)
                                            }}
                                            className="flex-1 px-2 py-1 bg-[#2a2a2a] hover:bg-[#333] text-[#e3e3e3] rounded text-xs border border-[#373737] transition-colors"
                                        >
                                            Empty
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            <button
                                onClick={() => {
                                    onDelete()
                                    setShowTypeMenu(false)
                                }}
                                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-red-500/10 w-full text-left transition-colors text-red-400 hover:text-red-300"
                            >
                                <Trash2 size={14} />
                                <span className="text-sm">Delete Column</span>
                            </button>
                            
                            <div className="h-px bg-[#373737] my-1" />

                            <div className="text-[10px] font-semibold text-[#6b6b6b] uppercase px-2 py-1">Basic</div>
                            {['text', 'number', 'checkbox', 'date'].map((t) => {
                                const config = getTypeConfig(t as ColumnType)
                                return (
                                    <button
                                        key={t}
                                        onClick={() => handleTypeChange(t as ColumnType)}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#2a2a2a] w-full text-left transition-colors ${column.type === t ? 'bg-[#2a2a2a]' : ''}`}
                                    >
                                        <config.icon size={14} className={config.color} />
                                        <span className={`text-sm ${column.type === t ? 'text-[#e3e3e3]' : 'text-[#9b9b9b]'}`}>{config.label}</span>
                                        {column.type === t && <Check size={12} className="ml-auto text-blue-400" />}
                                    </button>
                                )
                            })}
                            
                            <div className="text-[10px] font-semibold text-[#6b6b6b] uppercase px-2 py-1 mt-1">Selection</div>
                            {['select', 'multi-select'].map((t) => {
                                const config = getTypeConfig(t as ColumnType)
                                return (
                                    <button
                                        key={t}
                                        onClick={() => handleTypeChange(t as ColumnType)}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#2a2a2a] w-full text-left transition-colors ${column.type === t ? 'bg-[#2a2a2a]' : ''}`}
                                    >
                                        <config.icon size={14} className={config.color} />
                                        <span className={`text-sm ${column.type === t ? 'text-[#e3e3e3]' : 'text-[#9b9b9b]'}`}>{config.label}</span>
                                        {column.type === t && <Check size={12} className="ml-auto text-blue-400" />}
                                    </button>
                                )
                            })}

                            <div className="text-[10px] font-semibold text-[#6b6b6b] uppercase px-2 py-1 mt-1">Advanced</div>
                            {['url', 'email', 'phone', 'username', 'password', 'rating', 'progress', 'reminder', 'file', 'comment'].map((t) => {
                                const config = getTypeConfig(t as ColumnType)
                                return (
                                    <button
                                        key={t}
                                        onClick={() => handleTypeChange(t as ColumnType)}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#2a2a2a] w-full text-left transition-colors ${column.type === t ? 'bg-[#2a2a2a]' : ''}`}
                                    >
                                        <config.icon size={14} className={config.color} />
                                        <span className={`text-sm ${column.type === t ? 'text-[#e3e3e3]' : 'text-[#9b9b9b]'}`}>{config.label}</span>
                                        {column.type === t && <Check size={12} className="ml-auto text-blue-400" />}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    )
}
