import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { useAuthStore } from './authStore'
import type { AuthenticatedUser, LoginResponse } from '@/types/auth'

vi.mock('axios', () => ({
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

function buildLoginResponse(overrides: Partial<LoginResponse> = {}): LoginResponse {
  return {
    accessToken: 'access-token',
    tokenType: 'Bearer',
    expiresIn: 900000,
    user: buildUser(),
    ...overrides,
  }
}

describe('authStore refresh-cookie restoration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      token: null,
      user: null,
      isRestoring: false,
      hasTriedRestore: false,
    })
    localStorage.clear()
    sessionStorage.clear()
  })

  it('restores session with the HttpOnly refresh cookie and keeps refresh token out of browser storage', async () => {
    const localStorageSetItem = vi.spyOn(Storage.prototype, 'setItem')
    vi.mocked(axios.post).mockResolvedValue({ data: buildLoginResponse() })

    await expect(useAuthStore.getState().restoreSession()).resolves.toBe(true)

    expect(axios.post).toHaveBeenCalledWith(
      '/api/v1/auth/refresh',
      {},
      expect.objectContaining({ withCredentials: true })
    )
    expect(useAuthStore.getState().token).toBe('access-token')
    expect(useAuthStore.getState().user?.role).toBe('ADMIN')
    expect(useAuthStore.getState().hasTriedRestore).toBe(true)
    expect(localStorageSetItem).not.toHaveBeenCalled()
  })

  it('returns false and clears auth state when the refresh cookie is missing', async () => {
    vi.mocked(axios.post).mockRejectedValue({ response: { status: 401 } })

    await expect(useAuthStore.getState().restoreSession()).resolves.toBe(false)

    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().isRestoring).toBe(false)
    expect(useAuthStore.getState().hasTriedRestore).toBe(true)
  })

  it('returns false and clears auth state when the refresh cookie is expired', async () => {
    vi.mocked(axios.post).mockRejectedValue({ response: { status: 401, data: { message: 'Invalid refresh token' } } })

    await expect(useAuthStore.getState().restoreSession()).resolves.toBe(false)

    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().hasTriedRestore).toBe(true)
  })
})
