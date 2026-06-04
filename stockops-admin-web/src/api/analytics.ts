/**
 * API client functions for analytics and reporting.
 * Provides data fetching for the five Phase 2 BI metric groups
 * and PDF/XLSX export downloads.
 *
 * @author StockOps Team
 * @since 2.0
 */

import api from '@/lib/api'
import type {
  AnalyticsQueryFilter,
  StockAgingReportResponse,
  StockoutRateReportResponse,
  ExpiryWasteReportResponse,
  PurchaseOrderLeadTimeReportResponse,
  FillRateReportResponse,
} from '@/types/analytics'

function buildQueryParams(filter: AnalyticsQueryFilter): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  if (filter.from) params.from = filter.from
  if (filter.to) params.to = filter.to
  if (filter.centerId != null) params.centerId = filter.centerId
  if (filter.warehouseId != null) params.warehouseId = filter.warehouseId
  return params
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

// ─── JSON analytics endpoints ────────────────────────────────────────────────

export async function getStockAgingReport(filter: AnalyticsQueryFilter): Promise<StockAgingReportResponse> {
  const response = await api.get<StockAgingReportResponse>('/v1/analytics/stock-aging', {
    params: buildQueryParams(filter),
  })
  return response.data
}

export async function getStockoutRateReport(filter: AnalyticsQueryFilter): Promise<StockoutRateReportResponse> {
  const response = await api.get<StockoutRateReportResponse>('/v1/analytics/stockout-rate', {
    params: buildQueryParams(filter),
  })
  return response.data
}

export async function getExpiryWasteReport(filter: AnalyticsQueryFilter): Promise<ExpiryWasteReportResponse> {
  const response = await api.get<ExpiryWasteReportResponse>('/v1/analytics/expiry-waste', {
    params: buildQueryParams(filter),
  })
  return response.data
}

export async function getPurchaseOrderLeadTimeReport(filter: AnalyticsQueryFilter): Promise<PurchaseOrderLeadTimeReportResponse> {
  const response = await api.get<PurchaseOrderLeadTimeReportResponse>('/v1/analytics/purchase-order-lead-time', {
    params: buildQueryParams(filter),
  })
  return response.data
}

export async function getFillRateReport(filter: AnalyticsQueryFilter): Promise<FillRateReportResponse> {
  const response = await api.get<FillRateReportResponse>('/v1/analytics/fill-rate', {
    params: buildQueryParams(filter),
  })
  return response.data
}

// ─── PDF export endpoints ────────────────────────────────────────────────────

export async function downloadStockAgingPdf(filter: AnalyticsQueryFilter): Promise<void> {
  const response = await api.get<Blob>('/v1/reports/analytics/stock-aging/pdf', {
    params: buildQueryParams(filter),
    responseType: 'blob',
  })
  triggerBlobDownload(response.data, 'stock-aging-report.pdf')
}

export async function downloadStockoutRatePdf(filter: AnalyticsQueryFilter): Promise<void> {
  const response = await api.get<Blob>('/v1/reports/analytics/stockout-rate/pdf', {
    params: buildQueryParams(filter),
    responseType: 'blob',
  })
  triggerBlobDownload(response.data, 'stockout-rate-report.pdf')
}

export async function downloadExpiryWastePdf(filter: AnalyticsQueryFilter): Promise<void> {
  const response = await api.get<Blob>('/v1/reports/analytics/expiry-waste/pdf', {
    params: buildQueryParams(filter),
    responseType: 'blob',
  })
  triggerBlobDownload(response.data, 'expiry-waste-report.pdf')
}

export async function downloadPurchaseOrderLeadTimePdf(filter: AnalyticsQueryFilter): Promise<void> {
  const response = await api.get<Blob>('/v1/reports/analytics/purchase-order-lead-time/pdf', {
    params: buildQueryParams(filter),
    responseType: 'blob',
  })
  triggerBlobDownload(response.data, 'purchase-order-lead-time-report.pdf')
}

export async function downloadFillRatePdf(filter: AnalyticsQueryFilter): Promise<void> {
  const response = await api.get<Blob>('/v1/reports/analytics/fill-rate/pdf', {
    params: buildQueryParams(filter),
    responseType: 'blob',
  })
  triggerBlobDownload(response.data, 'fill-rate-report.pdf')
}

// ─── XLSX export endpoints ────────────────────────────────────────────────────

export async function downloadStockAgingXlsx(filter: AnalyticsQueryFilter): Promise<void> {
  const response = await api.get<Blob>('/v1/reports/analytics/stock-aging/xlsx', {
    params: buildQueryParams(filter),
    responseType: 'blob',
  })
  triggerBlobDownload(response.data, 'stock-aging-report.xlsx')
}

export async function downloadStockoutRateXlsx(filter: AnalyticsQueryFilter): Promise<void> {
  const response = await api.get<Blob>('/v1/reports/analytics/stockout-rate/xlsx', {
    params: buildQueryParams(filter),
    responseType: 'blob',
  })
  triggerBlobDownload(response.data, 'stockout-rate-report.xlsx')
}

export async function downloadExpiryWasteXlsx(filter: AnalyticsQueryFilter): Promise<void> {
  const response = await api.get<Blob>('/v1/reports/analytics/expiry-waste/xlsx', {
    params: buildQueryParams(filter),
    responseType: 'blob',
  })
  triggerBlobDownload(response.data, 'expiry-waste-report.xlsx')
}

export async function downloadPurchaseOrderLeadTimeXlsx(filter: AnalyticsQueryFilter): Promise<void> {
  const response = await api.get<Blob>('/v1/reports/analytics/purchase-order-lead-time/xlsx', {
    params: buildQueryParams(filter),
    responseType: 'blob',
  })
  triggerBlobDownload(response.data, 'purchase-order-lead-time-report.xlsx')
}

export async function downloadFillRateXlsx(filter: AnalyticsQueryFilter): Promise<void> {
  const response = await api.get<Blob>('/v1/reports/analytics/fill-rate/xlsx', {
    params: buildQueryParams(filter),
    responseType: 'blob',
  })
  triggerBlobDownload(response.data, 'fill-rate-report.xlsx')
}