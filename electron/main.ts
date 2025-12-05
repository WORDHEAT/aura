import { app, BrowserWindow, Menu, dialog } from 'electron'
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
            preload: path.join(__dirname, 'preload.js'),
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

app.whenReady().then(() => {
    createWindow()
    setupAutoUpdater()
})
