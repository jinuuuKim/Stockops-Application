/**
 * Axios HTTP client with JWT authentication interceptor.
 * Automatically attaches Bearer token to requests and handles 401 responses
 * with automatic token refresh flow.
 *
 * @author StockOps Team
 * @since 1.0
 */

import axios from 'axios'
import { getErrorMessage, showErrorToast } from '@/lib/httpError'
import { showToast } from '@/lib/toast'
import { useAuthStore } from '@/stores/authStore'
import type { LoginResponse } from '@/types/auth'

/**
 * Axios instance configured for StockOps API.
 * Base URL is configurable via VITE_API_BASE_URL environment variable.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

/** Flag to prevent multiple concurrent refresh requests */
let isRefreshing = false
/** Queue of failed request callbacks waiting for token refresh */
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: unknown) => void }> = []

/**
 * Process the queue of failed requests after a successful token refresh.
 */
function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

/**
 * Force logout and redirect to login page.
 */
function forceLogout() {
  useAuthStore.getState().logout()
  window.location.href = '/login'
}

/**
 * Request interceptor that attaches JWT token to Authorization header.
 * Retrieves token from Zustand auth store (memory only).
 * Excludes login endpoint from adding Authorization header.
 */
api.interceptors.request.use((config) => {
  // Don't add Authorization header to login endpoint
  if (config.url === '/v1/auth/login') {
    return config
  }
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * Response interceptor that handles:
 * - Network failures and timeouts (toast without clearing auth)
 * - 401 responses (automatic token refresh with retry)
 * - 5xx responses (server error toast)
 */
api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const message = getErrorMessage(error)

    if (message) {
      showErrorToast(message)
      return Promise.reject(error)
    }

    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const originalRequest = error.config

      // If this is already a refresh request, don't retry
      if (!originalRequest || originalRequest.url === '/v1/auth/refresh') {
        forceLogout()
        return Promise.reject(error)
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(api(originalRequest))
            },
            reject,
          })
        })
      }

      isRefreshing = true

      try {
        const response = await axios.post<LoginResponse>(
          `${import.meta.env.VITE_API_BASE_URL ?? '/api'}/v1/auth/refresh`,
          {},
          {
            headers: {
              'Content-Type': 'application/json',
            },
            withCredentials: true,
          }
        )

        const { accessToken, user } = response.data
        useAuthStore.getState().login(accessToken, user)

        processQueue(null, accessToken)

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        forceLogout()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (axios.isAxiosError(error) && (error.response?.status ?? 0) >= 500) {
      showToast({ message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', variant: 'error' })
    }

    return Promise.reject(error)
  }
)

export default api
