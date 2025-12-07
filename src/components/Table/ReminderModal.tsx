import { X, Bell } from 'lucide-react'
import { useState } from 'react'
import { NotificationService } from '../../services/NotificationService'

interface ReminderModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (date: string) => void
    currentValue?: string
    tableName?: string
    userId?: string
}

export function ReminderModal({ isOpen, onClose, onSave, currentValue, tableName, userId }: ReminderModalProps) {
    const [dateTime, setDateTime] = useState(currentValue || '')
    const [prevValue, setPrevValue] = useState(currentValue)

    // Sync state when currentValue changes (React-recommended pattern)
    // This runs during render, not in an effect, avoiding cascading renders
    if (currentValue !== prevValue) {
        setPrevValue(currentValue)
        setDateTime(currentValue || '')
    }

    if (!isOpen) return null

    const handleSave = () => {
        if (dateTime) {
            onSave(dateTime)
            const reminderDate = new Date(dateTime)
            const now = new Date()
            const delay = reminderDate.getTime() - now.getTime()

            if (delay > 0) {
                const title = tableName ? `Reminder: ${tableName}` : 'Aura Reminder'
                NotificationService.schedule(title, reminderDate, undefined, {
                    tableName,
                    userId
                })
            }
        }
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <div className="bg-[#202020] border border-[#373737] rounded-t-2xl sm:rounded-lg shadow-2xl w-full sm:max-w-md max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-[#373737] sticky top-0 bg-[#202020] z-10">
                    <h3 className="text-base font-semibold text-[#e3e3e3]">Set Reminder</h3>
                    <button
                        onClick={onClose}
                        className="text-[#9b9b9b] hover:text-[#e3e3e3] transition-colors p-2 hover:bg-[#2a2a2a] rounded -mr-2"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="px-4 sm:px-5 py-4 sm:py-5">
                    <label className="block text-sm font-medium text-[#9b9b9b] mb-2">
                        Date & Time
                    </label>
                    <input
                        type="datetime-local"
                        value={dateTime}
                        onChange={(e) => setDateTime(e.target.value)}
                        className="w-full bg-[#191919] border border-[#373737] text-[#e3e3e3] px-3 py-3 sm:py-2.5 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                    <div className="mt-3 p-3 bg-[#2a2a2a] rounded-lg">
                        <p className="text-xs text-[#9b9b9b] flex items-center gap-2">
                            <Bell size={14} className="text-blue-400" />
                            You'll receive a browser notification at the specified time
                        </p>
                        {userId && (
                            <p className="mt-2 text-xs text-blue-400">
                                + Telegram notification (if configured in Profile)
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 px-4 sm:px-5 py-4 border-t border-[#373737] sticky bottom-0 bg-[#202020]">
                    <button
                        onClick={onClose}
                        className="px-4 py-3 sm:py-2 text-sm font-medium text-[#9b9b9b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-3 sm:py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
                    >
                        Save Reminder
                    </button>
                </div>
            </div>
        </div>
    )
}
