/**
 * Stat card component displaying a metric with icon.
 * Matches web_proto dashboard stat card design.
 *
 * @author StockOps Team
 * @since 1.0
 */
interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  change?: string
  variant?: 'default' | 'warning' | 'success' | 'danger'
}

export function StatCard({ icon, label, value, change, variant = 'default' }: StatCardProps) {
  const variantClasses = {
    default: 'text-neutral-600',
    warning: 'text-amber-500',
    success: 'text-emerald-500',
    danger: 'text-red-500',
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className="text-3xl">{icon}</div>
      <div>
        <h3 className="text-sm font-medium text-text-secondary mb-1">{label}</h3>
        <p className={`text-3xl font-bold ${variantClasses[variant]}`}>{value}</p>
        {change && <span className="text-xs text-text-light">{change}</span>}
      </div>
    </div>
  )
}
