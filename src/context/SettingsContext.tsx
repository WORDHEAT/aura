import React, { createContext, useContext, useState, useEffect } from 'react'

export interface AppSettings {
    dateFormat: string
    timeFormat: string
    compactMode: boolean
    defaultView: 'single' | 'all'
    enableNotifications: boolean
    showGridLines: boolean
    zebraStriping: boolean
}

interface SettingsContextType {
    settings: AppSettings
    updateSettings: (newSettings: Partial<AppSettings>) => void
}

const defaultSettings: AppSettings = {
    dateFormat: 'MM/dd/yyyy',
    timeFormat: 'HH:mm',
    compactMode: false,
    defaultView: 'single',
    enableNotifications: true,
    showGridLines: true,
    zebraStriping: false,
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
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

    useEffect(() => {
        localStorage.setItem('aura-settings', JSON.stringify(settings))
    }, [settings])

    const updateSettings = (newSettings: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }))
    }

    return (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
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
