/**
 * API client functions for product management.
 * Provides CRUD operations for products.
 *
 * @author StockOps Team
 * @since 1.0
 */

import api from '@/lib/api'
import type { ProductDTO, CreateProductRequest, UpdateProductRequest } from '@/types/product'

/**
 * Paginated response from API.
 */
interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

/**
 * Fetches paginated products.
 *
 * @param page - Page number (0-indexed)
 * @param size - Page size
 * @returns Paginated product response
 */
export async function getProducts(page = 0, size = 20): Promise<PageResponse<ProductDTO>> {
  const response = await api.get<PageResponse<ProductDTO>>('/v1/products', {
    params: { page, size },
  })
  return response.data
}

/**
 * Fetches a single product by ID.
 *
 * @param id - Product ID
 * @returns Product DTO
 */
export async function getProductById(id: number): Promise<ProductDTO> {
  const response = await api.get<ProductDTO>(`/v1/products/${id}`)
  return response.data
}

/**
 * Fetches a product by barcode.
 *
 * @param barcode - Product barcode
 * @returns Product DTO
 */
export async function getProductByBarcode(barcode: string): Promise<ProductDTO> {
  const response = await api.get<ProductDTO>(`/v1/products/barcode/${barcode}`)
  return response.data
}

/**
 * Creates a new product.
 *
 * @param data - Product creation request
 * @returns Created product DTO
 */
export async function createProduct(data: CreateProductRequest): Promise<ProductDTO> {
  const response = await api.post<ProductDTO>('/v1/products', data)
  return response.data
}

/**
 * Updates an existing product.
 *
 * @param id - Product ID
 * @param data - Product update request
 * @returns Updated product DTO
 */
export async function updateProduct(id: number, data: UpdateProductRequest): Promise<ProductDTO> {
  const response = await api.put<ProductDTO>(`/v1/products/${id}`, data)
  return response.data
}

/**
 * Deletes a product.
 *
 * @param id - Product ID
 */
export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/v1/products/${id}`)
}