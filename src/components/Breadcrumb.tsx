import { ChevronRight, Table as TableIcon, FileText, Folder } from 'lucide-react'
import { useTableContext } from '../context/TableContext'

export function Breadcrumb() {
    const { 
        workspaces, 
        currentWorkspaceId, 
        currentTableId, 
        currentNoteId,
        currentItemType 
    } = useTableContext()

    const currentWorkspace = workspaces.find(ws => ws.id === currentWorkspaceId)
    const currentTable = currentWorkspace?.tables.find(t => t.id === currentTableId)
    const currentNote = currentWorkspace?.notes.find(n => n.id === currentNoteId)

    const currentItem = currentItemType === 'note' ? currentNote : currentTable
    const ItemIcon = currentItemType === 'note' ? FileText : TableIcon

    if (!currentWorkspace) return null

    return (
        <nav className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm min-w-0">
            {/* Workspace */}
            <div className="flex items-center gap-1 sm:gap-1.5 text-[#9b9b9b] min-w-0 flex-shrink">
                <Folder size={14} className="text-blue-400 flex-shrink-0" />
                <span className="hover:text-[#e3e3e3] transition-colors cursor-default truncate max-w-[60px] sm:max-w-[120px] lg:max-w-none">
                    {currentWorkspace.name}
                </span>
            </div>

            {/* Separator & Current Item */}
            {currentItem && (
                <>
                    <ChevronRight size={12} className="text-[#6b6b6b] flex-shrink-0 sm:w-[14px] sm:h-[14px]" />
                    <div className="flex items-center gap-1 sm:gap-1.5 text-[#e3e3e3] min-w-0 flex-shrink">
                        <ItemIcon size={14} className={`flex-shrink-0 ${currentItemType === 'note' ? 'text-green-400' : 'text-blue-400'}`} />
                        <span className="font-medium truncate max-w-[80px] sm:max-w-[150px] lg:max-w-none">{currentItem.name}</span>
                    </div>
                </>
            )}
        </nav>
    )
}
