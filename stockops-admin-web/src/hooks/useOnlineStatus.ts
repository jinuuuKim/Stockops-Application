/**
 * Tracks browser connectivity for read-only offline behavior.
 * Phase 2 uses this hook to disable mutating actions while offline.
 *
 * @returns Current online state from the browser runtime
 */
import { useEffect, useState } from 'react'

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') {
      return true
    }

    return navigator.onLine
  })

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
