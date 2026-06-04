import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePwaInstall } from './usePwaInstall'

describe('usePwaInstall', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    Object.defineProperty(navigator, 'standalone', {
      configurable: true,
      value: undefined,
    })

    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.0',
    })
  })

  it('initially is not installable and not standalone', () => {
    const { result } = renderHook(() => usePwaInstall())

    expect(result.current.isInstallable).toBe(false)
    expect(result.current.isStandalone).toBe(false)
    expect(result.current.isIos).toBe(false)
    expect(result.current.isDismissed).toBe(false)
  })

  it('detects standalone mode from display-mode matchMedia', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const { result } = renderHook(() => usePwaInstall())

    expect(result.current.isStandalone).toBe(true)
    expect(result.current.isInstallable).toBe(false)
  })

  it('detects iOS Safari from user agent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    })

    const { result } = renderHook(() => usePwaInstall())

    expect(result.current.isIos).toBe(true)
  })

  it('sets installable when beforeinstallprompt fires', () => {
    const { result } = renderHook(() => usePwaInstall())

    const mockPrompt = vi.fn().mockResolvedValue(undefined)
    const mockEvent = new Event('beforeinstallprompt') as Event & { prompt: typeof mockPrompt; userChoice: Promise<{ outcome: string; platform: string }> }
    Object.assign(mockEvent, { prompt: mockPrompt, userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }) })

    act(() => {
      window.dispatchEvent(mockEvent)
    })

    expect(result.current.isInstallable).toBe(true)
  })

  it('promptInstall calls deferred prompt and sets standalone on acceptance', async () => {
    const { result } = renderHook(() => usePwaInstall())

    const mockPrompt = vi.fn().mockResolvedValue(undefined)
    const mockEvent = new Event('beforeinstallprompt') as Event & { prompt: typeof mockPrompt; userChoice: Promise<{ outcome: string; platform: string }> }
    Object.assign(mockEvent, { prompt: mockPrompt, userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }) })

    act(() => {
      window.dispatchEvent(mockEvent)
    })

    expect(result.current.isInstallable).toBe(true)

    await act(async () => {
      await result.current.promptInstall()
    })

    expect(mockPrompt).toHaveBeenCalled()
    expect(result.current.isStandalone).toBe(true)
    expect(result.current.isInstallable).toBe(false)
  })

  it('dismissPrompt sets dismissed state and persists to localStorage', () => {
    const { result } = renderHook(() => usePwaInstall())

    act(() => {
      result.current.dismissPrompt()
    })

    expect(result.current.isDismissed).toBe(true)
    expect(localStorage.getItem('pwa-install-dismissed')).not.toBeNull()
  })

  it('restores dismissed state from localStorage', () => {
    const future = Date.now() + 86400000
    localStorage.setItem('pwa-install-dismissed', String(future))

    const { result } = renderHook(() => usePwaInstall())

    expect(result.current.isDismissed).toBe(true)
  })

  it('does not consider expired dismissal as dismissed', () => {
    const past = Date.now() - 86400000
    localStorage.setItem('pwa-install-dismissed', String(past))

    const { result } = renderHook(() => usePwaInstall())

    expect(result.current.isDismissed).toBe(false)
  })
})
