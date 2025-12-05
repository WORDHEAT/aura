import { useState, useRef, useEffect } from 'react'
import { MessageSquare } from 'lucide-react'

interface CommentCellProps {
    value: string
    onChange: (value: string) => void
}

export function CommentCell({ value, onChange }: CommentCellProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(value)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        setEditValue(value)
    }, [value])

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus()
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }, [isEditing])

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
    }, [])

    // Auto-save with debounce
    const handleChange = (newValue: string) => {
        setEditValue(newValue)
        
        // Clear previous timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }
        
        // Auto-save after 500ms of no typing
        saveTimeoutRef.current = setTimeout(() => {
            onChange(newValue)
        }, 500)
    }

    const handleBlur = () => {
        // Save immediately on blur
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }
        onChange(editValue)
        setIsEditing(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            // Cancel and restore original value
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
            setEditValue(value)
            setIsEditing(false)
        }
    }

    if (isEditing) {
        return (
            <div className="w-full">
                <textarea
                    ref={textareaRef}
                    value={editValue}
                    onChange={(e) => {
                        handleChange(e.target.value)
                        e.target.style.height = 'auto'
                        e.target.style.height = `${e.target.scrollHeight}px`
                    }}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="w-full min-h-[60px] bg-[#252525] border border-blue-500/50 rounded-md px-2 py-1.5 text-sm text-[#e3e3e3] outline-none resize-none custom-scrollbar"
                    placeholder="Add a comment..."
                />
                <div className="text-[10px] text-[#6b6b6b] mt-1">
                    Auto-saves • Esc to cancel
                </div>
            </div>
        )
    }

    if (!value) {
        return (
            <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-[#6b6b6b] hover:text-[#9b9b9b] text-sm transition-colors"
            >
                <MessageSquare size={14} />
                <span>Add comment</span>
            </button>
        )
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className="cursor-pointer group/comment"
        >
            <div className="flex items-start gap-2">
                <MessageSquare size={14} className="text-teal-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-[#e3e3e3] whitespace-pre-wrap break-words line-clamp-3 group-hover/comment:line-clamp-none transition-all">
                    {value}
                </div>
            </div>
            {value.split('\n').length > 3 && (
                <div className="text-[10px] text-[#6b6b6b] mt-1 group-hover/comment:hidden">
                    Click to expand
                </div>
            )}
        </div>
    )
}
