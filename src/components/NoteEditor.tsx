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
    Clock,
    Eye,
    Edit3,
    ChevronUp,
    ChevronDown,
    FileText,
    Bold,
    Italic,
    Strikethrough,
    Link,
    List,
    ListOrdered,
    Quote,
    Heading1,
    Heading2,
    Heading3,
    CheckSquare,
    Undo2,
    Redo2,
    Minus,
    SpellCheck
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTableContext, type NoteItem } from '../context/TableContext'
import { useSettings } from '../context/SettingsContext'
import { NoteContextMenu, useLongPress } from './NoteContextMenu'

interface NoteEditorProps {
    note: NoteItem
}

export function NoteEditor({ note }: NoteEditorProps) {
    const { updateNoteContent, updateNoteSettings, renameNote } = useTableContext()
    const { settings } = useSettings()
    
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
    const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>(settings.defaultNoteView)
    const [showFormatBar, setShowFormatBar] = useState(true)
    
    // Context menu state
    const [contextMenu, setContextMenu] = useState<{ 
        isOpen: boolean; 
        position: { x: number; y: number }; 
        selectedText: string;
        spellSuggestions: string[];
        misspelledWord: string;
    }>({
        isOpen: false,
        position: { x: 0, y: 0 },
        selectedText: '',
        spellSuggestions: [],
        misspelledWord: ''
    })
    
    // Undo/Redo history
    const [history, setHistory] = useState<string[]>([note.content])
    const [historyIndex, setHistoryIndex] = useState(0)
    const isUndoRedoRef = useRef(false)
    
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const previewRef = useRef<HTMLDivElement>(null)
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lineNumbersRef = useRef<HTMLDivElement>(null)

    // Sync local content when note.content changes from external source (cloud sync)
    // Only update if user is not currently typing (no pending save timeout)
    useEffect(() => {
        if (!saveTimeoutRef.current) {
            setContent(note.content) // eslint-disable-line react-hooks/set-state-in-effect
        }
    }, [note.content, note.id])

    // Update content and manage history
    const updateContent = useCallback((newContent: string, addToHistory = true) => {
        setContent(newContent)
        setIsSaving(true)
        
        // Add to history for undo/redo (only if not an undo/redo action)
        if (addToHistory && !isUndoRedoRef.current) {
            setHistory(prev => {
                const newHistory = prev.slice(0, historyIndex + 1)
                newHistory.push(newContent)
                // Keep max 50 history items
                if (newHistory.length > 50) newHistory.shift()
                return newHistory
            })
            setHistoryIndex(prev => Math.min(prev + 1, 49))
        }
        isUndoRedoRef.current = false
        
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }
        
        saveTimeoutRef.current = setTimeout(() => {
            updateNoteContent(note.id, newContent)
            setIsSaving(false)
            setLastSaved(new Date())
        }, 500)
    }, [note.id, updateNoteContent, historyIndex])

    // Auto-save with debounce - using onChange handler directly
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateContent(e.target.value)
    }

    // Undo function
    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            isUndoRedoRef.current = true
            const newIndex = historyIndex - 1
            setHistoryIndex(newIndex)
            setContent(history[newIndex])
            updateNoteContent(note.id, history[newIndex])
            setLastSaved(new Date())
        }
    }, [historyIndex, history, note.id, updateNoteContent])

    // Redo function
    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            isUndoRedoRef.current = true
            const newIndex = historyIndex + 1
            setHistoryIndex(newIndex)
            setContent(history[newIndex])
            updateNoteContent(note.id, history[newIndex])
            setLastSaved(new Date())
        }
    }, [historyIndex, history, note.id, updateNoteContent])

    // Rich text formatting functions
    const insertFormat = useCallback((prefix: string, suffix: string = prefix, placeholder?: string) => {
        const textarea = textareaRef.current
        if (!textarea) return
        
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = content.substring(start, end)
        const textToWrap = selectedText || placeholder || ''
        
        const newContent = 
            content.substring(0, start) + 
            prefix + textToWrap + suffix + 
            content.substring(end)
        
        updateContent(newContent)
        
        // Set cursor position
        setTimeout(() => {
            textarea.focus()
            if (selectedText) {
                textarea.setSelectionRange(start + prefix.length, start + prefix.length + textToWrap.length)
            } else {
                textarea.setSelectionRange(start + prefix.length, start + prefix.length + textToWrap.length)
            }
        }, 0)
    }, [content, updateContent])

    const insertLinePrefix = useCallback((prefix: string) => {
        const textarea = textareaRef.current
        if (!textarea) return
        
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        
        // Find the start of the current line
        const lineStart = content.lastIndexOf('\n', start - 1) + 1
        const lineEnd = content.indexOf('\n', end)
        const actualLineEnd = lineEnd === -1 ? content.length : lineEnd
        
        const selectedLines = content.substring(lineStart, actualLineEnd)
        const lines = selectedLines.split('\n')
        const prefixedLines = lines.map(line => prefix + line).join('\n')
        
        const newContent = 
            content.substring(0, lineStart) + 
            prefixedLines + 
            content.substring(actualLineEnd)
        
        updateContent(newContent)
        
        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(lineStart + prefix.length, lineStart + prefixedLines.length)
        }, 0)
    }, [content, updateContent])

    // Format action handlers (wrapped in useCallback for stable references)
    const formatBold = useCallback(() => insertFormat('**', '**', 'bold text'), [insertFormat])
    const formatItalic = useCallback(() => insertFormat('*', '*', 'italic text'), [insertFormat])
    const formatStrikethrough = useCallback(() => insertFormat('~~', '~~', 'strikethrough'), [insertFormat])
    const formatCode = useCallback(() => insertFormat('`', '`', 'code'), [insertFormat])
    const formatCodeBlock = useCallback(() => insertFormat('```\n', '\n```', 'code block'), [insertFormat])
    const formatLink = useCallback(() => insertFormat('[', '](url)', 'link text'), [insertFormat])
    const formatHeading1 = useCallback(() => insertLinePrefix('# '), [insertLinePrefix])
    const formatHeading2 = useCallback(() => insertLinePrefix('## '), [insertLinePrefix])
    const formatHeading3 = useCallback(() => insertLinePrefix('### '), [insertLinePrefix])
    const formatBulletList = useCallback(() => insertLinePrefix('- '), [insertLinePrefix])
    const formatNumberedList = useCallback(() => insertLinePrefix('1. '), [insertLinePrefix])
    const formatCheckbox = useCallback(() => insertLinePrefix('- [ ] '), [insertLinePrefix])
    const formatQuote = useCallback(() => insertLinePrefix('> '), [insertLinePrefix])
    const formatHorizontalRule = useCallback(() => {
        const textarea = textareaRef.current
        if (!textarea) return
        const start = textarea.selectionStart
        const newContent = content.substring(0, start) + '\n---\n' + content.substring(start)
        updateContent(newContent)
        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start + 5, start + 5)
        }, 0)
    }, [content, updateContent])

    // Check if running in Electron (type-safe access)
    const getElectronAPI = useCallback(() => {
        return (window as Window & { electronAPI?: {
            getSpellSuggestions: () => Promise<{ misspelledWord: string; suggestions: string[] } | null>
            addToDictionary: (word: string) => Promise<boolean>
            onSpellCheckContext: (callback: (context: { misspelledWord: string; suggestions: string[] }) => void) => void
            removeSpellCheckListener: () => void
        }}).electronAPI
    }, [])

    // Store latest spell check context from Electron
    const spellContextRef = useRef<{ misspelledWord: string; suggestions: string[] } | null>(null)

    // Listen for spell check context from Electron
    useEffect(() => {
        const electronAPI = getElectronAPI()
        if (electronAPI) {
            electronAPI.onSpellCheckContext((context) => {
                spellContextRef.current = context
            })
            return () => {
                electronAPI.removeSpellCheckListener()
            }
        }
    }, [getElectronAPI])

    // Context menu handlers
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        const textarea = textareaRef.current
        const selectedText = textarea ? content.substring(textarea.selectionStart, textarea.selectionEnd) : ''
        
        // Always prevent default - we'll show our custom menu
        e.preventDefault()
        
        // Use spell context from ref (set by Electron IPC)
        const spellContext = spellContextRef.current
        const spellSuggestions = spellContext?.suggestions || []
        const misspelledWord = spellContext?.misspelledWord || ''
        
        // Clear the spell context after using it
        spellContextRef.current = null
        
        setContextMenu({
            isOpen: true,
            position: { x: e.clientX, y: e.clientY },
            selectedText,
            spellSuggestions,
            misspelledWord
        })
    }, [content])

    const handleLongPress = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0] || e.changedTouches[0]
        const textarea = textareaRef.current
        const selectedText = textarea ? content.substring(textarea.selectionStart, textarea.selectionEnd) : ''
        setContextMenu({
            isOpen: true,
            position: { x: touch.clientX, y: touch.clientY },
            selectedText,
            spellSuggestions: [],
            misspelledWord: ''
        })
    }, [content])

    const longPressHandlers = useLongPress(handleLongPress, 500)

    const closeContextMenu = useCallback(() => {
        setContextMenu(prev => ({ ...prev, isOpen: false }))
    }, [])

    const handleCopy = useCallback(() => {
        const textarea = textareaRef.current
        if (!textarea) return
        const selectedText = content.substring(textarea.selectionStart, textarea.selectionEnd)
        navigator.clipboard.writeText(selectedText)
    }, [content])

    const handleCut = useCallback(() => {
        const textarea = textareaRef.current
        if (!textarea) return
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = content.substring(start, end)
        navigator.clipboard.writeText(selectedText)
        const newContent = content.substring(0, start) + content.substring(end)
        updateContent(newContent)
        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start, start)
        }, 0)
    }, [content, updateContent])

    const handlePaste = useCallback(async () => {
        const textarea = textareaRef.current
        if (!textarea) return
        try {
            const text = await navigator.clipboard.readText()
            const start = textarea.selectionStart
            const end = textarea.selectionEnd
            const newContent = content.substring(0, start) + text + content.substring(end)
            updateContent(newContent)
            setTimeout(() => {
                textarea.focus()
                textarea.setSelectionRange(start + text.length, start + text.length)
            }, 0)
        } catch (err) {
            console.error('Failed to paste:', err)
        }
    }, [content, updateContent])

    // Replace misspelled word with suggestion
    const handleApplySuggestion = useCallback((suggestion: string) => {
        if (!contextMenu.misspelledWord) return
        
        const textarea = textareaRef.current
        if (!textarea) return
        
        // Find the misspelled word in content and replace it
        const cursorPos = textarea.selectionStart
        
        // Search for the misspelled word around cursor position
        const searchStart = Math.max(0, cursorPos - 50)
        const searchEnd = Math.min(content.length, cursorPos + 50)
        const searchArea = content.substring(searchStart, searchEnd)
        
        const wordIndex = searchArea.lastIndexOf(contextMenu.misspelledWord)
        if (wordIndex !== -1) {
            const absoluteIndex = searchStart + wordIndex
            const newContent = 
                content.substring(0, absoluteIndex) + 
                suggestion + 
                content.substring(absoluteIndex + contextMenu.misspelledWord.length)
            updateContent(newContent)
            
            setTimeout(() => {
                textarea.focus()
                textarea.setSelectionRange(absoluteIndex + suggestion.length, absoluteIndex + suggestion.length)
            }, 0)
        }
    }, [content, contextMenu.misspelledWord, updateContent])

    // Add word to dictionary
    const handleAddToDictionary = useCallback(async () => {
        if (!contextMenu.misspelledWord) return
        
        const electronAPI = getElectronAPI()
        if (electronAPI) {
            try {
                await electronAPI.addToDictionary(contextMenu.misspelledWord)
            } catch (err) {
                console.error('Failed to add word to dictionary:', err)
            }
        }
    }, [contextMenu.misspelledWord, getElectronAPI])

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
            const isMod = e.ctrlKey || e.metaKey
            
            if (isMod && e.key === 'f') {
                e.preventDefault()
                setShowSearch(true)
            }
            if (e.key === 'Escape' && showSearch) {
                setShowSearch(false)
            }
            if (isMod && e.key === 's') {
                e.preventDefault()
                updateNoteContent(note.id, content)
                setIsSaving(false)
                setLastSaved(new Date())
            }
            // Undo/Redo
            if (isMod && e.key === 'z' && !e.shiftKey) {
                e.preventDefault()
                handleUndo()
            }
            if (isMod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault()
                handleRedo()
            }
            // Formatting shortcuts (only in edit mode)
            if (viewMode !== 'preview' && isMod) {
                if (e.key === 'b') {
                    e.preventDefault()
                    formatBold()
                }
                if (e.key === 'i') {
                    e.preventDefault()
                    formatItalic()
                }
                if (e.key === 'k') {
                    e.preventDefault()
                    formatLink()
                }
            }
        }
        
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [showSearch, note.id, content, updateNoteContent, handleUndo, handleRedo, viewMode, formatBold, formatItalic, formatLink])

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

    const scrollToSearchResult = useCallback((index: number) => {
        if (!textareaRef.current || computedSearchResults.length === 0) return
        
        const pos = computedSearchResults[index]
        const textarea = textareaRef.current
        
        // Calculate line number for the position
        const textBefore = content.substring(0, pos)
        const lineNumber = textBefore.split('\n').length - 1
        
        // Calculate approximate scroll position
        const lineHeight = 22.4 // matches our line height
        const scrollTop = lineNumber * lineHeight - textarea.clientHeight / 3
        
        textarea.scrollTop = Math.max(0, scrollTop)
        
        // Focus and select the found text
        textarea.focus()
        textarea.setSelectionRange(pos, pos + searchQuery.length)
    }, [computedSearchResults, content, searchQuery])

    const goToNextResult = useCallback(() => {
        if (computedSearchResults.length > 0) {
            const nextIndex = (currentSearchIndex + 1) % computedSearchResults.length
            setCurrentSearchIndex(nextIndex)
            scrollToSearchResult(nextIndex)
        }
    }, [computedSearchResults.length, currentSearchIndex, scrollToSearchResult])

    const goToPrevResult = useCallback(() => {
        if (computedSearchResults.length > 0) {
            const prevIndex = (currentSearchIndex - 1 + computedSearchResults.length) % computedSearchResults.length
            setCurrentSearchIndex(prevIndex)
            scrollToSearchResult(prevIndex)
        }
    }, [computedSearchResults.length, currentSearchIndex, scrollToSearchResult])

    // Scroll to first result when search query changes
    useEffect(() => {
        if (computedSearchResults.length > 0 && searchQuery) {
            setCurrentSearchIndex(0) // eslint-disable-line react-hooks/set-state-in-effect
            scrollToSearchResult(0)
        }
    }, [searchQuery, computedSearchResults.length, scrollToSearchResult])

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

                    <button
                        onClick={() => updateNoteSettings(note.id, { spellCheck: !(note.spellCheck ?? !note.isMonospace) })}
                        className={`p-2 rounded-lg transition-all ${
                            (note.spellCheck ?? !note.isMonospace)
                                ? 'bg-blue-500/20 text-blue-400' 
                                : 'text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a]'
                        }`}
                        title={(note.spellCheck ?? !note.isMonospace) ? 'Disable spell check' : 'Enable spell check'}
                    >
                        <SpellCheck size={16} />
                    </button>

                    <div className="w-px h-5 bg-[#373737] mx-1" />

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-[#252525] rounded-lg p-0.5">
                        <button
                            onClick={() => setViewMode('edit')}
                            className={`p-1.5 rounded transition-all ${
                                viewMode === 'edit'
                                    ? 'bg-[#373737] text-blue-400'
                                    : 'text-[#6b6b6b] hover:text-[#e3e3e3]'
                            }`}
                            title="Edit mode"
                        >
                            <Edit3 size={14} />
                        </button>
                        <button
                            onClick={() => setViewMode('split')}
                            className={`p-1.5 rounded transition-all ${
                                viewMode === 'split'
                                    ? 'bg-[#373737] text-blue-400'
                                    : 'text-[#6b6b6b] hover:text-[#e3e3e3]'
                            }`}
                            title="Split view"
                        >
                            <FileText size={14} />
                        </button>
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`p-1.5 rounded transition-all ${
                                viewMode === 'preview'
                                    ? 'bg-[#373737] text-blue-400'
                                    : 'text-[#6b6b6b] hover:text-[#e3e3e3]'
                            }`}
                            title="Preview mode"
                        >
                            <Eye size={14} />
                        </button>
                    </div>

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

            {/* Format Bar */}
            {showFormatBar && viewMode !== 'preview' && (
                <div className="flex items-center gap-1 px-4 py-2 bg-[#1a1a1a] border-b border-[#373737] overflow-x-auto custom-scrollbar">
                    {/* Undo/Redo */}
                    <button
                        onClick={handleUndo}
                        disabled={historyIndex <= 0}
                        className="p-1.5 rounded text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo2 size={16} />
                    </button>
                    <button
                        onClick={handleRedo}
                        disabled={historyIndex >= history.length - 1}
                        className="p-1.5 rounded text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Redo (Ctrl+Y)"
                    >
                        <Redo2 size={16} />
                    </button>

                    <div className="w-px h-5 bg-[#373737] mx-1" />

                    {/* Text Formatting */}
                    <button
                        onClick={formatBold}
                        className="p-1.5 rounded text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors"
                        title="Bold (Ctrl+B)"
                    >
                        <Bold size={16} />
                    </button>
                    <button
                        onClick={formatItalic}
                        className="p-1.5 rounded text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors"
                        title="Italic (Ctrl+I)"
                    >
                        <Italic size={16} />
                    </button>
                    <button
                        onClick={formatStrikethrough}
                        className="p-1.5 rounded text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors"
                        title="Strikethrough"
                    >
                        <Strikethrough size={16} />
                    </button>
                    <button
                        onClick={formatCode}
                        className="p-1.5 rounded text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors"
                        title="Inline Code"
                    >
                        <Code2 size={16} />
                    </button>

                    <div className="w-px h-5 bg-[#373737] mx-1" />

                    {/* Headings */}
                    <button
                        onClick={formatHeading1}
                        className="p-1.5 rounded text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors"
                        title="Heading 1"
                    >
                        <Heading1 size={16} />
                    </button>
                    <button
                        onClick={formatHeading2}
                        className="p-1.5 rounded text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors"
                        title="Heading 2"
                    >
                        <Heading2 size={16} />
                    </button>
                    <button
                        onClick={formatHeading3}
                        className="p-1.5 rounded text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors"
                        title="Heading 3"
                    >
                        <Heading3 size={16} />
                    </button>

                    <div className="w-px h-5 bg-[#373737] mx-1" />

                    {/* Lists */}
                    <button
                        onClick={formatBulletList}
                        className="p-1.5 rounded text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors"
                        title="Bullet List"
                    >
                        <List size={16} />
                    </button>
                    <button
                        onClick={formatNumberedList}
                        className="p-1.5 rounded text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors"
                        title="Numbered List"
                    >
                        <ListOrdered size={16} />
                    </button>
                    <button
                        onClick={formatCheckbox}
                        className="p-1.5 rounded text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors"
                        title="Checkbox"
                    >
                        <CheckSquare size={16} />
                    </button>

                    <div className="w-px h-5 bg-[#373737] mx-1" />

                    {/* Other */}
                    <button
                        onClick={formatLink}
                        className="p-1.5 rounded text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors"
                        title="Link (Ctrl+K)"
                    >
                        <Link size={16} />
                    </button>
                    <button
                        onClick={formatQuote}
                        className="p-1.5 rounded text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors"
                        title="Blockquote"
                    >
                        <Quote size={16} />
                    </button>
                    <button
                        onClick={formatCodeBlock}
                        className="px-2 py-1 rounded text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors text-xs font-mono"
                        title="Code Block"
                    >
                        {"</>"}
                    </button>
                    <button
                        onClick={formatHorizontalRule}
                        className="p-1.5 rounded text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors"
                        title="Horizontal Rule"
                    >
                        <Minus size={16} />
                    </button>

                    <div className="flex-1" />

                    {/* Toggle Format Bar */}
                    <button
                        onClick={() => setShowFormatBar(false)}
                        className="p-1 rounded text-[#6b6b6b] hover:text-[#e3e3e3] transition-colors"
                        title="Hide format bar"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Show Format Bar Button (when hidden) */}
            {!showFormatBar && viewMode !== 'preview' && (
                <button
                    onClick={() => setShowFormatBar(true)}
                    className="w-full py-1 bg-[#1a1a1a] border-b border-[#373737] text-[#6b6b6b] hover:text-[#e3e3e3] text-xs transition-colors"
                >
                    Show formatting toolbar
                </button>
            )}

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
                            <span className="text-xs text-[#9b9b9b] bg-[#373737] px-2 py-0.5 rounded">
                                {currentSearchIndex + 1} / {computedSearchResults.length}
                            </span>
                        )}
                        {searchQuery && computedSearchResults.length === 0 && (
                            <span className="text-xs text-red-400">No results</span>
                        )}
                        <button 
                            onClick={goToPrevResult} 
                            disabled={computedSearchResults.length === 0}
                            className="p-1.5 text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#373737] rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Previous (↑)"
                        >
                            <ChevronUp size={16} />
                        </button>
                        <button 
                            onClick={goToNextResult} 
                            disabled={computedSearchResults.length === 0}
                            className="p-1.5 text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#373737] rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Next (↓)"
                        >
                            <ChevronDown size={16} />
                        </button>
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
                {/* Editor Panel */}
                {(viewMode === 'edit' || viewMode === 'split') && (
                    <div className={`flex ${viewMode === 'split' ? 'w-1/2 border-r border-[#373737]' : 'flex-1'}`}>
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
                            onContextMenu={handleContextMenu}
                            {...longPressHandlers}
                            className="flex-1 bg-[#191919] text-[#e3e3e3] p-3 resize-none outline-none"
                            style={{
                                fontFamily: note.isMonospace ? 'JetBrains Mono, Consolas, monospace' : 'Inter, system-ui, sans-serif',
                                fontSize: '14px',
                                lineHeight: '1.6',
                                whiteSpace: note.wordWrap ? 'pre-wrap' : 'pre',
                                overflowWrap: note.wordWrap ? 'break-word' : 'normal',
                                tabSize: 4,
                            }}
                            placeholder="Start writing... (Supports Markdown)"
                            spellCheck={note.spellCheck ?? !note.isMonospace}
                        />
                    </div>
                )}

                {/* Preview Panel */}
                {(viewMode === 'preview' || viewMode === 'split') && (
                    <div 
                        ref={previewRef}
                        className={`${viewMode === 'split' ? 'w-1/2' : 'flex-1'} bg-[#191919] overflow-y-auto custom-scrollbar`}
                    >
                        <div className="p-4 prose prose-invert prose-sm max-w-none markdown-preview">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    // Syntax highlighted code blocks
                                    code({ className, children, ...props }) {
                                        const match = /language-(\w+)/.exec(className || '')
                                        const isInline = !match && !className
                                        return !isInline && match ? (
                                            <SyntaxHighlighter
                                                style={oneDark}
                                                language={match[1]}
                                                PreTag="div"
                                                customStyle={{
                                                    margin: 0,
                                                    borderRadius: '8px',
                                                    fontSize: '13px',
                                                }}
                                            >
                                                {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
                                        ) : (
                                            <code className="bg-[#2a2a2a] px-1.5 py-0.5 rounded text-blue-400 text-sm" {...props}>
                                                {children}
                                            </code>
                                        )
                                    },
                                    // Interactive checklists
                                    li({ children, ...props }) {
                                        const text = String(children)
                                        const isChecked = text.startsWith('☑') || text.includes('[x]') || text.includes('[X]')
                                        const isUnchecked = text.startsWith('☐') || text.includes('[ ]')
                                        
                                        if (isChecked || isUnchecked) {
                                            return (
                                                <li className="list-none flex items-start gap-2" {...props}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isChecked}
                                                        onChange={() => {
                                                            // Toggle checkbox in content
                                                            const newContent = isChecked 
                                                                ? content.replace(/\[x\]/gi, '[ ]').replace('☑', '☐')
                                                                : content.replace('[ ]', '[x]').replace('☐', '☑')
                                                            setContent(newContent)
                                                            updateNoteContent(note.id, newContent)
                                                        }}
                                                        className="mt-1 w-4 h-4 rounded border-[#373737] bg-[#2a2a2a] checked:bg-blue-500 cursor-pointer"
                                                    />
                                                    <span className={isChecked ? 'line-through text-[#6b6b6b]' : ''}>
                                                        {text.replace(/^\[[ xX]\]\s*/, '').replace(/^[☑☐]\s*/, '')}
                                                    </span>
                                                </li>
                                            )
                                        }
                                        return <li {...props}>{children}</li>
                                    },
                                    // Style headings
                                    h1: ({ children }) => <h1 className="text-2xl font-bold text-white border-b border-[#373737] pb-2 mb-4">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-xl font-semibold text-white border-b border-[#373737] pb-2 mb-3">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-lg font-semibold text-[#e3e3e3] mb-2">{children}</h3>,
                                    // Style links
                                    a: ({ href, children }) => (
                                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                                            {children}
                                        </a>
                                    ),
                                    // Style blockquotes
                                    blockquote: ({ children }) => (
                                        <blockquote className="border-l-4 border-blue-500 pl-4 italic text-[#9b9b9b] my-4">
                                            {children}
                                        </blockquote>
                                    ),
                                    // Style tables
                                    table: ({ children }) => (
                                        <table className="border-collapse w-full my-4">
                                            {children}
                                        </table>
                                    ),
                                    th: ({ children }) => (
                                        <th className="border border-[#373737] bg-[#252525] px-3 py-2 text-left text-[#e3e3e3]">
                                            {children}
                                        </th>
                                    ),
                                    td: ({ children }) => (
                                        <td className="border border-[#373737] px-3 py-2 text-[#9b9b9b]">
                                            {children}
                                        </td>
                                    ),
                                    // Style horizontal rule
                                    hr: () => <hr className="border-[#373737] my-6" />,
                                    // Style paragraphs
                                    p: ({ children }) => <p className="text-[#e3e3e3] leading-relaxed mb-4">{children}</p>,
                                    // Style lists
                                    ul: ({ children }) => <ul className="list-disc list-inside text-[#e3e3e3] mb-4 space-y-1">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal list-inside text-[#e3e3e3] mb-4 space-y-1">{children}</ol>,
                                }}
                            >
                                {content || '*Start writing to see preview...*'}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
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
                    <span>{(note.spellCheck ?? !note.isMonospace) ? 'Spell ✓' : 'Spell ✗'}</span>
                    <span>
                        Updated: {new Date(note.updatedAt).toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Context Menu */}
            <NoteContextMenu
                isOpen={contextMenu.isOpen}
                position={contextMenu.position}
                onClose={closeContextMenu}
                selectedText={contextMenu.selectedText}
                onFormat={insertFormat}
                onLinePrefix={insertLinePrefix}
                onCopy={handleCopy}
                onCut={handleCut}
                onPaste={handlePaste}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={historyIndex > 0}
                canRedo={historyIndex < history.length - 1}
                spellingSuggestions={contextMenu.spellSuggestions}
                misspelledWord={contextMenu.misspelledWord}
                onApplySuggestion={handleApplySuggestion}
                onAddToDictionary={handleAddToDictionary}
            />
        </div>
    )
}
