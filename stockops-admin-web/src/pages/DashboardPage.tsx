/**
 * Dashboard page component.
 * Main landing page after login showing system overview.
 * Redesigned to match web_proto with stats cards, alerts, AI widget,
 * and refresh metadata for live dashboard monitoring.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useDashboardSummary, useDashboardTransactions } from '@/hooks/useDashboard'
import { useEnvironmentDashboard } from '@/hooks/useEnvironment'
import { createProduct } from '@/api/products'
import { ProductModal } from '@/components/products/ProductModal'
import { CreateInboundModal } from '@/components/inbound/CreateInboundModal'
import { CreateOutboundModal } from '@/components/outbound/CreateOutboundModal'
import { StatCard } from '@/components/ui/StatCard'
import { AlertItem } from '@/components/ui/AlertItem'
import { ActivityItem } from '@/components/ui/ActivityItem'
import { AIBanner } from '@/components/ui/AIBanner'
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Package, RefreshCw } from 'lucide-react'
import type { CreateProductRequest, UpdateProductRequest } from '@/types/product'

/**
 * Dashboard page displaying welcome message and system overview.
 * Shows key metrics, recent transactions, quick actions, and dashboard
 * refresh status with manual refetch support.
 *
 * @returns Dashboard page JSX element
 */
export function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [now, setNow] = useState(() => Date.now())
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)
  const [quickAction, setQuickAction] = useState<'inbound' | 'outbound' | 'product' | null>(null)
  const [isProductSubmitting, setIsProductSubmitting] = useState(false)
  const {
    data: summary,
    refetch: refetchSummary,
    dataUpdatedAt: summaryUpdatedAt,
  } = useDashboardSummary()
  const {
    data: transactions,
    refetch: refetchTransactions,
    dataUpdatedAt: transactionsUpdatedAt,
  } = useDashboardTransactions(5)
  const environmentDashboardQuery = useEnvironmentDashboard()

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const lastUpdatedAt = useMemo(() => {
    return Math.max(summaryUpdatedAt, transactionsUpdatedAt, environmentDashboardQuery.dataUpdatedAt)
  }, [summaryUpdatedAt, transactionsUpdatedAt, environmentDashboardQuery.dataUpdatedAt])

  const lastUpdatedText = useMemo(() => {
    if (!lastUpdatedAt) {
      return '마지막 갱신: 데이터 대기 중'
    }

    const secondsAgo = Math.max(0, Math.floor((now - lastUpdatedAt) / 1000))
    return `마지막 갱신: ${secondsAgo}초 전`
  }, [lastUpdatedAt, now])

  async function handleManualRefresh(): Promise<void> {
    setIsManualRefreshing(true)

    try {
      await Promise.all([
        refetchSummary(),
        refetchTransactions(),
        queryClient.invalidateQueries({ queryKey: ['environment', 'dashboard'] }),
      ])
    }
    finally {
      setIsManualRefreshing(false)
      setNow(Date.now())
    }
  }

  const hasEnvironmentAlert =
    (environmentDashboardQuery.data?.warningCount ?? 0) > 0 ||
    (environmentDashboardQuery.data?.dangerCount ?? 0) > 0

  const environmentVariant = environmentDashboardQuery.isLoading
    ? 'default'
    : (environmentDashboardQuery.data?.dangerCount ?? 0) > 0
      ? 'danger'
      : (environmentDashboardQuery.data?.warningCount ?? 0) > 0
        ? 'warning'
        : 'success'

  const canShowAiRecommendation =
    (summary?.totalProducts ?? 0) > 0 &&
    (summary?.recentTransactionCount ?? 0) > 0

  const aiDescription = canShowAiRecommendation
    ? '최근 입출고 이력과 안전재고 기준으로 발주 후보를 검토하세요. 상세 화면에서 모델 근거와 추천 수량을 확인할 수 있습니다.'
    : '추천을 만들 만큼 입출고 이력이 충분하지 않습니다. 상품, 입고, 출고 데이터가 쌓이면 자동 발주 후보를 표시합니다.'

  async function handleProductSubmit(data: CreateProductRequest | UpdateProductRequest): Promise<void> {
    setIsProductSubmitting(true)

    try {
      await createProduct(data as CreateProductRequest)
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      setQuickAction(null)
    }
    finally {
      setIsProductSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">대시보드</h1>
          <p className="text-text-secondary mt-1">
            안녕하세요, <span className="font-medium">{user?.name || '관리자'}</span>님!
            현재 시스템 현황을 확인하세요.
          </p>
          <p className="text-sm text-text-secondary mt-2">{lastUpdatedText}</p>
        </div>
        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isManualRefreshing}
          className="flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
        >
          <RefreshCw className={`w-4 h-4 ${isManualRefreshing ? 'animate-spin' : ''}`} />
          {isManualRefreshing ? '새로고침 중...' : '새로고침'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/products" className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500">
          <StatCard
            icon="📦"
            label="전체 품목"
            value={summary?.totalProducts ?? 0}
            variant="default"
          />
        </Link>
        <Link to="/expiry" className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500">
          <StatCard
            icon="⚠️"
            label="유통기한 임박"
            value={summary?.criticalExpiryCount ?? 0}
            change="3일 이내"
            variant="warning"
          />
        </Link>
        <div className="relative rounded-xl">
          <Link to="/environment" className="absolute inset-0 z-0 rounded-xl" aria-label="환경 페이지로 이동" />
          <div className="relative z-10 rounded-xl">
            {hasEnvironmentAlert ? (
              <Link
                to="/environment"
                className="absolute right-3 top-3 z-20 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                이상 감지
              </Link>
            ) : null}
            {environmentDashboardQuery.isLoading ? (
              <div className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm animate-pulse">
                <div className="h-12 w-12 rounded-full bg-neutral-200" />
                <div className="space-y-2">
                  <div className="h-4 w-20 rounded bg-neutral-200" />
                  <div className="h-8 w-32 rounded bg-neutral-200" />
                  <div className="h-3 w-40 rounded bg-neutral-200" />
                </div>
              </div>
            ) : environmentDashboardQuery.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
                <p className="text-sm font-medium text-red-600">환경 상태를 불러오지 못했습니다.</p>
                <p className="mt-1 text-xs text-red-500">카드를 눌러 환경 페이지에서 다시 확인하세요.</p>
              </div>
            ) : (environmentDashboardQuery.data?.totalSensors ?? 0) === 0 ? (
              <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">🌡️</div>
                  <div>
                    <h3 className="mb-1 text-sm font-medium text-text-secondary">환경 상태</h3>
                    <p className="text-xl font-bold text-neutral-500">센서 없음</p>
                    <span className="text-xs text-text-light">환경 페이지에서 센서를 등록하세요</span>
                  </div>
                </div>
              </div>
            ) : (
              <StatCard
                icon="🌡️"
                label="환경 상태"
                value={`${environmentDashboardQuery.data?.activeSensors ?? 0} / ${environmentDashboardQuery.data?.totalSensors ?? 0}`}
                change={`주의 ${environmentDashboardQuery.data?.warningCount ?? 0} · 위험 ${environmentDashboardQuery.data?.dangerCount ?? 0}`}
                variant={environmentVariant}
              />
            )}
          </div>
        </div>
        <Link to="/inbound" className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500">
          <StatCard
            icon="📊"
            label="오늘 입출고"
            value={`${summary?.todayInboundCount ?? 0} / ${summary?.todayOutboundCount ?? 0}`}
            change="입고 / 출고"
            variant="default"
          />
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
        <h2 className="text-lg font-semibold mb-4 text-text-primary">빠른 작업</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setQuickAction('inbound')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            <ArrowDownToLine className="w-5 h-5" />
            입고 등록
          </button>
          <button
            type="button"
            onClick={() => setQuickAction('outbound')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            <ArrowUpFromLine className="w-5 h-5" />
            출고 등록
          </button>
          <button
            type="button"
            onClick={() => setQuickAction('product')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] bg-neutral-100 text-text-primary border border-neutral-200 rounded-lg hover:bg-neutral-200 transition-colors font-medium"
          >
            <Package className="w-5 h-5" />
            상품 등록
          </button>
        </div>
      </div>

      {/* Alerts Section */}
      {(summary?.criticalExpiryCount ?? 0) > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <h2 className="text-lg font-semibold mb-4 text-text-primary">⚠️ 주요 알림</h2>
          <div className="space-y-3">
            <AlertItem
              type="danger"
              icon="🔥"
              title="유통기한 임박"
              message={`${summary?.criticalExpiryCount}개 품목이 3일 이내에 만료됩니다`}
              timestamp="5분 전"
              actionLabel="확인하기"
              onAction={() => {}}
            />
            {summary?.lowStockCount && summary.lowStockCount > 0 && (
              <AlertItem
                type="warning"
                icon="📉"
                title="재고 부족"
                message={`${summary.lowStockCount}개 품목의 재고가 안전재고 이하입니다`}
                timestamp="1시간 전"
                actionLabel="확인하기"
                onAction={() => {}}
              />
            )}
          </div>
        </div>
      )}

      {/* AI Banner */}
      <AIBanner
        title="AI 추천"
        description={aiDescription}
        actionLabel={canShowAiRecommendation ? '추천 검토' : undefined}
        onAction={() => navigate('/ai')}
      />

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
        <h2 className="text-lg font-semibold mb-4 text-text-primary">최근 활동</h2>
        {transactions && transactions.length > 0 ? (
          <div className="space-y-2">
            {transactions.slice(0, 5).map((tx) => (
              <ActivityItem
                key={tx.id}
                time={new Date(tx.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                type={tx.type === 'INBOUND' ? 'inbound' : tx.type === 'OUTBOUND' ? 'outbound' : 'adjust'}
                description={`${tx.productName} - ${tx.type === 'INBOUND' ? '+' : '-'}${tx.quantity}개`}
                user={tx.createdBy?.toString() || '시스템'}
              />
            ))}
          </div>
        ) : (
          <p className="text-text-secondary text-center py-8">최근 활동이 없습니다</p>
        )}
      </div>

      {quickAction === 'inbound' && (
        <CreateInboundModal onClose={() => setQuickAction(null)} />
      )}

      {quickAction === 'outbound' && (
        <CreateOutboundModal
          onClose={() => setQuickAction(null)}
          onSuccess={() => {
            setQuickAction(null)
            queryClient.invalidateQueries({ queryKey: ['outbounds'] })
          }}
        />
      )}

      <ProductModal
        isOpen={quickAction === 'product'}
        onClose={() => setQuickAction(null)}
        onSubmit={handleProductSubmit}
        isLoading={isProductSubmitting}
      />
    </div>
  )
}
