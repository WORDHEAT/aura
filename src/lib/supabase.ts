import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
}

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
