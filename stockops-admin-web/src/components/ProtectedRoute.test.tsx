import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { fireEvent } from '@testing-library/react'
import axios from 'axios'
import api from '@/lib/api'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { useAuthStore } from '@/stores/authStore'
import type { AuthenticatedUser, LoginResponse } from '@/types/auth'

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}))

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

function buildLoginResponse(user: AuthenticatedUser): LoginResponse {
  return {
    accessToken: 'restored-access-token',
    tokenType: 'Bearer',
    expiresIn: 900000,
    user,
  }
}

function LocationDisplay() {
  const location = useLocation()

  return <div data-testid="current-location">{location.pathname}{location.search}{location.hash}</div>
}

function renderProtectedAdminRoute() {
  return render(
    <MemoryRouter initialEntries={['/admin/ai-suggestions?status=PENDING#review']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div>dashboard page</div>} />
        <Route
          path="/admin/ai-suggestions"
          element={
            <ProtectedRoute>
              <div>
                <div>ai suggestions page</div>
                <LocationDisplay />
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute refresh-cookie restoration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      token: null,
      user: null,
      isRestoring: false,
      hasTriedRestore: false,
    })
  })

  it('restores an admin session and stays on the intended admin route', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: buildLoginResponse(buildUser()) })

    renderProtectedAdminRoute()

    expect(await screen.findByText('ai suggestions page')).toBeInTheDocument()
    expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/auth/refresh',
      {},
      expect.objectContaining({ withCredentials: true })
    )
  })

  it('returns to the original deep link after login succeeds', async () => {
    vi.mocked(axios.post).mockRejectedValue({ response: { status: 401 } })
    vi.mocked(api.post).mockResolvedValue({ data: buildLoginResponse(buildUser()) })

    renderProtectedAdminRoute()

    expect(await screen.findByRole('heading', { name: 'StockOps' })).toBeInTheDocument()

    fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'admin@stockops.test' } })
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'password' } })
    fireEvent.click(screen.getByTestId('login-submit'))

    expect(await screen.findByText('ai suggestions page')).toBeInTheDocument()
    expect(screen.getByTestId('current-location')).toHaveTextContent('/admin/ai-suggestions?status=PENDING#review')
    expect(api.post).toHaveBeenCalledWith('/v1/auth/login', {
      email: 'admin@stockops.test',
      password: 'password',
    })
  })

  it('redirects to login without infinite loading when the refresh cookie is missing', async () => {
    vi.mocked(axios.post).mockRejectedValue({ response: { status: 401 } })

    renderProtectedAdminRoute()

    expect(await screen.findByRole('heading', { name: 'StockOps' })).toBeInTheDocument()
    await waitFor(() => expect(useAuthStore.getState().hasTriedRestore).toBe(true))
    expect(useAuthStore.getState().isRestoring).toBe(false)
  })

  it('redirects to login without infinite loading when the refresh cookie is expired', async () => {
    vi.mocked(axios.post).mockRejectedValue({ response: { status: 401, data: { message: 'Invalid refresh token' } } })

    renderProtectedAdminRoute()

    expect(await screen.findByRole('heading', { name: 'StockOps' })).toBeInTheDocument()
    await waitFor(() => expect(useAuthStore.getState().hasTriedRestore).toBe(true))
    expect(useAuthStore.getState().isRestoring).toBe(false)
  })

  it('redirects a restored non-admin session away from the admin route', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: buildLoginResponse(buildUser({ role: 'WAREHOUSE_MANAGER', permissions: [] })),
    })

    renderProtectedAdminRoute()

    expect(await screen.findByText('dashboard page')).toBeInTheDocument()
    expect(screen.queryByText('ai suggestions page')).not.toBeInTheDocument()
  })
})
