import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'

/**
 * Service to send Telegram notifications for reminders
 * The actual sending is done via Supabase Edge Function to keep the bot token secure
 */
export class TelegramService {
    private static EDGE_FUNCTION_URL = 'telegram-notify'

    /**
     * Send a reminder notification via Telegram
     */
    static async sendReminder(
        userId: string,
        title: string,
        tableName: string,
        scheduledTime: Date,
        rowTitle?: string
    ): Promise<boolean> {
        try {
            // First, get user's telegram_chat_id from profiles
            const { data: profile } = await supabase
                .from('profiles')
                .select('telegram_chat_id')
                .eq('id', userId)
                .single()

            if (!profile?.telegram_chat_id) {
                logger.log('No Telegram chat ID configured for user')
                return false
            }

            // Call the edge function to send the notification
            const { error } = await supabase.functions.invoke(this.EDGE_FUNCTION_URL, {
                body: {
                    chatId: profile.telegram_chat_id,
                    title,
                    tableName,
                    rowTitle,
                    scheduledTime: scheduledTime.toISOString()
                }
            })

            if (error) {
                console.error('Failed to send Telegram notification:', error)
                return false
            }

            logger.log('✅ Telegram notification sent successfully')
            return true
        } catch (err) {
            console.error('Error sending Telegram notification:', err)
            return false
        }
    }

    /**
     * Test the Telegram connection by sending a test message
     */
    static async sendTestMessage(chatId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase.functions.invoke(this.EDGE_FUNCTION_URL, {
                body: {
                    chatId,
                    isTest: true
                }
            })

            if (error) {
                return { success: false, error: error.message }
            }

            return { success: true }
        } catch {
            return { success: false, error: 'Failed to connect to Telegram' }
        }
    }
}
