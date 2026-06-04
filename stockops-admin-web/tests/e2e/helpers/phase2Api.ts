import type { Page, Route } from '@playwright/test'
import type { AIRecommendation } from '@/types/aiRecommendation'
import type { Phase2BrowserFixtureState } from '../fixtures/phase2Fixtures'

interface ApiEvidence {
  approvedPoNumber?: string
  unauthorizedStatuses: number[]
  exportDownloads: string[]
}

function json(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

function toPurchaseOrder(recommendation: AIRecommendation) {
  return {
    id: 900 + recommendation.id,
    poNumber: `PO-AI-${recommendation.id}`,
    status: 'DRAFT',
    supplierName: 'AI Forecast Engine',
    createdAt: '2026-05-01T09:15:00Z',
    updatedAt: '2026-05-01T09:15:00Z',
    requestingCenter: {
      id: recommendation.centerId,
      code: 'CENTER-A',
      name: 'Center A',
    },
    targetWarehouse: {
      id: recommendation.warehouseId,
      code: 'WH-10',
      name: 'Warehouse 10',
    },
    items: [{
      id: recommendation.id,
      productId: recommendation.productId,
      requestedQuantity: recommendation.recommendedQuantity,
      acceptedQuantity: recommendation.recommendedQuantity,
      cancelledQuantity: 0,
    }],
    shipments: [],
  }
}

function getMetricKey(url: URL) {
  return url.pathname.split('/').filter(Boolean).at(-1) as keyof Phase2BrowserFixtureState['analytics']
}

function getReportMetricKey(url: URL) {
  return url.pathname.split('/').slice(-2, -1)[0] as keyof Phase2BrowserFixtureState['analytics']
}

export async function installPhase2ApiMocks(page: Page, state: Phase2BrowserFixtureState, evidence: ApiEvidence): Promise<void> {
  await page.route('**/api/v1/auth/login', async (route) => {
    await json(route, {
      accessToken: 'phase-2-smoke-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: state.user,
    })
  })

  await page.route('**/api/v1/dashboard/summary', async (route) => {
    await json(route, {
      totalProducts: 12,
      totalInventoryQuantity: 120,
      todayInboundCount: 3,
      todayOutboundCount: 2,
      lowStockCount: 1,
      pendingCycleCounts: 0,
      criticalExpiryCount: 0,
      warningExpiryCount: 1,
      recentTransactionCount: 2,
    })
  })

  await page.route('**/api/v1/inventory/transactions/recent', async (route) => {
    await json(route, [])
  })

  await page.route('**/api/v1/environment/dashboard', async (route) => {
    await json(route, {
      totalSensors: 1,
      activeSensors: 1,
      normalCount: 1,
      warningCount: 0,
      dangerCount: 0,
      latestReadings: [],
    })
  })

  await page.route('**/api/v1/notifications**', async (route) => {
    await json(route, [])
  })

  await page.route('**/api/v1/centers', async (route) => {
    await json(route, state.centers.filter((center) => state.user.scopeMetadata.centerIds.includes(center.id)))
  })

  await page.route('**/api/v1/warehouses', async (route) => {
    await json(route, state.warehouses.filter((warehouse) => state.user.scopeMetadata.warehouseIds.includes(warehouse.id)))
  })

  await page.route('**/api/v1/warehouses/center/*', async (route) => {
    const centerId = Number(route.request().url().split('/').at(-1))
    await json(route, state.warehouses.filter((warehouse) => warehouse.centerId === centerId && state.user.scopeMetadata.warehouseIds.includes(warehouse.id)))
  })

  await page.route('**/api/v1/analytics/*', async (route) => {
    const url = new URL(route.request().url())
    const metric = getMetricKey(url)
    const warehouseId = Number(url.searchParams.get('warehouseId') ?? state.user.scopeMetadata.warehouseIds[0])

    if (!state.user.scopeMetadata.warehouseIds.includes(warehouseId)) {
      evidence.unauthorizedStatuses.push(403)
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ message: `Access denied for warehouse: ${warehouseId}` }),
      })
      return
    }

    await json(route, state.analytics[metric])
  })

  await page.route('**/api/v1/reports/analytics/*/*', async (route) => {
    const url = new URL(route.request().url())
    const warehouseId = Number(url.searchParams.get('warehouseId') ?? state.user.scopeMetadata.warehouseIds[0])

    if (!state.user.scopeMetadata.warehouseIds.includes(warehouseId)) {
      evidence.unauthorizedStatuses.push(403)
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ message: `Access denied for warehouse: ${warehouseId}` }),
      })
      return
    }

    evidence.exportDownloads.push(`${getReportMetricKey(url)}-${url.pathname.endsWith('/pdf') ? 'pdf' : 'xlsx'}`)
    await route.fulfill({
      status: 200,
      contentType: url.pathname.endsWith('/pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: 'phase2-export',
    })
  })

  await page.route('**/api/v1/ai/recommendations', async (route) => {
    await json(route, state.recommendations)
  })

  await page.route('**/api/v1/ai/recommendations/*/approve', async (route) => {
    const recommendationId = Number(route.request().url().split('/').at(-2))
    const recommendation = state.recommendations.find((candidate) => candidate.id === recommendationId)

    if (!recommendation) {
      await route.fulfill({ status: 404 })
      return
    }

    recommendation.status = 'APPROVED_TO_DRAFT'
    recommendation.approvedPurchaseOrderId = 900 + recommendation.id
    recommendation.approvedPurchaseOrderNumber = `PO-AI-${recommendation.id}`
    recommendation.approvedAt = '2026-05-01T09:15:00Z'
    recommendation.approvedByUserId = state.user.id

    const purchaseOrder = toPurchaseOrder(recommendation)
    state.purchaseOrders = [purchaseOrder, ...state.purchaseOrders]
    evidence.approvedPoNumber = purchaseOrder.poNumber

    await json(route, recommendation)
  })

  await page.route('**/api/v1/purchase-orders', async (route) => {
    if (route.request().method() === 'GET') {
      await json(route, state.purchaseOrders)
      return
    }

    await route.fulfill({ status: 204 })
  })

  await page.route('**/api/v1/purchase-orders/*', async (route) => {
    const request = route.request()
    if (request.method() !== 'GET') {
      await route.fulfill({ status: 204 })
      return
    }

    const id = Number(request.url().split('/').at(-1))
    const purchaseOrder = state.purchaseOrders.find((candidate) => candidate.id === id)
    await json(route, purchaseOrder ?? null)
  })
}

export async function requestUnauthorizedWarehouse(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const response = await fetch('/api/v1/reports/analytics/fill-rate/pdf?warehouseId=11')
    return response.status
  })
}

export type Phase2ApiEvidence = ApiEvidence
