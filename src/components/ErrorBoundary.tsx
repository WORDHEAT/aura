import React, { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

interface ErrorBoundaryProps {
    children: ReactNode
    fallback?: ReactNode
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
    errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        }
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        this.setState({ errorInfo })
        
        // Log error to console
        console.error('🚨 Error Boundary caught an error:', error)
        console.error('Component stack:', errorInfo.componentStack)
        
        // Call optional error handler
        this.props.onError?.(error, errorInfo)
    }

    handleReload = (): void => {
        window.location.reload()
    }

    handleGoHome = (): void => {
        window.location.href = '/'
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null, errorInfo: null })
    }

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback
            }

            // Default error UI
            return (
                <div className="min-h-screen bg-[#191919] flex items-center justify-center p-4">
                    <div className="bg-[#202020] border border-[#373737] rounded-xl p-8 max-w-lg w-full shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-red-500/10 rounded-lg">
                                <AlertTriangle className="text-red-400" size={28} />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold text-[#e3e3e3]">
                                    Something went wrong
                                </h1>
                                <p className="text-sm text-[#9b9b9b]">
                                    An unexpected error occurred
                                </p>
                            </div>
                        </div>

                        {/* Error details (collapsible) */}
                        <details className="mb-6 group">
                            <summary className="flex items-center gap-2 text-sm text-[#6b6b6b] hover:text-[#9b9b9b] cursor-pointer transition-colors">
                                <Bug size={14} />
                                <span>Show error details</span>
                            </summary>
                            <div className="mt-3 p-3 bg-[#191919] rounded-lg border border-[#373737] overflow-auto max-h-48">
                                <p className="text-red-400 text-sm font-mono mb-2">
                                    {this.state.error?.name}: {this.state.error?.message}
                                </p>
                                {this.state.errorInfo?.componentStack && (
                                    <pre className="text-xs text-[#6b6b6b] whitespace-pre-wrap">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>
                        </details>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={this.handleRetry}
                                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                            >
                                <RefreshCw size={16} />
                                Try Again
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="flex-1 flex items-center justify-center gap-2 bg-[#2a2a2a] hover:bg-[#333] text-[#e3e3e3] px-4 py-2.5 rounded-lg font-medium transition-colors border border-[#373737]"
                            >
                                <RefreshCw size={16} />
                                Reload Page
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="flex-1 flex items-center justify-center gap-2 bg-[#2a2a2a] hover:bg-[#333] text-[#e3e3e3] px-4 py-2.5 rounded-lg font-medium transition-colors border border-[#373737]"
                            >
                                <Home size={16} />
                                Go Home
                            </button>
                        </div>

                        {/* Help text */}
                        <p className="mt-6 text-xs text-[#6b6b6b] text-center">
                            If this problem persists, try clearing your browser cache or contact support.
                        </p>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

// Lightweight error boundary for modals (auto-closes on error)
interface ModalErrorBoundaryProps {
    children: ReactNode
    onClose?: () => void
}

interface ModalErrorBoundaryState {
    hasError: boolean
}

export class ModalErrorBoundary extends Component<ModalErrorBoundaryProps, ModalErrorBoundaryState> {
    constructor(props: ModalErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(): Partial<ModalErrorBoundaryState> {
        return { hasError: true }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('🚨 Error loading modal:', error)
        console.error('Component stack:', errorInfo.componentStack)
    }

    handleClose = (): void => {
        this.setState({ hasError: false })
        this.props.onClose?.()
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-[#202020] border border-[#373737] rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-500/10 rounded-lg">
                                <AlertTriangle className="text-red-400" size={20} />
                            </div>
                            <h3 className="text-lg font-medium text-[#e3e3e3]">
                                Failed to load
                            </h3>
                        </div>
                        <p className="text-sm text-[#9b9b9b] mb-4">
                            This feature couldn't be loaded. Please try again.
                        </p>
                        <button
                            onClick={this.handleClose}
                            className="w-full bg-[#2a2a2a] hover:bg-[#333] text-[#e3e3e3] px-4 py-2 rounded-lg font-medium transition-colors border border-[#373737]"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

// Lightweight error boundary for specific sections
interface SectionErrorBoundaryProps {
    children: ReactNode
    name?: string
}

interface SectionErrorBoundaryState {
    hasError: boolean
}

export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
    constructor(props: SectionErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(): Partial<SectionErrorBoundaryState> {
        return { hasError: true }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error(`🚨 Error in ${this.props.name || 'section'}:`, error)
        console.error('Component stack:', errorInfo.componentStack)
    }

    handleRetry = (): void => {
        this.setState({ hasError: false })
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center p-8 bg-[#202020] border border-[#373737] rounded-lg m-4">
                    <AlertTriangle className="text-yellow-400 mb-3" size={24} />
                    <p className="text-[#9b9b9b] text-sm mb-3">
                        Failed to load {this.props.name || 'this section'}
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                    >
                        <RefreshCw size={14} />
                        Try again
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}
