import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

// User type for our app
export interface User {
    id: string
    email: string
    name: string
    avatarUrl?: string
    createdAt: string
}

// Auth state type
interface AuthState {
    user: User | null
    isLoading: boolean
    isAuthenticated: boolean
}

// Auth context type
interface AuthContextType extends AuthState {
    signIn: (email: string, password: string) => Promise<void>
    signUp: (email: string, password: string, name: string) => Promise<void>
    signOut: () => Promise<void>
    signInWithGoogle: () => Promise<void>
    signInWithGithub: () => Promise<void>
    updateProfile: (data: Partial<Pick<User, 'name' | 'avatarUrl'>>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
    children: ReactNode
}

// Convert Supabase user to our User type
const mapSupabaseUser = (supabaseUser: SupabaseUser): User => ({
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
    avatarUrl: supabaseUser.user_metadata?.avatar_url,
    createdAt: supabaseUser.created_at
})

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Initialize auth state and listen for changes
    useEffect(() => {
        // Get initial session
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.user) {
                    setUser(mapSupabaseUser(session.user))
                }
            } catch (error) {
                console.error('Failed to get session:', error)
            } finally {
                setIsLoading(false)
            }
        }
        initAuth()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (session?.user) {
                    setUser(mapSupabaseUser(session.user))
                } else {
                    setUser(null)
                }
                setIsLoading(false)
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    // Sign in with email/password
    const signIn = async (email: string, password: string): Promise<void> => {
        setIsLoading(true)
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            })
            if (error) throw error
        } finally {
            setIsLoading(false)
        }
    }

    // Sign up with email/password
    const signUp = async (email: string, password: string, name: string): Promise<void> => {
        setIsLoading(true)
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        full_name: name
                    }
                }
            })
            if (error) throw error
        } finally {
            setIsLoading(false)
        }
    }

    // Sign out
    const signOut = async (): Promise<void> => {
        setIsLoading(true)
        try {
            // Clear local storage first
            localStorage.removeItem('aura-workspaces')
            localStorage.removeItem('aura-current-table-id')
            localStorage.removeItem('sb-vyjjqzzsqupbhglasylt-auth-token')
            
            // Sign out from Supabase
            await supabase.auth.signOut({ scope: 'global' })
            
            // Clear user state
            setUser(null)
            
            // Reload the page (works in both web and Electron)
            window.location.reload()
        } catch (error) {
            console.error('Sign out error:', error)
            // Force clear even on error
            setUser(null)
            localStorage.clear()
            window.location.reload()
        } finally {
            setIsLoading(false)
        }
    }

    // Sign in with Google
    const signInWithGoogle = async (): Promise<void> => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        })
        if (error) throw error
    }

    // Sign in with GitHub
    const signInWithGithub = async (): Promise<void> => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: window.location.origin
            }
        })
        if (error) throw error
    }

    // Update user profile
    const updateProfile = async (data: Partial<Pick<User, 'name' | 'avatarUrl'>>): Promise<void> => {
        if (!user) throw new Error('Not authenticated')
        
        setIsLoading(true)
        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    name: data.name,
                    avatar_url: data.avatarUrl
                }
            })
            if (error) throw error
            
            // Update local state
            setUser(prev => prev ? { ...prev, ...data } : null)
        } finally {
            setIsLoading(false)
        }
    }

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        signInWithGithub,
        updateProfile
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
