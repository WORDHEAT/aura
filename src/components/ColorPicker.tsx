import { Palette, Check, Ban } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ColorPickerProps {
    currentColor?: string
    onColorChange: (color: string) => void
    onOpenChange?: (isOpen: boolean) => void
}

const COLORS = [
    { name: 'Default', value: '', bg: 'bg-transparent', text: 'text-[#e3e3e3]' },
    { name: 'Red', value: 'bg-red-500/20', bg: 'bg-red-500', text: 'text-red-400' },
    { name: 'Orange', value: 'bg-orange-500/20', bg: 'bg-orange-500', text: 'text-orange-400' },
    { name: 'Yellow', value: 'bg-yellow-500/20', bg: 'bg-yellow-500', text: 'text-yellow-400' },
    { name: 'Green', value: 'bg-green-500/20', bg: 'bg-green-500', text: 'text-green-400' },
    { name: 'Blue', value: 'bg-blue-500/20', bg: 'bg-blue-500', text: 'text-blue-400' },
    { name: 'Purple', value: 'bg-purple-500/20', bg: 'bg-purple-500', text: 'text-purple-400' },
    { name: 'Pink', value: 'bg-pink-500/20', bg: 'bg-pink-500', text: 'text-pink-400' },
    { name: 'Gray', value: 'bg-gray-500/20', bg: 'bg-gray-500', text: 'text-gray-400' },
]

export { COLORS }

export function ColorPicker({ currentColor = '', onColorChange, onOpenChange }: ColorPickerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const [dropdownPosition, setDropdownPosition] = useState<{ top?: number, bottom?: number, right: number }>({ top: 0, right: 0 })

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current && 
                !dropdownRef.current.contains(event.target as Node) &&
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false)
                onOpenChange?.(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, onOpenChange])

    const handleToggle = (e: React.MouseEvent) => {
        if (!isOpen) {
            const rect = e.currentTarget.getBoundingClientRect()
            const spaceBelow = window.innerHeight - rect.bottom
            const menuHeight = 320 // approx height
            
            // If not enough space below, open upwards
            if (spaceBelow < menuHeight) {
                setDropdownPosition({
                    bottom: window.innerHeight - rect.top + 4,
                    right: window.innerWidth - rect.right
                })
            } else {
                setDropdownPosition({
                    top: rect.bottom + 4,
                    right: window.innerWidth - rect.right
                })
            }
        }
        const newState = !isOpen
        setIsOpen(newState)
        onOpenChange?.(newState)
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleToggle}
                className={`p-1.5 rounded transition-all duration-200 ${isOpen ? 'bg-[#2a2a2a] text-[#e3e3e3]' : 'text-[#6b6b6b] hover:bg-[#2a2a2a] hover:text-[#e3e3e3]'}`}
                title="Change cell color"
            >
                <Palette size={14} />
            </button>

            {isOpen && createPortal(
                <div 
                    ref={menuRef}
                    className="fixed z-[9999] bg-[#202020] border border-[#373737] rounded-xl shadow-2xl w-[160px] overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right"
                    style={{
                        top: dropdownPosition.top,
                        bottom: dropdownPosition.bottom,
                        right: dropdownPosition.right
                    }}
                >
                    <div className="p-1.5 space-y-0.5">
                        <div className="px-2 py-1.5 text-[10px] font-semibold text-[#6b6b6b] uppercase tracking-wider">
                            Background Color
                        </div>
                        {COLORS.map((color) => (
                            <button
                                key={color.name}
                                onClick={() => {
                                    onColorChange(color.value)
                                    setIsOpen(false)
                                    onOpenChange?.(false)
                                }}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-sm group ${
                                    currentColor === color.value 
                                        ? 'bg-[#2a2a2a]' 
                                        : 'hover:bg-[#2a2a2a]'
                                }`}
                            >
                                <div className={`w-4 h-4 rounded flex items-center justify-center border border-[#373737] ${color.value ? color.bg : 'bg-[#252525]'}`}>
                                    {!color.value && <Ban size={10} className="text-[#6b6b6b]" />}
                                </div>
                                <span className={`flex-1 text-left ${color.value ? 'text-[#e3e3e3]' : 'text-[#9b9b9b]'}`}>
                                    {color.name}
                                </span>
                                {currentColor === color.value && (
                                    <Check size={12} className="text-blue-400" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
