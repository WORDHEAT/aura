import { useState, useEffect } from 'react'
import { Download, Upload, AlertCircle, CheckCircle } from 'lucide-react'
import type { Column, Row } from './Table/Table'

interface ExportImportProps {
    data: { columns: Column[]; rows: Row[] }
    onImport: (data: { columns: Column[]; rows: Row[] }) => void
}

type ToastType = 'success' | 'error'

export function ExportImport({ data, onImport }: ExportImportProps) {
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

    // Auto-dismiss toast after 3 seconds
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    const showToast = (message: string, type: ToastType) => {
        setToast({ message, type })
    }

    const handleExport = () => {
        const jsonStr = JSON.stringify(data, null, 2)
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `aura-table-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        showToast('Table exported successfully', 'success')
    }

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target?.result as string)
                if (imported.columns && imported.rows) {
                    onImport(imported)
                    showToast('Table imported successfully', 'success')
                } else {
                    showToast('Invalid table format: missing columns or rows', 'error')
                }
            } catch {
                showToast('Failed to import: Invalid JSON file', 'error')
            }
        }
        reader.readAsText(file)
        // Reset input so same file can be imported again
        event.target.value = ''
    }

    return (
        <div className="relative flex gap-2">
            <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-[#202020] hover:bg-[#2a2a2a] text-[#e3e3e3] border border-[#373737] px-3 py-2 sm:py-1.5 rounded-md text-xs sm:text-sm transition-colors min-h-[44px] sm:min-h-0"
            >
                <Download size={16} className="flex-shrink-0" />
                <span className="hidden sm:inline">Export</span>
            </button>
            <label className="flex items-center gap-2 bg-[#202020] hover:bg-[#2a2a2a] text-[#e3e3e3] border border-[#373737] px-3 py-2 sm:py-1.5 rounded-md text-xs sm:text-sm transition-colors cursor-pointer min-h-[44px] sm:min-h-0">
                <Upload size={16} className="flex-shrink-0" />
                <span className="hidden sm:inline">Import</span>
                <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                />
            </label>
            
            {/* Toast notification */}
            {toast && (
                <div className={`absolute bottom-full left-0 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                    toast.type === 'error' 
                        ? 'bg-red-500/10 border border-red-500/30 text-red-400' 
                        : 'bg-green-500/10 border border-green-500/30 text-green-400'
                }`}>
                    {toast.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                    {toast.message}
                </div>
            )}
        </div>
    )
}
