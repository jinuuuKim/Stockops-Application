/**
 * Shared toast notification utility.
 * Provides a unified `showToast` function for both error and success variants,
 * replacing the duplicate implementations that were scattered across components.
 *
 * Uses `document.createElement` and appends to `<body>` so it works without
 * any UI library dependency.
 *
 * @author StockOps Team
 * @since 1.0
 */

/** Toast variant determining background colour and ARIA role. */
type ToastVariant = 'error' | 'success'

/** Parameter object for {@link showToast}. */
interface ShowToastOptions {
  /** Message displayed inside the toast. */
  message: string
  /** Visual variant — `'error'` (red) or `'success'` (green). */
  variant: ToastVariant
}

const TOAST_ID = 'stockops-toast'
const TOAST_DURATION_MS = 4000

const VARIANT_CONFIG: Record<ToastVariant, { backgroundColor: string; role: string }> = {
  error: { backgroundColor: '#dc2626', role: 'alert' },
  success: { backgroundColor: '#16a34a', role: 'status' },
}

let activeToastTimeout: number | undefined

/**
 * Shows a temporary toast notification at the bottom of the viewport.
 * Reuses a single DOM element so repeated calls do not stack endlessly.
 *
 * @param options - Toast configuration
 * @param options.message - Message shown to the user
 * @param options.variant - `'error'` for red or `'success'` for green
 * @example
 * showToast({ message: '저장되었습니다.', variant: 'success' })
 * showToast({ message: '오류가 발생했습니다.', variant: 'error' })
 */
export function showToast({ message, variant }: ShowToastOptions): void {
  if (typeof document === 'undefined' || !document.body) {
    return
  }

  document.getElementById(TOAST_ID)?.remove()

  const config = VARIANT_CONFIG[variant]
  const toast = document.createElement('div')
  toast.id = TOAST_ID
  toast.setAttribute('role', config.role)
  toast.textContent = message

  Object.assign(toast.style, {
    position: 'fixed',
    left: '50%',
    bottom: '24px',
    transform: 'translateX(-50%)',
    zIndex: '9999',
    maxWidth: 'calc(100vw - 32px)',
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: config.backgroundColor,
    color: '#ffffff',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: '500',
  } satisfies Partial<CSSStyleDeclaration>)

  document.body.appendChild(toast)

  if (activeToastTimeout !== undefined) {
    window.clearTimeout(activeToastTimeout)
  }

  activeToastTimeout = window.setTimeout(() => {
    document.getElementById(TOAST_ID)?.remove()
    activeToastTimeout = undefined
  }, TOAST_DURATION_MS)
}
