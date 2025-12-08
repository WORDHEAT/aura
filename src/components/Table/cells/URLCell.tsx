import { ExternalLink } from 'lucide-react'

interface URLCellProps {
    value: string
    onChange: (value: string) => void
}

export function URLCell({ value, onChange }: URLCellProps) {
    const hasValidUrl = value && (value.startsWith('http://') || value.startsWith('https://'))

    return (
        <div className="flex items-center gap-2 w-full overflow-hidden">
            <input
                type="url"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="https://..."
                className="flex-1 bg-transparent outline-none text-[#e3e3e3] placeholder-[#6b6b6b] focus:placeholder-[#9b9b9b] text-sm min-h-[44px] sm:min-h-0 py-2 sm:py-0"
            />
            {hasValidUrl && (
                <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                >
                    <ExternalLink size={14} />
                </a>
            )}
        </div>
    )
}
