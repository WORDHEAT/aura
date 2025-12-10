import { useState, useEffect, lazy, Suspense, useCallback } from 'react'
import { TableSwitcher } from './components/TableSwitcher'
import { Table } from './components/Table/Table'
import { NoteEditor } from './components/NoteEditor'
// ExportImport moved to sidebar
import { SearchFilter } from './components/SearchFilter'
import { NotificationService } from './services/NotificationService'
import { TeamNotificationService } from './services/TeamNotificationService'
import type { TeamNotification } from './services/TeamNotificationService'
import { useTableContext } from './context/TableContext'
import { useAuth } from './context/AuthContext'
import type { Row } from './components/Table/Table'
import { Plus, FolderPlus, FileText, Table2, Clock, Sparkles, Menu, X, Trash2, Search, Bell, Settings, LayoutList, LayoutTemplate, Undo2, Redo2, Calendar } from 'lucide-react'
import { useSettings } from './context/SettingsContext'
import { UserMenu } from './components/Auth'
import { LandingPage } from './components/LandingPage'
import { SectionErrorBoundary, ModalErrorBoundary } from './components/ErrorBoundary'

// Lazy load modals for better initial bundle size
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })))
const CalendarView = lazy(() => import('./components/CalendarView').then(m => ({ default: m.CalendarView })))
const AuthModal = lazy(() => import('./components/Auth/AuthModal').then(m => ({ default: m.AuthModal })))
const ProfileModal = lazy(() => import('./components/ProfileModal').then(m => ({ default: m.ProfileModal })))
const TrashModal = lazy(() => import('./components/TrashModal').then(m => ({ default: m.TrashModal })))
const SearchCommand = lazy(() => import('./components/SearchCommand').then(m => ({ default: m.SearchCommand })))

function App() {
  const { settings } = useSettings()
  const { workspaces, currentTable, currentNote, currentItemType, selectedTableIds, updateTable, updateTableById, updateTableColumns, updateTableAppearance, renameTable, undo, redo, canUndo, canRedo, createWorkspace, createTable, createNote, currentWorkspaceId, switchTable } = useTableContext()
  const { isAuthenticated, signIn, signUp, signInWithGoogle, signInWithGithub } = useAuth()
  const [hasSkippedLanding, setHasSkippedLanding] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editingTitle, setEditingTitle] = useState('')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState<'single' | 'all'>(settings.defaultView)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isTrashOpen, setIsTrashOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [teamNotifications, setTeamNotifications] = useState<TeamNotification[]>([])
  const [showNotificationPanel, setShowNotificationPanel] = useState(false)

  // Handle notification settings and restore
  useEffect(() => {
    if (settings.enableNotifications) {
        NotificationService.requestPermission()
        NotificationService.restoreReminders()
    } else {
        NotificationService.cancelAll()
    }
  }, [settings.enableNotifications])

  // Subscribe to team notifications when authenticated
  const handleTeamNotification = useCallback((notification: TeamNotification) => {
    setTeamNotifications(prev => [notification, ...prev])
  }, [])

  useEffect(() => {
    if (isAuthenticated && settings.enableNotifications) {
      // Load existing unread notifications
      TeamNotificationService.getUnreadNotifications().then(setTeamNotifications)
      // Subscribe to new notifications
      TeamNotificationService.subscribe(handleTeamNotification)
      return () => {
        TeamNotificationService.unsubscribe()
      }
    }
  }, [isAuthenticated, settings.enableNotifications, handleTeamNotification])

  const handleMarkAllRead = async () => {
    await TeamNotificationService.markAllAsRead()
    setTeamNotifications([])
    setShowNotificationPanel(false)
  }


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
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
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

  // Get all tables and notes from all workspaces (excluding archived)
  const allTables = workspaces.flatMap(ws => ws.tables.filter(t => !t.isArchived))
  const allNotes = workspaces.flatMap(ws => ws.notes.filter(n => !n.isArchived))
  
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

  // Show landing page for non-authenticated users (unless they dismiss it)
  if (!hasSkippedLanding && !isAuthenticated) {
    return (
      <>
        <LandingPage 
          onGetStarted={() => {
            setHasSkippedLanding(true)
            setIsAuthModalOpen(true)
          }}
          onSignIn={() => {
            setHasSkippedLanding(true)
            setIsAuthModalOpen(true)
          }}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSignIn={signIn}
          onSignUp={signUp}
          onGoogleSignIn={signInWithGoogle}
          onGithubSignIn={signInWithGithub}
        />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[#191919] text-[#e3e3e3]">
      {/* Header - Clean minimal design like Upbase */}
      <header className="sticky top-0 z-[100] bg-[#191919] border-b border-[#2a2a2a] px-4 py-2">
        <div className="flex items-center gap-4">
          {/* Left: Hamburger only */}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setIsMobileDrawerOpen(true)
              } else {
                setIsSidebarCollapsed(!isSidebarCollapsed)
              }
            }}
            className="p-1.5 text-[#9b9b9b] hover:text-[#e3e3e3] rounded transition-colors"
            title={isSidebarCollapsed ? "Show workspaces" : "Hide workspaces"}
          >
            <Menu size={20} />
          </button>
          
          {/* Right: Minimal icons */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors"
              title="Search (Ctrl+K)"
            >
              <Search size={18} />
            </button>
            {/* Team Notifications Bell */}
            {isAuthenticated && (
              <div className="relative">
                <button
                  onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                  className="p-1.5 sm:p-2 rounded-lg text-[#9b9b9b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors relative"
                  title="Notifications"
                >
                  <Bell size={18} />
                  {teamNotifications.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {teamNotifications.length > 9 ? '9+' : teamNotifications.length}
                    </span>
                  )}
                </button>
                {/* Notification Panel */}
                {showNotificationPanel && (
                  <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setShowNotificationPanel(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-[#202020] border border-[#373737] rounded-xl shadow-2xl z-[101] overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[#373737]">
                        <h3 className="text-sm font-semibold text-[#e3e3e3]">Team Notifications</h3>
                        {teamNotifications.length > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {teamNotifications.length === 0 ? (
                          <div className="p-4 text-center text-sm text-[#6b6b6b]">
                            No notifications
                          </div>
                        ) : (
                          teamNotifications.map((notification) => (
                            <div
                              key={notification.id}
                              className="px-4 py-3 border-b border-[#2a2a2a] hover:bg-[#2a2a2a] transition-colors"
                            >
                              <p className="text-sm text-[#e3e3e3]">{notification.title}</p>
                              {notification.message && (
                                <p className="text-xs text-[#9b9b9b] mt-1">{notification.message}</p>
                              )}
                              <p className="text-[10px] text-[#6b6b6b] mt-1">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            <UserMenu 
              onOpenSettings={() => setIsSettingsOpen(true)} 
              onOpenProfile={() => setIsProfileOpen(true)}
              onOpenAuth={() => setIsAuthModalOpen(true)} 
            />
          </div>
        </div>
      </header>

      {/* Toolbar - Second row with actions */}
      <div className="sticky top-[44px] z-[99] bg-[#191919] border-b border-[#2a2a2a] px-4 py-1.5">
        <div className="flex items-center gap-1 justify-end">
          {/* View Toggle */}
          <div className="flex items-center bg-[#252525] rounded p-0.5">
            <button
              onClick={() => setViewMode('single')}
              className={`px-2 py-1 rounded text-xs transition-all ${viewMode === 'single' ? 'bg-[#373737] text-blue-400' : 'text-[#6b6b6b] hover:text-[#e3e3e3]'}`}
              title="Selected View"
            >
              <LayoutTemplate size={14} />
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-2 py-1 rounded text-xs transition-all ${viewMode === 'all' ? 'bg-[#373737] text-blue-400' : 'text-[#6b6b6b] hover:text-[#e3e3e3]'}`}
              title="All Workspaces"
            >
              <LayoutList size={14} />
            </button>
          </div>

          <div className="w-px h-5 bg-[#373737] mx-2" />

          {/* Undo/Redo */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`p-1.5 rounded transition-colors ${canUndo ? 'text-[#9b9b9b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a]' : 'text-[#4a4a4a] cursor-not-allowed'}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`p-1.5 rounded transition-colors ${canRedo ? 'text-[#9b9b9b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a]' : 'text-[#4a4a4a] cursor-not-allowed'}`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={14} />
          </button>

          <div className="w-px h-5 bg-[#373737] mx-2" />

          {/* Calendar */}
          <button
            onClick={() => setIsCalendarOpen(true)}
            className="p-1.5 rounded text-[#9b9b9b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors"
            title="Calendar"
          >
            <Calendar size={14} />
          </button>

          {/* Trash */}
          <button
            onClick={() => setIsTrashOpen(true)}
            className="p-1.5 rounded text-[#9b9b9b] hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Trash"
          >
            <Trash2 size={14} />
          </button>

        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[150]">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute left-0 top-0 w-[85vw] max-w-[400px] h-[100dvh] bg-[#191919] border-r border-[#373737] shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#373737] shrink-0">
              <h2 className="font-semibold text-[#e3e3e3]">Workspaces</h2>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-2 text-[#9b9b9b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
              <TableSwitcher onItemSelect={() => setIsMobileDrawerOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="px-4 sm:px-6 py-4">
        {/* Desktop: Grid layout with sidebar */}
        <div className={`lg:grid gap-4 transition-all duration-300 ${isSidebarCollapsed ? '' : 'lg:grid-cols-[260px_1fr]'}`}>
          {/* Sidebar - hidden on mobile, toggleable on desktop */}
          {!isSidebarCollapsed && (
            <aside className="hidden lg:block lg:sticky lg:top-[80px] lg:h-[calc(100vh-96px)] animate-in slide-in-from-left duration-200">
              <div className="bg-[#202020] border border-[#373737] rounded-xl h-full overflow-hidden">
                <SectionErrorBoundary name="Sidebar">
                  <TableSwitcher />
                </SectionErrorBoundary>
              </div>
            </aside>
          )}

          {/* Main Content Area */}
          <main className="min-w-0">
            <SectionErrorBoundary name="Content">
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
                      onClick={() => { setIsSearchOpen(true); setIsMobileDrawerOpen(false) }}
                      className="flex items-center gap-4 p-4 bg-[#2a2a2a] hover:bg-[#333] border border-[#373737] hover:border-blue-500/50 rounded-xl transition-all group"
                    >
                      <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                        <Search className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-[#e3e3e3]">Search</div>
                        <div className="text-xs text-[#6b6b6b]">Find tables and notes (Ctrl+K)</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { setIsTrashOpen(true); setIsMobileDrawerOpen(false) }}
                      className="flex items-center gap-4 p-4 bg-[#2a2a2a] hover:bg-[#333] border border-[#373737] hover:border-red-500/50 rounded-xl transition-all group"
                    >
                      <div className="p-3 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition-colors">
                        <Trash2 className="w-6 h-6 text-red-400" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-[#e3e3e3]">Trash</div>
                        <div className="text-xs text-[#6b6b6b]">View deleted items</div>
                      </div>
                    </button>

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
                  <div className="mt-8 pt-6 border-t border-[#373737] text-center space-y-2">
                    <p className="text-xs text-[#4a4a4a]">
                      <span className="text-[#6b6b6b]">Tip:</span> Press <kbd className="px-1.5 py-0.5 bg-[#2a2a2a] border border-[#373737] rounded text-[#9b9b9b]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-[#2a2a2a] border border-[#373737] rounded text-[#9b9b9b]">K</kbd> to search
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
            </SectionErrorBoundary>
          </main>
        </div>
      </div>

      {/* Lazy-loaded modals wrapped in Suspense and Error Boundary */}
      <Suspense fallback={null}>
        {isSettingsOpen && (
          <ModalErrorBoundary onClose={() => setIsSettingsOpen(false)}>
            <SettingsModal 
              isOpen={isSettingsOpen} 
              onClose={() => setIsSettingsOpen(false)} 
            />
          </ModalErrorBoundary>
        )}

        {isAuthModalOpen && (
          <ModalErrorBoundary onClose={() => setIsAuthModalOpen(false)}>
            <AuthModal
              isOpen={isAuthModalOpen}
              onClose={() => setIsAuthModalOpen(false)}
              onSignIn={signIn}
              onSignUp={signUp}
              onGoogleSignIn={signInWithGoogle}
              onGithubSignIn={signInWithGithub}
            />
          </ModalErrorBoundary>
        )}

        {isCalendarOpen && (
          <ModalErrorBoundary onClose={() => setIsCalendarOpen(false)}>
            <CalendarView
              isOpen={isCalendarOpen}
              onClose={() => setIsCalendarOpen(false)}
            />
          </ModalErrorBoundary>
        )}

        {isProfileOpen && (
          <ModalErrorBoundary onClose={() => setIsProfileOpen(false)}>
            <ProfileModal
              isOpen={isProfileOpen}
              onClose={() => setIsProfileOpen(false)}
            />
          </ModalErrorBoundary>
        )}

        {isTrashOpen && (
          <ModalErrorBoundary onClose={() => setIsTrashOpen(false)}>
            <TrashModal
              isOpen={isTrashOpen}
              onClose={() => setIsTrashOpen(false)}
            />
          </ModalErrorBoundary>
        )}

        {isSearchOpen && (
          <ModalErrorBoundary onClose={() => setIsSearchOpen(false)}>
            <SearchCommand
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
            />
          </ModalErrorBoundary>
        )}
      </Suspense>
    </div>
  )
}

export default App
