import { useState, useRef, useEffect } from 'react'
import { X, Camera, Loader2, Check, User, Send, Bell, ExternalLink } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

interface ProfileModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const { user, updateProfile } = useAuth()
    const [name, setName] = useState(user?.name || '')
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '')
    const [telegramChatId, setTelegramChatId] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Fetch existing profile data including telegram
    useEffect(() => {
        if (isOpen && user) {
            fetchProfile()
        }
    }, [isOpen, user])

    const fetchProfile = async () => {
        if (!user) return
        const { data } = await supabase
            .from('profiles')
            .select('telegram_chat_id')
            .eq('id', user.id)
            .single()
        
        if (data?.telegram_chat_id) {
            setTelegramChatId(data.telegram_chat_id)
        }
    }

    if (!isOpen) return null

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !user) return

        setIsUploading(true)
        setError(null)

        try {
            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}-${Date.now()}.${fileExt}`
            const filePath = `avatars/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true })

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            setAvatarUrl(publicUrl)
        } catch (err) {
            console.error('Avatar upload error:', err)
            setError('Failed to upload avatar. Try a smaller image.')
        } finally {
            setIsUploading(false)
        }
    }

    const handleSave = async () => {
        if (!user) return

        setIsSaving(true)
        setError(null)

        try {
            // Update profiles table in Supabase
            const { error: dbError } = await supabase
                .from('profiles')
                .update({
                    name: name.trim() || user.email?.split('@')[0],
                    avatar_url: avatarUrl || null,
                    telegram_chat_id: telegramChatId.trim() || null
                })
                .eq('id', user.id)

            if (dbError) throw dbError

            // Update auth context
            await updateProfile({
                name: name.trim() || user.email?.split('@')[0],
                avatarUrl: avatarUrl || undefined
            })

            setSuccess(true)
            
            setTimeout(() => {
                setSuccess(false)
                onClose()
            }, 1500)
        } catch (err) {
            console.error('Profile update error:', err)
            setError('Failed to update profile')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal - Full screen on mobile, centered card on desktop */}
            <div className="relative bg-[#191919] sm:bg-[#202020] border-t sm:border border-[#373737] sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[95vh] sm:max-h-[85vh] flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
                {/* Header - Sticky */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#373737] bg-[#191919] sm:bg-[#202020]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <User size={16} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-semibold text-white">Edit Profile</h2>
                            <p className="text-xs text-[#6b6b6b] hidden sm:block">Manage your account settings</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-[#6b6b6b] hover:text-white hover:bg-[#2a2a2a] rounded-xl transition-all active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                    <div className="p-4 sm:p-6 space-y-5">
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center py-2">
                            <div className="relative group">
                                <div className="relative">
                                    {avatarUrl ? (
                                        <img 
                                            src={avatarUrl} 
                                            alt="Avatar" 
                                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-[#373737] ring-offset-2 ring-offset-[#191919]"
                                        />
                                    ) : (
                                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl sm:text-3xl font-semibold ring-4 ring-[#373737] ring-offset-2 ring-offset-[#191919]">
                                            {name?.charAt(0).toUpperCase() || <User size={32} />}
                                        </div>
                                    )}
                                    
                                    {/* Camera overlay */}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
                                    >
                                        {isUploading ? (
                                            <Loader2 size={24} className="text-white animate-spin" />
                                        ) : (
                                            <Camera size={24} className="text-white" />
                                        )}
                                    </button>
                                    
                                    {/* Edit badge */}
                                    <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center border-2 border-[#191919] shadow-lg">
                                        <Camera size={12} className="text-white" />
                                    </div>
                                </div>
                                
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    className="hidden"
                                />
                            </div>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                Change photo
                            </button>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-medium text-[#9b9b9b] uppercase tracking-wide mb-2">
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name"
                                    className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#373737] rounded-xl text-white placeholder-[#6b6b6b] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                                />
                            </div>

                            {/* Email (read-only) */}
                            <div>
                                <label className="block text-xs font-medium text-[#9b9b9b] uppercase tracking-wide mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-[#6b6b6b] cursor-not-allowed"
                                />
                                <p className="mt-1.5 text-xs text-[#6b6b6b] flex items-center gap-1">
                                    <span className="w-1 h-1 bg-[#6b6b6b] rounded-full"></span>
                                    Email cannot be changed
                                </p>
                            </div>
                        </div>

                        {/* Telegram Section */}
                        <div className="p-4 bg-gradient-to-br from-[#1a1a1a] to-[#1f1f1f] border border-[#373737] rounded-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                    <Send size={18} className="text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-white">Telegram Notifications</h3>
                                    <p className="text-xs text-[#6b6b6b]">Get reminders on your phone</p>
                                </div>
                            </div>
                            
                            <a 
                                href="https://t.me/AuraTableBot" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-medium rounded-xl transition-all active:scale-[0.98]"
                            >
                                <ExternalLink size={16} />
                                Open @AuraTableBot
                            </a>
                            
                            <div className="mt-4">
                                <label className="block text-xs font-medium text-[#9b9b9b] uppercase tracking-wide mb-2">
                                    Chat ID
                                </label>
                                <input
                                    type="text"
                                    value={telegramChatId}
                                    onChange={(e) => setTelegramChatId(e.target.value)}
                                    placeholder="e.g., 123456789"
                                    className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#373737] rounded-xl text-white placeholder-[#6b6b6b] text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                                />
                                <p className="mt-2 text-xs text-[#6b6b6b] flex items-center gap-1.5">
                                    <Bell size={12} className="text-blue-400" />
                                    Get your ID from @userinfobot on Telegram
                                </p>
                            </div>
                        </div>

                        {/* Status Messages */}
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <X size={12} />
                                </div>
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                    <Check size={12} />
                                </div>
                                Profile updated successfully!
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer - Sticky */}
                <div className="sticky bottom-0 flex gap-3 px-4 sm:px-6 py-4 border-t border-[#373737] bg-[#191919] sm:bg-[#1a1a1a]">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 text-sm font-medium text-[#e3e3e3] bg-[#2a2a2a] hover:bg-[#333] rounded-xl transition-all active:scale-[0.98]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
