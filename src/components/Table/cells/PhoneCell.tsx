import { Phone } from 'lucide-react'

interface PhoneCellProps {
    value: string
    onChange: (value: string) => void
}

export function PhoneCell({ value, onChange }: PhoneCellProps) {
    const hasPhone = value && value.length > 3

    return (
        <div className="flex items-center gap-2 w-full overflow-hidden">
            <input
                type="tel"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="flex-1 bg-transparent outline-none text-[#e3e3e3] placeholder-[#6b6b6b] focus:placeholder-[#9b9b9b] text-sm min-h-[44px] sm:min-h-0 py-2 sm:py-0"
            />
            {hasPhone && (
                <a
                    href={`tel:${value}`}
                    className="text-blue-400 hover:text-blue-300 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Phone size={14} />
                </a>
            )}
        </div>
    )
}
