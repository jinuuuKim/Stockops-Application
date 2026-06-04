/**
 * Product create/edit modal component.
 * Provides form for creating and editing products.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useState, useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { CategorySelector } from '@/components/category/CategorySelector'
import { useCategories } from '@/hooks/useCategories'
import type { ProductDTO, CreateProductRequest, UpdateProductRequest } from '@/types/product'
import type { Category } from '@/types/category'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateProductRequest | UpdateProductRequest) => Promise<void>
  product?: ProductDTO | null
  isLoading?: boolean
}

const initialFormData: CreateProductRequest = {
  barcode: '',
  name: '',
  description: '',
  category: '',
  categoryId: undefined,
  unit: 'EA',
  expiryManaged: true,
  defaultPrice: 0,
  safetyStockQuantity: 0,
}

export function ProductModal({
  isOpen,
  onClose,
  onSubmit,
  product,
  isLoading = false,
}: ProductModalProps) {
  const [formData, setFormData] = useState<CreateProductRequest>(initialFormData)
  const { data: categories = [] } = useCategories()

  const categoryMap = useMemo(() => {
    const map = new Map<number, Category>()
    function traverse(list: Category[]) {
      for (const c of list) {
        map.set(c.id, c)
        if (c.children && c.children.length > 0) traverse(c.children)
      }
    }
    traverse(categories)
    return map
  }, [categories])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (product) {
      setFormData({
        barcode: product.barcode,
        name: product.name,
        description: product.description || '',
        category: product.category || '',
        categoryId: product.categoryId,
        unit: product.unit,
        expiryManaged: product.expiryManaged,
        defaultPrice: product.defaultPrice || 0,
        safetyStockQuantity: product.safetyStockQuantity || 0,
      })
    } else {
      setFormData(initialFormData)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [product, isOpen])

  const handleCategoryChange = (categoryId: number | null) => {
    const selectedCategory = categoryId ? categoryMap.get(categoryId) : null
    setFormData({
      ...formData,
      categoryId: categoryId ?? undefined,
      category: selectedCategory?.name ?? '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (product) {
      const updateData: UpdateProductRequest = {
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category || undefined,
        categoryId: formData.categoryId,
        unit: formData.unit,
        expiryManaged: formData.expiryManaged,
        defaultPrice: formData.defaultPrice || undefined,
        safetyStockQuantity: formData.safetyStockQuantity || undefined,
      }
      await onSubmit(updateData)
    } else {
      await onSubmit(formData)
    }
  }

  const handleClose = () => {
    setFormData(initialFormData)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-neutral-900">
            {product ? '상품 수정' : '새 상품'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              바코드 <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              disabled={!!product}
              placeholder="8801234567890"
            />
            {product && (
              <p className="text-xs text-neutral-500 mt-1">바코드는 수정할 수 없습니다</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              상품명 <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              placeholder="상품명을 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">설명</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={3}
              placeholder="상품 설명 (선택)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">카테고리</label>
            <CategorySelector
              value={formData.categoryId ?? null}
              onChange={handleCategoryChange}
              nullable
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                단위 <span className="text-error">*</span>
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="EA">EA (개)</option>
                <option value="BOX">BOX (박스)</option>
                <option value="KG">KG (킬로그램)</option>
                <option value="L">L (리터)</option>
                <option value="PACK">PACK (팩)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">기본 가격</label>
              <input
                type="number"
                value={formData.defaultPrice}
                onChange={(e) =>
                  setFormData({ ...formData, defaultPrice: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">안전 재고량</label>
              <input
                type="number"
                value={formData.safetyStockQuantity}
                onChange={(e) =>
                  setFormData({ ...formData, safetyStockQuantity: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                min="0"
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="expiryManaged"
              checked={formData.expiryManaged}
              onChange={(e) => setFormData({ ...formData, expiryManaged: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="expiryManaged" className="text-sm text-neutral-700">
              유통기한 관리 대상
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              disabled={isLoading}
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
