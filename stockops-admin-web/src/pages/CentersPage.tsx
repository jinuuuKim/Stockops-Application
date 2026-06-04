/**
 * Centers management page.
 * Provides CRUD operations for centers with pagination, error handling, and accessible confirmations.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import api from '@/lib/api'
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

interface Center {
  id: number
  code: string
  name: string
  address?: string
  phone?: string
  status: string
}

export function CentersPage() {
  const [centers, setCenters] = useState<Center[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingCenter, setEditingCenter] = useState<Center | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 10
  const [formError, setFormError] = useState("")
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    phone: '',
  })

  const fetchCenters = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/v1/centers')
      setCenters(Array.isArray(response.data) ? response.data : [])
    } catch {
      setError('센터 데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- initial page load hydrates the center list from the API. */
    void fetchCenters()
  }, [fetchCenters])

  const handleSubmit = async (e: React.FormEvent) => {
    setFormError("")
    e.preventDefault()
    try {
      if (editingCenter) {
        await api.put(`/v1/centers/${editingCenter.id}`, formData)
      } else {
        await api.post('/v1/centers', formData)
      }
      void fetchCenters()
      setShowModal(false)
      setEditingCenter(null)
      setFormData({ code: '', name: '', address: '', phone: '' })
    } catch {
      setFormError('센터 저장에 실패했습니다.')
    }
  }

  const handleEdit = (center: Center) => {
    setEditingCenter(center)
    setFormData({
      code: center.code,
      name: center.name,
      address: center.address || '',
      phone: center.phone || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/v1/centers/${id}`)
      void fetchCenters()
    } catch {
      setError('센터 삭제에 실패했습니다.')
    } finally {
      setDeleteConfirm({ open: false, id: null })
    }
  }

  const paginatedCenters = useMemo(() => {
    const start = currentPage * pageSize
    return centers.slice(start, start + pageSize)
  }, [centers, currentPage])

  const totalPages = Math.ceil(centers.length / pageSize)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">센터 관리</h1>
        <button
          type="button"
          onClick={() => {
            setEditingCenter(null)
            setFormData({ code: '', name: '', address: '', phone: '' })
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          새 센터
        </button>
      </div>

      {loading ? (
        <EmptyState
          title="로딩 중..."
          description="센터 데이터를 불러오는 중입니다"
          variant="empty"
        />
      ) : error ? (
        <EmptyState
          title="데이터 로딩 실패"
          description={error}
          variant="error"
          actionLabel="다시 시도"
          onAction={() => void fetchCenters()}
        />
      ) : centers.length === 0 ? (
        <EmptyState
          title="등록된 센터가 없습니다"
          description="첫 번째 센터를 추가해보세요"
          actionLabel="센터 추가"
          onAction={() => {
            setEditingCenter(null)
            setFormData({ code: '', name: '', address: '', phone: '' })
            setShowModal(true)
          }}
        />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">코드</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">센터명</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">주소</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">상태</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {paginatedCenters.map((center) => (
                  <tr key={center.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 font-mono text-sm">{center.code}</td>
                    <td className="px-6 py-4 font-medium">{center.name}</td>
                    <td className="px-6 py-4 text-sm text-text-secondary">{center.address || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        center.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {center.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleEdit(center)}
                        className="p-2 hover:bg-neutral-100 rounded-lg text-text-secondary"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm({ open: true, id: center.id })}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3">
              <div className="text-sm text-text-secondary">
                총 {centers.length}개 중 {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, centers.length)}개 표시
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="px-3 py-1 border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = currentPage < 3 ? i : currentPage - 2 + i
                    if (pageNum >= totalPages) return null
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded transition-colors ${
                          currentPage === pageNum
                            ? 'bg-primary-600 text-white'
                            : 'hover:bg-neutral-100'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="px-3 py-1 border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={() => {
          if (deleteConfirm.id !== null) {
            void handleDelete(deleteConfirm.id)
          }
        }}
        title="센터 삭제"
        description="이 센터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        variant="destructive"
        confirmLabel="삭제"
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingCenter ? '센터 수정' : '새 센터'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="rounded-lg bg-error/10 p-3 text-sm text-error" role="alert">
                  {formError}
                </div>
              )}
              <div>
                <label htmlFor="center-code" className="block text-sm font-medium mb-1">센터 코드 *</label>
                <input
                  id="center-code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg disabled:bg-neutral-100 disabled:text-text-secondary disabled:cursor-not-allowed"
                  required
                  disabled={!!editingCenter}
                />
                {editingCenter && (
                  <p className="mt-1 text-xs text-text-secondary">코드는 변경할 수 없습니다</p>
                )}
              </div>
              <div>
                <label htmlFor="center-name" className="block text-sm font-medium mb-1">센터명 *</label>
                <input
                  id="center-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label htmlFor="center-address" className="block text-sm font-medium mb-1">주소</label>
                <input
                  id="center-address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="center-phone" className="block text-sm font-medium mb-1">연락처</label>
                <input
                  id="center-phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
