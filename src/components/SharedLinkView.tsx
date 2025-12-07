import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { syncService } from '../services/SyncService'
import { Loader2, ArrowLeft, Lock, TableIcon, FileText, Clock, AlertCircle, Save, Check } from 'lucide-react'

interface SharedTable {
    id: string
    name: string
    columns: Array<{ id: string; title: string; type: string }>
    rows: Array<{ id: string; cells: Record<string, string> }>
}

interface SharedNote {
    id: string
    name: string
    content: string
    isMonospace?: boolean
}

interface SharedWorkspace {
    id: string
    name: string
    tables: SharedTable[]
    notes: SharedNote[]
}

export function SharedLinkView() {
    const { token } = useParams<{ token: string }>()
    const [workspace, setWorkspace] = useState<SharedWorkspace | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isExpired, setIsExpired] = useState(false)
    const [allowEdit, setAllowEdit] = useState(false)
    const [activeTab, setActiveTab] = useState<'tables' | 'notes'>('tables')
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null)
    const [editValue, setEditValue] = useState('')

    // Handle cell edit
    const handleCellClick = (rowId: string, colId: string, currentValue: string) => {
        if (!allowEdit) return
        setEditingCell({ rowId, colId })
        setEditValue(currentValue)
    }

    // Save cell edit
    const handleCellSave = useCallback(async () => {
        if (!editingCell || !workspace || !selectedItemId) return

        const table = workspace.tables.find(t => t.id === selectedItemId)
        if (!table) return

        // Update local state
        const updatedRows = table.rows.map(row => 
            row.id === editingCell.rowId 
                ? { ...row, cells: { ...row.cells, [editingCell.colId]: editValue } }
                : row
        )

        setWorkspace(prev => prev ? {
            ...prev,
            tables: prev.tables.map(t => 
                t.id === selectedItemId ? { ...t, rows: updatedRows } : t
            )
        } : null)

        // Save to database
        setIsSaving(true)
        try {
            await supabase
                .from('tables')
                .update({ rows: updatedRows })
                .eq('id', selectedItemId)
            
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 2000)
        } catch (err) {
            console.error('Failed to save:', err)
        } finally {
            setIsSaving(false)
            setEditingCell(null)
        }
    }, [editingCell, editValue, workspace, selectedItemId])

    // Handle note content edit
    const handleNoteChange = async (noteId: string, content: string) => {
        if (!allowEdit || !workspace) return

        setWorkspace(prev => prev ? {
            ...prev,
            notes: prev.notes.map(n => 
                n.id === noteId ? { ...n, content } : n
            )
        } : null)

        // Debounced save
        setIsSaving(true)
        try {
            await supabase
                .from('notes')
                .update({ content })
                .eq('id', noteId)
            
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 2000)
        } catch (err) {
            console.error('Failed to save note:', err)
        } finally {
            setIsSaving(false)
        }
    }

    useEffect(() => {
        async function validateAndFetch() {
            if (!token) {
                setError('Invalid share link')
                setLoading(false)
                return
            }

            try {
                // Validate the share link
                const validation = await syncService.validateShareLink(token)
                
                if (!validation.valid || !validation.workspaceId) {
                    setIsExpired(true)
                    setLoading(false)
                    return
                }

                setAllowEdit(validation.allowEdit || false)

                // Fetch workspace data
                const { data: wsData, error: wsError } = await supabase
                    .from('workspaces')
                    .select('*')
                    .eq('id', validation.workspaceId)
                    .single()

                if (wsError || !wsData) {
                    setError('Workspace not found')
                    setLoading(false)
                    return
                }

                // Fetch tables
                const { data: tablesData } = await supabase
                    .from('tables')
                    .select('*')
                    .eq('workspace_id', validation.workspaceId)
                    .order('position', { ascending: true })

                // Fetch notes
                const { data: notesData } = await supabase
                    .from('notes')
                    .select('*')
                    .eq('workspace_id', validation.workspaceId)
                    .order('position', { ascending: true })

                const tables: SharedTable[] = (tablesData || []).map(t => ({
                    id: t.id,
                    name: t.name,
                    columns: t.columns as SharedTable['columns'],
                    rows: t.rows as SharedTable['rows']
                }))

                const notes: SharedNote[] = (notesData || []).map(n => ({
                    id: n.id,
                    name: n.name,
                    content: n.content,
                    isMonospace: n.is_monospace
                }))

                setWorkspace({
                    id: wsData.id,
                    name: wsData.name,
                    tables,
                    notes
                })

                // Select first item
                if (tables.length > 0) {
                    setSelectedItemId(tables[0].id)
                    setActiveTab('tables')
                } else if (notes.length > 0) {
                    setSelectedItemId(notes[0].id)
                    setActiveTab('notes')
                }
            } catch (err) {
                console.error('Error loading shared workspace:', err)
                setError('Failed to load shared content')
            } finally {
                setLoading(false)
            }
        }

        validateAndFetch()
    }, [token])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#191919] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
        )
    }

    if (isExpired) {
        return (
            <div className="min-h-screen bg-[#191919] flex flex-col items-center justify-center gap-4">
                <Clock className="w-16 h-16 text-orange-400" />
                <h1 className="text-xl text-white">Link Expired or Revoked</h1>
                <p className="text-[#6b6b6b]">This share link is no longer valid.</p>
                <Link 
                    to="/" 
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                    Go to Aura
                </Link>
            </div>
        )
    }

    if (error || !workspace) {
        return (
            <div className="min-h-screen bg-[#191919] flex flex-col items-center justify-center gap-4">
                <AlertCircle className="w-16 h-16 text-red-400" />
                <h1 className="text-xl text-white">{error || 'Something went wrong'}</h1>
                <Link 
                    to="/" 
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                    Go to Aura
                </Link>
            </div>
        )
    }

    const selectedTable = activeTab === 'tables' 
        ? workspace.tables.find(t => t.id === selectedItemId) 
        : null
    const selectedNote = activeTab === 'notes' 
        ? workspace.notes.find(n => n.id === selectedItemId) 
        : null

    return (
        <div className="min-h-screen bg-[#191919]">
            {/* Header */}
            <header className="sticky top-0 z-50 px-4 py-3 bg-[#191919]/95 backdrop-blur border-b border-[#373737]">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="text-[#6b6b6b] hover:text-white transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-lg font-semibold text-white">{workspace.name}</h1>
                            <p className="text-xs text-[#6b6b6b]">
                                Shared link • {allowEdit ? 'Can edit' : 'View only'}
                            </p>
                        </div>
                    </div>
                    <Link 
                        to="/" 
                        className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        Open in Aura
                    </Link>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-4 lg:grid lg:grid-cols-[280px,1fr] gap-6">
                {/* Sidebar */}
                <aside className="mb-4 lg:mb-0">
                    <div className="bg-[#202020] rounded-xl border border-[#373737] p-4">
                        {workspace.tables.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wide mb-2">
                                    Tables ({workspace.tables.length})
                                </h3>
                                <div className="space-y-1">
                                    {workspace.tables.map(table => (
                                        <button
                                            key={table.id}
                                            onClick={() => {
                                                setSelectedItemId(table.id)
                                                setActiveTab('tables')
                                            }}
                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                                                selectedItemId === table.id && activeTab === 'tables'
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : 'text-[#e0e0e0] hover:bg-[#2a2a2a]'
                                            }`}
                                        >
                                            <TableIcon size={16} />
                                            <span className="truncate">{table.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {workspace.notes.length > 0 && (
                            <div>
                                <h3 className="text-xs font-medium text-[#6b6b6b] uppercase tracking-wide mb-2">
                                    Notes ({workspace.notes.length})
                                </h3>
                                <div className="space-y-1">
                                    {workspace.notes.map(note => (
                                        <button
                                            key={note.id}
                                            onClick={() => {
                                                setSelectedItemId(note.id)
                                                setActiveTab('notes')
                                            }}
                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                                                selectedItemId === note.id && activeTab === 'notes'
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : 'text-[#e0e0e0] hover:bg-[#2a2a2a]'
                                            }`}
                                        >
                                            <FileText size={16} />
                                            <span className="truncate">{note.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {workspace.tables.length === 0 && workspace.notes.length === 0 && (
                            <p className="text-[#6b6b6b] text-sm text-center py-4">
                                This workspace is empty
                            </p>
                        )}
                    </div>
                </aside>

                {/* Main content */}
                <main className="min-w-0 flex-1">
                    {selectedTable && (
                        <div className="bg-[#202020] rounded-xl border border-[#373737] overflow-hidden">
                            <div className="px-5 py-4 border-b border-[#373737] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <TableIcon size={20} className="text-blue-400" />
                                    <h2 className="text-lg font-semibold text-white">{selectedTable.name}</h2>
                                </div>
                                <span className="text-xs text-[#6b6b6b]">
                                    {selectedTable.rows.length} row{selectedTable.rows.length !== 1 ? 's' : ''} • {selectedTable.columns.length} column{selectedTable.columns.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm" style={{ tableLayout: 'auto' }}>
                                    <thead className="bg-[#252525] sticky top-0">
                                        <tr>
                                            <th className="px-3 py-3 text-center text-[#6b6b6b] font-medium border-b border-r border-[#373737] w-12">
                                                #
                                            </th>
                                            {selectedTable.columns.map(col => (
                                                <th key={col.id} className="px-4 py-3 text-left text-[#e0e0e0] font-medium border-b border-[#373737] min-w-[120px]">
                                                    {col.title}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTable.rows.map((row, idx) => (
                                            <tr 
                                                key={row.id} 
                                                className={`${idx % 2 === 0 ? 'bg-[#202020]' : 'bg-[#1c1c1c]'} hover:bg-[#2a2a2a] transition-colors`}
                                            >
                                                <td className="px-3 py-3 text-center text-[#6b6b6b] border-b border-r border-[#373737] text-xs">
                                                    {idx + 1}
                                                </td>
                                                {selectedTable.columns.map(col => (
                                                    <td 
                                                        key={col.id} 
                                                        className={`px-4 py-3 text-[#e0e0e0] border-b border-[#373737] ${allowEdit ? 'cursor-text hover:bg-[#333]' : ''}`}
                                                        onClick={() => handleCellClick(row.id, col.id, String(row.cells[col.id] || ''))}
                                                    >
                                                        {editingCell?.rowId === row.id && editingCell?.colId === col.id ? (
                                                            <input
                                                                type="text"
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                onBlur={handleCellSave}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                                                                className="w-full bg-[#2a2a2a] border border-blue-500 rounded px-2 py-1 text-white outline-none"
                                                                autoFocus
                                                            />
                                                        ) : (
                                                            String(row.cells[col.id] || '')
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {selectedTable.rows.length === 0 && (
                                    <div className="p-12 text-center">
                                        <TableIcon size={48} className="mx-auto text-[#373737] mb-4" />
                                        <p className="text-[#6b6b6b]">This table is empty</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {selectedNote && (
                        <div className="bg-[#202020] rounded-xl border border-[#373737] overflow-hidden">
                            <div className="px-5 py-4 border-b border-[#373737] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileText size={20} className="text-blue-400" />
                                    <h2 className="text-lg font-semibold text-white">{selectedNote.name}</h2>
                                </div>
                                {isSaving && (
                                    <span className="text-xs text-[#6b6b6b] flex items-center gap-1">
                                        <Save size={12} className="animate-pulse" /> Saving...
                                    </span>
                                )}
                                {saveSuccess && (
                                    <span className="text-xs text-green-400 flex items-center gap-1">
                                        <Check size={12} /> Saved
                                    </span>
                                )}
                            </div>
                            {allowEdit ? (
                                <textarea
                                    value={selectedNote.content}
                                    onChange={(e) => handleNoteChange(selectedNote.id, e.target.value)}
                                    className={`w-full min-h-[300px] p-5 bg-transparent text-[#e0e0e0] resize-none outline-none leading-relaxed ${selectedNote.isMonospace ? 'font-mono text-sm' : ''}`}
                                    placeholder="Start typing..."
                                />
                            ) : (
                                <div className={`p-5 text-[#e0e0e0] whitespace-pre-wrap leading-relaxed ${selectedNote.isMonospace ? 'font-mono text-sm bg-[#1a1a1a]' : ''}`}>
                                    {selectedNote.content || (
                                        <div className="text-center py-8">
                                            <FileText size={48} className="mx-auto text-[#373737] mb-4" />
                                            <p className="text-[#6b6b6b]">This note is empty</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {!selectedTable && !selectedNote && (
                        <div className="bg-[#202020] rounded-xl border border-[#373737] p-12 text-center">
                            <Lock size={48} className="mx-auto text-[#373737] mb-4" />
                            <p className="text-[#6b6b6b]">Select a table or note from the sidebar</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
