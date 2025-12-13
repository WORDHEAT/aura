// Supabase Edge Function to check for due reminders and notify team members
// This should be scheduled to run every minute via Supabase Cron

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TeamReminder {
    id: string
    workspace_id: string
    table_id: string
    row_id: string
    column_id: string
    title: string
    reminder_time: string
    created_by: string
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        // Create Supabase client with service role for full access
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Get current time
        const now = new Date()
        
        // Find reminders that are due (within the last 2 minutes to account for cron timing)
        const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000)
        
        const { data: dueReminders, error: reminderError } = await supabase
            .from('team_reminders')
            .select('*')
            .eq('is_sent', false)
            .lte('reminder_time', now.toISOString())
            .gte('reminder_time', twoMinutesAgo.toISOString())

        if (reminderError) {
            console.error('Error fetching reminders:', reminderError)
            throw reminderError
        }

        if (!dueReminders || dueReminders.length === 0) {
            return new Response(
                JSON.stringify({ message: 'No due reminders', checked_at: now.toISOString() }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`Found ${dueReminders.length} due reminders`)

        const notificationResults = []

        for (const reminder of dueReminders as TeamReminder[]) {
            // Get workspace info to check visibility
            const { data: workspace } = await supabase
                .from('workspaces')
                .select('owner_id, visibility')
                .eq('id', reminder.workspace_id)
                .single()

            if (!workspace) continue

            // Get team members based on workspace visibility
            let memberIds: string[] = []
            
            if (workspace.visibility === 'private') {
                // Private: only owner
                memberIds = [workspace.owner_id]
            } else {
                // Team or public: get all users who have profiles (simplified)
                // In a real app, you'd have a workspace_members table
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id')
                
                if (profiles) {
                    memberIds = profiles.map((p: { id: string }) => p.id)
                }
            }

            // Create notifications for each team member
            const notifications = memberIds.map(userId => ({
                user_id: userId,
                workspace_id: reminder.workspace_id,
                reminder_id: reminder.id,
                title: `🔔 ${reminder.title}`,
                message: `Reminder is due now`,
                is_read: false
            }))

            if (notifications.length > 0) {
                const { error: insertError } = await supabase
                    .from('team_notifications')
                    .insert(notifications)

                if (insertError) {
                    console.error('Error creating notifications:', insertError)
                } else {
                    console.log(`Created ${notifications.length} notifications for reminder ${reminder.id}`)
                }
            }

            // Mark reminder as sent
            await supabase
                .from('team_reminders')
                .update({ is_sent: true, sent_at: now.toISOString() })
                .eq('id', reminder.id)

            notificationResults.push({
                reminder_id: reminder.id,
                notifications_created: notifications.length
            })

            // Note: Telegram notifications are handled by the client-side NotificationService
            // to avoid duplicate notifications
        }

        return new Response(
            JSON.stringify({ 
                success: true, 
                processed: dueReminders.length,
                results: notificationResults,
                checked_at: now.toISOString()
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error in check-reminders function:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
