import { useState, useEffect } from 'react'
import { TableSwitcher } from './components/TableSwitcher'
import { Table } from './components/Table/Table'
import { NoteEditor } from './components/NoteEditor'
import { ExportImport } from './components/ExportImport'
import { SearchFilter } from './components/SearchFilter'
import { NotificationService } from './services/NotificationService'
import { useTableContext } from './context/TableContext'
import { useAuth } from './context/AuthContext'
import type { Row } from './components/Table/Table'
import { LayoutList, LayoutTemplate, Settings, Undo2, Redo2, Plus, FolderPlus, FileText, Table2, Clock, Sparkles } from 'lucide-react'
import { SettingsModal } from './components/SettingsModal'
import { useSettings } from './context/SettingsContext'
import { AuthModal, UserMenu } from './components/Auth'

function App() {
  const { settings } = useSettings()
  const { workspaces, currentTable, currentNote, currentItemType, selectedTableIds, updateTable, updateTableById, updateTableColumns, updateTableAppearance, renameTable, undo, redo, canUndo, canRedo, createWorkspace, createTable, createNote, currentWorkspaceId, switchTable } = useTableContext()
  const { signIn, signUp, signInWithGoogle, signInWithGithub } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editingTitle, setEditingTitle] = useState('')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState<'single' | 'all'>(settings.defaultView)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  // Handle notification settings and restore
  useEffect(() => {
    if (settings.enableNotifications) {
        NotificationService.requestPermission()
        NotificationService.restoreReminders()
    } else {
        NotificationService.cancelAll()
    }
  }, [settings.enableNotifications])

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  // Filter rows helper
  const getFilteredRows = (rows: Row[]): Row[] => {
    if (!searchTerm) return rows
    return rows.filter((row) =>
      Object.values(row.cells).some((cellValue) =>
        String(cellValue).toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  }

  // Get all tables and notes from all workspaces
  const allTables = workspaces.flatMap(ws => ws.tables)
  const allNotes = workspaces.flatMap(ws => ws.notes)
  
  // Determine which tables and notes to show
  const activeTables = viewMode === 'all' 
    ? allTables 
    : allTables.filter(t => selectedTableIds.includes(t.id))
  
  const activeNotes = viewMode === 'all'
    ? []  // Don't show all notes in "all" view
    : allNotes.filter(n => selectedTableIds.includes(n.id))
    
  // Tables and notes to render
  const tablesToRender = activeTables
  const notesToRender = activeNotes
  const totalSelectedItems = tablesToRender.length + notesToRender.length
  
  // Show multi-view if multiple items selected (tables + notes combined)
  const showMultiView = totalSelectedItems > 1

  // Filter rows based on search term for current table (Single View)
  const filteredRows = currentTable ? getFilteredRows(currentTable.rows) : []

  const handleTitleSave = () => {
    if (editingTitle.trim() && editingTitle !== currentTable.name) {
      renameTable(currentTable.id, editingTitle.trim())
    }
    setIsEditingTitle(false)
  }

  return (
    <div className="min-h-screen bg-[#191919] text-[#e3e3e3]">
      {/* Header */}
      <header className="sticky top-0 z-[100] bg-[#191919]/95 backdrop-blur-sm border-b border-[#373737] px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Aura
            </h1>
            <p className="text-[#9b9b9b] text-xs sm:text-sm mt-0.5">Your tables, your time.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-[#2a2a2a] p-1 rounded-lg border border-[#373737]">
              <button
                onClick={() => setViewMode('single')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'single' ? 'bg-[#373737] text-blue-400 shadow-sm' : 'text-[#6b6b6b] hover:text-[#e3e3e3]'}`}
                title="Selected View"
              >
                <LayoutTemplate size={18} />
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'all' ? 'bg-[#373737] text-blue-400 shadow-sm' : 'text-[#6b6b6b] hover:text-[#e3e3e3]'}`}
                title="All Workspaces"
              >
                <LayoutList size={18} />
              </button>
            </div>
            <div className="w-px h-6 bg-[#373737] mx-1" />
            <div className="flex items-center gap-1">
              <button
                onClick={undo}
                disabled={!canUndo}
                className={`p-2 rounded-lg transition-colors ${
                  canUndo 
                    ? 'text-[#9b9b9b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a]' 
                    : 'text-[#4a4a4a] cursor-not-allowed'
                }`}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={18} />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className={`p-2 rounded-lg transition-colors ${
                  canRedo 
                    ? 'text-[#9b9b9b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a]' 
                    : 'text-[#4a4a4a] cursor-not-allowed'
                }`}
                title="Redo (Ctrl+Y)"
              >
                <Redo2 size={18} />
              </button>
            </div>
            <div className="hidden sm:flex items-center">
              <div className="w-px h-6 bg-[#373737] mx-1" />
              <ExportImport
                data={{ columns: currentTable.columns, rows: currentTable.rows }}
                onImport={(data) => updateTable(data)}
              />
            </div>
            <div className="w-px h-6 bg-[#373737] mx-1" />
            <UserMenu 
              onOpenSettings={() => setIsSettingsOpen(true)} 
              onOpenAuth={() => setIsAuthModalOpen(true)} 
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Mobile: Stack layout, Desktop: Grid layout */}
        <div className={`flex flex-col lg:grid gap-4 transition-all duration-300 ${isSidebarCollapsed ? 'lg:grid-cols-[60px_1fr]' : 'lg:grid-cols-[280px_1fr]'}`}>
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-[88px]">
            <TableSwitcher isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
          </aside>

          {/* Main Content Area */}
          <main className="min-w-0">
            {/* Note Editor View - only show in single view mode when a note is current and not in multi-select */}
            {currentItemType === 'note' && currentNote && !showMultiView ? (
              <div className="bg-[#202020] border border-[#373737] rounded-xl overflow-hidden h-[calc(100vh-180px)]">
                <NoteEditor key={currentNote.id} note={currentNote} />
              </div>
            ) : totalSelectedItems === 0 ? (
              /* Quick Actions Dashboard */
              <div className="bg-[#202020] border border-[#373737] rounded-xl p-8">
                <div className="max-w-2xl mx-auto">
                  {/* Welcome Header */}
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 mb-4">
                      <Sparkles className="w-8 h-8 text-blue-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-[#e3e3e3] mb-2">Quick Actions</h2>
                    <p className="text-[#6b6b6b] text-sm">Select a table or note from the sidebar, or use quick actions below</p>
                  </div>

                  {/* Quick Actions Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <button
                      onClick={() => createWorkspace('New Workspace')}
                      className="flex items-center gap-4 p-4 bg-[#2a2a2a] hover:bg-[#333] border border-[#373737] hover:border-blue-500/50 rounded-xl transition-all group"
                    >
                      <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                        <FolderPlus className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-[#e3e3e3]">New Workspace</div>
                        <div className="text-xs text-[#6b6b6b]">Create a new workspace</div>
                      </div>
                    </button>

                    {currentWorkspaceId && (
                      <>
                        <button
                          onClick={() => createTable(currentWorkspaceId, 'New Table')}
                          className="flex items-center gap-4 p-4 bg-[#2a2a2a] hover:bg-[#333] border border-[#373737] hover:border-green-500/50 rounded-xl transition-all group"
                        >
                          <div className="p-3 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                            <Table2 className="w-6 h-6 text-green-400" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-[#e3e3e3]">New Table</div>
                            <div className="text-xs text-[#6b6b6b]">Add table to current workspace</div>
                          </div>
                        </button>

                        <button
                          onClick={() => createNote(currentWorkspaceId, 'New Note')}
                          className="flex items-center gap-4 p-4 bg-[#2a2a2a] hover:bg-[#333] border border-[#373737] hover:border-purple-500/50 rounded-xl transition-all group"
                        >
                          <div className="p-3 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                            <FileText className="w-6 h-6 text-purple-400" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-[#e3e3e3]">New Note</div>
                            <div className="text-xs text-[#6b6b6b]">Add note to current workspace</div>
                          </div>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setIsSettingsOpen(true)}
                      className="flex items-center gap-4 p-4 bg-[#2a2a2a] hover:bg-[#333] border border-[#373737] hover:border-[#555] rounded-xl transition-all group"
                    >
                      <div className="p-3 bg-[#373737] rounded-lg group-hover:bg-[#444] transition-colors">
                        <Settings className="w-6 h-6 text-[#9b9b9b]" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-[#e3e3e3]">Settings</div>
                        <div className="text-xs text-[#6b6b6b]">Configure your preferences</div>
                      </div>
                    </button>
                  </div>

                  {/* Recent Items */}
                  {allTables.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-[#6b6b6b]" />
                        <h3 className="text-sm font-medium text-[#9b9b9b] uppercase tracking-wider">Recent Tables</h3>
                      </div>
                      <div className="space-y-2">
                        {allTables.slice(0, 5).map((table) => {
                          const workspace = workspaces.find(ws => ws.tables.some(t => t.id === table.id))
                          return (
                            <button
                              key={table.id}
                              onClick={() => workspace && switchTable(workspace.id, table.id)}
                              className="flex items-center gap-3 w-full p-3 bg-[#252525] hover:bg-[#2a2a2a] border border-[#373737] rounded-lg transition-all text-left"
                            >
                              <Table2 className="w-4 h-4 text-blue-400" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-[#e3e3e3] truncate">{table.name}</div>
                                <div className="text-xs text-[#6b6b6b]">{workspace?.name} • {table.rows.length} rows</div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Keyboard Shortcut Hint */}
                  <div className="mt-8 pt-6 border-t border-[#373737] text-center">
                    <p className="text-xs text-[#4a4a4a]">
                      <span className="text-[#6b6b6b]">Tip:</span> Use <kbd className="px-1.5 py-0.5 bg-[#2a2a2a] border border-[#373737] rounded text-[#9b9b9b]">Ctrl</kbd> + Click to select multiple items
                    </p>
                  </div>
                </div>
              </div>
            ) : !currentTable ? (
              /* Empty workspace - no tables exist */
              <div className="bg-[#202020] border border-[#373737] rounded-xl p-8 text-center">
                <div className="text-[#6b6b6b] mb-4">
                  <Plus className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-[#9b9b9b] mb-2">No Items Yet</h3>
                  <p className="text-sm">Create a table or note to get started.</p>
                </div>
              </div>
            ) : !showMultiView ? (
              <>
                {/* Table Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  {isEditingTitle ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={handleTitleSave}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur()
                        if (e.key === 'Escape') {
                          setEditingTitle(currentTable.name)
                          setIsEditingTitle(false)
                        }
                      }}
                      className="text-base sm:text-lg font-semibold bg-[#191919] border border-[#373737] px-2 py-1 rounded outline-none focus:border-blue-500 text-[#e3e3e3] min-w-[200px]"
                      autoFocus
                    />
                  ) : (
                    <h2
                      className="text-base sm:text-lg font-semibold text-[#e3e3e3] truncate cursor-pointer hover:text-blue-400 transition-colors border border-transparent px-2 py-1 rounded hover:bg-[#2a2a2a]"
                      onClick={() => {
                        setEditingTitle(currentTable.name)
                        setIsEditingTitle(true)
                      }}
                      title="Click to rename table"
                    >
                      {currentTable.name}
                    </h2>
                  )}
                  <SearchFilter searchTerm={searchTerm} onSearchChange={setSearchTerm} />
                </div>

                {/* Search Results Info */}
                {searchTerm && (
                  <div className="mb-3 text-xs sm:text-sm text-[#9b9b9b]">
                    Showing {filteredRows.length} of {currentTable.rows.length} rows
                  </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <Table
                      tableId={currentTable.id}
                      data={{ columns: currentTable.columns, rows: filteredRows }}
                      onUpdate={updateTable}
                      onColumnUpdate={(cols) => updateTableColumns(currentTable.id, cols)}
                      isFiltered={!!searchTerm}
                      appearance={currentTable.appearance}
                      onAppearanceChange={(app) => updateTableAppearance(currentTable.id, app)}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-12">
                {/* Render selected tables */}
                {tablesToRender.map((table) => (
                  <div key={table.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="text-lg font-semibold text-[#e3e3e3] border-l-4 border-blue-500 pl-3">
                        {table.name}
                      </h2>
                      <div className="h-px bg-[#373737] flex-1" />
                    </div>
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                        <Table
                          tableId={table.id}
                          data={{
                            columns: table.columns,
                            rows: getFilteredRows(table.rows),
                          }}
                          onUpdate={(newData) => updateTableById(table.id, newData)}
                          onColumnUpdate={(cols) => updateTableColumns(table.id, cols)}
                          isFiltered={!!searchTerm}
                          appearance={table.appearance}
                          onAppearanceChange={(app) => updateTableAppearance(table.id, app)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Render selected notes */}
                {notesToRender.map((note) => (
                  <div key={note.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="text-lg font-semibold text-[#e3e3e3] border-l-4 border-green-500 pl-3">
                        {note.name}
                      </h2>
                      <div className="h-px bg-[#373737] flex-1" />
                    </div>
                    <div className="bg-[#202020] border border-[#373737] rounded-xl overflow-hidden h-[400px]">
                      <NoteEditor key={note.id} note={note} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignIn={signIn}
        onSignUp={signUp}
        onGoogleSignIn={signInWithGoogle}
        onGithubSignIn={signInWithGithub}
      />
    </div>
  )
}

export default App
