/**
 * API client functions for report endpoints.
 * Provides data fetching for inventory turnover, ABC/XYZ analysis,
 * and the ABC-XYZ matrix.
 *
 * @author StockOps Team
 * @since 2.0
 */

import api from '@/lib/api'
import type {
  InventoryTurnoverReportResponse,
  InventoryTurnoverItem,
  AbcAnalysisReportResponse,
  AbcAnalysisItem,
  XyzAnalysisReportResponse,
  XyzAnalysisItem,
  AbcXyzMatrixReportResponse,
  AbcXyzMatrixCell,
  AbcXyzMatrixProduct,
} from '@/types/analytics'

type BackendInventoryTurnoverItem = {
  productId?: number
  productName?: string
  productCode?: string
  productBarcode?: string
  turnoverRate?: number
  cogs?: number
  averageInventoryQty?: number
  avgInventory?: number
}

type BackendAbcAnalysisItem = {
  productId?: number
  productName?: string
  annualUsageValue?: number
  revenue?: number
  revenuePercentage?: number
  cumulativePercentage?: number
  abcClass?: string
  class?: string
}

type BackendXyzAnalysisItem = {
  productId?: number
  productName?: string
  cv?: number
  coefficientOfVariation?: number
  xyzClass?: string
  class?: string
}

type BackendAbcXyzMatrixRow = {
  abcClass?: string
  xCount?: number
  yCount?: number
  zCount?: number
  xProducts?: AbcXyzMatrixProduct[]
  yProducts?: AbcXyzMatrixProduct[]
  zProducts?: AbcXyzMatrixProduct[]
}

function buildReportParams(params: Record<string, string | number | undefined>): Record<string, string | number> {
  const result: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      result[key] = value
    }
  }
  return result
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : []
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function asAbcClass(value: unknown): 'A' | 'B' | 'C' {
  return value === 'A' || value === 'B' || value === 'C' ? value : 'C'
}

function asXyzClass(value: unknown): 'X' | 'Y' | 'Z' {
  return value === 'X' || value === 'Y' || value === 'Z' ? value : 'Z'
}

function normalizeInventoryTurnover(data: unknown): InventoryTurnoverReportResponse {
  const items = Array.isArray(data)
    ? data
    : asArray<BackendInventoryTurnoverItem>((data as Partial<InventoryTurnoverReportResponse> | undefined)?.items)

  return {
    items: items.map((item): InventoryTurnoverItem => ({
      productId: asNumber(item.productId),
      productName: item.productName ?? '',
      productBarcode: item.productBarcode ?? item.productCode ?? '',
      turnoverRate: asNumber(item.turnoverRate),
      cogs: asNumber(item.cogs),
      avgInventory: asNumber(item.avgInventory ?? item.averageInventoryQty),
    })),
  }
}

function normalizeAbcAnalysis(data: unknown): AbcAnalysisReportResponse {
  const items = Array.isArray(data)
    ? data
    : asArray<BackendAbcAnalysisItem>((data as Partial<AbcAnalysisReportResponse> | undefined)?.items)

  return {
    items: items.map((item): AbcAnalysisItem => ({
      productId: asNumber(item.productId),
      productName: item.productName ?? '',
      revenue: asNumber(item.revenue ?? item.annualUsageValue),
      revenuePercentage: asNumber(item.revenuePercentage),
      cumulativePercentage: asNumber(item.cumulativePercentage),
      class: asAbcClass(item.class ?? item.abcClass),
    })),
  }
}

function normalizeXyzAnalysis(data: unknown): XyzAnalysisReportResponse {
  const items = Array.isArray(data)
    ? data
    : asArray<BackendXyzAnalysisItem>((data as Partial<XyzAnalysisReportResponse> | undefined)?.items)

  return {
    items: items.map((item): XyzAnalysisItem => ({
      productId: asNumber(item.productId),
      productName: item.productName ?? '',
      coefficientOfVariation: asNumber(item.coefficientOfVariation ?? item.cv),
      class: asXyzClass(item.class ?? item.xyzClass),
    })),
  }
}

function normalizeAbcXyzMatrix(data: unknown): AbcXyzMatrixReportResponse {
  if (!Array.isArray(data) && Array.isArray((data as Partial<AbcXyzMatrixReportResponse> | undefined)?.cells)) {
    return { cells: (data as AbcXyzMatrixReportResponse).cells }
  }

  const rows = asArray<BackendAbcXyzMatrixRow>((data as { rows?: BackendAbcXyzMatrixRow[] } | undefined)?.rows)
  const cells = rows.flatMap((row): AbcXyzMatrixCell[] => {
    const abcClass = asAbcClass(row.abcClass)
    return [
      { abcClass, xyzClass: 'X', productCount: asNumber(row.xCount), products: asArray(row.xProducts) },
      { abcClass, xyzClass: 'Y', productCount: asNumber(row.yCount), products: asArray(row.yProducts) },
      { abcClass, xyzClass: 'Z', productCount: asNumber(row.zCount), products: asArray(row.zProducts) },
    ]
  })

  return { cells }
}

export async function getInventoryTurnoverReport(
  startDate?: string,
  endDate?: string,
  centerId?: number,
): Promise<InventoryTurnoverReportResponse> {
  const response = await api.get<unknown>('/v1/reports/inventory-turnover', {
    params: buildReportParams({ startDate, endDate, centerId }),
  })
  return normalizeInventoryTurnover(response.data)
}

export async function getAbcAnalysisReport(centerId?: number): Promise<AbcAnalysisReportResponse> {
  const response = await api.get<unknown>('/v1/reports/abc-analysis', {
    params: buildReportParams({ centerId }),
  })
  return normalizeAbcAnalysis(response.data)
}

export async function getXyzAnalysisReport(centerId?: number): Promise<XyzAnalysisReportResponse> {
  const response = await api.get<unknown>('/v1/reports/xyz-analysis', {
    params: buildReportParams({ centerId }),
  })
  return normalizeXyzAnalysis(response.data)
}

export async function getAbcXyzMatrixReport(centerId?: number): Promise<AbcXyzMatrixReportResponse> {
  const response = await api.get<unknown>('/v1/reports/abc-xyz-matrix', {
    params: buildReportParams({ centerId }),
  })
  return normalizeAbcXyzMatrix(response.data)
}
