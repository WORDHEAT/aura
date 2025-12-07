import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Globe, Lock, Users, UserPlus, Trash2, Crown, Shield, Pencil, Eye, Loader2, Check, Copy, Link2, Clock, Ban, Plus } from 'lucide-react'
import { useTableContext, type WorkspaceVisibility } from '../context/TableContext'
import { useAuth } from '../context/AuthContext'
import { syncService, type WorkspaceMember, type ShareLink } from '../services/SyncService'
import type { WorkspaceMemberRole } from '../lib/database.types'

interface WorkspaceSettingsModalProps {
    isOpen: boolean
    onClose: () => void
    workspaceId: string
}

const VISIBILITY_OPTIONS: { value: WorkspaceVisibility; label: string; icon: typeof Lock; description: string }[] = [
    { value: 'private', label: 'Private', icon: Lock, description: 'Only you can access' },
    { value: 'team', label: 'Team', icon: Users, description: 'Invite members to collaborate' },
    { value: 'public', label: 'Public', icon: Globe, description: 'Anyone with the link can view' },
]

const ROLE_OPTIONS: { value: WorkspaceMemberRole; label: string; icon: typeof Eye }[] = [
    { value: 'admin', label: 'Admin', icon: Shield },
    { value: 'editor', label: 'Editor', icon: Pencil },
    { value: 'viewer', label: 'Viewer', icon: Eye },
]

export function WorkspaceSettingsModal({ isOpen, onClose, workspaceId }: WorkspaceSettingsModalProps) {
    const { workspaces, setWorkspaceVisibility, renameWorkspace } = useTableContext()
    const { user, isAuthenticated } = useAuth()
    const workspace = workspaces.find(ws => ws.id === workspaceId)

    const [visibility, setVisibility] = useState<WorkspaceVisibility>(workspace?.visibility || 'private')
    const [members, setMembers] = useState<WorkspaceMember[]>([])
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<WorkspaceMemberRole>('viewer')
    const [isLoading, setIsLoading] = useState(false)
    const [isInviting, setIsInviting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [isEditingName, setIsEditingName] = useState(false)
    const [editName, setEditName] = useState(workspace?.name || '')
    const [copied, setCopied] = useState(false)
    
    // Share links state
    const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
    const [isCreatingLink, setIsCreatingLink] = useState(false)
    const [newLinkExpiry, setNewLinkExpiry] = useState<string>('never')
    const [newLinkAllowEdit, setNewLinkAllowEdit] = useState(false)
    const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)

    // Load members when modal opens
    useEffect(() => {
        if (isOpen && isAuthenticated && workspace?.visibility === 'team') {
            loadMembers()
        }
    }, [isOpen, isAuthenticated, workspace?.visibility])

    // Reset state when workspace changes
    useEffect(() => {
        if (workspace) {
            setVisibility(workspace.visibility || 'private')
            setEditName(workspace.name)
        }
    }, [workspace])

    const loadMembers = async () => {
        setIsLoading(true)
        try {
            const data = await syncService.getWorkspaceMembers(workspaceId)
            setMembers(data)
        } catch (err) {
            console.error('Failed to load members:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const loadShareLinks = async () => {
        try {
            const links = await syncService.getShareLinks(workspaceId)
            setShareLinks(links)
        } catch (err) {
            console.error('Failed to load share links:', err)
        }
    }

    // Load share links when public visibility
    useEffect(() => {
        if (isOpen && isAuthenticated && visibility === 'public') {
            loadShareLinks()
        }
    }, [isOpen, isAuthenticated, visibility]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleCreateShareLink = async () => {
        if (!isAuthenticated) return
        
        setIsCreatingLink(true)
        setError(null)
        
        try {
            const expiresIn = newLinkExpiry === 'never' ? undefined :
                             newLinkExpiry === '1h' ? 1 :
                             newLinkExpiry === '24h' ? 24 :
                             newLinkExpiry === '7d' ? 168 :
                             newLinkExpiry === '30d' ? 720 : undefined
            
            await syncService.createShareLink(workspaceId, {
                expiresIn,
                allowEdit: newLinkAllowEdit
            })
            
            loadShareLinks()
            setNewLinkExpiry('never')
            setNewLinkAllowEdit(false)
            setSuccess('Share link created!')
        } catch {
            setError('Failed to create share link')
        } finally {
            setIsCreatingLink(false)
        }
    }

    const handleRevokeLink = async (linkId: string) => {
        try {
            await syncService.revokeShareLink(linkId)
            setShareLinks(prev => prev.map(l => 
                l.id === linkId ? { ...l, isActive: false } : l
            ))
        } catch {
            setError('Failed to revoke link')
        }
    }

    const handleDeleteLink = async (linkId: string) => {
        try {
            await syncService.deleteShareLink(linkId)
            setShareLinks(prev => prev.filter(l => l.id !== linkId))
        } catch {
            setError('Failed to delete link')
        }
    }

    const copyShareLink = (token: string, linkId: string) => {
        const url = `${window.location.origin}/share/${token}`
        navigator.clipboard.writeText(url)
        setCopiedLinkId(linkId)
        setTimeout(() => setCopiedLinkId(null), 2000)
    }

    const formatExpiry = (expiresAt: string | null) => {
        if (!expiresAt) return 'Never expires'
        const date = new Date(expiresAt)
        if (date < new Date()) return 'Expired'
        return `Expires ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
    }

    const handleVisibilityChange = async (newVisibility: WorkspaceVisibility) => {
        if (!isAuthenticated) return
        
        setError(null)
        setVisibility(newVisibility)
        
        try {
            await setWorkspaceVisibility(workspaceId, newVisibility)
            if (newVisibility === 'team') {
                loadMembers()
            }
        } catch {
            setError('Failed to update visibility')
            setVisibility(workspace?.visibility || 'private')
        }
    }

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteEmail.trim() || !isAuthenticated) return

        setIsInviting(true)
        setError(null)
        setSuccess(null)

        try {
            const result = await syncService.inviteToWorkspace(workspaceId, inviteEmail.trim(), inviteRole)
            if (result.success) {
                setSuccess(`Invited ${inviteEmail}`)
                setInviteEmail('')
                loadMembers()
            } else {
                setError(result.error || 'Failed to invite')
            }
        } catch {
            setError('Failed to send invite')
        } finally {
            setIsInviting(false)
        }
    }

    const handleRemoveMember = async (memberId: string, userId: string) => {
        if (!isAuthenticated) return
        
        try {
            await syncService.removeMember(workspaceId, userId)
            setMembers(prev => prev.filter(m => m.id !== memberId))
        } catch {
            setError('Failed to remove member')
        }
    }

    const handleUpdateRole = async (userId: string, role: WorkspaceMemberRole) => {
        if (!isAuthenticated) return
        
        try {
            await syncService.updateMemberRole(workspaceId, userId, role)
            setMembers(prev => prev.map(m => 
                m.user_id === userId ? { ...m, role } : m
            ))
        } catch {
            setError('Failed to update role')
        }
    }

    const handleSaveName = () => {
        if (editName.trim() && editName !== workspace?.name) {
            renameWorkspace(workspaceId, editName.trim())
        }
        setIsEditingName(false)
    }

    const handleCopyLink = () => {
        const link = `${window.location.origin}/workspace/${workspaceId}`
        navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (!isOpen || !workspace) return null

    const isOwner = workspace.ownerId === user?.id

    return createPortal(
        <div className="fixed inset-0 z-[50000] flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 bg-[#202020] border border-[#373737] rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#373737]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                            {visibility === 'private' ? <Lock size={20} className="text-white" /> :
                             visibility === 'team' ? <Users size={20} className="text-white" /> :
                             <Globe size={20} className="text-white" />}
                        </div>
                        <div>
                            {isEditingName ? (
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onBlur={handleSaveName}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                                    className="bg-[#191919] border border-[#373737] rounded px-2 py-1 text-lg font-semibold text-[#e3e3e3] outline-none focus:border-blue-500"
                                    autoFocus
                                />
                            ) : (
                                <h2 
                                    className="text-lg font-semibold text-[#e3e3e3] cursor-pointer hover:text-blue-400 transition-colors"
                                    onClick={() => isOwner && setIsEditingName(true)}
                                    title={isOwner ? "Click to rename" : undefined}
                                >
                                    {workspace.name}
                                </h2>
                            )}
                            <p className="text-xs text-[#6b6b6b]">Workspace Settings</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[#6b6b6b] hover:text-[#e3e3e3] p-2 rounded-lg hover:bg-[#2a2a2a] transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Not authenticated warning */}
                    {!isAuthenticated && (
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-sm text-yellow-400">
                                Sign in to enable cloud sync and team features.
                            </p>
                        </div>
                    )}

                    {/* Visibility */}
                    <div>
                        <h3 className="text-sm font-medium text-[#9b9b9b] mb-3">Visibility</h3>
                        <div className="space-y-2">
                            {VISIBILITY_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleVisibilityChange(option.value)}
                                    disabled={!isAuthenticated || !isOwner}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                        visibility === option.value
                                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                            : 'bg-[#191919] border-[#373737] text-[#9b9b9b] hover:border-[#4a4a4a]'
                                    } ${(!isAuthenticated || !isOwner) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <option.icon size={18} />
                                    <div className="flex-1 text-left">
                                        <p className="font-medium">{option.label}</p>
                                        <p className="text-xs opacity-70">{option.description}</p>
                                    </div>
                                    {visibility === option.value && (
                                        <Check size={18} className="text-blue-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Share Link (for public/team) */}
                    {visibility !== 'private' && (
                        <div>
                            <h3 className="text-sm font-medium text-[#9b9b9b] mb-3">Share Link</h3>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={`${window.location.origin}/workspace/${workspaceId}`}
                                    className="flex-1 bg-[#191919] border border-[#373737] rounded-lg px-3 py-2 text-sm text-[#9b9b9b] outline-none"
                                />
                                <button
                                    onClick={handleCopyLink}
                                    className="px-3 py-2 bg-[#2a2a2a] hover:bg-[#333] border border-[#373737] rounded-lg text-[#e3e3e3] transition-colors flex items-center gap-2"
                                >
                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Team Members (for team visibility) */}
                    {visibility === 'team' && isAuthenticated && (
                        <div>
                            <h3 className="text-sm font-medium text-[#9b9b9b] mb-3">Team Members</h3>
                            
                            {/* Invite form */}
                            {isOwner && (
                                <form onSubmit={handleInvite} className="flex gap-2 mb-4">
                                    <div className="flex-1 relative">
                                        <UserPlus size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b6b]" />
                                        <input
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            placeholder="Email address"
                                            className="w-full pl-9 pr-3 py-2 bg-[#191919] border border-[#373737] rounded-lg text-sm text-[#e3e3e3] placeholder-[#6b6b6b] outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <select
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value as WorkspaceMemberRole)}
                                        className="bg-[#191919] border border-[#373737] rounded-lg px-2 py-2 text-sm text-[#e3e3e3] outline-none"
                                    >
                                        {ROLE_OPTIONS.map(role => (
                                            <option key={role.value} value={role.value}>{role.label}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="submit"
                                        disabled={isInviting || !inviteEmail.trim()}
                                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isInviting ? <Loader2 size={16} className="animate-spin" /> : 'Invite'}
                                    </button>
                                </form>
                            )}

                            {/* Members list */}
                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 size={24} className="animate-spin text-blue-400" />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {/* Owner */}
                                    <div className="flex items-center gap-3 p-3 bg-[#191919] rounded-lg border border-[#373737]">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white text-sm font-medium">
                                            {user?.name?.charAt(0).toUpperCase() || 'O'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-[#e3e3e3]">{user?.name} (You)</p>
                                            <p className="text-xs text-[#6b6b6b]">{user?.email}</p>
                                        </div>
                                        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded text-yellow-400 text-xs">
                                            <Crown size={12} />
                                            Owner
                                        </div>
                                    </div>

                                    {/* Members */}
                                    {members.filter(m => m.user_id !== user?.id).map((member) => (
                                        <div key={member.id} className="flex items-center gap-3 p-3 bg-[#191919] rounded-lg border border-[#373737]">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                                                {member.profile?.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-[#e3e3e3]">{member.profile?.name || 'User'}</p>
                                                <p className="text-xs text-[#6b6b6b]">{member.profile?.email}</p>
                                            </div>
                                            {isOwner ? (
                                                <>
                                                    <select
                                                        value={member.role}
                                                        onChange={(e) => handleUpdateRole(member.user_id, e.target.value as WorkspaceMemberRole)}
                                                        className="bg-[#2a2a2a] border border-[#373737] rounded px-2 py-1 text-xs text-[#e3e3e3] outline-none"
                                                    >
                                                        {ROLE_OPTIONS.map(role => (
                                                            <option key={role.value} value={role.value}>{role.label}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={() => handleRemoveMember(member.id, member.user_id)}
                                                        className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                                        title="Remove member"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-xs text-[#6b6b6b] capitalize">{member.role}</span>
                                            )}
                                        </div>
                                    ))}

                                    {members.length === 0 && (
                                        <p className="text-sm text-[#6b6b6b] text-center py-4">
                                            No team members yet. Invite someone to collaborate!
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Share Links (for public visibility) */}
                    {visibility === 'public' && isAuthenticated && isOwner && (
                        <div>
                            <h3 className="text-sm font-medium text-[#9b9b9b] mb-3 flex items-center gap-2">
                                <Link2 size={16} />
                                Share Links
                            </h3>
                            
                            {/* Create new link form */}
                            <div className="p-3 bg-[#191919] rounded-lg border border-[#373737] mb-3">
                                <div className="flex items-center gap-2 mb-3">
                                    <select
                                        value={newLinkExpiry}
                                        onChange={(e) => setNewLinkExpiry(e.target.value)}
                                        className="flex-1 bg-[#2a2a2a] border border-[#373737] rounded-lg px-3 py-2 text-sm text-[#e3e3e3] outline-none"
                                    >
                                        <option value="never">Never expires</option>
                                        <option value="1h">Expires in 1 hour</option>
                                        <option value="24h">Expires in 24 hours</option>
                                        <option value="7d">Expires in 7 days</option>
                                        <option value="30d">Expires in 30 days</option>
                                    </select>
                                    <label className="flex items-center gap-2 text-sm text-[#9b9b9b]">
                                        <input
                                            type="checkbox"
                                            checked={newLinkAllowEdit}
                                            onChange={(e) => setNewLinkAllowEdit(e.target.checked)}
                                            className="rounded border-[#373737] bg-[#2a2a2a]"
                                        />
                                        Allow edit
                                    </label>
                                </div>
                                <button
                                    onClick={handleCreateShareLink}
                                    disabled={isCreatingLink}
                                    className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isCreatingLink ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <><Plus size={16} />Create Share Link</>
                                    )}
                                </button>
                            </div>

                            {/* Existing links */}
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {shareLinks.length === 0 ? (
                                    <p className="text-sm text-[#6b6b6b] text-center py-4">
                                        No share links yet. Create one to share this workspace.
                                    </p>
                                ) : (
                                    shareLinks.map(link => {
                                        const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date()
                                        return (
                                            <div 
                                                key={link.id} 
                                                className={`p-3 bg-[#191919] rounded-lg border ${
                                                    !link.isActive || isExpired 
                                                        ? 'border-red-500/30 opacity-60' 
                                                        : 'border-[#373737]'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Link2 size={14} className={!link.isActive || isExpired ? 'text-red-400' : 'text-blue-400'} />
                                                        <span className="text-xs font-mono text-[#6b6b6b]">
                                                            ...{link.token.slice(-8)}
                                                        </span>
                                                        {link.allowEdit && (
                                                            <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                                                                Can edit
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {link.isActive && !isExpired && (
                                                            <button
                                                                onClick={() => copyShareLink(link.token, link.id)}
                                                                className="p-1.5 text-[#6b6b6b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] rounded transition-colors"
                                                                title="Copy link"
                                                            >
                                                                {copiedLinkId === link.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                                            </button>
                                                        )}
                                                        {link.isActive && !isExpired && (
                                                            <button
                                                                onClick={() => handleRevokeLink(link.id)}
                                                                className="p-1.5 text-[#6b6b6b] hover:text-yellow-400 hover:bg-yellow-500/10 rounded transition-colors"
                                                                title="Revoke link"
                                                            >
                                                                <Ban size={14} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteLink(link.id)}
                                                            className="p-1.5 text-[#6b6b6b] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                            title="Delete link"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-[#6b6b6b]">
                                                    <Clock size={12} />
                                                    <span className={isExpired ? 'text-red-400' : ''}>
                                                        {!link.isActive ? 'Revoked' : formatExpiry(link.expiresAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* Error/Success messages */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}
                    {success && (
                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <p className="text-sm text-green-400">{success}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
