import { useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
    Bold,
    Italic,
    Strikethrough,
    Link,
    Code,
    List,
    ListOrdered,
    Quote,
    Heading1,
    Heading2,
    Heading3,
    CheckSquare,
    Copy,
    Clipboard,
    Scissors,
    SpellCheck,
    Undo2,
    Redo2
} from 'lucide-react'

interface ContextMenuItem {
    label: string
    icon: React.ReactNode
    action: () => void
    shortcut?: string
    disabled?: boolean
    divider?: boolean
}

interface NoteContextMenuProps {
    isOpen: boolean
    position: { x: number; y: number }
    onClose: () => void
    selectedText: string
    onFormat: (prefix: string, suffix?: string) => void
    onLinePrefix: (prefix: string) => void
    onCopy: () => void
    onCut: () => void
    onPaste: () => void
    onUndo: () => void
    onRedo: () => void
    canUndo: boolean
    canRedo: boolean
    spellingSuggestions?: string[]
    onApplySuggestion?: (suggestion: string) => void
}

export function NoteContextMenu({
    isOpen,
    position,
    onClose,
    selectedText,
    onFormat,
    onLinePrefix,
    onCopy,
    onCut,
    onPaste,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    spellingSuggestions = [],
    onApplySuggestion
}: NoteContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleEscape)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    const hasSelection = selectedText.length > 0

    const menuItems: (ContextMenuItem | { divider: true })[] = [
        // Spelling suggestions (if available)
        ...spellingSuggestions.slice(0, 5).map(suggestion => ({
            label: suggestion,
            icon: <SpellCheck size={14} />,
            action: () => onApplySuggestion?.(suggestion),
        })),
        ...(spellingSuggestions.length > 0 ? [{ divider: true as const }] : []),

        // Edit actions
        {
            label: 'Cut',
            icon: <Scissors size={14} />,
            action: onCut,
            shortcut: 'Ctrl+X',
            disabled: !hasSelection,
        },
        {
            label: 'Copy',
            icon: <Copy size={14} />,
            action: onCopy,
            shortcut: 'Ctrl+C',
            disabled: !hasSelection,
        },
        {
            label: 'Paste',
            icon: <Clipboard size={14} />,
            action: onPaste,
            shortcut: 'Ctrl+V',
        },
        { divider: true },

        // Undo/Redo
        {
            label: 'Undo',
            icon: <Undo2 size={14} />,
            action: onUndo,
            shortcut: 'Ctrl+Z',
            disabled: !canUndo,
        },
        {
            label: 'Redo',
            icon: <Redo2 size={14} />,
            action: onRedo,
            shortcut: 'Ctrl+Y',
            disabled: !canRedo,
        },
        { divider: true },

        // Text Formatting (only when text is selected)
        ...(hasSelection ? [
            {
                label: 'Bold',
                icon: <Bold size={14} />,
                action: () => onFormat('**'),
                shortcut: 'Ctrl+B',
            },
            {
                label: 'Italic',
                icon: <Italic size={14} />,
                action: () => onFormat('*'),
                shortcut: 'Ctrl+I',
            },
            {
                label: 'Strikethrough',
                icon: <Strikethrough size={14} />,
                action: () => onFormat('~~'),
            },
            {
                label: 'Code',
                icon: <Code size={14} />,
                action: () => onFormat('`'),
                shortcut: 'Ctrl+`',
            },
            {
                label: 'Link',
                icon: <Link size={14} />,
                action: () => onFormat('[', '](url)'),
                shortcut: 'Ctrl+K',
            },
            { divider: true as const },
        ] : []),

        // Block formatting
        {
            label: 'Heading 1',
            icon: <Heading1 size={14} />,
            action: () => onLinePrefix('# '),
        },
        {
            label: 'Heading 2',
            icon: <Heading2 size={14} />,
            action: () => onLinePrefix('## '),
        },
        {
            label: 'Heading 3',
            icon: <Heading3 size={14} />,
            action: () => onLinePrefix('### '),
        },
        { divider: true },
        {
            label: 'Bullet List',
            icon: <List size={14} />,
            action: () => onLinePrefix('- '),
        },
        {
            label: 'Numbered List',
            icon: <ListOrdered size={14} />,
            action: () => onLinePrefix('1. '),
        },
        {
            label: 'Checkbox',
            icon: <CheckSquare size={14} />,
            action: () => onLinePrefix('- [ ] '),
        },
        {
            label: 'Quote',
            icon: <Quote size={14} />,
            action: () => onLinePrefix('> '),
        },
    ]

    return createPortal(
        <div
            ref={menuRef}
            className="fixed bg-[#252525] border border-[#373737] rounded-lg shadow-xl py-1 z-[9999] min-w-[200px] max-h-[400px] overflow-y-auto custom-scrollbar"
            style={{
                left: Math.min(position.x, window.innerWidth - 220),
                top: Math.min(position.y, window.innerHeight - 420),
            }}
        >
            {menuItems.map((item, index) => {
                if ('divider' in item && item.divider === true) {
                    return <div key={`divider-${index}`} className="h-px bg-[#373737] my-1" />
                }

                const menuItem = item as ContextMenuItem
                return (
                    <button
                        key={menuItem.label}
                        onClick={() => {
                            menuItem.action()
                            onClose()
                        }}
                        disabled={menuItem.disabled}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
                            menuItem.disabled
                                ? 'text-[#4a4a4a] cursor-not-allowed'
                                : 'text-[#e3e3e3] hover:bg-[#333]'
                        }`}
                    >
                        <span className={menuItem.disabled ? 'text-[#4a4a4a]' : 'text-[#9b9b9b]'}>
                            {menuItem.icon}
                        </span>
                        <span className="flex-1">{menuItem.label}</span>
                        {menuItem.shortcut && (
                            <span className="text-xs text-[#6b6b6b]">{menuItem.shortcut}</span>
                        )}
                    </button>
                )
            })}
        </div>,
        document.body
    )
}

// Hook for long press detection (mobile)
export function useLongPress(callback: (e: React.TouchEvent) => void, ms = 500) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const touchStartPos = useRef<{ x: number; y: number } | null>(null)

    const start = useCallback((e: React.TouchEvent) => {
        touchStartPos.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        }
        timerRef.current = setTimeout(() => {
            callback(e)
        }, ms)
    }, [callback, ms])

    const move = useCallback((e: React.TouchEvent) => {
        if (!touchStartPos.current || !timerRef.current) return
        
        const deltaX = Math.abs(e.touches[0].clientX - touchStartPos.current.x)
        const deltaY = Math.abs(e.touches[0].clientY - touchStartPos.current.y)
        
        // Cancel if moved more than 10px
        if (deltaX > 10 || deltaY > 10) {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
                timerRef.current = null
            }
        }
    }, [])

    const end = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
        touchStartPos.current = null
    }, [])

    return {
        onTouchStart: start,
        onTouchMove: move,
        onTouchEnd: end,
        onTouchCancel: end,
    }
}
