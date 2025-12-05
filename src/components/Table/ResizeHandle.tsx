import { useState, useRef, useCallback } from 'react'

interface ResizeHandleProps {
    width: number
    minWidth?: number
    onResize: (width: number) => void
}

export function ResizeHandle({ width, minWidth = 80, onResize }: ResizeHandleProps) {
    const [isResizing, setIsResizing] = useState(false)
    const startXRef = useRef(0)
    const startWidthRef = useRef(0)

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsResizing(true)
        startXRef.current = e.clientX
        startWidthRef.current = width

        const handleMouseMove = (e: MouseEvent) => {
            const diff = e.clientX - startXRef.current
            const newWidth = Math.max(minWidth, startWidthRef.current + diff)
            onResize(newWidth)
        }

        const handleMouseUp = () => {
            setIsResizing(false)
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
    }, [width, minWidth, onResize])

    return (
        <div
            onMouseDown={handleMouseDown}
            className={`absolute right-0 top-0 bottom-0 w-4 translate-x-1/2 cursor-col-resize z-10 flex justify-center group/resize select-none outline-none touch-none ${
                isResizing ? 'bg-transparent' : ''
            }`}
            title="Drag to resize column"
        >
            {/* The visible line indicator */}
            <div className={`w-[2px] h-full transition-colors duration-150 ${
                isResizing 
                    ? 'bg-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.5)]' 
                    : 'bg-transparent group-hover/resize:bg-blue-500/50'
            }`} />
        </div>
    )
}
