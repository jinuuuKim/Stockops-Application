/**
 * Alert item component for dashboard notifications.
 * Displays alerts with icon, message, timestamp and optional action.
 *
 * @author StockOps Team
 * @since 1.0
 */
interface AlertItemProps {
  type: 'danger' | 'warning' | 'info'
  icon: React.ReactNode
  title: string
  message: string
  timestamp?: string
  actionLabel?: string
  onAction?: () => void
}

export function AlertItem({ type, icon, title, message, timestamp, actionLabel, onAction }: AlertItemProps) {
  const typeClasses = {
    danger: 'bg-red-50 border-l-4 border-red-500',
    warning: 'bg-amber-50 border-l-4 border-amber-500',
    info: 'bg-blue-50 border-l-4 border-blue-500',
  }

  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg ${typeClasses[type]}`}>
      <div className="text-2xl">{icon}</div>
      <div className="flex-1">
        <strong className="block mb-1">{title}</strong>
        <p className="text-sm text-text-secondary">{message}</p>
        {timestamp && <span className="text-xs text-text-light">{timestamp}</span>}
      </div>
      {actionLabel && onAction && (
        <button 
          onClick={onAction} 
          className="px-3 py-1.5 text-sm bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
