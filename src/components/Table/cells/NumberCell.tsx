interface NumberCellProps {
    value: string
    onChange: (value: string) => void
}

export function NumberCell({ value, onChange }: NumberCellProps) {
    return (
        <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent outline-none text-[#e3e3e3] placeholder-[#6b6b6b] focus:placeholder-[#9b9b9b] text-sm min-h-[44px] sm:min-h-0 py-2 sm:py-0"
        />
    )
}
