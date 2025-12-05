import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { 
    Save, 
    Type, 
    Code2, 
    WrapText, 
    AlignLeft,
    Search,
    Replace,
    X,
    Maximize2,
    Minimize2,
    Copy,
    Download,
    Clock
} from 'lucide-react'
import { useTableContext, type NoteItem } from '../context/TableContext'

interface NoteEditorProps {
    note: NoteItem
}

export function NoteEditor({ note }: NoteEditorProps) {
    const { updateNoteContent, updateNoteSettings, renameNote } = useTableContext()
    
    const [content, setContent] = useState(note.content)
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const [showSearch, setShowSearch] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [replaceQuery, setReplaceQuery] = useState('')
    // computedSearchResults computed via useMemo below
    const [currentSearchIndex, setCurrentSearchIndex] = useState(0)
    const [isFullScreen, setIsFullScreen] = useState(false)
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [editingTitle, setEditingTitle] = useState(note.name)
    
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lineNumbersRef = useRef<HTMLDivElement>(null)

    // Auto-save with debounce - using onChange handler directly
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value
        setContent(newContent)
        setIsSaving(true)
        
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }
        
        saveTimeoutRef.current = setTimeout(() => {
            updateNoteContent(note.id, newContent)
            setIsSaving(false)
            setLastSaved(new Date())
        }, 500)
    }

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
    }, [])

    // Sync scroll for line numbers
    const handleScroll = useCallback(() => {
        if (textareaRef.current && lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
        }
    }, [])

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault()
                setShowSearch(true)
            }
            if (e.key === 'Escape' && showSearch) {
                setShowSearch(false)
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                updateNoteContent(note.id, content)
                setIsSaving(false)
                setLastSaved(new Date())
            }
        }
        
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [showSearch, note.id, content, updateNoteContent])

    // Search functionality - computed from searchQuery and content
    const computedSearchResults = useMemo(() => {
        if (!searchQuery) return []
        
        const indices: number[] = []
        let index = content.toLowerCase().indexOf(searchQuery.toLowerCase())
        while (index !== -1) {
            indices.push(index)
            index = content.toLowerCase().indexOf(searchQuery.toLowerCase(), index + 1)
        }
        return indices
    }, [searchQuery, content])

    // Calculate stats
    const lines = content.split('\n')
    const lineCount = lines.length
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
    const charCount = content.length

    const handleReplace = () => {
        if (!searchQuery || computedSearchResults.length === 0) return
        
        const pos = computedSearchResults[currentSearchIndex]
        const newContent = 
            content.substring(0, pos) + 
            replaceQuery + 
            content.substring(pos + searchQuery.length)
        setContent(newContent)
    }

    const handleReplaceAll = () => {
        if (!searchQuery) return
        const newContent = content.split(searchQuery).join(replaceQuery)
        setContent(newContent)
    }

    const goToNextResult = () => {
        if (computedSearchResults.length > 0) {
            setCurrentSearchIndex((prev) => (prev + 1) % computedSearchResults.length)
        }
    }

    const goToPrevResult = () => {
        if (computedSearchResults.length > 0) {
            setCurrentSearchIndex((prev) => (prev - 1 + computedSearchResults.length) % computedSearchResults.length)
        }
    }

    const handleCopyContent = async () => {
        await navigator.clipboard.writeText(content)
    }

    const handleDownload = () => {
        const blob = new Blob([content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${note.name}.txt`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleTitleSave = () => {
        if (editingTitle.trim() && editingTitle !== note.name) {
            renameNote(note.id, editingTitle.trim())
        }
        setIsEditingTitle(false)
    }

    // Handle tab key for indentation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault()
            const start = e.currentTarget.selectionStart
            const end = e.currentTarget.selectionEnd
            
            const newContent = content.substring(0, start) + '    ' + content.substring(end)
            setContent(newContent)
            
            // Move cursor after the tab
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = start + 4
                    textareaRef.current.selectionEnd = start + 4
                }
            }, 0)
        }
    }

    const formatLastSaved = () => {
        if (!lastSaved) return null
        const now = new Date()
        const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000)
        if (diff < 5) return 'Just now'
        if (diff < 60) return `${diff}s ago`
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
        return lastSaved.toLocaleTimeString()
    }

    return (
        <div className={`flex flex-col h-full ${isFullScreen ? 'fixed inset-0 z-[200] bg-[#191919]' : ''}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#373737] bg-[#202020]">
                <div className="flex items-center gap-3">
                    {isEditingTitle ? (
                        <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={handleTitleSave}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleTitleSave()
                                if (e.key === 'Escape') {
                                    setEditingTitle(note.name)
                                    setIsEditingTitle(false)
                                }
                            }}
                            className="text-lg font-semibold bg-[#2a2a2a] border border-[#373737] rounded px-2 py-1 text-[#e3e3e3] outline-none focus:border-blue-500"
                            autoFocus
                        />
                    ) : (
                        <h2 
                            className="text-lg font-semibold text-[#e3e3e3] cursor-pointer hover:text-blue-400 transition-colors"
                            onDoubleClick={() => setIsEditingTitle(true)}
                            title="Double-click to rename"
                        >
                            {note.name}
                        </h2>
                    )}
                    
                    {/* Save indicator */}
                    <div className="flex items-center gap-1.5 text-xs">
                        {isSaving ? (
                            <span className="text-yellow-400 flex items-center gap-1">
                                <Save size={12} className="animate-pulse" />
                                Saving...
                            </span>
                        ) : lastSaved ? (
                            <span className="text-[#6b6b6b] flex items-center gap-1">
                                <Clock size={12} />
                                {formatLastSaved()}
                            </span>
                        ) : null}
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-1">
                    {/* Toggle buttons */}
                    <button
                        onClick={() => updateNoteSettings(note.id, { isMonospace: !note.isMonospace })}
                        className={`p-2 rounded-lg transition-all ${
                            note.isMonospace 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a]'
                        }`}
                        title={note.isMonospace ? 'Switch to sans-serif' : 'Switch to monospace'}
                    >
                        {note.isMonospace ? <Code2 size={16} /> : <Type size={16} />}
                    </button>
                    
                    <button
                        onClick={() => updateNoteSettings(note.id, { wordWrap: !note.wordWrap })}
                        className={`p-2 rounded-lg transition-all ${
                            note.wordWrap 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a]'
                        }`}
                        title={note.wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
                    >
                        {note.wordWrap ? <WrapText size={16} /> : <AlignLeft size={16} />}
                    </button>

                    <div className="w-px h-5 bg-[#373737] mx-1" />

                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className={`p-2 rounded-lg transition-all ${
                            showSearch 
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a]'
                        }`}
                        title="Search & Replace (Ctrl+F)"
                    >
                        <Search size={16} />
                    </button>

                    <button
                        onClick={handleCopyContent}
                        className="p-2 rounded-lg text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-all"
                        title="Copy content"
                    >
                        <Copy size={16} />
                    </button>

                    <button
                        onClick={handleDownload}
                        className="p-2 rounded-lg text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-all"
                        title="Download as .txt"
                    >
                        <Download size={16} />
                    </button>

                    <div className="w-px h-5 bg-[#373737] mx-1" />

                    <button
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className="p-2 rounded-lg text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-all"
                        title={isFullScreen ? 'Exit fullscreen' : 'Fullscreen'}
                    >
                        {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                </div>
            </div>

            {/* Search & Replace Bar */}
            {showSearch && (
                <div className="flex items-center gap-2 px-4 py-2 bg-[#252525] border-b border-[#373737] animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 flex-1">
                        <Search size={14} className="text-[#6b6b6b]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search..."
                            className="flex-1 bg-[#2a2a2a] border border-[#373737] rounded px-2 py-1 text-sm text-[#e3e3e3] outline-none focus:border-blue-500"
                            autoFocus
                        />
                        {computedSearchResults.length > 0 && (
                            <span className="text-xs text-[#6b6b6b]">
                                {currentSearchIndex + 1} / {computedSearchResults.length}
                            </span>
                        )}
                        <button onClick={goToPrevResult} className="p-1 text-[#6b6b6b] hover:text-[#e3e3e3]">↑</button>
                        <button onClick={goToNextResult} className="p-1 text-[#6b6b6b] hover:text-[#e3e3e3]">↓</button>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-1">
                        <Replace size={14} className="text-[#6b6b6b]" />
                        <input
                            type="text"
                            value={replaceQuery}
                            onChange={(e) => setReplaceQuery(e.target.value)}
                            placeholder="Replace with..."
                            className="flex-1 bg-[#2a2a2a] border border-[#373737] rounded px-2 py-1 text-sm text-[#e3e3e3] outline-none focus:border-blue-500"
                        />
                        <button 
                            onClick={handleReplace}
                            className="px-2 py-1 text-xs bg-[#2a2a2a] hover:bg-[#333] text-[#e3e3e3] rounded border border-[#373737]"
                        >
                            Replace
                        </button>
                        <button 
                            onClick={handleReplaceAll}
                            className="px-2 py-1 text-xs bg-[#2a2a2a] hover:bg-[#333] text-[#e3e3e3] rounded border border-[#373737]"
                        >
                            All
                        </button>
                    </div>
                    
                    <button 
                        onClick={() => setShowSearch(false)}
                        className="p-1 text-[#6b6b6b] hover:text-[#e3e3e3]"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Editor Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Line Numbers */}
                <div 
                    ref={lineNumbersRef}
                    className="w-12 bg-[#1a1a1a] border-r border-[#373737] overflow-hidden select-none flex-shrink-0"
                    style={{ 
                        fontFamily: note.isMonospace ? 'JetBrains Mono, Consolas, monospace' : 'inherit',
                        fontSize: '14px',
                        lineHeight: '1.6',
                    }}
                >
                    <div className="py-3 px-2 text-right text-[#4a4a4a]">
                        {lines.map((_, i) => (
                            <div key={i} className="h-[22.4px]">{i + 1}</div>
                        ))}
                    </div>
                </div>

                {/* Textarea */}
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleChange}
                    onScroll={handleScroll}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-[#191919] text-[#e3e3e3] p-3 resize-none outline-none"
                    style={{
                        fontFamily: note.isMonospace ? 'JetBrains Mono, Consolas, monospace' : 'Inter, system-ui, sans-serif',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        whiteSpace: note.wordWrap ? 'pre-wrap' : 'pre',
                        overflowWrap: note.wordWrap ? 'break-word' : 'normal',
                        tabSize: 4,
                    }}
                    placeholder="Start writing..."
                    spellCheck={!note.isMonospace}
                />
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-t border-[#373737] text-xs text-[#6b6b6b]">
                <div className="flex items-center gap-4">
                    <span>Lines: {lineCount}</span>
                    <span>Words: {wordCount}</span>
                    <span>Characters: {charCount}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span>{note.isMonospace ? 'Monospace' : 'Sans-serif'}</span>
                    <span>{note.wordWrap ? 'Wrap' : 'No wrap'}</span>
                    <span>
                        Updated: {new Date(note.updatedAt).toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    )
}
