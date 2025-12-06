import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, CornerDownRight, MoreHorizontal, Ban, Trash2, ChevronDown, ChevronRight, Check, Copy, Clipboard, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { ColorPicker, COLORS } from '../ColorPicker'
import type { Column, Row } from './Table'
import { ResizeHandle } from './ResizeHandle'
import { useSettings } from '../../context/SettingsContext'
import { useState, useEffect } from 'react'

interface SortableRowProps {
    row: Row
    index: number
    level: number
    columns: Column[]
    activeActionMenu: string | null
    menuPosition: { top: number; left: number }
    activeColorPickerCell: { rowId: string; colId: string } | null
    copiedCell: { rowId: string; colId: string } | null
    pastedCell: { rowId: string; colId: string } | null
    onToggleRow: (id: string) => void
    onAddSiblingRow: (id: string) => void
    onAddSubRow: (id: string) => void
    onActionMenuClick: (e: React.MouseEvent, id: string) => void
    onDeleteRow: (id: string) => void
    onUpdateRowColor: (id: string, color: string) => void
    onUpdateCellColor: (rowId: string, colId: string, color: string) => void
    onCopyCell: (text: string, rowId: string, colId: string) => void
    onPasteCell: (rowId: string, colId: string) => void
    onResizeColumn: (colId: string, width: number) => void
    renderCell: (col: Column, row: Row) => React.ReactNode
    setActiveActionMenu: (id: string | null) => void
    actionMenuRef: React.RefObject<HTMLDivElement | null>
    setActiveColorPickerCell: (cell: { rowId: string; colId: string } | null) => void
    disabled?: boolean
    zebraStriping?: boolean
}

export function SortableRow({
    row,
    index,
    level,
    columns,
    activeActionMenu,
    menuPosition,
    activeColorPickerCell,
    copiedCell,
    pastedCell,
    onToggleRow,
    onAddSiblingRow,
    onAddSubRow,
    onActionMenuClick,
    onDeleteRow,
    onUpdateRowColor,
    onUpdateCellColor,
    onCopyCell,
    onPasteCell,
    onResizeColumn,
    renderCell,
    setActiveActionMenu,
    actionMenuRef,
    setActiveColorPickerCell,
    disabled,
    zebraStriping
}: SortableRowProps) {
    const { settings } = useSettings()
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [activeCellMenu, setActiveCellMenu] = useState<string | null>(null)

    useEffect(() => {
        if (activeActionMenu !== row.id && showDeleteConfirm) {
            setShowDeleteConfirm(false)
        }
    }, [activeActionMenu, row.id, showDeleteConfirm])

    // Close cell menu when clicking outside
    useEffect(() => {
        if (!activeCellMenu) return
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (!target.closest('.cell-action-menu')) {
                setActiveCellMenu(null)
            }
        }
        document.addEventListener('click', handleClick)
        return () => document.removeEventListener('click', handleClick)
    }, [activeCellMenu])

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: row.id, disabled })

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 'auto',
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as const,
    }

    // Use prop if provided, fallback to global settings
    const effectiveZebra = zebraStriping ?? settings.zebraStriping
    const stripeClass = effectiveZebra && index % 2 !== 0 && !row.rowColor ? 'bg-[#252525]/30' : ''

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={`group hover:bg-[#2a2a2a] transition-colors ${row.rowColor || ''} ${stripeClass}`}
        >
            {/* Left Gutter Column for Actions - entire cell is draggable */}
            <td 
                className={`w-[60px] px-1 border-r border-[#373737] bg-[#202020] sticky left-0 z-40 text-center group/gutter relative cursor-grab active:cursor-grabbing ${settings.compactMode ? 'py-1' : 'py-2'}`}
                {...attributes}
                {...listeners}
            >
                {/* Overlay for Row Color on Sticky Column */}
                {row.rowColor && (
                    <div className={`absolute inset-0 pointer-events-none ${row.rowColor}`} />
                )}
                
                {/* Action Buttons Overlay - always visible on mobile */}
                <div className={`absolute inset-0 z-20 flex items-center justify-center gap-0.5 bg-[#202020] transition-opacity duration-200 ${
                    activeActionMenu === row.id
                        ? 'opacity-100 pointer-events-auto' 
                        : 'sm:opacity-0 sm:pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto'
                }`}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onAddSiblingRow(row.id) }}
                        className="text-[#6b6b6b] hover:text-blue-400 p-1 rounded hover:bg-[#333]"
                        title="Add row below"
                    >
                        <Plus size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onAddSubRow(row.id) }}
                        className="text-[#6b6b6b] hover:text-blue-400 p-1 rounded hover:bg-[#333]"
                        title="Add sub-row"
                    >
                        <CornerDownRight size={14} />
                    </button>
                    
                    <div className="relative">
                        <button
                            onClick={(e) => onActionMenuClick(e, row.id)}
                            className={`p-1 rounded hover:bg-[#333] ${activeActionMenu === row.id ? 'text-[#e3e3e3] bg-[#333]' : 'text-[#6b6b6b] hover:text-[#e3e3e3]'}`}
                            title="More actions"
                        >
                            <MoreHorizontal size={14} />
                        </button>

                        {activeActionMenu === row.id && createPortal(
                            <div 
                                ref={actionMenuRef}
                                className="fixed z-[9999] bg-[#202020] border border-[#373737] rounded-xl shadow-2xl min-w-[180px] overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-left"
                                style={{
                                    top: menuPosition.top,
                                    left: menuPosition.left
                                }}
                            >
                                <div className="p-1.5">
                                    <div className="px-2 py-1.5 text-[10px] font-semibold text-[#6b6b6b] uppercase tracking-wider">
                                        Row Color
                                    </div>
                                    <div className="grid grid-cols-5 gap-1 px-1 pb-2">
                                        <button
                                            onClick={() => {
                                                onUpdateRowColor(row.id, '')
                                                setActiveActionMenu(null)
                                            }}
                                            className={`w-6 h-6 rounded flex items-center justify-center border border-[#373737] hover:border-[#6b6b6b] transition-colors bg-[#252525]`}
                                            title="Default"
                                        >
                                            <Ban size={12} className="text-[#6b6b6b]" />
                                        </button>
                                        {COLORS.map((color) => (
                                            <button
                                                key={color.name}
                                                onClick={() => {
                                                    onUpdateRowColor(row.id, color.value)
                                                    setActiveActionMenu(null)
                                                }}
                                                className={`w-6 h-6 rounded border border-transparent hover:border-[#6b6b6b] transition-colors ${color.bg}`}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                    
                                    <div className="h-px bg-[#373737] my-1" />
                                    
                                    {showDeleteConfirm ? (
                                        <div className="flex items-center justify-between px-2 py-1.5 bg-[#2a2a2a] rounded">
                                            <span className="text-xs text-red-300 font-medium">Delete?</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        onDeleteRow(row.id)
                                                        setActiveActionMenu(null)
                                                    }}
                                                    className="text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 p-1 rounded transition-colors"
                                                >
                                                    <Check size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setShowDeleteConfirm(false)}
                                                    className="text-[#9b9b9b] hover:text-[#e3e3e3] hover:bg-[#333] p-1 rounded transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-red-500/10 w-full text-left transition-colors text-red-400 hover:text-red-300"
                                            title="Delete row"
                                        >
                                            <Trash2 size={14} />
                                            <span className="text-sm">Delete Row</span>
                                        </button>
                                    )}
                                </div>
                            </div>,
                            document.body
                        )}
                    </div>
                </div>
                
                {/* Row Number - Static */}
                <div className="flex items-center justify-center h-full text-[10px] text-[#444] font-mono pointer-events-none">
                    {index + 1}
                </div>
            </td>

            {columns.map((col, colIndex) => (
                <td
                    key={col.id}
                    className={`px-3 sm:px-4 ${settings.showGridLines ? 'border-r' : ''} border-[#373737] last:border-r-0 relative group/cell ${row.colors?.[col.id] || ''} ${settings.compactMode ? 'py-1' : 'py-2.5'}`}
                    style={{ width: col.width || 150, minWidth: 80 }}
                >
                    <div className="w-full h-full min-h-[24px] flex items-center gap-2">
                        {/* Render Indent and Toggle for First Column */}
                        {colIndex === 0 && (
                            <div className="flex items-center flex-shrink-0" style={{ paddingLeft: `${level * 20}px` }}>
                                {level > 0 && <CornerDownRight size={12} className="text-[#555] mr-1" />}
                                {(row.children && row.children.length > 0) ? (
                                    <button
                                        onClick={() => onToggleRow(row.id)}
                                        className="p-0.5 rounded hover:bg-[#333] text-[#9b9b9b] hover:text-[#e3e3e3] transition-colors mr-1"
                                    >
                                        {row.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </button>
                                ) : (
                                    /* Placeholder for alignment */
                                    <div className="w-[18px] mr-1" />
                                )}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            {renderCell(col, row)}
                        </div>
                    </div>
                    
                    {/* Cell Actions - Click to expand on mobile */}
                    {col.type !== 'checkbox' && (
                        <div className={`cell-action-menu absolute top-1 right-1 z-20 transition-opacity ${
                            activeColorPickerCell?.rowId === row.id && activeColorPickerCell?.colId === col.id || activeCellMenu === `${row.id}-${col.id}`
                                ? 'opacity-100'
                                : 'sm:opacity-0 sm:group-hover/cell:opacity-100'
                        }`}>
                            <div className="relative">
                                {/* Trigger button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setActiveCellMenu(activeCellMenu === `${row.id}-${col.id}` ? null : `${row.id}-${col.id}`)
                                    }}
                                    className="w-6 h-6 rounded bg-[#2a2a2a]/90 flex items-center justify-center hover:bg-[#333] transition-colors shadow-sm border border-[#373737]"
                                >
                                    <MoreHorizontal size={14} className="text-[#6b6b6b]" />
                                </button>
                                
                                {/* Actions menu - shown on click */}
                                {activeCellMenu === `${row.id}-${col.id}` && (
                                    <div className="absolute top-0 right-0 flex items-center gap-1 bg-[#252525] rounded-lg p-1 shadow-lg border border-[#373737] animate-in fade-in zoom-in-95 duration-100">
                                        {/* Paste Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onPasteCell(row.id, col.id)
                                            }}
                                            className="p-2 rounded text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#333] transition-colors"
                                            title="Paste"
                                        >
                                            {pastedCell?.rowId === row.id && pastedCell?.colId === col.id ? (
                                                <Check size={16} className="text-green-400" />
                                            ) : (
                                                <Clipboard size={16} />
                                            )}
                                        </button>

                                        {/* Copy Button */}
                                        {row.cells[col.id] && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onCopyCell(row.cells[col.id], row.id, col.id)
                                                }}
                                                className="p-2 rounded text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#333] transition-colors"
                                                title="Copy"
                                            >
                                                {copiedCell?.rowId === row.id && copiedCell?.colId === col.id ? (
                                                    <Check size={16} className="text-green-400" />
                                                ) : (
                                                    <Copy size={16} />
                                                )}
                                            </button>
                                        )}
                                        
                                        {/* Color Picker */}
                                        <ColorPicker
                                            currentColor={row.colors?.[col.id]}
                                            onColorChange={(color: string) => onUpdateCellColor(row.id, col.id, color)}
                                            onOpenChange={(isOpen: boolean) => {
                                                if (isOpen) {
                                                    setActiveColorPickerCell({ rowId: row.id, colId: col.id })
                                                } else {
                                                    setActiveColorPickerCell(null)
                                                }
                                            }}
                                        />
                                        
                                        {/* Close button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setActiveCellMenu(null)
                                            }}
                                            className="p-2 rounded text-[#6b6b6b] hover:text-red-400 hover:bg-[#333] transition-colors"
                                            title="Close"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Resize Handle in Cell */}
                    <div className="absolute top-0 bottom-0 right-0 w-0 z-10 sm:opacity-0 sm:group-hover/cell:opacity-100 hover:opacity-100">
                        <ResizeHandle 
                            width={col.width || 150} 
                            onResize={(width) => onResizeColumn(col.id, width)} 
                            minWidth={80}
                        />
                    </div>
                </td>
            ))}
        </tr>
    )
}
