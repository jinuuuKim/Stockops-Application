/**
 * PWA installation prompt hook.
 * Tracks `beforeinstallprompt` event, handles install prompting,
 * detects iOS Safari, and manages dismissal state with localStorage.
 *
 * @author StockOps Team
 * @since 1.0
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
 */

import { useState, useEffect, useCallback } from 'react'

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

export interface UsePwaInstallReturn {
  /** True if the browser fired `beforeinstallprompt` and install is available */
  isInstallable: boolean
  /** True if the app is already running in standalone mode */
  isStandalone: boolean
  /** True if the device is iOS Safari */
  isIos: boolean
  /** Trigger the native install prompt (noop if not installable) */
  promptInstall: () => Promise<void>
  /** Dismiss the prompt and persist dismissal for 7 days */
  dismissPrompt: () => void
  /** True if the user has dismissed the prompt recently */
  isDismissed: boolean
}

function getDismissedUntil(): number | null {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return null
    return parseInt(raw, 10)
  } catch {
    return null
  }
}

function isCurrentlyDismissed(): boolean {
  const until = getDismissedUntil()
  if (!until) return false
  return Date.now() < until
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  // iOS Safari
  if ((navigator as unknown as { standalone?: boolean }).standalone === true) return true
  // Chrome/Edge/Android
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  return false
}

function detectIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  const isIosDevice = /iphone|ipad|ipod/.test(ua)
  const isSafari = /safari/.test(ua) && !/chrome|crios|crmo/.test(ua)
  return isIosDevice && isSafari
}

/**
 * Hook for managing PWA install prompt behavior.
 *
 * @returns PWA install state and actions
 */
export function usePwaInstall(): UsePwaInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(() => detectStandalone())
  const [isIos] = useState(() => detectIos())
  const [isDismissed, setIsDismissed] = useState(() => isCurrentlyDismissed())

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsStandalone(true)
    }

    const handleDisplayModeChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        setIsStandalone(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    const mql = window.matchMedia('(display-mode: standalone)')
    if (mql.matches) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- initializes state from the browser display-mode media query. */
      setIsStandalone(true)
    }
    mql.addEventListener?.('change', handleDisplayModeChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      mql.removeEventListener?.('change', handleDisplayModeChange)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setIsStandalone(true)
    }
  }, [deferredPrompt])

  const dismissPrompt = useCallback(() => {
    const until = Date.now() + DISMISS_DURATION_MS
    try {
      localStorage.setItem(DISMISS_KEY, String(until))
    } catch {
      // Storage may be unavailable in private mode
    }
    setIsDismissed(true)
  }, [])

  return {
    isInstallable: deferredPrompt !== null,
    isStandalone,
    isIos,
    promptInstall,
    dismissPrompt,
    isDismissed,
  }
}
