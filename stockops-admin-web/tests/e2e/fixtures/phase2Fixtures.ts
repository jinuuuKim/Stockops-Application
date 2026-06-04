import type { AuthenticatedUser } from '@/types/auth'
import type { AIRecommendation } from '@/types/aiRecommendation'
import type {
  AnalyticsMetric,
  ExpiryWasteReportResponse,
  FillRateReportResponse,
  PurchaseOrderLeadTimeReportResponse,
  StockAgingReportResponse,
  StockoutRateReportResponse,
} from '@/types/analytics'

interface CenterOption {
  id: number
  code: string
  name: string
}

interface WarehouseOption {
  id: number
  code: string
  name: string
  centerId: number
}

interface PurchaseOrderFixture {
  id: number
  poNumber: string
  status: string
  supplierName: string
  createdAt: string
  updatedAt: string
  requestingCenter: {
    id: number
    code: string
    name: string
  }
  targetWarehouse: {
    id: number
    code: string
    name: string
  }
  items: Array<{
    id: number
    productId: number
    requestedQuantity: number
    acceptedQuantity: number
    cancelledQuantity: number
  }>
  shipments: Array<{
    id: number
    shipmentNumber: string
    carrier: string
    trackingNumber: string
    createdAt: string
    shippedAt: string
  }>
}

export interface Phase2BrowserFixtureState {
  user: AuthenticatedUser
  centers: CenterOption[]
  warehouses: WarehouseOption[]
  analytics: Record<AnalyticsMetric, StockAgingReportResponse | StockoutRateReportResponse | ExpiryWasteReportResponse | PurchaseOrderLeadTimeReportResponse | FillRateReportResponse>
  recommendations: AIRecommendation[]
  purchaseOrders: PurchaseOrderFixture[]
}

const scopedUser: AuthenticatedUser = {
  id: 21,
  email: 'manager.center-a@stockops.local',
  name: 'Center A Manager',
  role: 'MANAGER',
  permissions: ['DASHBOARD_READ', 'REPORT_READ', 'REPORT_EXPORT', 'AI_RECOMMENDATION_READ', 'AI_RECOMMENDATION_APPROVE', 'PURCHASE_ORDER_READ'],
  scopeMetadata: {
    global: false,
    assignments: [{ scope: 'WAREHOUSE', centerId: 1, warehouseId: 10 }],
    centerIds: [1],
    warehouseIds: [10],
  },
}

const centers: CenterOption[] = [
  { id: 1, code: 'CENTER-A', name: 'Center A' },
  { id: 2, code: 'CENTER-B', name: 'Center B' },
]

const warehouses: WarehouseOption[] = [
  { id: 10, code: 'WH-10', name: 'Warehouse 10', centerId: 1 },
  { id: 11, code: 'WH-11', name: 'Warehouse 11', centerId: 1 },
  { id: 20, code: 'WH-20', name: 'Warehouse 20', centerId: 2 },
]

const reportDate = '2026-04-30'

const analytics = {
  'stock-aging': {
    summary: {
      rowCount: 1,
      totalAvailableQuantity: 42,
      zeroToThirtyQuantity: 42,
      thirtyOneToSixtyQuantity: 0,
      sixtyOneToNinetyQuantity: 0,
      overNinetyQuantity: 0,
      noDemandQuantity: 0,
    },
    rows: [{
      productId: 1001,
      productName: 'Analytics Product',
      centerId: 1,
      centerName: 'Center A',
      warehouseId: 10,
      warehouseName: 'Warehouse 10',
      businessDate: reportDate,
      availableQuantity: 42,
      averageDailyDemand: 6,
      estimatedCoverageDays: 7,
      agingBucket: '0-30',
    }],
  },
  'stockout-rate': {
    summary: {
      rowCount: 1,
      observedDayCount: 30,
      stockoutDayCount: 1,
      overallStockoutRate: 0.033,
    },
    rows: [{
      productId: 1001,
      productName: 'Analytics Product',
      centerId: 1,
      centerName: 'Center A',
      warehouseId: 10,
      warehouseName: 'Warehouse 10',
      observedDayCount: 30,
      stockoutDayCount: 1,
      stockoutRate: 0.033,
      latestAvailableQuantity: 42,
    }],
  },
  'expiry-waste': {
    summary: {
      rowCount: 1,
      quarantinedQuantity: 5,
      quarantinedLotCount: 2,
    },
    rows: [{
      productId: 1001,
      productName: 'Analytics Product',
      centerId: 1,
      centerName: 'Center A',
      warehouseId: 10,
      warehouseName: 'Warehouse 10',
      quarantinedQuantity: 5,
      quarantinedLotCount: 2,
    }],
  },
  'purchase-order-lead-time': {
    summary: {
      rowCount: 1,
      purchaseOrderCount: 1,
      leadTimeSampleCount: 1,
      totalLeadTimeHours: 48,
      averageLeadTimeHours: 48,
    },
    rows: [{
      productId: 1001,
      productName: 'Analytics Product',
      centerId: 1,
      centerName: 'Center A',
      warehouseId: 10,
      warehouseName: 'Warehouse 10',
      purchaseOrderCount: 1,
      leadTimeSampleCount: 1,
      totalLeadTimeHours: 48,
      averageLeadTimeHours: 48,
    }],
  },
  'fill-rate': {
    summary: {
      rowCount: 1,
      purchaseOrderCount: 1,
      requestedQuantity: 20,
      acceptedQuantity: 16,
      cancelledQuantity: 4,
      shippedQuantity: 12,
      acceptanceRate: 0.8,
      shippedFillRate: 0.6,
    },
    rows: [{
      productId: 1001,
      productName: 'Analytics Product',
      centerId: 1,
      centerName: 'Center A',
      warehouseId: 10,
      warehouseName: 'Warehouse 10',
      purchaseOrderCount: 1,
      requestedQuantity: 20,
      acceptedQuantity: 16,
      cancelledQuantity: 4,
      shippedQuantity: 12,
      acceptanceRate: 0.8,
      shippedFillRate: 0.6,
    }],
  },
} satisfies Phase2BrowserFixtureState['analytics']

const recommendations: AIRecommendation[] = [{
  id: 501,
  businessDate: '2026-05-01',
  productId: 1001,
  productName: 'Analytics Product',
  productBarcode: 'P-1001',
  centerId: 1,
  warehouseId: 10,
  status: 'READY_FOR_APPROVAL',
  currentStockQuantity: 42,
  safetyStockQuantity: 12,
  recommendedQuantity: 18,
  sevenDayForecastQuantity: 21,
  leadTimeDays: 2,
  leadTimeDemandQuantity: 6,
  trailingSevenDayAverage: 3,
  sameWeekdayAverage: 3,
  weightedDailyDemand: 3,
  demandEventCount: 8,
  insufficientHistory: false,
  explanationSummary: '최근 확정 출고 수요와 리드타임을 반영해 초안 발주를 권장합니다.',
  approvedPurchaseOrderId: null,
  approvedPurchaseOrderNumber: null,
  approvedAt: null,
  approvedByUserId: null,
  createdAt: '2026-05-01T09:00:00Z',
  updatedAt: '2026-05-01T09:00:00Z',
}]

const purchaseOrders: PurchaseOrderFixture[] = []

export function createPhase2BrowserFixtureState(): Phase2BrowserFixtureState {
  return structuredClone({
    user: scopedUser,
    centers,
    warehouses,
    analytics,
    recommendations,
    purchaseOrders,
  })
}
