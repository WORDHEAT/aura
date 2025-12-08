import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Bell, AlignJustify, Grid3X3, StretchHorizontal } from 'lucide-react'
import { ReminderModal } from './ReminderModal'
import { ColumnHeader } from './ColumnHeader'
import { format, differenceInDays } from 'date-fns'
import { CheckboxCell } from './cells/CheckboxCell'
import { NumberCell } from './cells/NumberCell'
import { URLCell } from './cells/URLCell'
import { SelectCell } from './cells/SelectCell'
import { MultiSelectCell } from './cells/MultiSelectCell'
import { EmailCell } from './cells/EmailCell'
import { PhoneCell } from './cells/PhoneCell'
import { RatingCell } from './cells/RatingCell'
import { ProgressCell } from './cells/ProgressCell'
import { FileCell } from './cells/FileCell'
import { CommentCell } from './cells/CommentCell'
import { useSettings } from '../../context/SettingsContext'
import { useTableContext } from '../../context/TableContext'
import { useAuth } from '../../context/AuthContext'
import { updateRowInTree } from '../../utils/treeUtils'
import {
    DndContext, 
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableRow } from './SortableRow'

import { ResizeHandle } from './ResizeHandle'

export type ColumnType =
    | 'text'
    | 'date'
    | 'reminder'
    | 'number'
    | 'checkbox'
    | 'url'
    | 'select'
    | 'multi-select'
    | 'email'
    | 'phone'
    | 'rating'
    | 'progress'
    | 'file'
    | 'password'
    | 'comment'

export type SummaryType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'none'

export interface Column {
    id: string
    title: string
    type: ColumnType
    options?: string[]
    width?: number // Column width in pixels
    summaryType?: SummaryType
}

export interface Row {
    id: string
    cells: Record<string, string>
    colors?: Record<string, string>
    rowColor?: string
    children?: Row[]
    isExpanded?: boolean
}

interface TableAppearance {
    compactMode?: boolean
    showGridLines?: boolean
    zebraStriping?: boolean
}

interface TableProps {
    tableId: string
    data: { columns: Column[]; rows: Row[] }
    onUpdate: (data: { columns: Column[]; rows: Row[] }) => void
    onColumnUpdate?: (columns: Column[]) => void
    isFiltered?: boolean
    appearance?: TableAppearance
    onAppearanceChange?: (appearance: Partial<TableAppearance>) => void
}

// Sortable Column Header Wrapper
interface SortableColumnProps {
    column: Column
    children: (dragHandleProps: { attributes: object; listeners: object | undefined }) => React.ReactNode
    width: number
    className: string
}

function SortableColumn({ column, children, width, className }: SortableColumnProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: column.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        width,
        minWidth: 80,
    }

    return (
        <th
            ref={setNodeRef}
            style={style}
            className={className}
        >
            {children({ attributes, listeners })}
        </th>
    )
}

export function Table({ tableId, data, onUpdate, onColumnUpdate, isFiltered, appearance, onAppearanceChange }: TableProps) {
    const { settings } = useSettings()
    const { user } = useAuth()
    const { 
        updateTableCell, 
        updateTableCellColor,
        updateTableRowColor, 
        deleteTableRow,
        duplicateTableRow,
        addTableRowSibling, 
        addTableRowChild, 
        addTableRow,
        toggleTableRow,
        getTableById
    } = useTableContext()
    
    // Merge per-table appearance with global settings (per-table takes priority)
    const effectiveSettings = {
        compactMode: appearance?.compactMode ?? settings.compactMode,
        showGridLines: appearance?.showGridLines ?? settings.showGridLines,
        zebraStriping: appearance?.zebraStriping ?? settings.zebraStriping,
    }
    
    const [reminderModal, setReminderModal] = useState<{ rowId: string; colId: string } | null>(null)
    const [activeColorPickerCell, setActiveColorPickerCell] = useState<{ rowId: string; colId: string } | null>(null)
    const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null)
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
    const [copiedCell, setCopiedCell] = useState<{ rowId: string; colId: string } | null>(null)
    const [pastedCell, setPastedCell] = useState<{ rowId: string; colId: string } | null>(null)
    const [activeSummaryMenu, setActiveSummaryMenu] = useState<{ colId: string; top: number; left: number } | null>(null)
    const actionMenuRef = useRef<HTMLDivElement>(null)
    const summaryMenuRef = useRef<HTMLDivElement>(null)

    // DnD Sensors - with touch support for mobile
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200,
                tolerance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const findParent = (rows: Row[], id: string): { parent: Row | null, items: Row[] } | null => {
        if (rows.some(r => r.id === id)) {
            return { parent: null, items: rows }
        }
        for (const row of rows) {
            if (row.children) {
                if (row.children.some(r => r.id === id)) {
                    return { parent: row, items: row.children }
                }
                const found = findParent(row.children, id)
                if (found) return found
            }
        }
        return null
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return

        const activeInfo = findParent(data.rows, active.id as string)
        const overInfo = findParent(data.rows, over.id as string)

        if (activeInfo && overInfo && activeInfo.items === overInfo.items) {
            const oldIndex = activeInfo.items.findIndex(r => r.id === active.id)
            const newIndex = overInfo.items.findIndex(r => r.id === over.id)
            
            const newItems = arrayMove(activeInfo.items, oldIndex, newIndex)
            
            if (activeInfo.parent === null) {
                 onUpdate({ ...data, rows: newItems })
            } else {
                 const newRows = updateRowInTree(data.rows, activeInfo.parent.id, (row) => ({
                     ...row,
                     children: newItems
                 }))
                 onUpdate({ ...data, rows: newRows })
            }
        }
    }

    // Handle click outside action menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeActionMenu && actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setActiveActionMenu(null)
            }
            if (activeSummaryMenu && 
                !summaryMenuRef.current?.contains(event.target as Node) && 
                !(event.target as Element).closest('.summary-menu-trigger')
            ) {
                setActiveSummaryMenu(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [activeActionMenu, activeSummaryMenu])

    const handleActionMenuClick = (e: React.MouseEvent, rowId: string) => {
        e.stopPropagation()
        if (activeActionMenu === rowId) {
            setActiveActionMenu(null)
        } else {
            const rect = e.currentTarget.getBoundingClientRect()
            setMenuPosition({
                top: rect.top,
                left: rect.right + 4
            })
            setActiveActionMenu(rowId)
        }
    }

    const handleCopyCell = async (text: string, rowId: string, colId: string) => {
        if (!text) return
        try {
            await navigator.clipboard.writeText(text)
            setCopiedCell({ rowId, colId })
            setTimeout(() => setCopiedCell(null), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const handlePasteCell = async (rowId: string, colId: string) => {
        try {
            const text = await navigator.clipboard.readText()
            if (text) {
                updateCell(rowId, colId, text)
                setPastedCell({ rowId, colId })
                setTimeout(() => setPastedCell(null), 2000)
            }
        } catch (err) {
            console.error('Failed to paste:', err)
        }
    }

    const addColumn = () => {
        const newCol: Column = {
            id: crypto.randomUUID(),
            title: 'New Column',
            type: 'text',
        }
        if (onColumnUpdate) {
            onColumnUpdate([...data.columns, newCol])
        } else {
            onUpdate({
                ...data,
                columns: [...data.columns, newCol],
            })
        }
    }

    const addRow = () => {
        addTableRow(tableId)
    }

    const updateColumn = (columnId: string, updatedColumn: Column) => {
        const newColumns = data.columns.map((col) =>
            col.id === columnId ? updatedColumn : col
        )
        if (onColumnUpdate) {
            onColumnUpdate(newColumns)
        } else {
            onUpdate({ ...data, columns: newColumns })
        }
    }

    const deleteColumn = (columnId: string) => {
        const newColumns = data.columns.filter((col) => col.id !== columnId)
        if (onColumnUpdate) {
            onColumnUpdate(newColumns)
        } else {
            onUpdate({ ...data, columns: newColumns })
        }
    }

    const duplicateColumn = (columnId: string, withContent: boolean) => {
        const sourceColumn = data.columns.find(col => col.id === columnId)
        if (!sourceColumn) return
        
        const newColumnId = crypto.randomUUID()
        const newColumn: Column = {
            ...sourceColumn,
            id: newColumnId,
            title: `${sourceColumn.title} (Copy)`,
        }
        
        // Find the index to insert after the source column
        const sourceIndex = data.columns.findIndex(col => col.id === columnId)
        const newColumns = [
            ...data.columns.slice(0, sourceIndex + 1),
            newColumn,
            ...data.columns.slice(sourceIndex + 1)
        ]
        
        // Clone cell values if withContent is true
        const cloneRowCells = (rows: Row[]): Row[] => {
            return rows.map(row => {
                const newColors = row.colors ? { ...row.colors } : undefined
                if (newColors && withContent && row.colors?.[columnId]) {
                    newColors[newColumnId] = row.colors[columnId]
                }
                return {
                    ...row,
                    cells: {
                        ...row.cells,
                        [newColumnId]: withContent ? (row.cells[columnId] || '') : ''
                    },
                    colors: newColors,
                    children: row.children ? cloneRowCells(row.children) : []
                }
            })
        }
        
        const newRows = cloneRowCells(data.rows)
        
        if (onColumnUpdate) {
            onColumnUpdate(newColumns)
            // Also need to update the rows with the new cell values
            onUpdate({ columns: newColumns, rows: newRows })
        } else {
            onUpdate({ columns: newColumns, rows: newRows })
        }
    }

    const reorderColumns = (newColumns: Column[]) => {
        if (onColumnUpdate) {
            onColumnUpdate(newColumns)
        } else {
            onUpdate({ ...data, columns: newColumns })
        }
    }

    const handleColumnDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (active.id !== over?.id) {
            const oldIndex = data.columns.findIndex(col => col.id === active.id)
            const newIndex = data.columns.findIndex(col => col.id === over?.id)
            if (oldIndex !== -1 && newIndex !== -1) {
                const newColumns = arrayMove(data.columns, oldIndex, newIndex)
                reorderColumns(newColumns)
            }
        }
    }

    const deleteRow = (rowId: string) => {
        if (settings.confirmBeforeDelete) {
            if (!window.confirm('Are you sure you want to delete this row?')) {
                return
            }
        }
        deleteTableRow(tableId, rowId)
    }

    const duplicateRow = (rowId: string) => {
        duplicateTableRow(tableId, rowId)
    }

    const updateCell = (rowId: string, colId: string, value: string) => {
        updateTableCell(tableId, rowId, colId, value)
    }

    const updateCellColor = (rowId: string, colId: string, color: string) => {
        updateTableCellColor(tableId, rowId, colId, color)
    }

    const updateRowColor = (rowId: string, color: string) => {
        updateTableRowColor(tableId, rowId, color)
    }

    const toggleRow = (rowId: string) => {
        toggleTableRow(tableId, rowId)
    }

    const addSubRow = (parentId: string) => {
        addTableRowChild(tableId, parentId)
    }

    const addSiblingRow = (siblingId: string) => {
        addTableRowSibling(tableId, siblingId)
    }

    const resizeColumn = (columnId: string, width: number) => {
        const newColumns = data.columns.map((col) =>
            col.id === columnId ? { ...col, width } : col
        )
        if (onColumnUpdate) {
            onColumnUpdate(newColumns)
        } else {
            onUpdate({ ...data, columns: newColumns })
        }
    }

    // Flatten visible rows for rendering
    const getVisibleRows = (rows: Row[], level = 0): { row: Row; level: number }[] => {
        let result: { row: Row; level: number }[] = []
        rows.forEach((row) => {
            result.push({ row, level })
            if (row.isExpanded && row.children) {
                result = [...result, ...getVisibleRows(row.children, level + 1)]
            }
        })
        return result
    }

    const visibleRows = getVisibleRows(data.rows)

    const renderCell = (col: Column, row: Row) => {
        const value = row.cells[col.id] || ''
        const onChange = (newValue: string) => updateCell(row.id, col.id, newValue)
        const onOptionsChange = (newOptions: string[]) => updateColumn(col.id, { ...col, options: newOptions })

        switch (col.type) {
            case 'checkbox':
                return <CheckboxCell value={value} onChange={onChange} />
            case 'number':
                return <NumberCell value={value} onChange={onChange} />
            case 'url':
                return <URLCell value={value} onChange={onChange} />
            case 'select':
                return <SelectCell value={value} onChange={onChange} options={col.options || []} onOptionsChange={onOptionsChange} />
            case 'multi-select':
                return <MultiSelectCell value={value} onChange={onChange} options={col.options || []} onOptionsChange={onOptionsChange} />
            case 'email':
                return <EmailCell value={value} onChange={onChange} />
            case 'phone':
                return <PhoneCell value={value} onChange={onChange} />
            case 'rating':
                return <RatingCell value={value} onChange={onChange} />
            case 'progress':
                return <ProgressCell value={value} onChange={onChange} />
            case 'file':
                return <FileCell value={value} onChange={onChange} />
            case 'comment':
                return <CommentCell value={value} onChange={onChange} />
            case 'password':
                return (
                    <input
                        type="password"
                        className="w-full bg-transparent outline-none text-[#e3e3e3] placeholder-[#6b6b6b] focus:placeholder-[#9b9b9b] text-sm min-h-[44px] sm:min-h-0 py-2 sm:py-0"
                        placeholder="********"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                    />
                )
            case 'date':
                return (
                    <input
                        type="date"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full bg-transparent outline-none text-[#e3e3e3] text-sm min-h-[44px] sm:min-h-0 py-2 sm:py-0 [color-scheme:dark]"
                    />
                )
            case 'reminder':
                return (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setReminderModal({ rowId: row.id, colId: col.id })}
                            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors min-h-[44px] sm:min-h-0"
                        >
                            <Bell size={16} className="flex-shrink-0" />
                            {value ? (
                                <span className="text-[#e3e3e3] text-xs sm:text-sm truncate">
                                    {(() => {
                                        try {
                                            return format(new Date(value), `${settings.dateFormat} ${settings.timeFormat}`)
                                        } catch {
                                            return 'Invalid date'
                                        }
                                    })()}
                                </span>
                            ) : (
                                <span className="text-[#6b6b6b] text-xs sm:text-sm">Set reminder</span>
                            )}
                        </button>
                    </div>
                )
            default:
                return (
                    <input
                        type="text"
                        className="w-full bg-transparent outline-none text-[#e3e3e3] placeholder-[#6b6b6b] focus:placeholder-[#9b9b9b] text-sm min-h-[44px] sm:min-h-0 py-2 sm:py-0"
                        placeholder="Empty"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                    />
                )
        }
    }

    const calculateColumnStats = (col: Column) => {
        const values = data.rows.map(r => r.cells[col.id]).filter(v => v !== undefined && v !== '')
        
        if (values.length === 0) return <div className="text-xs text-[#6b6b6b]">-</div>

        switch (col.type) {
            case 'number': {
                const nums = values.map(v => parseFloat(v)).filter(n => !isNaN(n))
                if (nums.length === 0) return <div className="text-xs text-[#6b6b6b]">-</div>
                
                const type = col.summaryType || 'sum'
                let result = ''
                let label = ''

                switch (type) {
                    case 'sum':
                        result = nums.reduce((a, b) => a + b, 0).toString()
                        label = 'Sum'
                        break
                    case 'avg':
                        result = (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)
                        label = 'Avg'
                        break
                    case 'min':
                        result = Math.min(...nums).toString()
                        label = 'Min'
                        break
                    case 'max':
                        result = Math.max(...nums).toString()
                        label = 'Max'
                        break
                    case 'count':
                        result = nums.length.toString()
                        label = 'Count'
                        break
                    case 'none':
                        result = '-'
                        label = 'Calc'
                        break
                }

                if (type === 'none') {
                    return (
                        <button
                            className="summary-menu-trigger flex items-center justify-center text-xs hover:bg-[#333] p-1 rounded -ml-1 w-full h-full min-h-[20px] transition-colors text-[#6b6b6b]"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                setActiveSummaryMenu({
                                    colId: col.id,
                                    top: rect.top - 8,
                                    left: rect.left
                                })
                            }}
                        >
                            Calculate
                        </button>
                    )
                }

                return (
                    <button
                        className="summary-menu-trigger flex flex-col items-start text-xs hover:bg-[#333] p-1 rounded -ml-1 w-full transition-colors"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setActiveSummaryMenu({
                                colId: col.id,
                                top: rect.top - 8, // Position above
                                left: rect.left
                            })
                        }}
                    >
                        <span className="text-[#e3e3e3] font-medium">{label}: {result}</span>
                    </button>
                )
            }
            case 'date':
            case 'reminder': {
                const dates = values.map(v => new Date(v).getTime()).filter(n => !isNaN(n))
                if (dates.length === 0) return null
                const min = Math.min(...dates)
                const earliestDate = new Date(min)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const daysLeft = differenceInDays(earliestDate, today)
                const daysText = daysLeft === 0 ? 'Today' : daysLeft === 1 ? '1 day left' : daysLeft > 0 ? `${daysLeft} days left` : `${Math.abs(daysLeft)} days ago`
                return (
                    <div className="text-xs">
                        <div className="text-[#9b9b9b]">Earliest:</div>
                        <div className="text-[#e3e3e3] font-medium">{format(earliestDate, settings.dateFormat)}</div>
                        <div className={`text-[10px] mt-0.5 ${daysLeft < 0 ? 'text-red-400' : daysLeft === 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {daysText}
                        </div>
                    </div>
                )
            }
            case 'checkbox': {
                const checked = values.filter(v => v === 'true').length
                return (
                    <div className="text-xs text-[#e3e3e3]">
                        {checked} checked
                    </div>
                )
            }
            default:
                return (
                    <div className="text-xs text-[#6b6b6b]">
                        {values.length} items
                    </div>
                )
        }
    }

    return (
        <div className="overflow-hidden border border-[#373737] rounded-xl bg-[#202020] shadow-xl">
            <div className="overflow-x-auto custom-scrollbar">
                {/* ... table ... */}
                <table className={`w-full text-left ${settings.fontSize === 'small' ? 'text-xs' : settings.fontSize === 'large' ? 'text-base' : 'text-sm'}`} style={{ tableLayout: 'fixed' }}>
                    {/* ... existing rendering ... */}
                    <thead className="bg-[#252525] text-[#9b9b9b] text-xs font-medium uppercase tracking-wider sticky top-0 z-50 shadow-sm">
                        <tr>
                            {/* Left Gutter Column for Actions */}
                            <th className={`w-[80px] px-2 border-b border-r border-[#373737] bg-[#252525] sticky left-0 z-[60] text-center font-semibold text-[#555] ${effectiveSettings.compactMode ? 'py-1.5' : 'py-3'}`}>
                                #
                            </th>
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleColumnDragEnd}
                            >
                                <SortableContext
                                    items={data.columns.map(col => col.id)}
                                    strategy={horizontalListSortingStrategy}
                                >
                            {data.columns.map((col) => {
                                // Collect all cell values for this column (including nested children)
                                const getCellValuesFromRows = (rows: Row[]): string[] => {
                                    const values: string[] = []
                                    rows.forEach(row => {
                                        values.push(row.cells[col.id] || '')
                                        if (row.children?.length) {
                                            values.push(...getCellValuesFromRows(row.children))
                                        }
                                    })
                                    return values
                                }
                                const cellValues = getCellValuesFromRows(data.rows)
                                
                                return (
                                <SortableColumn 
                                    key={col.id}
                                    column={col}
                                    width={col.width || 150}
                                    className={`px-3 sm:px-4 group relative border-b border-[#373737] ${effectiveSettings.showGridLines ? 'border-r' : ''} last:border-r-0 border-[#373737] bg-[#252525] z-50 ${effectiveSettings.compactMode ? 'py-1 sm:py-1.5' : 'py-2.5 sm:py-3'}`}
                                >
                                    {({ attributes, listeners }) => (
                                        <>
                                            <ColumnHeader
                                                column={col}
                                                onUpdate={(updated) => updateColumn(col.id, updated)}
                                                onDelete={() => deleteColumn(col.id)}
                                                onDuplicate={(withContent) => duplicateColumn(col.id, withContent)}
                                                cellValues={cellValues}
                                                dragHandleProps={{ attributes, listeners }}
                                            />
                                            {/* Resize Handle in Header */}
                                            <div className="absolute top-0 bottom-0 right-0 w-0 z-10">
                                                <ResizeHandle 
                                                    width={col.width || 150} 
                                                    onResize={(width) => resizeColumn(col.id, width)} 
                                                    minWidth={80}
                                                />
                                            </div>
                                        </>
                                    )}
                                </SortableColumn>
                            )})}
                                </SortableContext>
                            </DndContext>
                            
                            {/* Removed Right Actions Column Header */}
                            <th className={`px-3 sm:px-4 w-[50px] border-b border-[#373737] bg-[#252525] z-50 ${effectiveSettings.compactMode ? 'py-1 sm:py-1.5' : 'py-2.5 sm:py-3'}`}>
                                <button
                                    onClick={addColumn}
                                    className="text-[#6b6b6b] hover:text-blue-400 transition-colors p-1.5 hover:bg-blue-500/10 rounded"
                                    aria-label="Add column"
                                >
                                    <Plus size={18} />
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext 
                            items={visibleRows.map(r => r.row.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <tbody className="divide-y divide-[#373737]">
                                {data.rows.length === 0 && (
                                    <tr>
                                        <td colSpan={data.columns.length + 1} className="px-4 py-12 text-center text-[#6b6b6b]">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-[#2a2a2a] flex items-center justify-center">
                                                    <Plus size={24} className="text-[#4a4a4a]" />
                                                </div>
                                                <p>No items yet. Click "New" to add a row.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {visibleRows.map(({ row, level }, index) => (
                                    <SortableRow
                                        key={row.id}
                                        row={row}
                                        index={index}
                                        level={level}
                                        columns={data.columns}
                                        activeActionMenu={activeActionMenu}
                                        menuPosition={menuPosition}
                                        activeColorPickerCell={activeColorPickerCell}
                                        copiedCell={copiedCell}
                                        pastedCell={pastedCell}
                                        onToggleRow={toggleRow}
                                        onAddSiblingRow={addSiblingRow}
                                        onAddSubRow={addSubRow}
                                        onActionMenuClick={handleActionMenuClick}
                                        onDeleteRow={deleteRow}
                                        onDuplicateRow={duplicateRow}
                                        onUpdateRowColor={updateRowColor}
                                        onUpdateCellColor={updateCellColor}
                                        onCopyCell={handleCopyCell}
                                        onPasteCell={handlePasteCell}
                                        onResizeColumn={resizeColumn}
                                        renderCell={renderCell}
                                        setActiveActionMenu={setActiveActionMenu}
                                        actionMenuRef={actionMenuRef}
                                        setActiveColorPickerCell={setActiveColorPickerCell}
                                        disabled={isFiltered}
                                        zebraStriping={effectiveSettings.zebraStriping}
                                    />
                                ))}
                            </tbody>
                        </SortableContext>
                    </DndContext>
                    <tfoot className="bg-[#252525] border-t border-[#373737] sticky bottom-0 z-30 shadow-[0_-1px_2px_rgba(0,0,0,0.1)]">
                        <tr>
                            <td className={`w-[80px] px-2 border-r border-[#373737] text-center font-semibold text-[#555] bg-[#252525] sticky left-0 z-40 ${effectiveSettings.compactMode ? 'py-1' : 'py-2'}`}>
                                <div className="text-[10px] uppercase tracking-wider">Summary</div>
                            </td>
                            {data.columns.map((col) => (
                                <td
                                    key={col.id}
                                    className={`px-3 sm:px-4 ${effectiveSettings.showGridLines ? 'border-r' : ''} border-[#373737] last:border-r-0 bg-[#252525] ${effectiveSettings.compactMode ? 'py-1' : 'py-2'}`}
                                    style={{ width: col.width || 150, minWidth: 80 }}
                                >
                                    {calculateColumnStats(col)}
                                </td>
                            ))}
                            <td className="w-[50px] bg-[#252525]"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div className="px-3 sm:px-4 py-2.5 border-t border-[#373737] bg-[#202020] flex items-center justify-between">
                <button
                    onClick={addRow}
                    className="flex items-center gap-2 text-[#9b9b9b] hover:text-[#e3e3e3] px-3 py-2 rounded-md text-sm transition-all hover:bg-[#2a2a2a] active:scale-95 font-medium"
                >
                    <Plus size={16} /> 
                    <span>New Row</span>
                </button>
                
                {/* Per-table Appearance Controls */}
                {onAppearanceChange && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onAppearanceChange({ compactMode: !effectiveSettings.compactMode })}
                            className={`p-2 rounded-lg transition-all ${effectiveSettings.compactMode ? 'bg-blue-500/20 text-blue-400' : 'text-[#6b6b6b] hover:text-[#9b9b9b] hover:bg-[#2a2a2a]'}`}
                            title={`Compact Mode: ${effectiveSettings.compactMode ? 'On' : 'Off'}`}
                        >
                            <AlignJustify size={16} />
                        </button>
                        <button
                            onClick={() => onAppearanceChange({ showGridLines: !effectiveSettings.showGridLines })}
                            className={`p-2 rounded-lg transition-all ${effectiveSettings.showGridLines ? 'bg-blue-500/20 text-blue-400' : 'text-[#6b6b6b] hover:text-[#9b9b9b] hover:bg-[#2a2a2a]'}`}
                            title={`Grid Lines: ${effectiveSettings.showGridLines ? 'On' : 'Off'}`}
                        >
                            <Grid3X3 size={16} />
                        </button>
                        <button
                            onClick={() => onAppearanceChange({ zebraStriping: !effectiveSettings.zebraStriping })}
                            className={`p-2 rounded-lg transition-all ${effectiveSettings.zebraStriping ? 'bg-blue-500/20 text-blue-400' : 'text-[#6b6b6b] hover:text-[#9b9b9b] hover:bg-[#2a2a2a]'}`}
                            title={`Zebra Striping: ${effectiveSettings.zebraStriping ? 'On' : 'Off'}`}
                        >
                            <StretchHorizontal size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Summary Menu Portal */}
            {activeSummaryMenu && createPortal(
                <>
                    <div className="fixed inset-0 z-[9999]" onClick={() => setActiveSummaryMenu(null)} />
                    <div 
                        ref={summaryMenuRef}
                        className="fixed z-[10000] bg-[#202020] border border-[#373737] rounded-lg shadow-xl min-w-[120px] overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col py-1"
                        style={{
                            top: activeSummaryMenu.top, // Position relative to trigger
                            left: activeSummaryMenu.left,
                            transform: 'translateY(-100%)' // Shift up to appear above footer
                        }}
                    >
                        <div className="text-[10px] font-semibold text-[#6b6b6b] uppercase px-2 py-1">Calculate</div>
                        {[
                            { type: 'sum', label: 'Sum' },
                            { type: 'avg', label: 'Average' },
                            { type: 'min', label: 'Min' },
                            { type: 'max', label: 'Max' },
                            { type: 'count', label: 'Count' },
                            { type: 'none', label: 'None' }
                        ].map((opt) => (
                            <button
                                key={opt.type}
                                onClick={() => {
                                    const col = data.columns.find(c => c.id === activeSummaryMenu.colId)
                                    if (col) {
                                        updateColumn(col.id, { ...col, summaryType: opt.type as SummaryType })
                                    }
                                    setActiveSummaryMenu(null)
                                }}
                                className="text-left px-3 py-1.5 text-sm text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors"
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </>,
                document.body
            )}

            <ReminderModal
                isOpen={!!reminderModal}
                onClose={() => setReminderModal(null)}
                onSave={(date) => {
                    if (reminderModal) {
                        updateCell(reminderModal.rowId, reminderModal.colId, date)
                    }
                }}
                currentValue={reminderModal ? getVisibleRows(data.rows).find(r => r.row.id === reminderModal.rowId)?.row.cells[reminderModal.colId] : undefined}
                tableName={getTableById(tableId)?.name}
                userId={user?.id}
            />
        </div>
    )
}
