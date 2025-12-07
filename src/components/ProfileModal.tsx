import { useState, useRef } from 'react'
import { X, Camera, Loader2, Check, User } from 'lucide-react'
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
    const [isUploading, setIsUploading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

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
                    avatar_url: avatarUrl || null
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-[#202020] border border-[#373737] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#373737]">
                    <h2 className="text-lg font-semibold text-white">Edit Profile</h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-[#6b6b6b] hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Avatar */}
                    <div className="flex flex-col items-center">
                        <div className="relative group">
                            {avatarUrl ? (
                                <img 
                                    src={avatarUrl} 
                                    alt="Avatar" 
                                    className="w-24 h-24 rounded-full object-cover border-2 border-[#373737]"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-3xl font-medium">
                                    {name?.charAt(0).toUpperCase() || <User size={40} />}
                                </div>
                            )}
                            
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                {isUploading ? (
                                    <Loader2 size={24} className="text-white animate-spin" />
                                ) : (
                                    <Camera size={24} className="text-white" />
                                )}
                            </button>
                            
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                className="hidden"
                            />
                        </div>
                        <p className="mt-2 text-xs text-[#6b6b6b]">Click to change avatar</p>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-[#9b9b9b] mb-2">
                            Display Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            className="w-full px-4 py-3 bg-[#2a2a2a] border border-[#373737] rounded-lg text-white placeholder-[#6b6b6b] outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    {/* Email (read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-[#9b9b9b] mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#373737] rounded-lg text-[#6b6b6b] cursor-not-allowed"
                        />
                        <p className="mt-1 text-xs text-[#6b6b6b]">Email cannot be changed</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Success */}
                    {success && (
                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center gap-2">
                            <Check size={16} />
                            Profile updated successfully!
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-[#373737] bg-[#1a1a1a]">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-sm text-[#e3e3e3] hover:bg-[#2a2a2a] rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
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
