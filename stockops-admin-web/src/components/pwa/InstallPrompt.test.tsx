import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InstallPrompt } from './InstallPrompt'

vi.mock('@/hooks/usePwaInstall', () => ({
  usePwaInstall: vi.fn(),
}))

import { usePwaInstall } from '@/hooks/usePwaInstall'

describe('InstallPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when not installable and not iOS', () => {
    vi.mocked(usePwaInstall).mockReturnValue({
      isInstallable: false,
      isStandalone: false,
      isIos: false,
      promptInstall: vi.fn(),
      dismissPrompt: vi.fn(),
      isDismissed: false,
    })
    render(<InstallPrompt />)
    expect(screen.queryByText('StockOps를 홈 화면에 추가하세요')).not.toBeInTheDocument()
  })

  it('renders when installable and not standalone', () => {
    vi.mocked(usePwaInstall).mockReturnValue({
      isInstallable: true,
      isStandalone: false,
      isIos: false,
      promptInstall: vi.fn(),
      dismissPrompt: vi.fn(),
      isDismissed: false,
    })
    render(<InstallPrompt />)
    expect(screen.getByText('StockOps를 홈 화면에 추가하세요')).toBeInTheDocument()
  })

  it('does not render when already standalone', () => {
    vi.mocked(usePwaInstall).mockReturnValue({
      isInstallable: true,
      isStandalone: true,
      isIos: false,
      promptInstall: vi.fn(),
      dismissPrompt: vi.fn(),
      isDismissed: false,
    })
    render(<InstallPrompt />)
    expect(screen.queryByText('StockOps를 홈 화면에 추가하세요')).not.toBeInTheDocument()
  })

  it('does not render when dismissed', () => {
    vi.mocked(usePwaInstall).mockReturnValue({
      isInstallable: true,
      isStandalone: false,
      isIos: false,
      promptInstall: vi.fn(),
      dismissPrompt: vi.fn(),
      isDismissed: true,
    })
    render(<InstallPrompt />)
    expect(screen.queryByText('StockOps를 홈 화면에 추가하세요')).not.toBeInTheDocument()
  })

  it('renders iOS manual instructions on iOS Safari', () => {
    vi.mocked(usePwaInstall).mockReturnValue({
      isInstallable: false,
      isStandalone: false,
      isIos: true,
      promptInstall: vi.fn(),
      dismissPrompt: vi.fn(),
      isDismissed: false,
    })
    render(<InstallPrompt />)
    expect(screen.getByText('StockOps를 홈 화면에 추가하세요')).toBeInTheDocument()
    expect(screen.getByText(/공유 버튼을 누르고/)).toBeInTheDocument()
  })

  it('does not show install button on iOS', () => {
    vi.mocked(usePwaInstall).mockReturnValue({
      isInstallable: false,
      isStandalone: false,
      isIos: true,
      promptInstall: vi.fn(),
      dismissPrompt: vi.fn(),
      isDismissed: false,
    })
    render(<InstallPrompt />)
    expect(screen.queryByText('홈 화면에 추가')).not.toBeInTheDocument()
  })

  it('calls dismissPrompt when close button is clicked', () => {
    const dismissMock = vi.fn()
    vi.mocked(usePwaInstall).mockReturnValue({
      isInstallable: true,
      isStandalone: false,
      isIos: false,
      promptInstall: vi.fn(),
      dismissPrompt: dismissMock,
      isDismissed: false,
    })
    render(<InstallPrompt />)
    const closeBtn = screen.getByRole('button', { name: '닫기' })
    fireEvent.click(closeBtn)
    expect(dismissMock).toHaveBeenCalled()
  })

  it('calls promptInstall when install button is clicked', () => {
    const promptMock = vi.fn()
    vi.mocked(usePwaInstall).mockReturnValue({
      isInstallable: true,
      isStandalone: false,
      isIos: false,
      promptInstall: promptMock,
      dismissPrompt: vi.fn(),
      isDismissed: false,
    })
    render(<InstallPrompt />)
    const installBtn = screen.getByText('홈 화면에 추가')
    fireEvent.click(installBtn)
    expect(promptMock).toHaveBeenCalled()
  })
})
