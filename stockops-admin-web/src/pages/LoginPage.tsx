/**
 * Login page component for StockOps authentication.
 * Provides email/password login form with JWT authentication.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '@/lib/httpError'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/api'
import type { LoginResponse } from '@/types/auth'

function getRedirectPath(state: unknown): string {
  if (!state || typeof state !== 'object' || !('from' in state)) {
    return '/dashboard'
  }

  const from = (state as { from?: unknown }).from
  if (!from || typeof from !== 'object') {
    return '/dashboard'
  }

  const { pathname, search, hash } = from as { pathname?: unknown; search?: unknown; hash?: unknown }
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname === '/login') {
    return '/dashboard'
  }

  return `${pathname}${typeof search === 'string' ? search : ''}${typeof hash === 'string' ? hash : ''}`
}

/**
 * Login page with email/password authentication.
 * On successful login, stores JWT token and redirects to dashboard.
 *
 * @returns Login page JSX element
 */
export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((state) => state.login)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post<LoginResponse>('/v1/auth/login', { email, password })

      const { accessToken, user } = response.data

      if (!accessToken) {
        throw new Error('No accessToken in response')
      }

      login(accessToken, user)

      const redirectPath = getRedirectPath(location.state)
      navigate(redirectPath, { replace: true })
    } catch (err: unknown) {
      // Check for network errors (timeout, connection refused, etc.)
      const networkMessage = getErrorMessage(err)
      if (networkMessage) {
        setError(networkMessage)
        return
      }

      // Check for authentication errors (401)
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number } }
        if (axiosError.response?.status === 401) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.')
          return
        }
      }

      // All other errors
      setError('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-neutral-900">StockOps</h1>
        {error && (
          <div role="alert" className="bg-error/10 text-error p-3 rounded mb-4">
            {error}
          </div>
        )}
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium mb-1 text-neutral-700">
            이메일
          </label>
          <input
            data-testid="login-email"
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <div className="mb-6">
          <label htmlFor="password" className="block text-sm font-medium mb-1 text-neutral-700">
            비밀번호
          </label>
          <input
            data-testid="login-password"
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
        </div>
        <button
          data-testid="login-submit"
          type="submit"
          disabled={loading}
          className="w-full min-h-[44px] bg-primary-600 text-white px-3 py-2 rounded hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  )
}
