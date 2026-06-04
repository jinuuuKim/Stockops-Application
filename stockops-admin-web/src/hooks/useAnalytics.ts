/**
 * React Query hooks for analytics and reporting data.
 * Follows the same query-key and stale-time conventions as useEnvironment.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import {
  getStockAgingReport,
  getStockoutRateReport,
  getExpiryWasteReport,
  getPurchaseOrderLeadTimeReport,
  getFillRateReport,
  downloadStockAgingPdf,
  downloadStockoutRatePdf,
  downloadExpiryWastePdf,
  downloadPurchaseOrderLeadTimePdf,
  downloadFillRatePdf,
  downloadStockAgingXlsx,
  downloadStockoutRateXlsx,
  downloadExpiryWasteXlsx,
  downloadPurchaseOrderLeadTimeXlsx,
  downloadFillRateXlsx,
} from '@/api/analytics'
import type { AnalyticsQueryFilter } from '@/types/analytics'

const ANALYTICS_STALE_TIME = 60000

export function useStockAgingReport(filter: AnalyticsQueryFilter): UseQueryResult<import('@/types/analytics').StockAgingReportResponse, AxiosError> {
  return useQuery({
    queryKey: ['analytics', 'stock-aging', filter],
    queryFn: () => getStockAgingReport(filter),
    staleTime: ANALYTICS_STALE_TIME,
  })
}

export function useStockoutRateReport(filter: AnalyticsQueryFilter): UseQueryResult<import('@/types/analytics').StockoutRateReportResponse, AxiosError> {
  return useQuery({
    queryKey: ['analytics', 'stockout-rate', filter],
    queryFn: () => getStockoutRateReport(filter),
    staleTime: ANALYTICS_STALE_TIME,
  })
}

export function useExpiryWasteReport(filter: AnalyticsQueryFilter): UseQueryResult<import('@/types/analytics').ExpiryWasteReportResponse, AxiosError> {
  return useQuery({
    queryKey: ['analytics', 'expiry-waste', filter],
    queryFn: () => getExpiryWasteReport(filter),
    staleTime: ANALYTICS_STALE_TIME,
  })
}

export function usePurchaseOrderLeadTimeReport(filter: AnalyticsQueryFilter): UseQueryResult<import('@/types/analytics').PurchaseOrderLeadTimeReportResponse, AxiosError> {
  return useQuery({
    queryKey: ['analytics', 'purchase-order-lead-time', filter],
    queryFn: () => getPurchaseOrderLeadTimeReport(filter),
    staleTime: ANALYTICS_STALE_TIME,
  })
}

export function useFillRateReport(filter: AnalyticsQueryFilter): UseQueryResult<import('@/types/analytics').FillRateReportResponse, AxiosError> {
  return useQuery({
    queryKey: ['analytics', 'fill-rate', filter],
    queryFn: () => getFillRateReport(filter),
    staleTime: ANALYTICS_STALE_TIME,
  })
}

type ExportFormat = 'pdf' | 'xlsx'
type ExportMetric = 'stock-aging' | 'stockout-rate' | 'expiry-waste' | 'purchase-order-lead-time' | 'fill-rate'

const PDF_DOWNLOADERS: Record<ExportMetric, (filter: AnalyticsQueryFilter) => Promise<void>> = {
  'stock-aging': downloadStockAgingPdf,
  'stockout-rate': downloadStockoutRatePdf,
  'expiry-waste': downloadExpiryWastePdf,
  'purchase-order-lead-time': downloadPurchaseOrderLeadTimePdf,
  'fill-rate': downloadFillRatePdf,
}

const XLSX_DOWNLOADERS: Record<ExportMetric, (filter: AnalyticsQueryFilter) => Promise<void>> = {
  'stock-aging': downloadStockAgingXlsx,
  'stockout-rate': downloadStockoutRateXlsx,
  'expiry-waste': downloadExpiryWasteXlsx,
  'purchase-order-lead-time': downloadPurchaseOrderLeadTimeXlsx,
  'fill-rate': downloadFillRateXlsx,
}

export function useAnalyticsExport(
  metric: ExportMetric,
  format: ExportFormat,
): UseMutationResult<void, AxiosError, AnalyticsQueryFilter> {
  const queryClient = useQueryClient()
  const downloader = format === 'pdf' ? PDF_DOWNLOADERS[metric] : XLSX_DOWNLOADERS[metric]

  return useMutation({
    mutationFn: downloader,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['analytics', metric] })
    },
  })
}