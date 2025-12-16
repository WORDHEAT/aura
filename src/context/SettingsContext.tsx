import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { syncService } from '../services/SyncService'
import { useAuth } from './AuthContext'

export interface AppSettings {
    dateFormat: string
    timeFormat: string
    compactMode: boolean
    defaultView: 'single' | 'all'
    enableNotifications: boolean
    showGridLines: boolean
    zebraStriping: boolean
    fontSize: 'small' | 'medium' | 'large'
    confirmBeforeDelete: boolean
    defaultNoteView: 'edit' | 'split' | 'preview'
}

interface SettingsContextType {
    settings: AppSettings
    updateSettings: (newSettings: Partial<AppSettings>) => void
    syncSettings: () => Promise<void>
}

const defaultSettings: AppSettings = {
    dateFormat: 'MM/dd/yyyy',
    timeFormat: 'HH:mm',
    compactMode: false,
    defaultView: 'single',
    enableNotifications: true,
    showGridLines: true,
    zebraStriping: false,
    fontSize: 'medium',
    confirmBeforeDelete: true,
    defaultNoteView: 'edit',
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, user } = useAuth()
    const [settings, setSettings] = useState<AppSettings>(() => {
        const saved = localStorage.getItem('aura-settings')
        if (saved) {
            try {
                return { ...defaultSettings, ...JSON.parse(saved) }
            } catch {
                return defaultSettings
            }
        }
        return defaultSettings
    })
    
    const isLoadingFromCloudRef = useRef(false)
    const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Sync settings from cloud on login
    const syncSettings = useCallback(async () => {
        if (!isAuthenticated || !user) return
        
        try {
            const cloudSettings = await syncService.fetchSettings()
            if (cloudSettings && Object.keys(cloudSettings).length > 0) {
                isLoadingFromCloudRef.current = true
                setSettings(prev => ({ ...defaultSettings, ...prev, ...cloudSettings as Partial<AppSettings> }))
            }
        } catch (error) {
            console.error('Failed to sync settings:', error)
        }
    }, [isAuthenticated, user])

    // Load settings from cloud on auth change
    useEffect(() => {
        if (isAuthenticated && user) {
            syncSettings()
        }
    }, [isAuthenticated, user, syncSettings])

    // Save to localStorage and sync to cloud
    useEffect(() => {
        localStorage.setItem('aura-settings', JSON.stringify(settings))
        
        // Skip cloud sync if we just loaded from cloud
        if (isLoadingFromCloudRef.current) {
            isLoadingFromCloudRef.current = false
            return
        }
        
        // Debounced sync to cloud
        if (isAuthenticated && user) {
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current)
            }
            syncTimeoutRef.current = setTimeout(() => {
                syncService.updateSettings(settings as unknown as Record<string, unknown>).catch(console.error)
            }, 1000)
        }
    }, [settings, isAuthenticated, user])

    const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }))
    }, [])

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, syncSettings }}>
            {children}
        </SettingsContext.Provider>
    )
}

export function useSettings() {
    const context = useContext(SettingsContext)
    if (!context) {
        throw new Error('useSettings must be used within SettingsProvider')
    }
    return context
}
