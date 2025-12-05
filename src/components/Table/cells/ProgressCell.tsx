interface ProgressCellProps {
    value: string
    onChange: (value: string) => void
}

export function ProgressCell({ value, onChange }: ProgressCellProps) {
    const progress = Math.min(100, Math.max(0, parseInt(value) || 0))

    return (
        <div className="flex items-center gap-2 w-full">
            <div className="flex-1 bg-[#191919] rounded-full h-2 overflow-hidden">
                <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <input
                type="number"
                min="0"
                max="100"
                value={value || '0'}
                onChange={(e) => onChange(e.target.value)}
                className="w-12 bg-transparent outline-none text-[#e3e3e3] text-sm text-right"
            />
            <span className="text-[#6b6b6b] text-xs">%</span>
        </div>
    )
}
