/**
 * React Query hooks for product data fetching.
 * Provides hooks for fetching product list and single product.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import api from '@/lib/api'
import type { ProductDTO } from '@/types/product'

/**
 * Fetches all products.
 *
 * @returns React Query result with product array
 * @example
 * const { data: products, isLoading } = useProducts()
 */
export function useProducts(): UseQueryResult<ProductDTO[], AxiosError> {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get<{ content: ProductDTO[] }>('/v1/products')
      return response.data.content
    },
  })
}

/**
 * Fetches single product by ID.
 *
 * @param id - Product identifier
 * @returns React Query result with single product
 * @example
 * const { data: product } = useProductById(1)
 */
export function useProductById(id: number | null): UseQueryResult<ProductDTO, AxiosError> {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      if (!id) throw new Error('Product ID is required')
      const response = await api.get<ProductDTO>(`/v1/products/${id}`)
      return response.data
    },
    enabled: id !== null,
  })
}

/**
 * Fetches product by barcode.
 *
 * @param barcode - Product barcode
 * @returns React Query result with single product
 * @example
 * const { data: product } = useProductByBarcode('8801234567890')
 */
export function useProductByBarcode(barcode: string | null): UseQueryResult<ProductDTO, AxiosError> {
  return useQuery({
    queryKey: ['product', 'barcode', barcode],
    queryFn: async () => {
      if (!barcode) throw new Error('Barcode is required')
      const response = await api.get<ProductDTO>(`/v1/products/barcode/${barcode}`)
      return response.data
    },
    enabled: barcode !== null && barcode.length > 0,
  })
}