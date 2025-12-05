import { Mail } from 'lucide-react'

interface EmailCellProps {
    value: string
    onChange: (value: string) => void
}

export function EmailCell({ value, onChange }: EmailCellProps) {
    const isValidEmail = value && value.includes('@')

    return (
        <div className="flex items-center gap-2 w-full">
            <input
                type="email"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="email@example.com"
                className="flex-1 bg-transparent outline-none text-[#e3e3e3] placeholder-[#6b6b6b] focus:placeholder-[#9b9b9b] text-sm min-h-[44px] sm:min-h-0 py-2 sm:py-0"
            />
            {isValidEmail && (
                <a
                    href={`mailto:${value}`}
                    className="text-blue-400 hover:text-blue-300 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Mail size={14} />
                </a>
            )}
        </div>
    )
}
