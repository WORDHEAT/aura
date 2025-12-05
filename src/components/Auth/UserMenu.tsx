import { useState, useRef, useEffect } from 'react'
import { User, LogOut, Settings, ChevronDown, UserCircle, Crown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

interface UserMenuProps {
    onOpenSettings?: () => void
    onOpenAuth: () => void
}

export function UserMenu({ onOpenSettings, onOpenAuth }: UserMenuProps) {
    const { user, isAuthenticated, signOut, isLoading } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSignOut = async () => {
        setIsOpen(false)
        await signOut()
    }

    // Not authenticated - show sign in button
    if (!isAuthenticated) {
        return (
            <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
                <User size={16} />
                <span>Sign In</span>
            </button>
        )
    }

    // Authenticated - show user menu
    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoading}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#2a2a2a] transition-colors group"
            >
                {user?.avatarUrl ? (
                    <img 
                        src={user.avatarUrl} 
                        alt={user.name} 
                        className="w-7 h-7 rounded-full object-cover border border-[#373737]"
                    />
                ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                )}
                <span className="text-sm text-[#e3e3e3] hidden sm:block max-w-[100px] truncate">
                    {user?.name || 'User'}
                </span>
                <ChevronDown 
                    size={14} 
                    className={`text-[#6b6b6b] group-hover:text-[#9b9b9b] transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-[#202020] border border-[#373737] rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-[#373737]">
                        <div className="flex items-center gap-3">
                            {user?.avatarUrl ? (
                                <img 
                                    src={user.avatarUrl} 
                                    alt={user.name} 
                                    className="w-10 h-10 rounded-full object-cover border border-[#373737]"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#e3e3e3] truncate">
                                    {user?.name}
                                </p>
                                <p className="text-xs text-[#6b6b6b] truncate">
                                    {user?.email}
                                </p>
                            </div>
                        </div>
                        {/* Plan Badge */}
                        <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-[#2a2a2a] rounded-md w-fit">
                            <Crown size={12} className="text-yellow-500" />
                            <span className="text-xs text-[#9b9b9b]">Free Plan</span>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                        <button
                            onClick={() => {
                                setIsOpen(false)
                                // TODO: Open profile settings
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors"
                        >
                            <UserCircle size={16} className="text-[#6b6b6b]" />
                            <span>Profile</span>
                        </button>
                        
                        {onOpenSettings && (
                            <button
                                onClick={() => {
                                    setIsOpen(false)
                                    onOpenSettings()
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#e3e3e3] hover:bg-[#2a2a2a] transition-colors"
                            >
                                <Settings size={16} className="text-[#6b6b6b]" />
                                <span>Settings</span>
                            </button>
                        )}
                    </div>

                    {/* Sign Out */}
                    <div className="py-2 border-t border-[#373737]">
                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut size={16} />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
