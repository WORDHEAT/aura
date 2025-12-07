// Supabase Edge Function for sending Telegram notifications
// Deploy with: supabase functions deploy telegram-notify

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || ''

interface RequestBody {
    chatId: string
    title?: string
    tableName?: string
    scheduledTime?: string
    isTest?: boolean
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            },
        })
    }

    try {
        const body: RequestBody = await req.json()
        const { chatId, title, tableName, scheduledTime, isTest } = body

        if (!chatId) {
            return new Response(
                JSON.stringify({ error: 'chatId is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        if (!TELEGRAM_BOT_TOKEN) {
            console.error('TELEGRAM_BOT_TOKEN not configured')
            return new Response(
                JSON.stringify({ error: 'Telegram bot not configured' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Build message
        let message: string
        if (isTest) {
            message = '✅ *Aura Test Notification*\n\nYour Telegram notifications are working! You will receive reminders here.'
        } else {
            const time = scheduledTime ? new Date(scheduledTime).toLocaleString() : 'Now'
            message = `🔔 *Reminder: ${title || 'Untitled'}*\n\n📋 Table: ${tableName || 'Unknown'}\n⏰ Time: ${time}\n\n_Open Aura to view details_`
        }

        // Send via Telegram API
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        })

        const result = await response.json()

        if (!result.ok) {
            console.error('Telegram API error:', result)
            return new Response(
                JSON.stringify({ error: result.description || 'Failed to send message' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
})
