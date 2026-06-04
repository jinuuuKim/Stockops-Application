/**
 * AI recommendations banner widget.
 * Gradient background matching web_proto design.
 *
 * @author StockOps Team
 * @since 1.0
 */
interface AIBannerProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function AIBanner({ title, description, actionLabel, onAction }: AIBannerProps) {
  return (
    <div className="bg-gradient-to-r from-primary-500 to-primary-700 text-white p-6 rounded-xl shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🤖</span>
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="px-2 py-1 bg-white/20 rounded-full text-xs">Beta</span>
      </div>
      <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg">
        <p className="text-white/90 text-sm mb-4">{description}</p>
        {actionLabel && (
          <div className="flex gap-2">
            <button 
              onClick={onAction}
              className="px-4 py-2 bg-white text-primary-600 rounded-lg text-sm font-medium hover:bg-neutral-100 transition-colors"
            >
              {actionLabel}
            </button>
            <button className="px-4 py-2 bg-white/20 text-white rounded-lg text-sm hover:bg-white/30 transition-colors">
              자세히
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
