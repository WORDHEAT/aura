import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, X, Calendar, Clock } from 'lucide-react'
import { useTableContext } from '../context/TableContext'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, parseISO } from 'date-fns'

interface CalendarViewProps {
    isOpen: boolean
    onClose: () => void
}

interface ReminderItem {
    tableId: string
    tableName: string
    workspaceName: string
    rowId: string
    columnId: string
    columnTitle: string
    date: Date
    cellValue: string
}

export function CalendarView({ isOpen, onClose }: CalendarViewProps) {
    const { workspaces } = useTableContext()
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)

    // Extract all reminders from all tables
    const reminders = useMemo(() => {
        const items: ReminderItem[] = []
        
        workspaces.forEach(workspace => {
            workspace.tables.forEach(table => {
                // Find reminder columns
                const reminderColumns = table.columns.filter(col => col.type === 'reminder')
                
                reminderColumns.forEach(column => {
                    table.rows.forEach(row => {
                        const cellValue = row.cells[column.id]
                        if (cellValue && typeof cellValue === 'string') {
                            try {
                                const date = parseISO(cellValue)
                                if (!isNaN(date.getTime())) {
                                    // Get the name from the first text column for display
                                    const nameColumn = table.columns.find(c => c.type === 'text')
                                    const displayName = nameColumn ? (row.cells[nameColumn.id] || 'Unnamed') : 'Unnamed'
                                    
                                    items.push({
                                        tableId: table.id,
                                        tableName: table.name,
                                        workspaceName: workspace.name,
                                        rowId: row.id,
                                        columnId: column.id,
                                        columnTitle: column.title,
                                        date,
                                        cellValue: String(displayName)
                                    })
                                }
                            } catch {
                                // Invalid date, skip
                            }
                        }
                    })
                })
            })
        })
        
        return items.sort((a, b) => a.date.getTime() - b.date.getTime())
    }, [workspaces])

    // Get days for current month view
    const monthDays = useMemo(() => {
        const start = startOfMonth(currentMonth)
        const end = endOfMonth(currentMonth)
        return eachDayOfInterval({ start, end })
    }, [currentMonth])

    // Get reminders for a specific day
    const getRemindersForDay = (day: Date) => {
        return reminders.filter(r => isSameDay(r.date, day))
    }

    // Get reminders for selected date
    const selectedDateReminders = selectedDate 
        ? getRemindersForDay(selectedDate)
        : []

    // Get start day of week offset
    const startDayOffset = startOfMonth(currentMonth).getDay()

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-[#202020] border border-[#373737] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#373737]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Calendar className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[#e3e3e3]">Calendar</h2>
                            <p className="text-xs text-[#6b6b6b]">{reminders.length} reminders total</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row">
                    {/* Calendar Grid */}
                    <div className="flex-1 p-4">
                        {/* Month Navigation */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                className="p-2 text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] rounded-lg transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <h3 className="text-lg font-medium text-[#e3e3e3]">
                                {format(currentMonth, 'MMMM yyyy')}
                            </h3>
                            <button
                                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                className="p-2 text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] rounded-lg transition-colors"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        {/* Day Headers */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="text-center text-xs font-medium text-[#6b6b6b] py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Days */}
                        <div className="grid grid-cols-7 gap-1">
                            {/* Empty cells for offset */}
                            {Array.from({ length: startDayOffset }).map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-square" />
                            ))}
                            
                            {monthDays.map(day => {
                                const dayReminders = getRemindersForDay(day)
                                const hasReminders = dayReminders.length > 0
                                const isSelected = selectedDate && isSameDay(day, selectedDate)
                                const isCurrentDay = isToday(day)
                                
                                return (
                                    <button
                                        key={day.toISOString()}
                                        onClick={() => setSelectedDate(day)}
                                        className={`
                                            aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all text-sm
                                            ${isSelected 
                                                ? 'bg-blue-500 text-white' 
                                                : isCurrentDay
                                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                                                    : isSameMonth(day, currentMonth)
                                                        ? 'text-[#e3e3e3] hover:bg-[#2a2a2a]'
                                                        : 'text-[#4a4a4a]'
                                            }
                                        `}
                                    >
                                        <span className="font-medium">{format(day, 'd')}</span>
                                        {hasReminders && (
                                            <div className="flex gap-0.5">
                                                {dayReminders.slice(0, 3).map((_, i) => (
                                                    <div 
                                                        key={i} 
                                                        className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-400'}`}
                                                    />
                                                ))}
                                                {dayReminders.length > 3 && (
                                                    <span className={`text-[8px] ${isSelected ? 'text-white' : 'text-blue-400'}`}>+</span>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Selected Date Details */}
                    <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-[#373737] p-4 bg-[#191919]/50">
                        <h4 className="text-sm font-medium text-[#9b9b9b] mb-3">
                            {selectedDate 
                                ? format(selectedDate, 'EEEE, MMMM d, yyyy')
                                : 'Select a date'
                            }
                        </h4>
                        
                        {selectedDate && selectedDateReminders.length === 0 && (
                            <p className="text-sm text-[#6b6b6b]">No reminders for this date</p>
                        )}
                        
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {selectedDateReminders.map((reminder, i) => (
                                <div 
                                    key={`${reminder.tableId}-${reminder.rowId}-${i}`}
                                    className="p-3 bg-[#2a2a2a] rounded-lg border border-[#373737]"
                                >
                                    <div className="flex items-start gap-2">
                                        <Clock size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-[#e3e3e3] truncate">
                                                {reminder.cellValue}
                                            </p>
                                            <p className="text-xs text-[#6b6b6b] mt-0.5">
                                                {reminder.tableName} • {reminder.workspaceName}
                                            </p>
                                            <p className="text-xs text-[#6b6b6b]">
                                                {format(reminder.date, 'h:mm a')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Upcoming reminders */}
                        {!selectedDate && (
                            <>
                                <h4 className="text-sm font-medium text-[#9b9b9b] mb-3 mt-4">Upcoming</h4>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {reminders
                                        .filter(r => r.date >= new Date())
                                        .slice(0, 10)
                                        .map((reminder, i) => (
                                            <div 
                                                key={`upcoming-${reminder.tableId}-${reminder.rowId}-${i}`}
                                                className="p-3 bg-[#2a2a2a] rounded-lg border border-[#373737] cursor-pointer hover:border-blue-500/50 transition-colors"
                                                onClick={() => setSelectedDate(reminder.date)}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <Clock size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-[#e3e3e3] truncate">
                                                            {reminder.cellValue}
                                                        </p>
                                                        <p className="text-xs text-[#6b6b6b] mt-0.5">
                                                            {format(reminder.date, 'MMM d, yyyy • h:mm a')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    }
                                    {reminders.filter(r => r.date >= new Date()).length === 0 && (
                                        <p className="text-sm text-[#6b6b6b]">No upcoming reminders</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
