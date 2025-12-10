import { supabase, getCurrentUser } from '../lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'
import { logger } from '../lib/logger'

export interface TeamReminder {
    id: string
    workspace_id: string
    table_id: string
    row_id: string
    column_id: string
    title: string
    reminder_time: string
    created_by: string
    created_at: string
    is_sent: boolean
    sent_at?: string
}

export interface TeamNotification {
    id: string
    user_id: string
    workspace_id: string
    reminder_id?: string
    title: string
    message?: string
    is_read: boolean
    created_at: string
}

type NotificationCallback = (notification: TeamNotification) => void

class TeamNotificationServiceClass {
    private channel: RealtimeChannel | null = null
    private callbacks: NotificationCallback[] = []

    // Create a team reminder in Supabase
    async createReminder(params: {
        workspaceId: string
        tableId: string
        rowId: string
        columnId: string
        title: string
        reminderTime: Date
    }): Promise<TeamReminder | null> {
        const user = await getCurrentUser()
        if (!user) {
            console.error('User not authenticated')
            return null
        }

        const { data, error } = await supabase
            .from('team_reminders')
            .insert({
                workspace_id: params.workspaceId,
                table_id: params.tableId,
                row_id: params.rowId,
                column_id: params.columnId,
                title: params.title,
                reminder_time: params.reminderTime.toISOString(),
                created_by: user.id
            })
            .select()
            .single()

        if (error) {
            console.error('Failed to create team reminder:', error)
            return null
        }

        return data as TeamReminder
    }

    // Update an existing reminder
    async updateReminder(reminderId: string, reminderTime: Date, title?: string): Promise<boolean> {
        const updateData: Record<string, unknown> = {
            reminder_time: reminderTime.toISOString()
        }
        if (title) updateData.title = title

        const { error } = await supabase
            .from('team_reminders')
            .update(updateData)
            .eq('id', reminderId)

        if (error) {
            console.error('Failed to update reminder:', error)
            return false
        }
        return true
    }

    // Delete a reminder
    async deleteReminder(reminderId: string): Promise<boolean> {
        const { error } = await supabase
            .from('team_reminders')
            .delete()
            .eq('id', reminderId)

        if (error) {
            console.error('Failed to delete reminder:', error)
            return false
        }
        return true
    }

    // Get reminders for a workspace
    async getRemindersForWorkspace(workspaceId: string): Promise<TeamReminder[]> {
        const { data, error } = await supabase
            .from('team_reminders')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('is_sent', false)
            .order('reminder_time', { ascending: true })

        if (error) {
            console.error('Failed to fetch reminders:', error)
            return []
        }
        return data as TeamReminder[]
    }

    // Get unread notifications for current user
    async getUnreadNotifications(): Promise<TeamNotification[]> {
        const user = await getCurrentUser()
        if (!user) return []

        const { data, error } = await supabase
            .from('team_notifications')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Failed to fetch notifications:', error)
            return []
        }
        return data as TeamNotification[]
    }

    // Mark notification as read
    async markAsRead(notificationId: string): Promise<boolean> {
        const { error } = await supabase
            .from('team_notifications')
            .update({ is_read: true })
            .eq('id', notificationId)

        if (error) {
            console.error('Failed to mark notification as read:', error)
            return false
        }
        return true
    }

    // Mark all notifications as read
    async markAllAsRead(): Promise<boolean> {
        const user = await getCurrentUser()
        if (!user) return false

        const { error } = await supabase
            .from('team_notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false)

        if (error) {
            console.error('Failed to mark all notifications as read:', error)
            return false
        }
        return true
    }

    // Subscribe to realtime notifications
    async subscribe(callback: NotificationCallback): Promise<void> {
        const user = await getCurrentUser()
        if (!user) {
            console.warn('Cannot subscribe to notifications: user not authenticated')
            return
        }

        this.callbacks.push(callback)

        // Only create channel once
        if (this.channel) return

        this.channel = supabase
            .channel('team_notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'team_notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    const notification = payload.new as TeamNotification
                    
                    // Show browser notification
                    if (Notification.permission === 'granted') {
                        new Notification(notification.title, {
                            body: notification.message || 'You have a new reminder',
                            icon: '/icon-192x192.png'
                        })
                    }

                    // Call all registered callbacks
                    this.callbacks.forEach(cb => cb(notification))
                }
            )
            .subscribe()

        logger.log('Subscribed to team notifications')
    }

    // Unsubscribe from realtime notifications
    unsubscribe(): void {
        if (this.channel) {
            supabase.removeChannel(this.channel)
            this.channel = null
        }
        this.callbacks = []
    }

    // Remove a specific callback
    removeCallback(callback: NotificationCallback): void {
        this.callbacks = this.callbacks.filter(cb => cb !== callback)
    }
}

export const TeamNotificationService = new TeamNotificationServiceClass()
