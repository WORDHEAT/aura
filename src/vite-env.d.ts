/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Electron API exposed via preload
interface SpellCheckContext {
  misspelledWord: string
  suggestions: string[]
}

interface ElectronAPI {
  getSpellSuggestions: () => Promise<SpellCheckContext | null>
  addToDictionary: (word: string) => Promise<boolean>
  onSpellCheckContext: (callback: (context: SpellCheckContext) => void) => void
  removeSpellCheckListener: () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
