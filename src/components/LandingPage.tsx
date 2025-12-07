import { useState } from 'react'
import { 
    Table2, FileText, Cloud, Users, Calendar, Bell, 
    ChevronRight, Sparkles, Zap,
    CheckCircle2, ArrowRight, Menu, X
} from 'lucide-react'

interface LandingPageProps {
    onGetStarted: () => void
    onSignIn: () => void
}

export function LandingPage({ onGetStarted, onSignIn }: LandingPageProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
            {/* Animated background gradient */}
            <div className="fixed inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20 pointer-events-none" />
            <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Navigation */}
            <nav className="relative z-50 border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 sm:h-20">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                                Aura
                            </span>
                        </div>

                        {/* Desktop nav */}
                        <div className="hidden md:flex items-center gap-8">
                            <a href="#features" className="text-sm text-white/60 hover:text-white transition-colors">Features</a>
                            <a href="#pricing" className="text-sm text-white/60 hover:text-white transition-colors">Pricing</a>
                        </div>

                        <div className="hidden md:flex items-center gap-4">
                            <button
                                onClick={onSignIn}
                                className="text-sm text-white/80 hover:text-white transition-colors"
                            >
                                Sign In
                            </button>
                            <button
                                onClick={onGetStarted}
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-medium rounded-lg transition-all hover:shadow-lg hover:shadow-blue-500/25"
                            >
                                Get Started Free
                            </button>
                        </div>

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 text-white/60 hover:text-white"
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden absolute top-full left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-lg border-b border-white/5 p-4 space-y-4">
                        <a href="#features" className="block text-white/60 hover:text-white py-2">Features</a>
                        <a href="#pricing" className="block text-white/60 hover:text-white py-2">Pricing</a>
                        <div className="pt-4 border-t border-white/10 space-y-3">
                            <button onClick={onSignIn} className="block w-full text-left text-white/80 py-2">Sign In</button>
                            <button onClick={onGetStarted} className="block w-full px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-lg text-center">
                                Get Started Free
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="relative pt-20 sm:pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs sm:text-sm text-white/70 mb-6 sm:mb-8">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        Now with Cloud Sync & Collaboration
                    </div>

                    {/* Main heading */}
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-6 sm:mb-8">
                        <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                            Your Tables,
                        </span>
                        <br />
                        <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Your Time
                        </span>
                    </h1>

                    {/* Subtitle */}
                    <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed px-4">
                        A beautiful, modern workspace for organizing your data. 
                        Create tables, write notes, and collaborate with your team — all in one place.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={onGetStarted}
                            className="w-full sm:w-auto group px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all hover:shadow-xl hover:shadow-purple-500/20 flex items-center justify-center gap-2"
                        >
                            Start for Free
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={onSignIn}
                            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-all"
                        >
                            Sign In
                        </button>
                    </div>

                    {/* Trust indicators */}
                    <div className="mt-12 sm:mt-16 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-white/30 text-sm">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-400" />
                            <span>Free forever plan</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-400" />
                            <span>No credit card required</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-400" />
                            <span>Cloud sync included</span>
                        </div>
                    </div>
                </div>

                {/* App Preview */}
                <div className="mt-16 sm:mt-24 max-w-6xl mx-auto">
                    <div className="relative">
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-3xl opacity-50" />
                        
                        {/* Preview container */}
                        <div className="relative bg-[#191919] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                            {/* Browser chrome */}
                            <div className="flex items-center gap-2 px-4 py-3 bg-[#0d0d0d] border-b border-white/5">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                </div>
                                <div className="flex-1 mx-4">
                                    <div className="max-w-md mx-auto px-4 py-1.5 bg-white/5 rounded-lg text-xs text-white/30 text-center">
                                        app.aura.dev
                                    </div>
                                </div>
                            </div>
                            
                            {/* App content mockup */}
                            <div className="p-4 sm:p-8 min-h-[300px] sm:min-h-[400px]">
                                <div className="grid grid-cols-12 gap-4 h-full">
                                    {/* Sidebar */}
                                    <div className="col-span-3 bg-[#202020] rounded-xl p-4 hidden sm:block">
                                        <div className="flex items-center gap-2 mb-6">
                                            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600" />
                                            <span className="font-medium text-sm">Workspaces</span>
                                        </div>
                                        <div className="space-y-2">
                                            {['My Projects', 'Work Tasks', 'Personal'].map((item, i) => (
                                                <div key={i} className={`px-3 py-2 rounded-lg text-sm ${i === 0 ? 'bg-blue-500/20 text-blue-400' : 'text-white/40'}`}>
                                                    {item}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Main content */}
                                    <div className="col-span-12 sm:col-span-9 bg-[#202020] rounded-xl p-4 sm:p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="font-semibold text-lg">Project Tasks</h3>
                                            <div className="flex gap-2">
                                                <div className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs">+ Add Row</div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {[
                                                { task: 'Design landing page', status: 'Done', priority: 'High' },
                                                { task: 'Build API endpoints', status: 'In Progress', priority: 'Medium' },
                                                { task: 'Write documentation', status: 'To Do', priority: 'Low' },
                                            ].map((row, i) => (
                                                <div key={i} className="flex items-center gap-4 px-4 py-3 bg-[#191919] rounded-lg text-sm">
                                                    <span className="flex-1 text-white/80">{row.task}</span>
                                                    <span className={`px-2 py-1 rounded text-xs ${
                                                        row.status === 'Done' ? 'bg-green-500/20 text-green-400' :
                                                        row.status === 'In Progress' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-white/10 text-white/40'
                                                    }`}>{row.status}</span>
                                                    <span className={`px-2 py-1 rounded text-xs ${
                                                        row.priority === 'High' ? 'bg-red-500/20 text-red-400' :
                                                        row.priority === 'Medium' ? 'bg-orange-500/20 text-orange-400' :
                                                        'bg-white/10 text-white/40'
                                                    }`}>{row.priority}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12 sm:mb-20">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
                            <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                                Everything you need
                            </span>
                        </h2>
                        <p className="text-lg sm:text-xl text-white/40 max-w-2xl mx-auto">
                            Powerful features to help you organize, collaborate, and get things done.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {[
                            {
                                icon: Table2,
                                title: 'Smart Tables',
                                description: 'Create beautiful tables with multiple column types, sorting, filtering, and summaries.',
                                color: 'blue'
                            },
                            {
                                icon: FileText,
                                title: 'Rich Notes',
                                description: 'Write notes with Markdown support, syntax highlighting, and live preview.',
                                color: 'green'
                            },
                            {
                                icon: Cloud,
                                title: 'Cloud Sync',
                                description: 'Your data syncs automatically across all your devices in real-time.',
                                color: 'purple'
                            },
                            {
                                icon: Users,
                                title: 'Collaboration',
                                description: 'Share workspaces with your team and work together seamlessly.',
                                color: 'pink'
                            },
                            {
                                icon: Calendar,
                                title: 'Calendar View',
                                description: 'Visualize your tasks and reminders in a beautiful calendar interface.',
                                color: 'orange'
                            },
                            {
                                icon: Bell,
                                title: 'Reminders',
                                description: 'Set reminders and get notified via browser or Telegram.',
                                color: 'cyan'
                            },
                        ].map((feature, i) => (
                            <div 
                                key={i}
                                className="group p-6 sm:p-8 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300"
                            >
                                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-${feature.color}-500/10 flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform`}>
                                    <feature.icon className={`w-6 h-6 sm:w-7 sm:h-7 text-${feature.color}-400`} />
                                </div>
                                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">{feature.title}</h3>
                                <p className="text-sm sm:text-base text-white/40 leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-y border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
                        {[
                            { value: '10+', label: 'Column Types' },
                            { value: '∞', label: 'Tables & Notes' },
                            { value: '100%', label: 'Free Forever' },
                            { value: '< 1s', label: 'Sync Speed' },
                        ].map((stat, i) => (
                            <div key={i} className="text-center">
                                <div className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                                    {stat.value}
                                </div>
                                <div className="text-sm sm:text-base text-white/40">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12 sm:mb-16">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
                            <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                                Simple pricing
                            </span>
                        </h2>
                        <p className="text-lg sm:text-xl text-white/40">
                            Start free, upgrade when you need more.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
                        {/* Free Plan */}
                        <div className="p-6 sm:p-8 bg-white/[0.02] border border-white/10 rounded-2xl">
                            <div className="text-white/60 text-sm font-medium mb-2">Free</div>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl sm:text-5xl font-bold">$0</span>
                                <span className="text-white/40">/month</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                {[
                                    'Unlimited tables & notes',
                                    'Cloud sync',
                                    'All column types',
                                    'Calendar view',
                                    'Browser reminders',
                                    'Share workspaces',
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm sm:text-base text-white/60">
                                        <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={onGetStarted}
                                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-colors"
                            >
                                Get Started
                            </button>
                        </div>

                        {/* Pro Plan */}
                        <div className="relative p-6 sm:p-8 bg-gradient-to-b from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-xs font-medium">
                                Coming Soon
                            </div>
                            <div className="text-blue-400 text-sm font-medium mb-2">Pro</div>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl sm:text-5xl font-bold">$9</span>
                                <span className="text-white/40">/month</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                {[
                                    'Everything in Free',
                                    'Priority support',
                                    'Advanced analytics',
                                    'API access',
                                    'Custom branding',
                                    'Team management',
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm sm:text-base text-white/60">
                                        <CheckCircle2 size={18} className="text-blue-400 flex-shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <button
                                disabled
                                className="w-full py-3 bg-white/10 text-white/50 font-medium rounded-xl cursor-not-allowed"
                            >
                                Coming Soon
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-6 sm:mb-8">
                        <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
                        <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                            Ready to get started?
                        </span>
                    </h2>
                    <p className="text-lg sm:text-xl text-white/40 mb-8 sm:mb-10 max-w-xl mx-auto">
                        Join thousands of users who organize their work with Aura.
                    </p>
                    <button
                        onClick={onGetStarted}
                        className="group px-8 sm:px-10 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all hover:shadow-xl hover:shadow-purple-500/20 inline-flex items-center gap-2"
                    >
                        Start for Free
                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-t border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-lg font-semibold">Aura</span>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-white/40">
                            <span>Made with ❤️</span>
                        </div>

                        <div className="text-sm text-white/30">
                            © {new Date().getFullYear()} Aura. All rights reserved.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
