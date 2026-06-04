import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ScanBarcode, X } from 'lucide-react'
import api from '@/lib/api'
import { BarcodeScanner } from '@/components/common/BarcodeScanner'
import type { CreateOutboundRequest, AddOutboundItemRequest, OutboundDTO, OutboundItemDTO } from '@/types/outbound'
import type { ProductDTO } from '@/types/product'

export function CreateOutboundModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [customer, setCustomer] = useState('')
  const [outboundDate, setOutboundDate] = useState(new Date().toISOString().split('T')[0])
  const [createdOutbound, setCreatedOutbound] = useState<OutboundDTO | null>(null)
  const [items, setItems] = useState<Array<{ productId: number; quantity: number; productName: string }>>([])
  const [error, setError] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [scanError, setScanError] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState('')

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get<{ content: ProductDTO[] }>('/v1/products')
      return Array.isArray(response.data?.content) ? response.data.content : []
    },
  })

  const handleBarcodeScan = (barcode: string) => {
    const product = products.find((p) => p.barcode === barcode)
    if (product) {
      setSelectedProductId(String(product.id))
      setScanError('')
      setShowScanner(false)
    } else {
      setScanError(`바코드 '${barcode}'에 해당하는 상품을 찾을 수 없습니다.`)
    }
  }

  const createMutation = useMutation({
    mutationFn: async (request: CreateOutboundRequest) => {
      const response = await api.post<OutboundDTO>('/v1/outbounds', request)
      return response.data
    },
    onSuccess: (data) => {
      setCreatedOutbound(data)
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : '출고를 등록하지 못했습니다.'
      setError(message)
    },
  })

  const addItemMutation = useMutation({
    mutationFn: async ({ outboundId, request }: { outboundId: number; request: AddOutboundItemRequest }) => {
      const response = await api.post<OutboundItemDTO>(`/v1/outbounds/${outboundId}/items`, request)
      return response.data
    },
  })

  const handleCreateOutbound = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!customer.trim()) {
      setError('고객 또는 출고처를 입력해주세요.')
      return
    }
    createMutation.mutate({ customer, outboundDate })
  }

  const handleAddItem = () => {
    const productId = Number(selectedProductId)
    const parsedQuantity = Number(quantity)
    const selectedProduct = products.find((p) => p.id === productId)
    const productName = selectedProduct?.name ?? ''

    if (!productId || !selectedProduct || parsedQuantity <= 0 || Number.isNaN(parsedQuantity)) {
      setError('상품을 선택하고 올바른 수량을 입력해주세요.')
      return
    }

    if (!createdOutbound) {
      setError('먼저 출고 요청을 등록해주세요.')
      return
    }

    addItemMutation.mutate(
      { outboundId: createdOutbound.id, request: { productId, quantity: parsedQuantity } },
      {
        onSuccess: () => {
          setItems([...items, { productId, quantity: parsedQuantity, productName }])
          setSelectedProductId('')
          setQuantity('')
          setError('')
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : '출고 품목을 추가하지 못했습니다.'
          setError(message)
        },
      }
    )
  }

  const handleFinish = () => {
    if (items.length === 0) {
      setError('출고 품목을 1개 이상 추가해주세요.')
      return
    }
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">신규 출고 등록</h2>
          <button onClick={onClose} type="button" className="text-neutral-500 hover:text-neutral-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="bg-error/10 text-error p-3 rounded mb-4">{error}</div>}

        {!createdOutbound ? (
          <form onSubmit={handleCreateOutbound}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-neutral-700">고객/출고처 *</label>
              <input
                type="text"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="w-full p-2 min-h-[44px] text-base border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-neutral-700">출고일</label>
              <input
                type="date"
                value={outboundDate}
                onChange={(e) => setOutboundDate(e.target.value)}
                className="w-full p-2 min-h-[44px] text-base border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 min-h-[44px] border border-neutral-300 rounded hover:bg-neutral-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 min-h-[44px] bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? '등록 중...' : '출고 요청 등록'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="mb-4 p-3 bg-green-50 text-green-800 rounded">
              출고 #{createdOutbound.id}이 등록되었습니다. 아래에서 출고 품목을 추가하세요.
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-neutral-700">상품</label>
              {!showScanner ? (
                <>
                  <select
                    id="product-select"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full p-2 min-h-[44px] text-base border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">상품 선택</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="mt-2 flex items-center justify-center gap-2 w-full px-4 py-3 min-h-[48px] text-base font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
                  >
                    <ScanBarcode className="w-5 h-5" />
                    바코드 스캔
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <BarcodeScanner
                    onScan={handleBarcodeScan}
                    placeholder="상품 바코드를 스캔하세요"
                    onSuccess={() => setScanError('')}
                    onError={(err) => setScanError(err)}
                  />
                  {scanError && <p className="text-sm text-error">{scanError}</p>}
                  <button
                    type="button"
                    onClick={() => {
                      setShowScanner(false)
                      setScanError('')
                    }}
                    className="text-sm text-neutral-600 hover:text-neutral-700"
                  >
                    수동 선택으로 돌아가기
                  </button>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-neutral-700">수량</label>
              <input
                id="quantity-input"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full p-2 min-h-[44px] text-base border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="수량을 입력하세요"
              />
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              disabled={addItemMutation.isPending}
              className="w-full mb-4 px-4 py-2 min-h-[44px] bg-neutral-100 text-neutral-900 rounded hover:bg-neutral-200 disabled:opacity-50 transition-colors"
            >
              {addItemMutation.isPending ? '추가 중...' : '품목 추가'}
            </button>

            {items.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2 text-neutral-700">추가된 항목</h3>
                <ul className="border border-neutral-200 rounded divide-y divide-neutral-200">
                  {items.map((item, index) => (
                    <li key={index} className="p-2 text-sm text-neutral-900">
                      {item.productName} - 수량: {item.quantity}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                type="button"
                className="px-4 py-2 min-h-[44px] border border-neutral-300 rounded hover:bg-neutral-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleFinish}
                type="button"
                className="px-4 py-2 min-h-[44px] bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
              >
                완료
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
