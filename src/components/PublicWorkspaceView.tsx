import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2, ArrowLeft, Lock, TableIcon, FileText } from 'lucide-react'

interface PublicTable {
    id: string
    name: string
    columns: Array<{ id: string; title: string; type: string }>
    rows: Array<{ id: string; cells: Record<string, string> }>
    appearance?: {
        headerColor?: string
        accentColor?: string
    }
}

interface PublicNote {
    id: string
    name: string
    content: string
    isMonospace?: boolean
    wordWrap?: boolean
}

interface PublicWorkspace {
    id: string
    name: string
    visibility: string
    tables: PublicTable[]
    notes: PublicNote[]
}

export function PublicWorkspaceView() {
    const { workspaceId } = useParams<{ workspaceId: string }>()
    const [workspace, setWorkspace] = useState<PublicWorkspace | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'tables' | 'notes'>('tables')
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

    useEffect(() => {
        async function fetchPublicWorkspace() {
            if (!workspaceId) {
                setError('No workspace ID provided')
                setLoading(false)
                return
            }

            try {
                // Fetch workspace
                const { data: wsData, error: wsError } = await supabase
                    .from('workspaces')
                    .select('*')
                    .eq('id', workspaceId)
                    .eq('visibility', 'public')
                    .single()

                if (wsError || !wsData) {
                    setError('Workspace not found or is not public')
                    setLoading(false)
                    return
                }

                // Fetch tables
                const { data: tablesData } = await supabase
                    .from('tables')
                    .select('*')
                    .eq('workspace_id', workspaceId)
                    .order('position', { ascending: true })

                // Fetch notes
                const { data: notesData } = await supabase
                    .from('notes')
                    .select('*')
                    .eq('workspace_id', workspaceId)
                    .order('position', { ascending: true })

                const tables: PublicTable[] = (tablesData || []).map(t => ({
                    id: t.id,
                    name: t.name,
                    columns: t.columns as PublicTable['columns'],
                    rows: t.rows as PublicTable['rows'],
                    appearance: t.appearance as PublicTable['appearance']
                }))

                const notes: PublicNote[] = (notesData || []).map(n => ({
                    id: n.id,
                    name: n.name,
                    content: n.content,
                    isMonospace: n.is_monospace,
                    wordWrap: n.word_wrap
                }))

                setWorkspace({
                    id: wsData.id,
                    name: wsData.name,
                    visibility: wsData.visibility,
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
                console.error('Error fetching public workspace:', err)
                setError('Failed to load workspace')
            } finally {
                setLoading(false)
            }
        }

        fetchPublicWorkspace()
    }, [workspaceId])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#191919] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
        )
    }

    if (error || !workspace) {
        return (
            <div className="min-h-screen bg-[#191919] flex flex-col items-center justify-center gap-4">
                <Lock className="w-16 h-16 text-[#6b6b6b]" />
                <h1 className="text-xl text-white">{error || 'Workspace not found'}</h1>
                <p className="text-[#6b6b6b]">This workspace may be private or doesn't exist.</p>
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
                            <p className="text-xs text-[#6b6b6b]">Public workspace • View only</p>
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
                        {/* Tables section */}
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

                        {/* Notes section */}
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
                <main className="min-w-0">
                    {selectedTable && (
                        <div className="bg-[#202020] rounded-xl border border-[#373737] overflow-hidden">
                            <div className="px-4 py-3 border-b border-[#373737]">
                                <h2 className="text-lg font-semibold text-white">{selectedTable.name}</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-[#252525]">
                                        <tr>
                                            {selectedTable.columns.map(col => (
                                                <th key={col.id} className="px-4 py-3 text-left text-[#e0e0e0] font-medium border-b border-[#373737]">
                                                    {col.title}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTable.rows.map((row, idx) => (
                                            <tr key={row.id} className={idx % 2 === 0 ? 'bg-[#202020]' : 'bg-[#1a1a1a]'}>
                                                {selectedTable.columns.map(col => (
                                                    <td key={col.id} className="px-4 py-3 text-[#e0e0e0] border-b border-[#373737]">
                                                        {String(row.cells[col.id] || '')}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {selectedTable.rows.length === 0 && (
                                    <div className="p-8 text-center text-[#6b6b6b]">
                                        This table is empty
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {selectedNote && (
                        <div className="bg-[#202020] rounded-xl border border-[#373737] overflow-hidden">
                            <div className="px-4 py-3 border-b border-[#373737]">
                                <h2 className="text-lg font-semibold text-white">{selectedNote.name}</h2>
                            </div>
                            <div className={`p-4 text-[#e0e0e0] whitespace-pre-wrap ${selectedNote.isMonospace ? 'font-mono text-sm' : ''}`}>
                                {selectedNote.content || <span className="text-[#6b6b6b]">This note is empty</span>}
                            </div>
                        </div>
                    )}

                    {!selectedTable && !selectedNote && (
                        <div className="bg-[#202020] rounded-xl border border-[#373737] p-8 text-center">
                            <p className="text-[#6b6b6b]">Select a table or note from the sidebar</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
