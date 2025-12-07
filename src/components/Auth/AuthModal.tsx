import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Mail, Lock, User, Eye, EyeOff, Loader2, Github, Chrome } from 'lucide-react'

interface AuthModalProps {
    isOpen: boolean
    onClose: () => void
    onSignIn: (email: string, password: string) => Promise<void>
    onSignUp: (email: string, password: string, name: string) => Promise<void>
    onGoogleSignIn?: () => Promise<void>
    onGithubSignIn?: () => Promise<void>
}

export function AuthModal({ isOpen, onClose, onSignIn, onSignUp, onGoogleSignIn, onGithubSignIn }: AuthModalProps) {
    const [mode, setMode] = useState<'signin' | 'signup'>('signin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [name, setName] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            if (mode === 'signin') {
                await onSignIn(email, password)
            } else {
                if (!name.trim()) {
                    setError('Please enter your name')
                    setLoading(false)
                    return
                }
                if (password !== confirmPassword) {
                    setError('Passwords do not match')
                    setLoading(false)
                    return
                }
                await onSignUp(email, password, name)
            }
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleSocialSignIn = async (provider: 'google' | 'github') => {
        setError(null)
        setLoading(true)
        try {
            if (provider === 'google' && onGoogleSignIn) {
                await onGoogleSignIn()
            } else if (provider === 'github' && onGithubSignIn) {
                await onGithubSignIn()
            }
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const switchMode = () => {
        setMode(mode === 'signin' ? 'signup' : 'signin')
        setError(null)
        setConfirmPassword('')
    }

    return createPortal(
        <div className="fixed inset-0 z-[50000] flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md mx-4 bg-[#202020] border border-[#373737] rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#373737]">
                    <div>
                        <h2 className="text-xl font-semibold text-[#e3e3e3]">
                            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
                        </h2>
                        <p className="text-sm text-[#9b9b9b] mt-0.5">
                            {mode === 'signin' 
                                ? 'Sign in to access your workspaces' 
                                : 'Join Aura to collaborate with your team'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[#6b6b6b] hover:text-[#e3e3e3] p-2 rounded-lg hover:bg-[#2a2a2a] transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Social Login Buttons */}
                    <div className="flex gap-3 mb-6">
                        {onGoogleSignIn && (
                            <button
                                onClick={() => handleSocialSignIn('google')}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2a2a2a] hover:bg-[#333] border border-[#373737] rounded-lg text-[#e3e3e3] transition-colors disabled:opacity-50"
                            >
                                <Chrome size={18} />
                                <span className="text-sm font-medium">Google</span>
                            </button>
                        )}
                        {onGithubSignIn && (
                            <button
                                onClick={() => handleSocialSignIn('github')}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2a2a2a] hover:bg-[#333] border border-[#373737] rounded-lg text-[#e3e3e3] transition-colors disabled:opacity-50"
                            >
                                <Github size={18} />
                                <span className="text-sm font-medium">GitHub</span>
                            </button>
                        )}
                    </div>

                    {(onGoogleSignIn || onGithubSignIn) && (
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex-1 h-px bg-[#373737]" />
                            <span className="text-xs text-[#6b6b6b] uppercase tracking-wider">or continue with email</span>
                            <div className="flex-1 h-px bg-[#373737]" />
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'signup' && (
                            <div>
                                <label className="block text-sm font-medium text-[#9b9b9b] mb-1.5">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b6b]" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="John Doe"
                                        className="w-full pl-10 pr-4 py-2.5 bg-[#191919] border border-[#373737] rounded-lg text-[#e3e3e3] placeholder-[#6b6b6b] outline-none focus:border-blue-500 transition-colors"
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-[#9b9b9b] mb-1.5">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b6b]" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#191919] border border-[#373737] rounded-lg text-[#e3e3e3] placeholder-[#6b6b6b] outline-none focus:border-blue-500 transition-colors"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#9b9b9b] mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b6b]" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-12 py-2.5 bg-[#191919] border border-[#373737] rounded-lg text-[#e3e3e3] placeholder-[#6b6b6b] outline-none focus:border-blue-500 transition-colors"
                                    required
                                    minLength={6}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6b6b] hover:text-[#9b9b9b] transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {mode === 'signup' && (
                                <p className="text-xs text-[#6b6b6b] mt-1.5">
                                    Must be at least 6 characters
                                </p>
                            )}
                        </div>

                        {mode === 'signup' && (
                            <div>
                                <label className="block text-sm font-medium text-[#9b9b9b] mb-1.5">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b6b]" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-10 pr-12 py-2.5 bg-[#191919] border border-[#373737] rounded-lg text-[#e3e3e3] placeholder-[#6b6b6b] outline-none focus:border-blue-500 transition-colors"
                                        required
                                        minLength={6}
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6b6b] hover:text-[#9b9b9b] transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {password && confirmPassword && password !== confirmPassword && (
                                    <p className="text-xs text-red-400 mt-1.5">
                                        Passwords do not match
                                    </p>
                                )}
                            </div>
                        )}

                        {mode === 'signin' && (
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>{mode === 'signin' ? 'Signing in...' : 'Creating account...'}</span>
                                </>
                            ) : (
                                <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[#373737] text-center">
                    <p className="text-sm text-[#9b9b9b]">
                        {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                        <button
                            onClick={switchMode}
                            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                            {mode === 'signin' ? 'Sign up' : 'Sign in'}
                        </button>
                    </p>
                </div>
            </div>
        </div>,
        document.body
    )
}
