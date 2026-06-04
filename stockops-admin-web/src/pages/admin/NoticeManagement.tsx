import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

interface NoticeDTO {
  id: number
  title: string
  content: string
  type: string
  active: boolean
  createdAt: string
}

export function NoticeManagement() {
  const [notices, setNotices] = useState<NoticeDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [formData, setFormData] = useState({ title: '', content: '', type: 'SYSTEM' })
  const [error, setError] = useState('')

  const fetchNotices = useCallback(async () => {
    setLoading(true)
    try {
      setError('')
      const res = await api.get<NoticeDTO[]>('/v1/notices')
      setNotices(Array.isArray(res.data) ? res.data : [])
    } catch {
      setError('공지 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    void fetchNotices()
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [fetchNotices])

  const handleCreate = async () => {
    try {
      setError('')
      await api.post('/v1/notices', formData)
      setShowForm(false)
      setFormData({ title: '', content: '', type: 'SYSTEM' })
      void fetchNotices()
    } catch {
      setError('공지 저장에 실패했습니다.')
    }
  }

  const handleDelete = async () => {
    if (deleteTarget === null) return
    try {
      setError('')
      await api.delete(`/v1/notices/${deleteTarget}`)
      setDeleteTarget(null)
      void fetchNotices()
    } catch {
      setError('공지 삭제에 실패했습니다.')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">공지 관리</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          새 공지
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-neutral-500 py-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-primary-600" />
          <span className="text-sm">로딩 중...</span>
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500">제목</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500">유형</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500">상태</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500">생성일</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {notices.map(notice => (
              <tr key={notice.id} className="hover:bg-neutral-50">
                <td className="px-6 py-4 font-medium text-neutral-900">{notice.title}</td>
                <td className="px-6 py-4 text-sm text-neutral-600">{notice.type}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${notice.active ? 'bg-success/10 text-success' : 'bg-neutral-100 text-neutral-600'}`}>
                    {notice.active ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-neutral-500">{new Date(notice.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  <button type="button" className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-600">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(notice.id)}
                    className="p-2 hover:bg-error/10 rounded-lg text-error"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">새 공지 작성</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="notice-title" className="block text-sm font-medium text-neutral-700 mb-1">제목</label>
                <input
                  id="notice-title"
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="notice-content" className="block text-sm font-medium text-neutral-700 mb-1">내용</label>
                <textarea
                  id="notice-content"
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  rows={4}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="공지 삭제"
        description="정말로 이 공지를 삭제하시겠습니까?"
        variant="destructive"
        confirmLabel="삭제"
      />
    </div>
  )
}
