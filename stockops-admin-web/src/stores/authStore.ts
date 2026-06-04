/**
 * Authentication state management store.
 * Manages JWT token and user information in memory only (no localStorage persistence).
 *
 * @author StockOps Team
 * @since 1.0
 */

import { create } from 'zustand'
import axios from 'axios'
import type { AuthenticatedUser, LoginResponse } from '@/types/auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

let restoreSessionPromise: Promise<boolean> | null = null

/**
 * Authentication state interface.
 */
interface AuthState {
  /** JWT access token (memory only) */
  token: string | null
  /** Authenticated user information */
  user: AuthenticatedUser | null
  isRestoring: boolean
  hasTriedRestore: boolean
  /** Store JWT token and user info after successful login */
  login: (token: string, user: AuthenticatedUser) => void
  restoreSession: () => Promise<boolean>
  /** Update access token after refresh */
  setToken: (token: string) => void
  /** Clear auth state on logout */
  logout: () => void
  /** Check if user is currently authenticated */
  isAuthenticated: () => boolean
}

/**
 * Auth store with Zustand state management.
 * No persist middleware — tokens live in memory only to prevent XSS token theft.
 *
 * @example
 * const { token, user, login, logout, isAuthenticated } = useAuthStore()
 *
 * // Login
 * login(accessToken, user)
 *
 * // Check authentication
 * if (isAuthenticated()) { ... }
 *
 * // Logout
 * logout()
 */
export const useAuthStore = create<AuthState>()((set, get) => ({
  token: null,
  user: null,
  isRestoring: false,
  hasTriedRestore: false,

  /**
   * Store authentication credentials.
   * @param token - JWT access token
   * @param user - User information object
   */
  login: (token, user) => set({ token, user, hasTriedRestore: true }),

  restoreSession: () => {
    if (get().token && get().user) {
      return Promise.resolve(true)
    }

    if (restoreSessionPromise) {
      return restoreSessionPromise
    }

    set({ isRestoring: true })

    restoreSessionPromise = axios
      .post<LoginResponse>(
        `${API_BASE_URL}/v1/auth/refresh`,
        {},
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      )
      .then((response) => {
        const { accessToken, user } = response.data
        if (!accessToken) {
          throw new Error('No accessToken in refresh response')
        }

        set({ token: accessToken, user })
        return true
      })
      .catch(() => {
        set({ token: null, user: null })
        return false
      })
      .finally(() => {
        set({ isRestoring: false, hasTriedRestore: true })
        restoreSessionPromise = null
      })

    return restoreSessionPromise
  },

  /**
   * Update access token after a successful refresh.
   * @param token - New JWT access token
   */
  setToken: (token) => set({ token }),

  /**
   * Clear authentication state.
   * Removes token and user information from store.
   */
  logout: () => set({ token: null, user: null, hasTriedRestore: true }),

  /**
   * Check if user has valid authentication.
   * @returns true if token exists, false otherwise
   */
  isAuthenticated: () => !!get().token,
}))
