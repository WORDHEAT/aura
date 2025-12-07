import { Check } from 'lucide-react'
import { memo } from 'react'

interface CheckboxCellProps {
    value: string
    onChange: (value: string) => void
}

export const CheckboxCell = memo(function CheckboxCell({ value, onChange }: CheckboxCellProps) {
    const isChecked = value === 'true'

    return (
        <div className="flex items-center min-h-[44px] sm:min-h-0">
            <button
                onClick={() => onChange(isChecked ? 'false' : 'true')}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isChecked
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-[#373737] hover:border-[#4a4a4a]'
                    }`}
            >
                {isChecked && <Check size={14} className="text-white" />}
            </button>
        </div>
    )
})
