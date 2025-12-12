import { useState, useEffect, lazy, Suspense, useCallback } from 'react'
import { TableSwitcher } from './components/TableSwitcher'
import { Table } from './components/Table/Table'
import { NoteEditor } from './components/NoteEditor'
import { Breadcrumb } from './components/Breadcrumb'
import { ProfileWorkspaceSelector } from './components/ProfileWorkspaceSelector'
// ExportImport moved to sidebar
// SearchFilter not used in simplified layout
import { NotificationService } from './services/NotificationService'
import { TeamNotificationService } from './services/TeamNotificationService'
import type { TeamNotification } from './services/TeamNotificationService'
import { useTableContext } from './context/TableContext'
import { useAuth } from './context/AuthContext'
// Row type not needed in simplified layout
import { FolderPlus, FileText, Table2, Sparkles, Menu, X, Trash2, Search, Bell, LayoutList, LayoutTemplate, Undo2, Redo2, Calendar } from 'lucide-react'
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
  const { workspaces, currentTable, currentNote, currentItemType, selectedTableIds, updateTable, updateTableById, undo, redo, canUndo, canRedo, createWorkspace, createTable, createNote, currentWorkspaceId, getTableById, getNoteById } = useTableContext()
  const { isAuthenticated, signIn, signUp, signInWithGoogle, signInWithGithub } = useAuth()
  const [hasSkippedLanding, setHasSkippedLanding] = useState(false)
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
  const totalSelectedItems = activeTables.length + activeNotes.length
  
  // Show multi-view if multiple items selected (tables + notes combined)
  const showMultiView = totalSelectedItems > 1

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
      {/* Main Two-Column Layout */}
      <div className="hidden lg:grid h-screen grid-cols-[auto_1fr]">
        {/* LEFT COLUMN - Sidebar */}
        <div className={`bg-[#141414] flex flex-col h-screen overflow-hidden transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-0' : 'w-[260px]'}`}>
            {/* Sidebar Header - Profile/Search - matches right header height */}
            <div className="h-11 flex items-center justify-between px-3">
              <ProfileWorkspaceSelector />
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-1.5 rounded text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors flex-shrink-0"
                title="Search (Ctrl+K)"
              >
                <Search size={16} />
              </button>
            </div>
            
            {/* Sidebar Content - Workspaces */}
            <div className="flex-1 overflow-hidden border-t border-[#2a2a2a]">
              <SectionErrorBoundary name="Sidebar">
                <TableSwitcher />
              </SectionErrorBoundary>
            </div>
        </div>

        {/* RIGHT COLUMN - Headers + Content */}
        <div className="flex flex-col h-screen overflow-hidden">
          {/* Right Header Row */}
          <header className="bg-[#191919] border-b border-[#2a2a2a] h-11 flex items-center px-4 flex-shrink-0">
            {/* Hamburger menu - left side of header */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 text-[#9b9b9b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] rounded transition-colors mr-3"
              title={isSidebarCollapsed ? "Show workspaces" : "Hide workspaces"}
            >
              <Menu size={18} />
            </button>
            
            {/* Spacer */}
            <div className="flex-1" />
            
            {/* Right section - Notifications + User */}
            <div className="flex items-center gap-2">
              {/* Team Notifications Bell */}
              {isAuthenticated && (
                <div className="relative">
                  <button
                    onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                    className="p-1.5 rounded-lg text-[#9b9b9b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors relative"
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
          </header>

          {/* Toolbar Row */}
          <div className="bg-[#191919] border-b border-[#2a2a2a] px-4 py-1.5 flex items-center flex-shrink-0">
            {/* Breadcrumb - left side */}
            <div className="flex-shrink min-w-0 mr-4">
              <Breadcrumb />
            </div>
            
            {/* Toolbar actions - right side */}
            <div className="flex items-center gap-1 ml-auto">
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

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-4">
            <SectionErrorBoundary name="Content">
              {/* Note Editor View */}
              {currentItemType === 'note' && currentNote && !showMultiView ? (
                <div className="bg-[#202020] border border-[#373737] rounded-xl overflow-hidden h-[calc(100vh-180px)]">
                  <NoteEditor key={currentNote.id} note={currentNote} />
                </div>
              ) : totalSelectedItems === 0 ? (
                /* Quick Actions Dashboard */
                <div className="bg-[#202020] border border-[#373737] rounded-xl p-8">
                  <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-8">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 mb-4">
                        <Sparkles className="w-8 h-8 text-blue-400" />
                      </div>
                      <h2 className="text-xl font-semibold text-[#e3e3e3] mb-2">Quick Actions</h2>
                      <p className="text-[#6b6b6b] text-sm">Select a table or note from the sidebar, or use quick actions below</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                      <button
                        onClick={() => {
                          if (workspaces.length > 0) {
                            const currentWs = workspaces.find(w => w.id === currentWorkspaceId)
                            const tableCount = currentWs?.tables.filter(t => !t.isArchived).length || 0
                            createTable(currentWorkspaceId, `Table ${tableCount + 1}`)
                          }
                        }}
                        className="flex items-center gap-3 p-4 bg-[#252525] hover:bg-[#2a2a2a] rounded-xl border border-[#373737] hover:border-blue-500/50 transition-all group"
                      >
                        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30 transition-colors">
                          <Table2 size={20} />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-[#e3e3e3]">New Table</div>
                          <div className="text-xs text-[#6b6b6b]">Create a new table</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          if (workspaces.length > 0) {
                            const currentWs = workspaces.find(w => w.id === currentWorkspaceId)
                            const noteCount = currentWs?.notes.filter(n => !n.isArchived).length || 0
                            createNote(currentWorkspaceId, `Note ${noteCount + 1}`)
                          }
                        }}
                        className="flex items-center gap-3 p-4 bg-[#252525] hover:bg-[#2a2a2a] rounded-xl border border-[#373737] hover:border-green-500/50 transition-all group"
                      >
                        <div className="p-2 rounded-lg bg-green-500/20 text-green-400 group-hover:bg-green-500/30 transition-colors">
                          <FileText size={20} />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-[#e3e3e3]">New Note</div>
                          <div className="text-xs text-[#6b6b6b]">Create a new note</div>
                        </div>
                      </button>
                      <button
                        onClick={() => createWorkspace(`Workspace ${workspaces.length + 1}`)}
                        className="flex items-center gap-3 p-4 bg-[#252525] hover:bg-[#2a2a2a] rounded-xl border border-[#373737] hover:border-purple-500/50 transition-all group"
                      >
                        <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30 transition-colors">
                          <FolderPlus size={20} />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-[#e3e3e3]">New Workspace</div>
                          <div className="text-xs text-[#6b6b6b]">Create a new workspace</div>
                        </div>
                      </button>
                      <button
                        onClick={() => setIsSearchOpen(true)}
                        className="flex items-center gap-3 p-4 bg-[#252525] hover:bg-[#2a2a2a] rounded-xl border border-[#373737] hover:border-yellow-500/50 transition-all group"
                      >
                        <div className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400 group-hover:bg-yellow-500/30 transition-colors">
                          <Search size={20} />
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-[#e3e3e3]">Search</div>
                          <div className="text-xs text-[#6b6b6b]">Find tables and notes</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              ) : showMultiView ? (
                /* Multi-select view */
                <div className="space-y-4">
                  {selectedTableIds.map(itemId => {
                    const table = getTableById(itemId)
                    if (table) {
                      return (
                        <div key={itemId} className="bg-[#202020] border border-[#373737] rounded-xl overflow-hidden">
                          <Table
                            tableId={table.id}
                            data={{ columns: table.columns, rows: table.rows }}
                            onUpdate={(data) => updateTableById(table.id, data)}
                          />
                        </div>
                      )
                    }
                    const note = getNoteById(itemId)
                    if (note) {
                      return (
                        <div key={itemId} className="bg-[#202020] border border-[#373737] rounded-xl overflow-hidden">
                          <NoteEditor note={note} />
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
              ) : (
                /* Single table view */
                <div className="bg-[#202020] border border-[#373737] rounded-xl overflow-hidden">
                  <Table
                    tableId={currentTable.id}
                    data={{ columns: currentTable.columns, rows: currentTable.rows }}
                    onUpdate={updateTable}
                  />
                </div>
              )}
            </SectionErrorBoundary>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col h-screen">
        {/* Mobile Header */}
        <header className="bg-[#191919] border-b border-[#2a2a2a] h-11 flex items-center px-3 flex-shrink-0">
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-1.5 text-[#9b9b9b] hover:text-[#e3e3e3] rounded transition-colors"
            title="Open menu"
          >
            <Menu size={18} />
          </button>
          <div className="flex-1" />
          {/* Notifications */}
          {isAuthenticated && (
            <button
              onClick={() => setShowNotificationPanel(!showNotificationPanel)}
              className="p-1.5 rounded text-[#9b9b9b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors relative mr-1"
              title="Notifications"
            >
              <Bell size={18} />
              {teamNotifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {teamNotifications.length > 9 ? '9+' : teamNotifications.length}
                </span>
              )}
            </button>
          )}
          <UserMenu 
            onOpenSettings={() => setIsSettingsOpen(true)} 
            onOpenProfile={() => setIsProfileOpen(true)}
            onOpenAuth={() => setIsAuthModalOpen(true)} 
          />
        </header>
        
        {/* Mobile Toolbar */}
        <div className="bg-[#191919] border-b border-[#2a2a2a] px-3 py-1.5 flex items-center flex-shrink-0">
          <div className="flex-shrink min-w-0 mr-3">
            <Breadcrumb />
          </div>
          <div className="flex items-center gap-1 ml-auto">
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
            <div className="w-px h-4 bg-[#373737] mx-1" />
            {/* Undo/Redo */}
            <button
              onClick={undo}
              disabled={!canUndo}
              className={`p-1.5 rounded transition-colors ${canUndo ? 'text-[#9b9b9b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a]' : 'text-[#4a4a4a] cursor-not-allowed'}`}
              title="Undo"
            >
              <Undo2 size={14} />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className={`p-1.5 rounded transition-colors ${canRedo ? 'text-[#9b9b9b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a]' : 'text-[#4a4a4a] cursor-not-allowed'}`}
              title="Redo"
            >
              <Redo2 size={14} />
            </button>
            <div className="w-px h-4 bg-[#373737] mx-1" />
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
              className="p-1.5 rounded text-[#9b9b9b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors"
              title="Trash"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        
        {/* Mobile Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <SectionErrorBoundary name="Content">
            {currentItemType === 'note' && currentNote ? (
              <div className="bg-[#202020] border border-[#373737] rounded-xl overflow-hidden h-[calc(100vh-120px)]">
                <NoteEditor key={currentNote.id} note={currentNote} />
              </div>
            ) : currentTable ? (
              <div className="bg-[#202020] border border-[#373737] rounded-xl overflow-hidden">
                <Table
                  tableId={currentTable.id}
                  data={{ columns: currentTable.columns, rows: currentTable.rows }}
                  onUpdate={updateTable}
                />
              </div>
            ) : (
              <div className="bg-[#202020] border border-[#373737] rounded-xl p-8 text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-blue-400 opacity-50" />
                <p className="text-[#6b6b6b]">Select a table or note from the menu</p>
              </div>
            )}
          </SectionErrorBoundary>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[150]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileDrawerOpen(false)} />
          <div className="absolute left-0 top-0 w-[85vw] max-w-[400px] h-[100dvh] bg-[#1a1a1a] border-r border-[#373737] shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-[#2a2a2a] shrink-0">
              <ProfileWorkspaceSelector />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setIsSearchOpen(true); setIsMobileDrawerOpen(false) }}
                  className="p-2 text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] rounded-lg transition-colors"
                >
                  <Search size={18} />
                </button>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-2 text-[#9b9b9b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <TableSwitcher onItemSelect={() => setIsMobileDrawerOpen(false)} />
            </div>
          </div>
        </div>
      )}

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
