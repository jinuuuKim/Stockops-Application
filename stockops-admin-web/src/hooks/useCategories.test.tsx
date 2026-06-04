import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCategories, useCategoryTree, useInventoryByCategory } from './useCategories'
import * as categoriesApi from '@/api/categories'
import type { Category, CategoryInventorySummary } from '@/types/category'

vi.mock('@/api/categories', () => ({
  getCategories: vi.fn(),
  getCategoryTree: vi.fn(),
  getInventoryByCategory: vi.fn(),
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

describe('useCategories', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('fetches flat categories successfully', async () => {
    const mockCategories: Category[] = [
      { id: 1, name: 'Food', code: 'FOOD', level: 1, sortOrder: 1, active: true, parentId: null, children: [], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      { id: 2, name: 'Drink', code: 'DRINK', level: 1, sortOrder: 2, active: true, parentId: null, children: [], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
    ]
    vi.mocked(categoriesApi.getCategories).mockResolvedValue(mockCategories)

    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockCategories)
    expect(categoriesApi.getCategories).toHaveBeenCalledWith(true)
  })

  it('returns loading state initially', () => {
    vi.mocked(categoriesApi.getCategories).mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('returns error state on API failure', async () => {
    const error = new Error('Network error')
    vi.mocked(categoriesApi.getCategories).mockRejectedValue(error)

    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeDefined()
  })
})

describe('useCategoryTree', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('fetches category tree with nested children', async () => {
    const mockTree: Category[] = [
      {
        id: 1, name: 'Food', code: 'FOOD', level: 1, sortOrder: 1, active: true, parentId: null,
        children: [
          { id: 3, name: 'Snack', code: 'SNACK', level: 2, sortOrder: 1, active: true, parentId: 1, children: [], createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
        ],
        createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
      },
    ]
    vi.mocked(categoriesApi.getCategoryTree).mockResolvedValue(mockTree)

    const { result } = renderHook(() => useCategoryTree(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockTree)
    expect(result.current.data?.[0].children).toHaveLength(1)
    expect(categoriesApi.getCategoryTree).toHaveBeenCalledTimes(1)
  })

  it('returns error state when tree fetch fails', async () => {
    vi.mocked(categoriesApi.getCategoryTree).mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => useCategoryTree(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeDefined()
  })
})

describe('useInventoryByCategory', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('fetches inventory summary for a given category', async () => {
    const mockSummary: CategoryInventorySummary = {
      categoryId: 1,
      categoryName: 'Food',
      totalQuantity: 500,
      totalValue: 1500000,
      productCount: 10,
    }
    vi.mocked(categoriesApi.getInventoryByCategory).mockResolvedValue(mockSummary)

    const { result } = renderHook(() => useInventoryByCategory(1), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockSummary)
    expect(categoriesApi.getInventoryByCategory).toHaveBeenCalledWith(1)
  })

  it('does not fetch when categoryId is null', () => {
    vi.mocked(categoriesApi.getInventoryByCategory).mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useInventoryByCategory(null), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
    expect(categoriesApi.getInventoryByCategory).not.toHaveBeenCalled()
  })

  it('returns error state on API failure', async () => {
    vi.mocked(categoriesApi.getInventoryByCategory).mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => useInventoryByCategory(1), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeDefined()
  })
})
