import { Download, Upload } from 'lucide-react'
import type { Column, Row } from './Table/Table'

interface ExportImportProps {
    data: { columns: Column[]; rows: Row[] }
    onImport: (data: { columns: Column[]; rows: Row[] }) => void
}

export function ExportImport({ data, onImport }: ExportImportProps) {
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
                } else {
                    alert('Invalid table format')
                }
            } catch {
                alert('Failed to import: Invalid JSON file')
            }
        }
        reader.readAsText(file)
    }

    return (
        <div className="flex gap-2">
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
        </div>
    )
}
