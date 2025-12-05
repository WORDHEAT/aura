import { Search, X } from 'lucide-react'
import { useState } from 'react'

interface SearchFilterProps {
    searchTerm: string
    onSearchChange: (term: string) => void
}

export function SearchFilter({ searchTerm, onSearchChange }: SearchFilterProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    return (
        <div className="flex items-center gap-2">
            {isExpanded ? (
                <div className="flex items-center gap-2 bg-[#202020] border border-[#373737] px-3 py-2 sm:py-1.5 rounded-md w-full sm:w-auto">
                    <Search size={16} className="text-[#6b6b6b] flex-shrink-0" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search..."
                        className="bg-transparent outline-none text-sm w-full sm:w-48 text-[#e3e3e3] placeholder-[#6b6b6b]"
                        autoFocus
                    />
                    {searchTerm && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="text-[#6b6b6b] hover:text-[#e3e3e3] flex-shrink-0"
                        >
                            <X size={16} />
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setIsExpanded(false)
                            onSearchChange('')
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
