/**
 * Development-only logger utility
 * Logs are only output in development mode, not in production builds
 */

const isDev = import.meta.env.DEV

export const logger = {
    log: (...args: unknown[]) => {
        if (isDev) console.log(...args)
    },
    info: (...args: unknown[]) => {
        if (isDev) console.info(...args)
    },
    warn: (...args: unknown[]) => {
        if (isDev) console.warn(...args)
    },
    error: (...args: unknown[]) => {
        // Always log errors, even in production
        console.error(...args)
    },
    debug: (...args: unknown[]) => {
        if (isDev) console.debug(...args)
    }
}
