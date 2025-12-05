import { ChevronDown, Plus, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface MultiSelectCellProps {
    value: string
    onChange: (value: string) => void
    options: string[]
    onOptionsChange: (options: string[]) => void
}

export function MultiSelectCell({ value, onChange, options = [], onOptionsChange }: MultiSelectCellProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [newOption, setNewOption] = useState('')
    const [isAddingOption, setIsAddingOption] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setDropdownPosition({
                top: rect.bottom + 4,
                left: rect.left
            })
        }
    }, [isOpen])

    const selectedValues = value ? value.split(',').filter(Boolean) : []

    const toggleOption = (option: string) => {
        const newSelected = selectedValues.includes(option)
            ? selectedValues.filter(v => v !== option)
            : [...selectedValues, option]
        onChange(newSelected.join(','))
    }

    const removeValue = (optionToRemove: string) => {
        const newSelected = selectedValues.filter(v => v !== optionToRemove)
        onChange(newSelected.join(','))
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
        removeValue(option)
    }

    return (
        <div className="relative w-full">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left flex items-center flex-wrap gap-1.5 text-sm min-h-[44px] sm:min-h-[36px] py-2 sm:py-1"
            >
                {selectedValues.length > 0 ? (
                    <>
                        {selectedValues.map((val) => (
                            <span
                                key={val}
                                className="inline-flex items-center gap-1 bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded text-xs"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    removeValue(val)
                                }}
                            >
                                {val}
                                <X size={12} />
                            </span>
                        ))}
                        <ChevronDown size={14} className="text-[#6b6b6b] flex-shrink-0 ml-auto" />
                    </>
                ) : (
                    <>
                        <span className="text-[#6b6b6b]">Select...</span>
                        <ChevronDown size={14} className="text-[#6b6b6b] flex-shrink-0 ml-auto" />
                    </>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
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
                                    <label className="flex-1 flex items-center gap-2 cursor-pointer text-sm text-[#e3e3e3] select-none">
                                        <input
                                            type="checkbox"
                                            checked={selectedValues.includes(option)}
                                            onChange={() => toggleOption(option)}
                                            className="w-4 h-4 rounded border-[#373737] bg-[#191919] text-blue-600 focus:ring-0 focus:ring-offset-0"
                                        />
                                        {option}
                                    </label>
                                    <button
                                        onClick={() => handleRemoveOption(option)}
                                        className="opacity-0 group-hover:opacity-100 text-[#6b6b6b] hover:text-red-400 transition-all p-1"
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
