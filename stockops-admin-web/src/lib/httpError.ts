/**
 * HTTP error utilities for user-facing network failure handling.
 * Distinguishes transport issues from server responses so auth state is only
 * cleared for real authentication failures.
 *
 * @author StockOps Team
 * @since 1.0
 */

import axios from 'axios'
import { showToast } from '@/lib/toast'

/**
 * User-facing message for timeout or network connectivity failures.
 */
export const NETWORK_ERROR_MESSAGE = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'

/**
 * Returns a user-facing message for timeout and network transport failures.
 * Authentication and other HTTP response errors return null so callers can
 * preserve their existing handling flow.
 *
 * @param error - Unknown error thrown during an HTTP request
 * @returns Network failure message when special handling is required, otherwise null
 * @example
 * const message = getErrorMessage(error)
 * if (message) {
 *   showErrorToast(message)
 * }
 */
export function getErrorMessage(error: unknown): string | null {
  if (!axios.isAxiosError(error)) {
    return null
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || !error.response) {
    return NETWORK_ERROR_MESSAGE
  }

  return null
}

/**
 * Shows a temporary toast for network-related HTTP errors.
 * Delegates to the shared {@link showToast} utility with the error variant.
 *
 * @param message - Message shown to the user
 */
export function showErrorToast(message: string): void {
  showToast({ message, variant: 'error' })
}

/**
 * Extracts a user-facing error message from a failed API call.
 * Checks for network/timeout errors first, then inspects the Axios response
 * body for a `message` field, and falls back to the provided default.
 *
 * @param error - Unknown error thrown during an API request
 * @param fallback - Default message when no specific cause is found
 * @returns User-facing error message
 * @example
 * const msg = getServerErrorMessage(err, '저장에 실패했습니다.')
 */
export function getServerErrorMessage(error: unknown, fallback: string): string {
  const networkMessage = getErrorMessage(error)
  if (networkMessage) {
    return networkMessage
  }

  if (axios.isAxiosError(error)) {
    const responseMessage =
      error.response?.data && typeof error.response.data === 'object'
        ? Reflect.get(error.response.data, 'message')
        : null

    if (typeof responseMessage === 'string' && responseMessage.trim().length > 0) {
      return responseMessage
    }
  }

  return fallback
}
