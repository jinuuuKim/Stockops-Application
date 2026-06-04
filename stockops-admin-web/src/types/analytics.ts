/**
 * Analytics and reporting TypeScript types.
 * Matches backend DTOs for the five Phase 2 BI metric groups
 * and shared query filter parameters.
 *
 * @author StockOps Team
 * @since 2.0
 */

/**
 * Shared analytics query filter parameters.
 * All fields are optional; the backend applies scope-based defaults.
 */
export interface AnalyticsQueryFilter {
  from?: string
  to?: string
  centerId?: number
  warehouseId?: number
}

// ─── Stock Aging ─────────────────────────────────────────────────────────────

/**
 * Stock-aging summary totals.
 */
export interface StockAgingSummary {
  rowCount: number
  totalAvailableQuantity: number
  zeroToThirtyQuantity: number
  thirtyOneToSixtyQuantity: number
  sixtyOneToNinetyQuantity: number
  overNinetyQuantity: number
  noDemandQuantity: number
}

/**
 * Detailed stock-aging row per product/warehouse.
 */
export interface StockAgingRow {
  productId: number
  productName: string
  centerId: number
  centerName: string
  warehouseId: number
  warehouseName: string
  businessDate: string
  availableQuantity: number
  averageDailyDemand: number | null
  estimatedCoverageDays: number | null
  agingBucket: string
}

/**
 * Stock-aging analytics response.
 */
export interface StockAgingReportResponse {
  summary: StockAgingSummary
  rows: StockAgingRow[]
}

// ─── Stockout Rate ───────────────────────────────────────────────────────────

/**
 * Stockout-rate summary totals.
 */
export interface StockoutRateSummary {
  rowCount: number
  observedDayCount: number
  stockoutDayCount: number
  overallStockoutRate: number
}

/**
 * Detailed stockout-rate row per product/warehouse.
 */
export interface StockoutRateRow {
  productId: number
  productName: string
  centerId: number
  centerName: string
  warehouseId: number
  warehouseName: string
  observedDayCount: number
  stockoutDayCount: number
  stockoutRate: number
  latestAvailableQuantity: number
}

/**
 * Stockout-rate analytics response.
 */
export interface StockoutRateReportResponse {
  summary: StockoutRateSummary
  rows: StockoutRateRow[]
}

// ─── Expiry Waste ────────────────────────────────────────────────────────────

/**
 * Expiry-waste summary totals.
 */
export interface ExpiryWasteSummary {
  rowCount: number
  quarantinedQuantity: number
  quarantinedLotCount: number
}

/**
 * Detailed expiry-waste row per product/warehouse.
 */
export interface ExpiryWasteRow {
  productId: number
  productName: string
  centerId: number
  centerName: string
  warehouseId: number
  warehouseName: string
  quarantinedQuantity: number
  quarantinedLotCount: number
}

/**
 * Expiry-waste analytics response.
 */
export interface ExpiryWasteReportResponse {
  summary: ExpiryWasteSummary
  rows: ExpiryWasteRow[]
  monthlyData?: ExpiryWasteMonthly[]
}

// ─── Purchase Order Lead Time ────────────────────────────────────────────────

/**
 * Purchase-order lead-time summary totals.
 */
export interface PurchaseOrderLeadTimeSummary {
  rowCount: number
  purchaseOrderCount: number
  leadTimeSampleCount: number
  totalLeadTimeHours: number
  averageLeadTimeHours: number
}

/**
 * Detailed purchase-order lead-time row per product/warehouse.
 */
export interface PurchaseOrderLeadTimeRow {
  productId: number
  productName: string
  centerId: number
  centerName: string
  warehouseId: number
  warehouseName: string
  purchaseOrderCount: number
  leadTimeSampleCount: number
  totalLeadTimeHours: number
  averageLeadTimeHours: number
}

/**
 * Purchase-order lead-time analytics response.
 */
export interface PurchaseOrderLeadTimeReportResponse {
  summary: PurchaseOrderLeadTimeSummary
  rows: PurchaseOrderLeadTimeRow[]
  monthlyData?: LeadTimeMonthly[]
  suppliers?: LeadTimeSupplier[]
}

// ─── Fill Rate ───────────────────────────────────────────────────────────────

/**
 * Fill-rate summary totals.
 */
export interface FillRateSummary {
  rowCount: number
  purchaseOrderCount: number
  requestedQuantity: number
  acceptedQuantity: number
  cancelledQuantity: number
  shippedQuantity: number
  acceptanceRate: number
  shippedFillRate: number
}

/**
 * Detailed fill-rate row per product/warehouse.
 */
export interface FillRateRow {
  productId: number
  productName: string
  centerId: number
  centerName: string
  warehouseId: number
  warehouseName: string
  purchaseOrderCount: number
  requestedQuantity: number
  acceptedQuantity: number
  cancelledQuantity: number
  shippedQuantity: number
  acceptanceRate: number
  shippedFillRate: number
}

/**
 * Fill-rate analytics response.
 */
export interface FillRateReportResponse {
  summary: FillRateSummary
  rows: FillRateRow[]
}

// ─── Inventory Turnover ──────────────────────────────────────────────────────

/**
 * Inventory turnover item per product.
 */
export interface InventoryTurnoverItem {
  productId: number
  productName: string
  productBarcode: string
  turnoverRate: number
  cogs: number
  avgInventory: number
}

/**
 * Inventory turnover report response.
 */
export interface InventoryTurnoverReportResponse {
  items: InventoryTurnoverItem[]
}

// ─── ABC Analysis ────────────────────────────────────────────────────────────

/**
 * ABC analysis item per product.
 */
export interface AbcAnalysisItem {
  productId: number
  productName: string
  revenue: number
  revenuePercentage: number
  cumulativePercentage: number
  class: 'A' | 'B' | 'C'
}

/**
 * ABC analysis report response.
 */
export interface AbcAnalysisReportResponse {
  items: AbcAnalysisItem[]
}

// ─── XYZ Analysis ────────────────────────────────────────────────────────────

/**
 * XYZ analysis item per product.
 */
export interface XyzAnalysisItem {
  productId: number
  productName: string
  coefficientOfVariation: number
  class: 'X' | 'Y' | 'Z'
}

/**
 * XYZ analysis report response.
 */
export interface XyzAnalysisReportResponse {
  items: XyzAnalysisItem[]
}

// ─── ABC-XYZ Matrix ──────────────────────────────────────────────────────────

/**
 * Product inside an ABC-XYZ matrix cell.
 */
export interface AbcXyzMatrixProduct {
  productId: number
  productName: string
}

/**
 * Single cell in the ABC-XYZ matrix.
 */
export interface AbcXyzMatrixCell {
  abcClass: 'A' | 'B' | 'C'
  xyzClass: 'X' | 'Y' | 'Z'
  productCount: number
  products: AbcXyzMatrixProduct[]
}

/**
 * ABC-XYZ matrix report response.
 */
export interface AbcXyzMatrixReportResponse {
  cells: AbcXyzMatrixCell[]
}

// ─── Expiry Waste Monthly ────────────────────────────────────────────────────

/**
 * Monthly expiry waste data point.
 */
export interface ExpiryWasteMonthly {
  month: string
  quarantinedQuantity: number
}

// ─── Lead Time Monthly / Supplier ────────────────────────────────────────────

/**
 * Monthly lead time data point.
 */
export interface LeadTimeMonthly {
  month: string
  avgLeadTimeHours: number
}

/**
 * Lead time summary per supplier.
 */
export interface LeadTimeSupplier {
  supplierName: string
  avgLeadTimeHours: number
  orderCount: number
}

// ─── Metric type union ───────────────────────────────────────────────────────

/**
 * All available analytics metric identifiers.
 */
export type AnalyticsMetric =
  | 'stock-aging'
  | 'stockout-rate'
  | 'expiry-waste'
  | 'purchase-order-lead-time'
  | 'fill-rate'