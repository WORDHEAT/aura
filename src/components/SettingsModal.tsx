import { X, LayoutTemplate, LayoutList, Bell, Maximize2, Minimize2, Grid, Rows, Type, Trash2, Eye, Edit3, FileText, RefreshCw, Info } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useSettings } from '../context/SettingsContext'
import { format } from 'date-fns'

// App version - imported from package.json
const APP_VERSION = '1.4.2'

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && window.navigator.userAgent.includes('Electron')

// Extend Window interface for Electron IPC
declare global {
    interface Window {
        electronAPI?: {
            checkForUpdates?: () => void
        }
    }
}

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { settings, updateSettings } = useSettings()

    if (!isOpen) return null

    const dateFormats = [
        { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY (US)' },
        { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY (EU)' },
        { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD (ISO)' },
        { value: 'MMM d, yyyy', label: 'MMM D, YYYY' },
    ]

    const timeFormats = [
        { value: 'HH:mm', label: '24 Hour (14:30)' },
        { value: 'hh:mm a', label: '12 Hour (02:30 PM)' },
    ]

    const now = new Date()

    return createPortal(
        <div className="fixed inset-0 z-[50000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#202020] border border-[#373737] rounded-xl shadow-2xl w-full max-w-md m-4 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#373737]">
                    <h2 className="text-lg font-semibold text-[#e3e3e3]">Settings</h2>
                    <button 
                        onClick={onClose}
                        className="text-[#9b9b9b] hover:text-[#e3e3e3] p-1 rounded hover:bg-[#2a2a2a] transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Appearance Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-[#6b6b6b] uppercase tracking-wider">Appearance</h3>
                        
                        <div className="flex items-center justify-between px-3 py-2 bg-[#252525] border border-[#373737] rounded-lg">
                            <div className="flex items-center gap-3">
                                {settings.compactMode ? <Minimize2 size={18} className="text-blue-400" /> : <Maximize2 size={18} className="text-[#9b9b9b]" />}
                                <div className="flex flex-col">
                                    <span className="text-sm text-[#e3e3e3]">Compact Mode</span>
                                    <span className="text-xs text-[#6b6b6b]">Reduce table spacing</span>
                                </div>
                            </div>
                            <button
                                onClick={() => updateSettings({ compactMode: !settings.compactMode })}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                    settings.compactMode ? 'bg-blue-500' : 'bg-[#373737]'
                                }`}
                            >
                                <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                        settings.compactMode ? 'translate-x-[18px]' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>

                        <div className="flex items-center justify-between px-3 py-2 bg-[#252525] border border-[#373737] rounded-lg">
                            <div className="flex items-center gap-3">
                                <Grid size={18} className={settings.showGridLines ? "text-blue-400" : "text-[#9b9b9b]"} />
                                <div className="flex flex-col">
                                    <span className="text-sm text-[#e3e3e3]">Grid Lines</span>
                                    <span className="text-xs text-[#6b6b6b]">Show vertical borders</span>
                                </div>
                            </div>
                            <button
                                onClick={() => updateSettings({ showGridLines: !settings.showGridLines })}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                    settings.showGridLines ? 'bg-blue-500' : 'bg-[#373737]'
                                }`}
                            >
                                <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                        settings.showGridLines ? 'translate-x-[18px]' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>

                        <div className="flex items-center justify-between px-3 py-2 bg-[#252525] border border-[#373737] rounded-lg">
                            <div className="flex items-center gap-3">
                                <Rows size={18} className={settings.zebraStriping ? "text-blue-400" : "text-[#9b9b9b]"} />
                                <div className="flex flex-col">
                                    <span className="text-sm text-[#e3e3e3]">Zebra Striping</span>
                                    <span className="text-xs text-[#6b6b6b]">Alternate row colors</span>
                                </div>
                            </div>
                            <button
                                onClick={() => updateSettings({ zebraStriping: !settings.zebraStriping })}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                    settings.zebraStriping ? 'bg-blue-500' : 'bg-[#373737]'
                                }`}
                            >
                                <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                        settings.zebraStriping ? 'translate-x-[18px]' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Behavior Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-[#6b6b6b] uppercase tracking-wider">Behavior</h3>
                        
                        <div className="space-y-2">
                            <label className="text-sm text-[#e3e3e3]">Default View</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => updateSettings({ defaultView: 'single' })}
                                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                                        settings.defaultView === 'single'
                                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                            : 'bg-[#252525] border-[#373737] text-[#9b9b9b] hover:border-[#555] hover:text-[#e3e3e3]'
                                    }`}
                                >
                                    <LayoutTemplate size={16} />
                                    <span>Single</span>
                                </button>
                                <button
                                    onClick={() => updateSettings({ defaultView: 'all' })}
                                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                                        settings.defaultView === 'all'
                                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                            : 'bg-[#252525] border-[#373737] text-[#9b9b9b] hover:border-[#555] hover:text-[#e3e3e3]'
                                    }`}
                                >
                                    <LayoutList size={16} />
                                    <span>All Tables</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-3 py-2 bg-[#252525] border border-[#373737] rounded-lg">
                            <div className="flex items-center gap-3">
                                <Bell size={18} className={settings.enableNotifications ? "text-blue-400" : "text-[#9b9b9b]"} />
                                <div className="flex flex-col">
                                    <span className="text-sm text-[#e3e3e3]">Notifications</span>
                                    <span className="text-xs text-[#6b6b6b]">Enable reminder alerts</span>
                                </div>
                            </div>
                            <button
                                onClick={() => updateSettings({ enableNotifications: !settings.enableNotifications })}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                    settings.enableNotifications ? 'bg-blue-500' : 'bg-[#373737]'
                                }`}
                            >
                                <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                        settings.enableNotifications ? 'translate-x-[18px]' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>

                        <div className="flex items-center justify-between px-3 py-2 bg-[#252525] border border-[#373737] rounded-lg">
                            <div className="flex items-center gap-3">
                                <Trash2 size={18} className={settings.confirmBeforeDelete ? "text-blue-400" : "text-[#9b9b9b]"} />
                                <div className="flex flex-col">
                                    <span className="text-sm text-[#e3e3e3]">Confirm Delete</span>
                                    <span className="text-xs text-[#6b6b6b]">Ask before deleting items</span>
                                </div>
                            </div>
                            <button
                                onClick={() => updateSettings({ confirmBeforeDelete: !settings.confirmBeforeDelete })}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                    settings.confirmBeforeDelete ? 'bg-blue-500' : 'bg-[#373737]'
                                }`}
                            >
                                <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                        settings.confirmBeforeDelete ? 'translate-x-[18px]' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-[#e3e3e3]">Default Note View</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => updateSettings({ defaultNoteView: 'edit' })}
                                    className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-xs transition-all ${
                                        settings.defaultNoteView === 'edit'
                                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                            : 'bg-[#252525] border-[#373737] text-[#9b9b9b] hover:border-[#555] hover:text-[#e3e3e3]'
                                    }`}
                                >
                                    <Edit3 size={14} />
                                    <span>Edit</span>
                                </button>
                                <button
                                    onClick={() => updateSettings({ defaultNoteView: 'split' })}
                                    className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-xs transition-all ${
                                        settings.defaultNoteView === 'split'
                                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                            : 'bg-[#252525] border-[#373737] text-[#9b9b9b] hover:border-[#555] hover:text-[#e3e3e3]'
                                    }`}
                                >
                                    <FileText size={14} />
                                    <span>Split</span>
                                </button>
                                <button
                                    onClick={() => updateSettings({ defaultNoteView: 'preview' })}
                                    className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-xs transition-all ${
                                        settings.defaultNoteView === 'preview'
                                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                            : 'bg-[#252525] border-[#373737] text-[#9b9b9b] hover:border-[#555] hover:text-[#e3e3e3]'
                                    }`}
                                >
                                    <Eye size={14} />
                                    <span>Preview</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Font Size Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-[#6b6b6b] uppercase tracking-wider">Typography</h3>
                        
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                                <Type size={16} className="text-[#6b6b6b]" />
                                <label className="text-sm text-[#e3e3e3]">Font Size</label>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => updateSettings({ fontSize: 'small' })}
                                    className={`flex items-center justify-center px-3 py-2 rounded-lg border text-xs transition-all ${
                                        settings.fontSize === 'small'
                                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                            : 'bg-[#252525] border-[#373737] text-[#9b9b9b] hover:border-[#555] hover:text-[#e3e3e3]'
                                    }`}
                                >
                                    <span className="text-xs">Small</span>
                                </button>
                                <button
                                    onClick={() => updateSettings({ fontSize: 'medium' })}
                                    className={`flex items-center justify-center px-3 py-2 rounded-lg border text-sm transition-all ${
                                        settings.fontSize === 'medium'
                                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                            : 'bg-[#252525] border-[#373737] text-[#9b9b9b] hover:border-[#555] hover:text-[#e3e3e3]'
                                    }`}
                                >
                                    <span>Medium</span>
                                </button>
                                <button
                                    onClick={() => updateSettings({ fontSize: 'large' })}
                                    className={`flex items-center justify-center px-3 py-2 rounded-lg border text-base transition-all ${
                                        settings.fontSize === 'large'
                                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                            : 'bg-[#252525] border-[#373737] text-[#9b9b9b] hover:border-[#555] hover:text-[#e3e3e3]'
                                    }`}
                                >
                                    <span>Large</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Date & Time Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-[#6b6b6b] uppercase tracking-wider">Date & Time</h3>
                        
                        <div className="space-y-2">
                            <label className="text-sm text-[#e3e3e3]">Date Format</label>
                            <div className="grid gap-2">
                                {dateFormats.map((fmt) => (
                                    <button
                                        key={fmt.value}
                                        onClick={() => updateSettings({ dateFormat: fmt.value })}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${
                                            settings.dateFormat === fmt.value
                                                ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                                : 'bg-[#252525] border-[#373737] text-[#9b9b9b] hover:border-[#555] hover:text-[#e3e3e3]'
                                        }`}
                                    >
                                        <span>{fmt.label}</span>
                                        <span className="text-xs opacity-70">{format(now, fmt.value)}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-[#e3e3e3]">Time Format</label>
                            <div className="grid grid-cols-2 gap-2">
                                {timeFormats.map((fmt) => (
                                    <button
                                        key={fmt.value}
                                        onClick={() => updateSettings({ timeFormat: fmt.value })}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${
                                            settings.timeFormat === fmt.value
                                                ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                                : 'bg-[#252525] border-[#373737] text-[#9b9b9b] hover:border-[#555] hover:text-[#e3e3e3]'
                                        }`}
                                    >
                                        <span>{fmt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* About Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-[#6b6b6b] uppercase tracking-wider">About</h3>
                        
                        <div className="px-3 py-3 bg-[#252525] border border-[#373737] rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Info size={18} className="text-blue-400" />
                                    <div className="flex flex-col">
                                        <span className="text-sm text-[#e3e3e3]">Version</span>
                                        <span className="text-xs text-[#6b6b6b]">Current installed version</span>
                                    </div>
                                </div>
                                <span className="text-sm font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                                    v{APP_VERSION}
                                </span>
                            </div>
                            
                            {isElectron && (
                                <button
                                    onClick={() => {
                                        // Trigger update check via IPC if available
                                        if (window.electronAPI?.checkForUpdates) {
                                            window.electronAPI.checkForUpdates()
                                        } else {
                                            // Fallback: reload to trigger update check
                                            window.location.reload()
                                        }
                                    }}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors"
                                >
                                    <RefreshCw size={14} />
                                    Check for Updates
                                </button>
                            )}
                            
                            {!isElectron && (
                                <a
                                    href="https://github.com/WORDHEAT/aura/releases"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#2a2a2a] hover:bg-[#333] border border-[#373737] text-[#9b9b9b] hover:text-[#e3e3e3] rounded-lg text-sm transition-colors"
                                >
                                    <RefreshCw size={14} />
                                    View Releases on GitHub
                                </a>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="p-4 border-t border-[#373737] bg-[#252525]">
                    <div className="flex items-center justify-between text-xs text-[#6b6b6b]">
                        <span>Preview:</span>
                        <span className="text-[#e3e3e3] font-mono">
                            {format(now, `${settings.dateFormat} ${settings.timeFormat}`)}
                        </span>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
