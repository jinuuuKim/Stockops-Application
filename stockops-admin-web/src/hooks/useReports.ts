/**
 * React Query hooks for report data fetching.
 * Provides hooks for inventory turnover, ABC/XYZ analysis,
 * expiry waste, lead time, and stock aging reports.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import {
  getInventoryTurnoverReport,
  getAbcAnalysisReport,
  getXyzAnalysisReport,
  getAbcXyzMatrixReport,
} from '@/api/reports'
import {
  getExpiryWasteReport,
  getPurchaseOrderLeadTimeReport,
  getStockAgingReport,
} from '@/api/analytics'
import type {
  InventoryTurnoverReportResponse,
  AbcAnalysisReportResponse,
  XyzAnalysisReportResponse,
  AbcXyzMatrixReportResponse,
  AnalyticsQueryFilter,
  ExpiryWasteReportResponse,
  PurchaseOrderLeadTimeReportResponse,
  StockAgingReportResponse,
} from '@/types/analytics'

const REPORT_STALE_TIME = 60000

/**
 * Fetches inventory turnover report.
 *
 * @param startDate - Report start date (YYYY-MM-DD)
 * @param endDate - Report end date (YYYY-MM-DD)
 * @param centerId - Optional center filter
 * @returns React Query result with turnover items
 */
export function useInventoryTurnover(
  startDate?: string,
  endDate?: string,
  centerId?: number,
  enabled = true,
): UseQueryResult<InventoryTurnoverReportResponse, AxiosError> {
  return useQuery({
    queryKey: ['reports', 'inventory-turnover', startDate, endDate, centerId],
    queryFn: () => getInventoryTurnoverReport(startDate, endDate, centerId),
    staleTime: REPORT_STALE_TIME,
    enabled: enabled && !!startDate && !!endDate,
  })
}

/**
 * Fetches ABC analysis report.
 *
 * @param centerId - Optional center filter
 * @returns React Query result with ABC classification items
 */
export function useAbcAnalysis(centerId?: number, enabled = true): UseQueryResult<AbcAnalysisReportResponse, AxiosError> {
  return useQuery({
    queryKey: ['reports', 'abc-analysis', centerId],
    queryFn: () => getAbcAnalysisReport(centerId),
    staleTime: REPORT_STALE_TIME,
    enabled: enabled && centerId !== undefined,
  })
}

/**
 * Fetches XYZ analysis report.
 *
 * @param centerId - Optional center filter
 * @returns React Query result with XYZ classification items
 */
export function useXyzAnalysis(centerId?: number, enabled = true): UseQueryResult<XyzAnalysisReportResponse, AxiosError> {
  return useQuery({
    queryKey: ['reports', 'xyz-analysis', centerId],
    queryFn: () => getXyzAnalysisReport(centerId),
    staleTime: REPORT_STALE_TIME,
    enabled: enabled && centerId !== undefined,
  })
}

/**
 * Fetches ABC-XYZ matrix report.
 *
 * @param centerId - Optional center filter
 * @returns React Query result with matrix cells
 */
export function useAbcXyzMatrix(centerId?: number, enabled = true): UseQueryResult<AbcXyzMatrixReportResponse, AxiosError> {
  return useQuery({
    queryKey: ['reports', 'abc-xyz-matrix', centerId],
    queryFn: () => getAbcXyzMatrixReport(centerId),
    staleTime: REPORT_STALE_TIME,
    enabled: enabled && centerId !== undefined,
  })
}

/**
 * Fetches expiry waste analytics.
 *
 * @param from - Start date (YYYY-MM-DD)
 * @param to - End date (YYYY-MM-DD)
 * @param centerId - Optional center filter
 * @returns React Query result with expiry waste data
 */
export function useExpiryWaste(
  from?: string,
  to?: string,
  centerId?: number,
  enabled = true,
): UseQueryResult<ExpiryWasteReportResponse, AxiosError> {
  const filter: AnalyticsQueryFilter = { from, to, centerId }
  return useQuery({
    queryKey: ['reports', 'expiry-waste', from, to, centerId],
    queryFn: () => getExpiryWasteReport(filter),
    staleTime: REPORT_STALE_TIME,
    enabled: enabled && !!from && !!to,
  })
}

/**
 * Fetches purchase order lead time analytics.
 *
 * @param from - Start date (YYYY-MM-DD)
 * @param to - End date (YYYY-MM-DD)
 * @param centerId - Optional center filter
 * @returns React Query result with lead time data
 */
export function useLeadTime(
  from?: string,
  to?: string,
  centerId?: number,
  enabled = true,
): UseQueryResult<PurchaseOrderLeadTimeReportResponse, AxiosError> {
  const filter: AnalyticsQueryFilter = { from, to, centerId }
  return useQuery({
    queryKey: ['reports', 'lead-time', from, to, centerId],
    queryFn: () => getPurchaseOrderLeadTimeReport(filter),
    staleTime: REPORT_STALE_TIME,
    enabled: enabled && !!from && !!to,
  })
}

/**
 * Fetches stock aging analytics.
 *
 * @param from - Start date (YYYY-MM-DD)
 * @param to - End date (YYYY-MM-DD)
 * @param centerId - Optional center filter
 * @returns React Query result with stock aging data
 */
export function useStockAging(
  from?: string,
  to?: string,
  centerId?: number,
  enabled = true,
): UseQueryResult<StockAgingReportResponse, AxiosError> {
  const filter: AnalyticsQueryFilter = { from, to, centerId }
  return useQuery({
    queryKey: ['reports', 'stock-aging', from, to, centerId],
    queryFn: () => getStockAgingReport(filter),
    staleTime: REPORT_STALE_TIME,
    enabled: enabled && !!from && !!to,
  })
}
