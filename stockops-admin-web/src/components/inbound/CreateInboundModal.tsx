import { useState } from 'react'
import { useCreateInbound } from '@/hooks/useInbound'

export function CreateInboundModal({ onClose }: { onClose: () => void }) {
  const [supplier, setSupplier] = useState('')
  const [inboundDate, setInboundDate] = useState('')
  const createMutation = useCreateInbound()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(
      {
        supplier,
        inboundDate: inboundDate || undefined,
      },
      {
        onSuccess: () => {
          onClose()
        },
      }
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-neutral-900 mb-4">입고 등록</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1">공급처</label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="공급처명을 입력하세요"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1">입고 예정일</label>
            <input
              type="date"
              value={inboundDate}
              onChange={(e) => setInboundDate(e.target.value)}
              className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 min-h-[44px] text-neutral-600 hover:text-neutral-700"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 min-h-[44px] bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {createMutation.isPending ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
