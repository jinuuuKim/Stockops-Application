/**
 * Searchable product select dropdown component.
 * Provides debounced search functionality for filtering products by name or barcode.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'
import type { ProductDTO } from '@/types/product'

/**
 * Props for ProductSelectDropdown component.
 *
 * @param value - Currently selected product ID
 * @param onChange - Callback when product is selected
 * @param products - Array of products to search through
 * @param placeholder - Placeholder text for input
 * @param disabled - Whether the dropdown is disabled
 * @param loading - Whether products are loading
 * @param error - Error message to display
 */
interface ProductSelectDropdownProps {
  value: number | null
  onChange: (productId: number | null) => void
  products: ProductDTO[] | undefined
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  error?: string
}

/**
 * Debounce hook for delaying search input.
 *
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced value
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Searchable product select dropdown with debounced filtering.
 * Supports filtering by product name or barcode (SKU).
 *
 * @param props - Component props
 * @returns Dropdown JSX element
 * @example
 * <ProductSelectDropdown
 *   value={selectedProductId}
 *   onChange={setSelectedProductId}
 *   products={products}
 *   placeholder="상품을 검색하세요"
 * />
 */
export function ProductSelectDropdown({
  value,
  onChange,
  products = [],
  placeholder = '상품을 검색하세요',
  disabled = false,
  loading = false,
  error,
}: ProductSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Find selected product for display
  const selectedProduct = products?.find((p) => p.id === value)

  // Filter products based on debounced search term
  const filteredProducts = products?.filter((product) => {
    if (!debouncedSearchTerm) return true
    const term = debouncedSearchTerm.toLowerCase()
    return (
      product.name.toLowerCase().includes(term) ||
      product.barcode.toLowerCase().includes(term)
    )
  })

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Handle product selection
  const handleSelect = useCallback(
    (product: ProductDTO) => {
      onChange(product.id)
      setSearchTerm('')
      setIsOpen(false)
    },
    [onChange]
  )

  // Handle clear selection
  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange(null)
      setSearchTerm('')
    },
    [onChange]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.blur()
      } else if (e.key === 'Enter' && filteredProducts && filteredProducts.length === 1) {
        handleSelect(filteredProducts[0])
      }
    },
    [filteredProducts, handleSelect]
  )

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <div
        className={`relative flex items-center w-full px-3 py-2 border rounded-lg transition-colors ${
          error
            ? 'border-error focus-within:ring-2 focus-within:ring-error'
            : 'border-neutral-300 focus-within:ring-2 focus-within:ring-primary-500'
        } ${disabled ? 'bg-neutral-100 cursor-not-allowed' : 'bg-white cursor-text'}`}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {selectedProduct && !isOpen ? (
          // Show selected product
          <div className="flex items-center justify-between w-full">
            <span className="text-neutral-900">{selectedProduct.name}</span>
            <span className="text-sm text-neutral-500 ml-2">({selectedProduct.barcode})</span>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="ml-2 p-0.5 hover:bg-neutral-100 rounded"
                tabIndex={-1}
              >
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            )}
          </div>
        ) : (
          // Show search input
          <div className="flex items-center w-full">
            <Search className="w-4 h-4 text-neutral-400 mr-2 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="flex-1 outline-none bg-transparent text-neutral-900 placeholder-neutral-400"
            />
          </div>
        )}
        {!selectedProduct && !isOpen && (
          <ChevronDown className="w-4 h-4 text-neutral-400 ml-2 flex-shrink-0" />
        )}
      </div>

      {/* Dropdown List */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 text-neutral-500 text-center">
              <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
              <span>로딩 중...</span>
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelect(product)}
                className={`w-full px-4 py-2 text-left hover:bg-primary-50 transition-colors ${
                  value === product.id ? 'bg-primary-50' : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-neutral-900">{product.name}</span>
                  <span className="text-sm text-neutral-500">{product.barcode}</span>
                </div>
                {product.category && (
                  <span className="text-xs text-neutral-400">{product.category}</span>
                )}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-neutral-500 text-center">
              상품을 찾을 수 없습니다
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  )
}