import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordCellProps {
    value: string
    onChange: (value: string) => void
}

export function PasswordCell({ value, onChange }: PasswordCellProps) {
    const [showPassword, setShowPassword] = useState(false)

    return (
        <div className="flex items-center gap-2 w-full overflow-hidden">
            <input
                type={showPassword ? 'text' : 'password'}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter password"
                className="flex-1 bg-transparent outline-none text-[#e3e3e3] placeholder-[#6b6b6b] focus:placeholder-[#9b9b9b] text-sm min-h-[44px] sm:min-h-0 py-2 sm:py-0"
            />
            {value && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        setShowPassword(!showPassword)
                    }}
                    className="text-[#6b6b6b] hover:text-[#9b9b9b] flex-shrink-0 transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
            )}
        </div>
    )
}
