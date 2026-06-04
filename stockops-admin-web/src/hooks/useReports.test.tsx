import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useInventoryTurnover,
  useAbcAnalysis,
  useXyzAnalysis,
  useAbcXyzMatrix,
  useExpiryWaste,
  useLeadTime,
  useStockAging,
} from './useReports'
import * as reportsApi from '@/api/reports'
import * as analyticsApi from '@/api/analytics'
import type {
  InventoryTurnoverReportResponse,
  AbcAnalysisReportResponse,
  AbcXyzMatrixReportResponse,
  ExpiryWasteReportResponse,
  PurchaseOrderLeadTimeReportResponse,
  StockAgingReportResponse,
} from '@/types/analytics'

vi.mock('@/api/reports', () => ({
  getInventoryTurnoverReport: vi.fn(),
  getAbcAnalysisReport: vi.fn(),
  getXyzAnalysisReport: vi.fn(),
  getAbcXyzMatrixReport: vi.fn(),
}))

vi.mock('@/api/analytics', () => ({
  getExpiryWasteReport: vi.fn(),
  getPurchaseOrderLeadTimeReport: vi.fn(),
  getStockAgingReport: vi.fn(),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useReports hooks', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('useInventoryTurnover fetches report when dates are provided', async () => {
    const mockResponse: InventoryTurnoverReportResponse = {
      items: [{ productId: 1, productName: 'Product A', productBarcode: '123', turnoverRate: 2.5, cogs: 1000, avgInventory: 400 }],
    }
    vi.mocked(reportsApi.getInventoryTurnoverReport).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useInventoryTurnover('2024-01-01', '2024-01-31'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockResponse)
    expect(reportsApi.getInventoryTurnoverReport).toHaveBeenCalledWith('2024-01-01', '2024-01-31', undefined)
  })

  it('useInventoryTurnover is disabled when dates are missing', () => {
    vi.mocked(reportsApi.getInventoryTurnoverReport).mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useInventoryTurnover(undefined, undefined), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
    expect(reportsApi.getInventoryTurnoverReport).not.toHaveBeenCalled()
  })

  it('useAbcAnalysis fetches ABC report lazily when enabled', async () => {
    const mockResponse: AbcAnalysisReportResponse = {
      items: [{ productId: 1, productName: 'Product A', revenue: 5000, revenuePercentage: 50, cumulativePercentage: 50, class: 'A' }],
    }
    vi.mocked(reportsApi.getAbcAnalysisReport).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useAbcAnalysis(1, false), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
    expect(reportsApi.getAbcAnalysisReport).not.toHaveBeenCalled()
  })

  it('useAbcAnalysis fetches when enabled=true', async () => {
    const mockResponse: AbcAnalysisReportResponse = { items: [] }
    vi.mocked(reportsApi.getAbcAnalysisReport).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useAbcAnalysis(1, true), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(reportsApi.getAbcAnalysisReport).toHaveBeenCalledWith(1)
  })

  it('useAbcAnalysis is disabled without centerId', () => {
    vi.mocked(reportsApi.getAbcAnalysisReport).mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useAbcAnalysis(undefined, true), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
    expect(reportsApi.getAbcAnalysisReport).not.toHaveBeenCalled()
  })

  it('useXyzAnalysis returns error on API failure', async () => {
    vi.mocked(reportsApi.getXyzAnalysisReport).mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => useXyzAnalysis(1, true), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeDefined()
  })

  it('useAbcXyzMatrix fetches matrix data', async () => {
    const mockResponse: AbcXyzMatrixReportResponse = {
      cells: [{ abcClass: 'A', xyzClass: 'X', productCount: 5, products: [{ productId: 1, productName: 'P1' }] }],
    }
    vi.mocked(reportsApi.getAbcXyzMatrixReport).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useAbcXyzMatrix(1, true), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockResponse)
  })

  it('useAbcXyzMatrix is disabled without centerId', () => {
    vi.mocked(reportsApi.getAbcXyzMatrixReport).mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useAbcXyzMatrix(undefined, true), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
    expect(reportsApi.getAbcXyzMatrixReport).not.toHaveBeenCalled()
  })

  it('useExpiryWaste is disabled without date range', () => {
    vi.mocked(analyticsApi.getExpiryWasteReport).mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useExpiryWaste(undefined, undefined), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('useExpiryWaste fetches when dates are provided', async () => {
    const mockResponse: ExpiryWasteReportResponse = {
      summary: { rowCount: 1, quarantinedQuantity: 10, quarantinedLotCount: 2 },
      rows: [{ productId: 1, productName: 'P1', centerId: 1, centerName: 'C1', warehouseId: 1, warehouseName: 'W1', quarantinedQuantity: 10, quarantinedLotCount: 2 }],
    }
    vi.mocked(analyticsApi.getExpiryWasteReport).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useExpiryWaste('2024-01-01', '2024-01-31'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockResponse)
  })

  it('useLeadTime fetches lead time report', async () => {
    const mockResponse: PurchaseOrderLeadTimeReportResponse = {
      summary: { rowCount: 1, purchaseOrderCount: 5, leadTimeSampleCount: 5, totalLeadTimeHours: 120, averageLeadTimeHours: 24 },
      rows: [],
    }
    vi.mocked(analyticsApi.getPurchaseOrderLeadTimeReport).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useLeadTime('2024-01-01', '2024-01-31', 1), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockResponse)
  })

  it('useStockAging fetches stock aging report', async () => {
    const mockResponse: StockAgingReportResponse = {
      summary: { rowCount: 1, totalAvailableQuantity: 100, zeroToThirtyQuantity: 50, thirtyOneToSixtyQuantity: 30, sixtyOneToNinetyQuantity: 20, overNinetyQuantity: 0, noDemandQuantity: 0 },
      rows: [],
    }
    vi.mocked(analyticsApi.getStockAgingReport).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useStockAging('2024-01-01', '2024-01-31'), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockResponse)
  })
})
