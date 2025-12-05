const REMINDERS_KEY = 'aura-scheduled-reminders'

interface ScheduledReminder {
    id: string
    title: string
    time: string // ISO string
}

// Track active timeouts so we can clear them if needed
const activeTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map()

export const NotificationService = {
    requestPermission: async () => {
        if (!('Notification' in window)) {
            console.error('This browser does not support desktop notification')
            return false
        }
        const permission = await Notification.requestPermission()
        return permission === 'granted'
    },

    send: (title: string, options?: NotificationOptions) => {
        if (Notification.permission === 'granted') {
            new Notification(title, options)
        }
    },

    schedule: (title: string, time: Date, id?: string) => {
        const now = new Date().getTime()
        const target = time.getTime()
        const delay = target - now

        if (delay > 0) {
            const reminderId = id || crypto.randomUUID()
            
            // Clear existing timeout for this reminder if any
            if (activeTimeouts.has(reminderId)) {
                clearTimeout(activeTimeouts.get(reminderId))
            }

            const timeoutId = setTimeout(() => {
                NotificationService.send(title)
                // Remove from storage after firing
                NotificationService.removeReminder(reminderId)
                activeTimeouts.delete(reminderId)
            }, delay)
            
            activeTimeouts.set(reminderId, timeoutId)

            // Save to localStorage for persistence
            NotificationService.saveReminder({ id: reminderId, title, time: time.toISOString() })
            console.log(`Reminder scheduled for ${time.toLocaleTimeString()}`)
            return reminderId
        }
        return null
    },

    saveReminder: (reminder: ScheduledReminder) => {
        try {
            const reminders = NotificationService.getReminders()
            const filtered = reminders.filter(r => r.id !== reminder.id)
            filtered.push(reminder)
            localStorage.setItem(REMINDERS_KEY, JSON.stringify(filtered))
        } catch (error) {
            console.error('Failed to save reminder:', error)
        }
    },

    removeReminder: (id: string) => {
        try {
            const reminders = NotificationService.getReminders()
            const filtered = reminders.filter(r => r.id !== id)
            localStorage.setItem(REMINDERS_KEY, JSON.stringify(filtered))
        } catch (error) {
            console.error('Failed to remove reminder:', error)
        }
    },

    getReminders: (): ScheduledReminder[] => {
        try {
            const saved = localStorage.getItem(REMINDERS_KEY)
            return saved ? JSON.parse(saved) : []
        } catch {
            return []
        }
    },

    // Call this on app startup to restore pending reminders
    restoreReminders: () => {
        const reminders = NotificationService.getReminders()
        const now = new Date().getTime()
        
        reminders.forEach(reminder => {
            const target = new Date(reminder.time).getTime()
            if (target > now) {
                // Re-schedule if still in the future
                NotificationService.schedule(reminder.title, new Date(reminder.time), reminder.id)
            } else {
                // Remove expired reminders
                NotificationService.removeReminder(reminder.id)
            }
        })
    },

    cancelAll: () => {
        activeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId))
        activeTimeouts.clear()
    }
}
