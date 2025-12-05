import { Paperclip, X } from 'lucide-react'
import { useState } from 'react'

interface FileCellProps {
    value: string
    onChange: (value: string) => void
}

/**
 * FileCell - Displays file attachment UI
 * NOTE: Currently stores only the filename as a reference.
 * For full file storage, integrate with a file storage service (e.g., S3, Firebase Storage)
 * and store the file URL instead of just the filename.
 */
export function FileCell({ value, onChange }: FileCellProps) {
    const [isDragging, setIsDragging] = useState(false)

    const fileName = value || ''

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // In a real app, you'd upload this to a server and store the URL
            // For now, we'll just store the filename
            onChange(file.name)
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files?.[0]
        if (file) {
            onChange(file.name)
        }
    }

    return (
        <div className="w-full">
            {fileName ? (
                <div className="flex items-center gap-2 px-2 py-1 bg-blue-600/10 border border-blue-600/30 rounded">
                    <Paperclip size={14} className="text-blue-400 flex-shrink-0" />
                    <span className="text-sm text-blue-400 truncate flex-1">{fileName}</span>
                    <button
                        onClick={() => onChange('')}
                        className="text-[#6b6b6b] hover:text-red-400 flex-shrink-0"
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <label
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex items-center gap-2 px-2 py-1 border-2 border-dashed rounded cursor-pointer transition-colors ${isDragging
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-[#373737] hover:border-[#4a4a4a]'
                        }`}
                >
                    <Paperclip size={14} className="text-[#6b6b6b]" />
                    <span className="text-sm text-[#6b6b6b]">
                        {isDragging ? 'Drop file' : 'Attach file'}
                    </span>
                    <input
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </label>
            )}
        </div>
    )
}
