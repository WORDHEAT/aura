import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Camera, Loader2, Check, User, Send, Bell, ExternalLink, Lock, Globe, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

interface ProfileModalProps {
    isOpen: boolean
    onClose: () => void
}

// Common timezones
const TIMEZONES = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'Eastern Time (US)' },
    { value: 'America/Chicago', label: 'Central Time (US)' },
    { value: 'America/Denver', label: 'Mountain Time (US)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Central European Time' },
    { value: 'Europe/Moscow', label: 'Moscow Time' },
    { value: 'Asia/Dubai', label: 'Dubai (Gulf Standard)' },
    { value: 'Asia/Kolkata', label: 'India Standard Time' },
    { value: 'Asia/Singapore', label: 'Singapore Time' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time' },
    { value: 'Asia/Shanghai', label: 'China Standard Time' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time' },
]

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const { user, updateProfile } = useAuth()
    const [name, setName] = useState(user?.name || '')
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '')
    const [telegramChatId, setTelegramChatId] = useState('')
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
    const [isUploading, setIsUploading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    
    // Password change states
    const [showPasswordSection, setShowPasswordSection] = useState(false)
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [isChangingPassword, setIsChangingPassword] = useState(false)
    const [passwordError, setPasswordError] = useState<string | null>(null)
    
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Fetch existing profile data including telegram and timezone
    useEffect(() => {
        if (isOpen && user) {
            fetchProfile()
        }
    }, [isOpen, user])

    const fetchProfile = async () => {
        if (!user) return
        const { data } = await supabase
            .from('profiles')
            .select('telegram_chat_id, timezone')
            .eq('id', user.id)
            .single()
        
        if (data?.telegram_chat_id) {
            setTelegramChatId(data.telegram_chat_id)
        }
        if (data?.timezone) {
            setTimezone(data.timezone)
        }
    }

    const handleChangePassword = async () => {
        setPasswordError(null)
        
        if (newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters')
            return
        }
        
        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match')
            return
        }
        
        setIsChangingPassword(true)
        
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            })
            
            if (error) throw error
            
            setNewPassword('')
            setConfirmPassword('')
            setShowPasswordSection(false)
            setSuccess(true)
            
            setTimeout(() => setSuccess(false), 3000)
        } catch (err) {
            console.error('Password change error:', err)
            setPasswordError('Failed to change password. Please try again.')
        } finally {
            setIsChangingPassword(false)
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
                    telegram_chat_id: telegramChatId.trim() || null,
                    timezone: timezone
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

    return createPortal(
        <div className="fixed inset-0 z-[50000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#202020] border border-[#373737] rounded-xl shadow-2xl w-full max-w-md m-4 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#373737]">
                    <h2 className="text-lg font-semibold text-[#e3e3e3]">Profile</h2>
                    <button 
                        onClick={onClose}
                        className="text-[#9b9b9b] hover:text-[#e3e3e3] p-1 rounded hover:bg-[#2a2a2a] transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                {/* Content */}
                <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Avatar Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-[#6b6b6b] uppercase tracking-wider">Avatar</h3>
                        
                        <div className="flex items-center gap-4 px-3 py-3 bg-[#252525] border border-[#373737] rounded-lg">
                            <div className="relative group">
                                {avatarUrl ? (
                                    <img 
                                        src={avatarUrl} 
                                        alt="Avatar" 
                                        className="w-14 h-14 rounded-full object-cover border-2 border-[#373737]"
                                    />
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-semibold border-2 border-[#373737]">
                                        {name?.charAt(0).toUpperCase() || <User size={24} />}
                                    </div>
                                )}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    {isUploading ? (
                                        <Loader2 size={18} className="text-white animate-spin" />
                                    ) : (
                                        <Camera size={18} className="text-white" />
                                    )}
                                </button>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-[#e3e3e3]">{name || 'No name set'}</p>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    Change photo
                                </button>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                className="hidden"
                            />
                        </div>
                    </div>

                    {/* Account Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-[#6b6b6b] uppercase tracking-wider">Account</h3>
                        
                        <div className="space-y-3">
                            <div className="px-3 py-2 bg-[#252525] border border-[#373737] rounded-lg">
                                <label className="text-xs text-[#6b6b6b]">Display Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name"
                                    className="w-full bg-transparent text-sm text-[#e3e3e3] placeholder-[#6b6b6b] outline-none mt-1"
                                />
                            </div>

                            <div className="px-3 py-2 bg-[#252525] border border-[#373737] rounded-lg opacity-60">
                                <label className="text-xs text-[#6b6b6b]">Email</label>
                                <p className="text-sm text-[#9b9b9b] mt-1">{user?.email || ''}</p>
                            </div>
                        </div>
                    </div>

                    {/* Telegram Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-[#6b6b6b] uppercase tracking-wider">Notifications</h3>
                        
                        <div className="flex items-center justify-between px-3 py-2 bg-[#252525] border border-[#373737] rounded-lg">
                            <div className="flex items-center gap-3">
                                <Send size={18} className={telegramChatId ? "text-blue-400" : "text-[#9b9b9b]"} />
                                <div className="flex flex-col">
                                    <span className="text-sm text-[#e3e3e3]">Telegram</span>
                                    <span className="text-xs text-[#6b6b6b]">Get reminder alerts</span>
                                </div>
                            </div>
                            <a 
                                href="https://t.me/AuraTableBot" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                <ExternalLink size={12} />
                                Setup
                            </a>
                        </div>

                        <div className="px-3 py-2 bg-[#252525] border border-[#373737] rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                                <Bell size={14} className="text-[#6b6b6b]" />
                                <label className="text-xs text-[#6b6b6b]">Telegram Chat ID</label>
                            </div>
                            <input
                                type="text"
                                value={telegramChatId}
                                onChange={(e) => setTelegramChatId(e.target.value)}
                                placeholder="e.g., 123456789"
                                className="w-full bg-transparent text-sm text-[#e3e3e3] placeholder-[#6b6b6b] outline-none"
                            />
                        </div>
                    </div>

                    {/* Timezone Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-[#6b6b6b] uppercase tracking-wider">Regional</h3>
                        
                        <div className="px-3 py-2 bg-[#252525] border border-[#373737] rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Globe size={14} className="text-[#6b6b6b]" />
                                <label className="text-xs text-[#6b6b6b]">Timezone</label>
                            </div>
                            <select
                                value={timezone}
                                onChange={(e) => setTimezone(e.target.value)}
                                className="w-full bg-[#2a2a2a] text-sm text-[#e3e3e3] rounded px-2 py-1.5 border border-[#373737] outline-none focus:border-blue-500 cursor-pointer"
                            >
                                {TIMEZONES.map(tz => (
                                    <option key={tz.value} value={tz.value} className="bg-[#2a2a2a]">
                                        {tz.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Security Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-[#6b6b6b] uppercase tracking-wider">Security</h3>
                        
                        {!showPasswordSection ? (
                            <button
                                onClick={() => setShowPasswordSection(true)}
                                className="flex items-center gap-3 w-full px-3 py-2 bg-[#252525] border border-[#373737] rounded-lg hover:bg-[#2a2a2a] transition-colors"
                            >
                                <Lock size={18} className="text-[#9b9b9b]" />
                                <div className="flex flex-col items-start">
                                    <span className="text-sm text-[#e3e3e3]">Change Password</span>
                                    <span className="text-xs text-[#6b6b6b]">Update your account password</span>
                                </div>
                            </button>
                        ) : (
                            <div className="space-y-3 px-3 py-3 bg-[#252525] border border-[#373737] rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Lock size={16} className="text-blue-400" />
                                        <span className="text-sm text-[#e3e3e3]">Change Password</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowPasswordSection(false)
                                            setNewPassword('')
                                            setConfirmPassword('')
                                            setPasswordError(null)
                                        }}
                                        className="text-[#6b6b6b] hover:text-[#e3e3e3]"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="relative">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="New password"
                                        className="w-full bg-[#2a2a2a] text-sm text-[#e3e3e3] placeholder-[#6b6b6b] rounded px-3 py-2 pr-10 border border-[#373737] outline-none focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6b6b6b] hover:text-[#e3e3e3]"
                                    >
                                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>

                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    className="w-full bg-[#2a2a2a] text-sm text-[#e3e3e3] placeholder-[#6b6b6b] rounded px-3 py-2 border border-[#373737] outline-none focus:border-blue-500"
                                />

                                {passwordError && (
                                    <p className="text-xs text-red-400">{passwordError}</p>
                                )}

                                <button
                                    onClick={handleChangePassword}
                                    disabled={isChangingPassword || !newPassword || !confirmPassword}
                                    className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-2"
                                >
                                    {isChangingPassword ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            Changing...
                                        </>
                                    ) : (
                                        'Update Password'
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Status Messages */}
                    {error && (
                        <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center gap-2">
                            <Check size={14} />
                            Profile updated successfully!
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="flex gap-3 p-4 border-t border-[#373737] bg-[#252525]">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-sm font-medium text-[#9b9b9b] hover:text-[#e3e3e3] hover:bg-[#2a2a2a] rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
