import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MainLayout } from './MainLayout'
import { useAuthStore } from '@/stores/authStore'
import type { AuthenticatedUser } from '@/types/auth'

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => true,
}))

vi.mock('@/components/notifications/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}))

function buildUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    email: 'admin@stockops.test',
    name: 'Admin User',
    role: 'ADMIN',
    permissions: ['AI_SUGGESTION_READ'],
    scopeMetadata: {
      global: true,
      assignments: [],
      centerIds: [],
      warehouseIds: [],
    },
    ...overrides,
  }
}

describe('MainLayout page title lookup', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 'access-token',
      user: buildUser(),
      isRestoring: false,
      hasTriedRestore: true,
    })
  })

  it('shows AI 제안 관리 for the admin AI suggestions route', () => {
    render(
      <MemoryRouter initialEntries={['/admin/ai-suggestions']}>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route path="admin/ai-suggestions" element={<div>ai suggestions page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'AI 제안 관리' })).toBeInTheDocument()
    expect(screen.getByText('ai suggestions page')).toBeInTheDocument()
  })
})
