import { Search, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface SearchFilterProps {
    searchTerm: string
    onSearchChange: (term: string) => void
}

export function SearchFilter({ searchTerm, onSearchChange }: SearchFilterProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [localValue, setLocalValue] = useState(searchTerm)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Debounce search updates
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }
        debounceRef.current = setTimeout(() => {
            if (localValue !== searchTerm) {
                onSearchChange(localValue)
            }
        }, 150) // 150ms debounce

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current)
            }
        }
    }, [localValue, searchTerm, onSearchChange])

    // Sync with external searchTerm
    useEffect(() => {
        setLocalValue(searchTerm)
    }, [searchTerm])

    const handleClear = () => {
        setLocalValue('')
        onSearchChange('')
    }

    return (
        <div className="flex items-center gap-2">
            {isExpanded ? (
                <div className="flex items-center gap-2 bg-[#202020] border border-[#373737] px-3 py-2 sm:py-1.5 rounded-md w-full sm:w-auto">
                    <Search size={16} className="text-[#6b6b6b] flex-shrink-0" />
                    <input
                        type="text"
                        value={localValue}
                        onChange={(e) => setLocalValue(e.target.value)}
                        placeholder="Search..."
                        className="bg-transparent outline-none text-sm w-full sm:w-48 text-[#e3e3e3] placeholder-[#6b6b6b]"
                        autoFocus
                    />
                    {localValue && (
                        <button
                            onClick={handleClear}
                            className="text-[#6b6b6b] hover:text-[#e3e3e3] flex-shrink-0"
                        >
                            <X size={16} />
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setIsExpanded(false)
                            handleClear()
                        }}
                        className="text-[#9b9b9b] hover:text-[#e3e3e3] text-sm ml-1 hidden sm:block"
                    >
                        Close
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setIsExpanded(true)}
                    className="flex items-center gap-2 bg-[#202020] hover:bg-[#2a2a2a] text-[#e3e3e3] border border-[#373737] px-3 py-2 sm:py-1.5 rounded-md text-xs sm:text-sm transition-colors min-h-[44px] sm:min-h-0"
                >
                    <Search size={16} className="flex-shrink-0" />
                    <span className="hidden sm:inline">Search</span>
                </button>
            )}
        </div>
    )
}
