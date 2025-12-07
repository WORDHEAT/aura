import { Cloud, CloudOff, Loader2, RefreshCw, AlertCircle, CloudUpload } from 'lucide-react'
import { useTableContext } from '../context/TableContext'
import { useAuth } from '../context/AuthContext'

export function SyncIndicator() {
    const { isSyncing, syncError, pendingOpsCount, syncWorkspaces } = useTableContext()
    const { isAuthenticated } = useAuth()

    if (!isAuthenticated) {
        return (
            <div 
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#6b6b6b] rounded-md"
                title="Sign in to enable cloud sync"
            >
                <CloudOff size={14} />
                <span className="hidden sm:inline">Offline</span>
            </div>
        )
    }

    if (isSyncing) {
        return (
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-blue-400 rounded-md">
                <Loader2 size={14} className="animate-spin" />
                <span className="hidden sm:inline">Syncing...</span>
            </div>
        )
    }

    if (syncError) {
        return (
            <button
                onClick={() => syncWorkspaces()}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                title={`Sync failed: ${syncError}. Click to retry.`}
            >
                <AlertCircle size={14} />
                <span className="hidden sm:inline">Sync Error</span>
            </button>
        )
    }

    // Show pending operations count
    if (pendingOpsCount > 0) {
        return (
            <button
                onClick={() => syncWorkspaces()}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-yellow-400 hover:bg-yellow-500/10 rounded-md transition-colors"
                title={`${pendingOpsCount} pending deletion(s). Click to sync.`}
            >
                <CloudUpload size={14} />
                <span className="hidden sm:inline">Pending ({pendingOpsCount})</span>
            </button>
        )
    }

    return (
        <button
            onClick={() => syncWorkspaces()}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-green-400 hover:bg-green-500/10 rounded-md transition-colors group"
            title="Cloud sync active. Click to refresh."
        >
            <Cloud size={14} />
            <span className="hidden sm:inline">Synced</span>
            <RefreshCw size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
    )
}
