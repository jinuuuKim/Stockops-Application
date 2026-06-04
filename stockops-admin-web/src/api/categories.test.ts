import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getCategories, getCategoryTree, getInventoryByCategory } from './categories'
import api from '@/lib/api'
import type { Category, CategoryInventorySummary } from '@/types/category'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

describe('categories API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('getCategories calls /v1/categories with flat=true', async () => {
    const mockCategories: Category[] = [
      { id: 1, name: 'Food', code: 'FOOD', level: 1, sortOrder: 1, active: true, parentId: null, children: [], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    ]
    vi.mocked(api.get).mockResolvedValue({ data: mockCategories })

    const result = await getCategories(true)

    expect(api.get).toHaveBeenCalledWith('/v1/categories', { params: { flat: true, rootOnly: false } })
    expect(result).toEqual(mockCategories)
  })

  it('getCategories calls /v1/categories with rootOnly=true', async () => {
    const mockCategories: Category[] = [
      { id: 1, name: 'Food', code: 'FOOD', level: 1, sortOrder: 1, active: true, parentId: null, children: [], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    ]
    vi.mocked(api.get).mockResolvedValue({ data: mockCategories })

    await getCategories(false, true)

    expect(api.get).toHaveBeenCalledWith('/v1/categories', { params: { flat: false, rootOnly: true } })
  })

  it('getCategoryTree calls /v1/categories without params', async () => {
    const mockTree: Category[] = [
      { id: 1, name: 'Food', code: 'FOOD', level: 1, sortOrder: 1, active: true, parentId: null, children: [], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    ]
    vi.mocked(api.get).mockResolvedValue({ data: mockTree })

    const result = await getCategoryTree()

    expect(api.get).toHaveBeenCalledWith('/v1/categories')
    expect(result).toEqual(mockTree)
  })

  it('getInventoryByCategory calls /v1/inventory/by-category with categoryId', async () => {
    const mockSummary: CategoryInventorySummary = {
      categoryId: 1,
      categoryName: 'Food',
      totalQuantity: 500,
      totalValue: 1500000,
      productCount: 10,
    }
    vi.mocked(api.get).mockResolvedValue({ data: mockSummary })

    const result = await getInventoryByCategory(1)

    expect(api.get).toHaveBeenCalledWith('/v1/inventory/by-category', { params: { categoryId: 1 } })
    expect(result).toEqual(mockSummary)
  })

  it('propagates API errors', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

    await expect(getCategories()).rejects.toThrow('Network error')
  })
})
