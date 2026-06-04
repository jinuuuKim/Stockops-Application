/**
 * Product detail drawer component.
 * Displays comprehensive product information in a slide-out panel.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useEffect, useRef } from 'react'
import { X, Package, Barcode, Tag, Scale, Calendar, DollarSign, Shield, Clock, Edit, Trash2 } from 'lucide-react'
import type { ProductDTO } from '@/types/product'

interface ProductDetailDrawerProps {
  product: ProductDTO | null
  open: boolean
  onClose: () => void
  onEdit: (product: ProductDTO) => void
  onDelete: (id: number) => void
}

/**
 * Formats an ISO date string to a localized display string.
 *
 * @param isoDate - ISO 8601 date string
 * @returns Localized date string or '-' if invalid
 */
function formatDate(isoDate: string): string {
  if (!isoDate) return '-'
  try {
    return new Date(isoDate).toLocaleString('ko-KR')
  } catch {
    return '-'
  }
}

/**
 * Renders a read-only detail row with icon, label, and value.
 *
 * @param icon - Lucide icon component
 * @param label - Field label
 * @param value - Field value
 * @returns Detail row JSX element
 */
function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-neutral-100 last:border-0">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-neutral-500 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-neutral-900 break-words">{value}</p>
      </div>
    </div>
  )
}

export function ProductDetailDrawer({ product, open, onClose, onEdit, onDelete }: ProductDetailDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousActiveElement = useRef<Element | null>(null)

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement
      closeButtonRef.current?.focus()
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus()
      }
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!product) return null

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-detail-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-600" />
            </div>
            <div className="min-w-0">
              <h2 id="product-detail-title" className="text-lg font-semibold text-neutral-900 truncate">
                {product.name}
              </h2>
              <p className="text-xs text-neutral-500">{product.barcode}</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-140px)] px-6 py-4">
          <DetailRow icon={Barcode} label="바코드" value={product.barcode} />
          <DetailRow icon={Tag} label="카테고리" value={product.category || '-'} />
          <DetailRow icon={Scale} label="단위" value={product.unit} />
          <DetailRow
            icon={Calendar}
            label="유통기한 관리"
            value={product.expiryManaged ? '예' : '아니오'}
          />
          <DetailRow
            icon={DollarSign}
            label="기본 가격"
            value={product.defaultPrice ? `₩${product.defaultPrice.toLocaleString()}` : '-'}
          />
          <DetailRow
            icon={Shield}
            label="안전 재고 수량"
            value={product.safetyStockQuantity ?? '-'}
          />
          <DetailRow icon={Clock} label="생성일" value={formatDate(product.createdAt)} />
          <DetailRow icon={Clock} label="수정일" value={formatDate(product.updatedAt)} />

          {product.description && (
            <div className="mt-4 p-4 rounded-xl bg-neutral-50">
              <p className="text-xs font-medium text-neutral-500 mb-1">설명</p>
              <p className="text-sm text-neutral-700 whitespace-pre-wrap">{product.description}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t border-neutral-200 bg-white flex gap-3">
          <button
            type="button"
            onClick={() => {
              onEdit(product)
              onClose()
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Edit className="w-4 h-4" />
            수정
          </button>
          <button
            type="button"
            onClick={() => {
              onDelete(product.id)
              onClose()
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}
