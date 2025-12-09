import { User, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface UsernameCellProps {
    value: string
    onChange: (value: string) => void
}

export function UsernameCell({ value, onChange }: UsernameCellProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (value) {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        }
    }

    return (
        <div className="flex items-center gap-2 w-full overflow-hidden">
            <User size={14} className="text-[#6b6b6b] flex-shrink-0" />
            <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Username"
                className="flex-1 bg-transparent outline-none text-[#e3e3e3] placeholder-[#6b6b6b] focus:placeholder-[#9b9b9b] text-sm min-h-[44px] sm:min-h-0 py-2 sm:py-0"
            />
            {value && (
                <button
                    type="button"
                    onClick={handleCopy}
                    className="text-[#6b6b6b] hover:text-[#9b9b9b] flex-shrink-0 transition-colors"
                    title="Copy username"
                >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
            )}
        </div>
    )
}
