/**
 * ConfirmDialog component for accessible modal-based confirmations.
 * Replaces native window.confirm() with a proper modal dialog that supports
 * focus trapping, Escape key dismissal, and destructive action styling.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'

/**
 * Props for the ConfirmDialog component.
 */
interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when the dialog should close (cancel or overlay click) */
  onClose: () => void
  /** Callback when the user confirms the action */
  onConfirm: () => void
  /** Dialog title */
  title: string
  /** Detailed description of the action being confirmed */
  description: string
  /** Label for the confirm button (defaults to "확인") */
  confirmLabel?: string
  /** Label for the cancel button (defaults to "취소") */
  cancelLabel?: string
  /** Visual variant: 'destructive' for delete/danger actions, 'default' for normal confirmations */
  variant?: 'destructive' | 'default'
}

/**
 * Reusable confirmation dialog component.
 * Renders via React Portal with focus trap, Escape key support,
 * and accessible ARIA attributes.
 *
 * @param props - ConfirmDialog component props
 * @returns ConfirmDialog JSX element rendered in a portal
 *
 * @example
 * // Delete confirmation (destructive variant)
 * <ConfirmDialog
 *   open={showDeleteConfirm}
 *   onClose={() => setShowDeleteConfirm(false)}
 *   onConfirm={handleDelete}
 *   title="삭제 확인"
 *   description="이 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
 *   variant="destructive"
 *   confirmLabel="삭제"
 * />
 *
 * @example
 * // General confirmation (default variant)
 * <ConfirmDialog
 *   open={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   onConfirm={handleConfirm}
 *   title="출고 확정"
 *   description="출고를 확정하시겠습니까?"
 *   confirmLabel="확정"
 * />
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  variant = 'default',
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Focus trap: keep focus within the dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      // Focus the confirm button when dialog opens
      confirmButtonRef.current?.focus()
      // Prevent body scroll when dialog is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open) return null

  const isDestructive = variant === 'destructive'

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start gap-4">
          {isDestructive && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />
            </div>
          )}
          <div className="flex-1">
            <h2
              id="confirm-dialog-title"
              className={`text-lg font-semibold ${isDestructive ? 'text-red-900' : 'text-neutral-900'}`}
            >
              {title}
            </h2>
            <p
              id="confirm-dialog-description"
              className="mt-2 text-sm text-neutral-600"
            >
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}