/**
 * EmptyState component for displaying empty data or error states.
 * Provides consistent UI across all list pages with optional action button.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useId } from 'react'
import { Inbox, AlertCircle, RefreshCw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Props for the EmptyState component.
 */
interface EmptyStateProps {
  /**
   * Title displayed prominently.
   */
  title: string
  /**
   * Optional description text below the title.
   */
  description?: string
  /**
   * Label for the action button (if provided, button is shown).
   */
  actionLabel?: string
  /**
   * Callback when action button is clicked.
   */
  onAction?: () => void
  /**
   * Visual variant: 'empty' for no data, 'error' for API failures.
   * @default 'empty'
   */
  variant?: 'empty' | 'error'
  /**
   * Custom icon to display (defaults based on variant).
   */
  icon?: LucideIcon
  /**
   * Additional CSS classes for the container.
   */
  className?: string
}

/**
 * Reusable empty state component for list pages.
 * Displays an icon, title, description, and optional action button.
 *
 * @param props - EmptyState component props
 * @returns EmptyState JSX element
 *
 * @example
 * // Empty state with action
 * <EmptyState
 *   title="No products found"
 *   description="Add your first product to get started"
 *   actionLabel="Add Product"
 *   onAction={() => setShowModal(true)}
 * />
 *
 * @example
 * // Error state with retry
 * <EmptyState
 *   title="Failed to load data"
 *   description="Please check your connection and try again"
 *   variant="error"
 *   actionLabel="Retry"
 *   onAction={() => refetch()}
 * />
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  variant = 'empty',
  icon: CustomIcon,
  className = '',
}: EmptyStateProps) {
  const headingId = useId()
  const descriptionId = useId()
  const DefaultIcon = variant === 'error' ? AlertCircle : Inbox
  const Icon = CustomIcon || DefaultIcon

  const iconColorClass = variant === 'error' ? 'text-error' : 'text-neutral-400'
  const buttonVariant = variant === 'error' ? 'bg-error hover:bg-error/90' : 'bg-primary-600 hover:bg-primary-700'
  const regionRole = variant === 'error' ? 'alert' : 'status'

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}
      role={regionRole}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      aria-labelledby={headingId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <Icon aria-hidden="true" className={`w-12 h-12 mb-4 ${iconColorClass}`} />
      <h3 id={headingId} className="text-lg font-medium text-neutral-900 mb-2">
        {title}
      </h3>
      {description && (
        <p id={descriptionId} className="text-sm text-neutral-500 text-center max-w-sm mb-4">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors ${buttonVariant}`}
        >
          {variant === 'error' && <RefreshCw aria-hidden="true" className="w-4 h-4" />}
          {actionLabel}
        </button>
      )}
    </div>
  )
}
