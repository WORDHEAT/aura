import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = 'https://vyjjqzzsqupbhglasylt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5ampxenpzcXVwYmhnbGFzeWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MzMyNTAsImV4cCI6MjA4MDUwOTI1MH0.hacwXDVBy2wgtpVQY9lDgvFH47DcWz-4F0MvAiruU0M'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
})

// Helper to get current user
export const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

// Helper to get current session
export const getCurrentSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session
}
