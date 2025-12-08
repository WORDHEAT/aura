import { app, BrowserWindow, Menu, dialog, ipcMain, session } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configure logging
log.transports.file.level = 'info'
autoUpdater.logger = log

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

// Auto-updater configuration
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

function setupAutoUpdater() {
    // Check for updates on startup (only in production)
    if (app.isPackaged) {
        autoUpdater.checkForUpdatesAndNotify()
        
        // Check for updates every 4 hours
        setInterval(() => {
            autoUpdater.checkForUpdatesAndNotify()
        }, 4 * 60 * 60 * 1000)
    }

    autoUpdater.on('checking-for-update', () => {
        log.info('Checking for update...')
    })

    autoUpdater.on('update-available', (info: { version: string }) => {
        log.info('Update available:', info.version)
        dialog.showMessageBox(win!, {
            type: 'info',
            title: 'Update Available',
            message: `A new version (${info.version}) is available. It will be downloaded in the background.`,
            buttons: ['OK']
        })
    })

    autoUpdater.on('update-not-available', () => {
        log.info('Update not available.')
    })

    autoUpdater.on('download-progress', (progressObj: { bytesPerSecond: number; percent: number }) => {
        log.info(`Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`)
    })

    autoUpdater.on('update-downloaded', (info: { version: string }) => {
        log.info('Update downloaded:', info.version)
        dialog.showMessageBox(win!, {
            type: 'info',
            title: 'Update Ready',
            message: `Version ${info.version} has been downloaded. Restart the app to apply the update.`,
            buttons: ['Restart Now', 'Later']
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall()
            }
        })
    })

    autoUpdater.on('error', (err: Error) => {
        log.error('Update error:', err)
    })
}

function createWindow() {
    // Hide the application menu
    Menu.setApplicationMenu(null)
    
    win = new BrowserWindow({
        icon: path.join(process.env.VITE_PUBLIC || '', 'icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.mjs'),
            spellcheck: true, // Enable spellcheck in webContents
        },
        width: 1200,
        height: 800,
        backgroundColor: '#191919', // Aura dark background
        autoHideMenuBar: true, // Hide menu bar
        show: false,
    })

    win.once('ready-to-show', () => {
        win?.show()
    })

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        win.loadFile(path.join(process.env.DIST || '', 'index.html'))
    }

    // Set up spell check context menu listener AFTER content is loaded
    win.webContents.on('did-finish-load', () => {
        win?.webContents.on('context-menu', (_event, params) => {
            // Send spell context to renderer
            if (params.misspelledWord) {
                lastSpellCheckContext = {
                    misspelledWord: params.misspelledWord,
                    suggestions: params.dictionarySuggestions || []
                }
            } else {
                lastSpellCheckContext = {
                    misspelledWord: '',
                    suggestions: []
                }
            }
            win?.webContents.send('spell-check-context', lastSpellCheckContext)
        })
    })
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

// Store last spell check context for IPC
let lastSpellCheckContext: { misspelledWord: string; suggestions: string[] } | null = null

// IPC handler for checking a word and getting spell suggestions
ipcMain.handle('check-spelling', async (_event, word: string) => {
    if (!word || word.length < 2) return null
    
    try {
        // If we have context from context-menu event, use it
        if (lastSpellCheckContext && lastSpellCheckContext.misspelledWord.toLowerCase() === word.toLowerCase()) {
            return lastSpellCheckContext
        }
        
        // Otherwise return null - no suggestions available
        return null
    } catch (err) {
        log.error('Spell check error:', err)
        return null
    }
})

// Legacy handler for compatibility
ipcMain.handle('get-spell-suggestions', () => {
    return lastSpellCheckContext
})

// IPC handler to add word to dictionary
ipcMain.handle('add-to-dictionary', (_event, word: string) => {
    session.defaultSession.addWordToSpellCheckerDictionary(word)
    return true
})

app.whenReady().then(() => {
    // Enable spell checking at session level
    session.defaultSession.setSpellCheckerEnabled(true)
    session.defaultSession.setSpellCheckerLanguages(['en-US', 'en-GB'])
    
    createWindow()
    setupAutoUpdater()
})
