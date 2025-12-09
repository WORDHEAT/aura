import { contextBridge, ipcRenderer } from 'electron'

// Spell check context type
interface SpellCheckContext {
    misspelledWord: string
    suggestions: string[]
}

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('electronAPI', {
    // Spell check APIs
    getSpellSuggestions: () => ipcRenderer.invoke('get-spell-suggestions') as Promise<SpellCheckContext | null>,
    addToDictionary: (word: string) => ipcRenderer.invoke('add-to-dictionary', word) as Promise<boolean>,
    onSpellCheckContext: (callback: (context: SpellCheckContext) => void) => {
        ipcRenderer.on('spell-check-context', (_event, context) => callback(context))
    },
    removeSpellCheckListener: () => {
        ipcRenderer.removeAllListeners('spell-check-context')
    },
    // Update APIs
    checkForUpdates: () => ipcRenderer.send('check-for-updates')
})
