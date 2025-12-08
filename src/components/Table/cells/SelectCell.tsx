import { ChevronDown, Plus, X } from 'lucide-react'
import { useState, useRef } from 'react'

interface SelectCellProps {
    value: string
    onChange: (value: string) => void
    options: string[]
    onOptionsChange: (options: string[]) => void
}

export function SelectCell({ value, onChange, options = [], onOptionsChange }: SelectCellProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [newOption, setNewOption] = useState('')
    const [isAddingOption, setIsAddingOption] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null)

    const handleOpen = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setDropdownPosition({
                top: rect.bottom + 4,
                left: rect.left
            })
            setIsOpen(true)
        }
    }

    const handleClose = () => {
        setIsOpen(false)
        setDropdownPosition(null)
    }

    const handleAddOption = () => {
        if (newOption.trim() && !options.includes(newOption.trim())) {
            onOptionsChange([...options, newOption.trim()])
            setNewOption('')
            setIsAddingOption(false)
        }
    }

    const handleRemoveOption = (option: string) => {
        onOptionsChange(options.filter(o => o !== option))
        if (value === option) {
            onChange('')
        }
    }

    return (
        <div className="relative w-full overflow-hidden">
            <button
                ref={buttonRef}
                onClick={isOpen ? handleClose : handleOpen}
                className="w-full text-left flex items-center gap-1.5 text-sm min-h-[44px] sm:min-h-0 py-2 sm:py-1"
            >
                <ChevronDown size={14} className="text-[#6b6b6b] flex-shrink-0" />
                <span className={`truncate ${value ? 'text-[#e3e3e3]' : 'text-[#6b6b6b]'}`}>
                    {value || 'Select...'}
                </span>
            </button>

            {isOpen && dropdownPosition && (
                <>
                    <div className="fixed inset-0 z-[100]" onClick={handleClose} />
                    <div className="fixed z-[101] bg-[#202020] border border-[#373737] rounded-xl shadow-2xl min-w-[200px] max-h-[280px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
                        style={{
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`
                        }}
                    >
                        <div className="p-1">
                            {options.map((option) => (
                                <div
                                    key={option}
                                    className="flex items-center justify-between px-2 py-1.5 hover:bg-[#2a2a2a] rounded-lg group transition-colors"
                                >
                                    <button
                                        onClick={() => {
                                            onChange(option)
                                            handleClose()
                                        }}
                                        className="flex-1 text-left text-sm text-[#e3e3e3]"
                                    >
                                        {option}
                                    </button>
                                    <button
                                        onClick={() => handleRemoveOption(option)}
                                        className="sm:opacity-0 sm:group-hover:opacity-100 text-[#6b6b6b] hover:text-red-400 transition-all p-1.5"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {isAddingOption ? (
                            <div className="p-2 border-t border-[#373737]">
                                <input
                                    type="text"
                                    value={newOption}
                                    onChange={(e) => setNewOption(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddOption()
                                        if (e.key === 'Escape') setIsAddingOption(false)
                                    }}
                                    placeholder="New option..."
                                    className="w-full bg-[#191919] border border-[#373737] px-2 py-1.5 rounded-md text-sm outline-none focus:border-blue-500 text-[#e3e3e3]"
                                    autoFocus
                                />
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsAddingOption(true)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#9b9b9b] hover:text-blue-400 hover:bg-[#2a2a2a] border-t border-[#373737] transition-colors"
                            >
                                <Plus size={14} /> 
                                <span>Add option</span>
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
