/**
 * Activity item for recent transactions feed.
 * Displays time, type badge, description and user.
 *
 * @author StockOps Team
 * @since 1.0
 */
interface ActivityItemProps {
  time: string
  type: 'inbound' | 'outbound' | 'adjust'
  description: string
  user?: string
}

export function ActivityItem({ time, type, description, user }: ActivityItemProps) {
  const typeClasses = {
    inbound: 'bg-emerald-100 text-emerald-700',
    outbound: 'bg-blue-100 text-blue-700',
    adjust: 'bg-amber-100 text-amber-700',
  }

  const typeLabels = {
    inbound: '입고',
    outbound: '출고',
    adjust: '조정',
  }

  return (
    <div className="flex items-center gap-4 p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
      <span className="text-xs text-text-light min-w-[50px]">{time}</span>
      <span className={`px-2 py-1 rounded text-xs font-medium ${typeClasses[type]}`}>
        {typeLabels[type]}
      </span>
      <span className="flex-1 text-sm text-neutral-900">{description}</span>
      {user && <span className="text-xs text-text-light">{user}</span>}
    </div>
  )
}
