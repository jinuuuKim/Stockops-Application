import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  getInventoryTurnoverReport,
  getAbcAnalysisReport,
  getXyzAnalysisReport,
  getAbcXyzMatrixReport,
} from './reports'
import api from '@/lib/api'
import type {
  InventoryTurnoverReportResponse,
  AbcAnalysisReportResponse,
  XyzAnalysisReportResponse,
  AbcXyzMatrixReportResponse,
} from '@/types/analytics'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

describe('reports API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('getInventoryTurnoverReport calls correct endpoint with params', async () => {
    const mockResponse: InventoryTurnoverReportResponse = {
      items: [{ productId: 1, productName: 'P1', productBarcode: '123', turnoverRate: 2.5, cogs: 1000, avgInventory: 400 }],
    }
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })

    const result = await getInventoryTurnoverReport('2024-01-01', '2024-01-31', 1)

    expect(api.get).toHaveBeenCalledWith('/v1/reports/inventory-turnover', {
      params: { startDate: '2024-01-01', endDate: '2024-01-31', centerId: 1 },
    })
    expect(result).toEqual(mockResponse)
  })

  it('getInventoryTurnoverReport strips undefined params', async () => {
    const mockResponse: InventoryTurnoverReportResponse = { items: [] }
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })

    await getInventoryTurnoverReport('2024-01-01', '2024-01-31')

    expect(api.get).toHaveBeenCalledWith('/v1/reports/inventory-turnover', {
      params: { startDate: '2024-01-01', endDate: '2024-01-31' },
    })
  })

  it('getInventoryTurnoverReport normalizes backend array response', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [{
        productId: 1,
        productName: '프리미엄 우유 1L',
        productCode: '8801007000011',
        turnoverRate: 1.25,
        cogs: 3200,
        averageInventoryQty: 188,
      }],
    })

    const result = await getInventoryTurnoverReport('2026-04-01', '2026-04-30')

    expect(result).toEqual({
      items: [{
        productId: 1,
        productName: '프리미엄 우유 1L',
        productBarcode: '8801007000011',
        turnoverRate: 1.25,
        cogs: 3200,
        avgInventory: 188,
      }],
    })
  })

  it('getAbcAnalysisReport calls correct endpoint', async () => {
    const mockResponse: AbcAnalysisReportResponse = {
      items: [{ productId: 1, productName: 'P1', revenue: 5000, revenuePercentage: 50, cumulativePercentage: 50, class: 'A' }],
    }
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })

    const result = await getAbcAnalysisReport(1)

    expect(api.get).toHaveBeenCalledWith('/v1/reports/abc-analysis', {
      params: { centerId: 1 },
    })
    expect(result).toEqual(mockResponse)
  })

  it('getAbcAnalysisReport without centerId sends empty params', async () => {
    const mockResponse: AbcAnalysisReportResponse = { items: [] }
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })

    await getAbcAnalysisReport()

    expect(api.get).toHaveBeenCalledWith('/v1/reports/abc-analysis', {
      params: {},
    })
  })

  it('getAbcAnalysisReport normalizes backend class fields', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [{
        productId: 1,
        productName: 'P1',
        annualUsageValue: 5000,
        cumulativePercentage: 48.5,
        abcClass: 'A',
      }],
    })

    const result = await getAbcAnalysisReport(1)

    expect(result).toEqual({
      items: [{
        productId: 1,
        productName: 'P1',
        revenue: 5000,
        revenuePercentage: 0,
        cumulativePercentage: 48.5,
        class: 'A',
      }],
    })
  })

  it('getXyzAnalysisReport calls correct endpoint', async () => {
    const mockResponse: XyzAnalysisReportResponse = {
      items: [{ productId: 1, productName: 'P1', coefficientOfVariation: 0.5, class: 'X' }],
    }
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })

    const result = await getXyzAnalysisReport(2)

    expect(api.get).toHaveBeenCalledWith('/v1/reports/xyz-analysis', {
      params: { centerId: 2 },
    })
    expect(result).toEqual(mockResponse)
  })

  it('getXyzAnalysisReport normalizes backend volatility fields', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [{
        productId: 1,
        productName: 'P1',
        cv: 0.32,
        xyzClass: 'X',
      }],
    })

    const result = await getXyzAnalysisReport(1)

    expect(result).toEqual({
      items: [{ productId: 1, productName: 'P1', coefficientOfVariation: 0.32, class: 'X' }],
    })
  })

  it('getAbcXyzMatrixReport calls correct endpoint', async () => {
    const mockResponse: AbcXyzMatrixReportResponse = {
      cells: [{ abcClass: 'A', xyzClass: 'X', productCount: 5, products: [{ productId: 1, productName: 'P1' }] }],
    }
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })

    const result = await getAbcXyzMatrixReport()

    expect(api.get).toHaveBeenCalledWith('/v1/reports/abc-xyz-matrix', {
      params: {},
    })
    expect(result).toEqual(mockResponse)
  })

  it('getAbcXyzMatrixReport flattens backend matrix rows', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        rows: [{
          abcClass: 'A',
          xCount: 2,
          yCount: 1,
          zCount: 0,
          xProducts: [{ productId: 1, productName: 'P1' }],
          yProducts: [{ productId: 2, productName: 'P2' }],
          zProducts: [],
        }],
        totalProductCount: 3,
      },
    })

    const result = await getAbcXyzMatrixReport(1)

    expect(result).toEqual({
      cells: [
        { abcClass: 'A', xyzClass: 'X', productCount: 2, products: [{ productId: 1, productName: 'P1' }] },
        { abcClass: 'A', xyzClass: 'Y', productCount: 1, products: [{ productId: 2, productName: 'P2' }] },
        { abcClass: 'A', xyzClass: 'Z', productCount: 0, products: [] },
      ],
    })
  })

  it('propagates API errors', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Server error'))

    await expect(getInventoryTurnoverReport('2024-01-01', '2024-01-31')).rejects.toThrow('Server error')
  })
})
