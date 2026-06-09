import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Outlet } from 'react-router-dom'
import App from './App'

vi.mock('@/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/components/MainLayout', () => ({
  MainLayout: () => <Outlet />,
}))

vi.mock('@/components/pwa/InstallPrompt', () => ({
  InstallPrompt: () => null,
}))

vi.mock('@/pages/SettingsPage', () => ({
  SettingsPage: () => <div>settings route smoke</div>,
}))

vi.mock('@/pages/settings/NotificationChannelPage', () => ({
  NotificationChannelPage: () => <div>notification channels route smoke</div>,
}))

vi.mock('@/pages/admin/AdminPage', () => ({
  AdminPage: () => <div>admin route smoke</div>,
}))

vi.mock('@/pages/admin/NoticeManagement', () => ({
  NoticeManagement: () => <div>notices route smoke</div>,
}))

vi.mock('@/pages/admin/AuditLogViewer', () => ({
  AuditLogViewer: () => <div>audit logs route smoke</div>,
}))

describe('App admin/settings route smoke', () => {
  it.each([
    ['/settings', 'settings route smoke'],
    ['/settings/notification-channels', 'notification channels route smoke'],
    ['/admin', 'admin route smoke'],
    ['/admin/notices', 'notices route smoke'],
    ['/admin/audit-logs', 'audit logs route smoke'],
  ])('renders %s', async (path, expectedText) => {
    window.history.pushState({}, '', path)

    render(<App />)

    expect(await screen.findByText(expectedText)).toBeInTheDocument()
  })
})
