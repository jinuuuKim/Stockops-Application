import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LoginPage } from './LoginPage'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import type { AuthenticatedUser, LoginResponse } from '@/types/auth'

vi.mock('@/lib/api', () => ({
  default: {
    post: vi.fn(),
  },
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

function buildLoginResponse(): LoginResponse {
  return {
    accessToken: 'login-access-token',
    tokenType: 'Bearer',
    expiresIn: 900000,
    user: buildUser(),
  }
}

describe('LoginPage intended-route redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      token: null,
      user: null,
      isRestoring: false,
      hasTriedRestore: false,
    })
  })

  it('redirects to the originally requested route after successful login', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: buildLoginResponse() })

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login',
            state: { from: { pathname: '/admin/ai-suggestions', search: '?status=PENDING', hash: '#review' } },
          },
        ]}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/ai-suggestions" element={<div>restored target route</div>} />
          <Route path="/dashboard" element={<div>dashboard page</div>} />
        </Routes>
      </MemoryRouter>
    )

    fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'admin@stockops.test' } })
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'password' } })
    fireEvent.click(screen.getByTestId('login-submit'))

    expect(await screen.findByText('restored target route')).toBeInTheDocument()
    await waitFor(() => expect(useAuthStore.getState().token).toBe('login-access-token'))
    expect(api.post).toHaveBeenCalledWith('/v1/auth/login', {
      email: 'admin@stockops.test',
      password: 'password',
    })
  })
})
