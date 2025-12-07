import { createClient } from '@supabase/supabase-js'

// Use environment variables if available, otherwise use hardcoded values for desktop app
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vyjjqzzsqupbhglasylt.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5ampxenpzcXVwYmhnbGFzeWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MzMyNTAsImV4cCI6MjA4MDUwOTI1MH0.hacwXDVBy2wgtpVQY9lDgvFH47DcWz-4F0MvAiruU0M'

// Using any for database types to avoid strict type checking issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<any>(supabaseUrl, supabaseAnonKey, {
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
