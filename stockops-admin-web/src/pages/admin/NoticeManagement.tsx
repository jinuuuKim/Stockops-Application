import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { getAdminErrorMessage } from '@/api/admin'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import {
  useAdminNotices,
  useCreateAdminNotice,
  useDeleteAdminNotice,
  useUpdateAdminNotice,
} from '@/hooks/useAdmin'
import type { AdminNotice, CreateNoticeRequest, NoticeType, UpdateNoticeRequest } from '@/types/admin'

const PAGE_SIZE = 10
const NOTICE_TYPE_OPTIONS: NoticeType[] = ['SYSTEM', 'MAINTENANCE', 'UPDATE']
const NOTICE_TYPE_LABELS: Record<NoticeType, string> = {
  SYSTEM: '시스템',
  MAINTENANCE: '점검',
  UPDATE: '업데이트',
}

type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

interface NoticeFormData {
  title: string
  content: string
  type: NoticeType
  active: boolean
  publishStart: string
  publishEnd: string
}

const EMPTY_FORM: NoticeFormData = {
  title: '',
  content: '',
  type: 'SYSTEM',
  active: true,
  publishStart: '',
  publishEnd: '',
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR')
}

function formatDateTimeLocal(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function toIsoDateTime(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}

function getRangeError(start: string, end: string): string {
  if (start && end && new Date(end).getTime() <= new Date(start).getTime()) {
    return '게시 종료일은 게시 시작일 이후여야 합니다.'
  }
  return ''
}

function buildFormFromNotice(notice: AdminNotice): NoticeFormData {
  return {
    title: notice.title,
    content: notice.content ?? '',
    type: notice.type,
    active: notice.active,
    publishStart: formatDateTimeLocal(notice.noticeAt),
    publishEnd: '',
  }
}

export function NoticeManagement() {
  const [page, setPage] = useState(0)
  const [typeFilter, setTypeFilter] = useState<'ALL' | NoticeType>('ALL')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL')
  const [formOpen, setFormOpen] = useState(false)
  const [editingNotice, setEditingNotice] = useState<AdminNotice | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminNotice | null>(null)
  const [formData, setFormData] = useState<NoticeFormData>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [mutationError, setMutationError] = useState('')

  const noticeFilter = useMemo(
    () => ({
      page,
      size: PAGE_SIZE,
      ...(typeFilter !== 'ALL' ? { type: typeFilter } : {}),
      ...(activeFilter !== 'ALL' ? { active: activeFilter === 'ACTIVE' } : {}),
    }),
    [activeFilter, page, typeFilter],
  )

  const noticesQuery = useAdminNotices(noticeFilter)
  const createNotice = useCreateAdminNotice()
  const updateNotice = useUpdateAdminNotice()
  const deleteNotice = useDeleteAdminNotice()

  const notices = noticesQuery.data?.content ?? []
  const totalElements = noticesQuery.data?.totalElements ?? 0
  const totalPages = noticesQuery.data?.totalPages ?? 0
  const isSubmitting = createNotice.isPending || updateNotice.isPending
  const isDeleting = deleteNotice.isPending

  const openCreateForm = () => {
    setEditingNotice(null)
    setFormData(EMPTY_FORM)
    setFormError('')
    setMutationError('')
    setFormOpen(true)
  }

  const openEditForm = (notice: AdminNotice) => {
    setEditingNotice(notice)
    setFormData(buildFormFromNotice(notice))
    setFormError('')
    setMutationError('')
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingNotice(null)
    setFormData(EMPTY_FORM)
    setFormError('')
  }

  const resetToFirstPage = () => {
    setPage(0)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMutationError('')

    const title = formData.title.trim()
    if (!title) {
      setFormError('공지 제목을 입력해 주세요.')
      return
    }

    const rangeError = getRangeError(formData.publishStart, formData.publishEnd)
    if (rangeError) {
      setFormError(rangeError)
      return
    }

    setFormError('')
    const request: CreateNoticeRequest | UpdateNoticeRequest = {
      title,
      content: formData.content.trim(),
      type: formData.type,
      active: formData.active,
      noticeAt: toIsoDateTime(formData.publishStart),
    }

    try {
      if (editingNotice) {
        await updateNotice.mutateAsync({ id: editingNotice.id, request })
      } else {
        await createNotice.mutateAsync(request as CreateNoticeRequest)
      }
      closeForm()
    } catch (error) {
      setFormError(getAdminErrorMessage(error, '공지 저장에 실패했습니다.'))
    }
  }

  const handleToggleActive = async (notice: AdminNotice) => {
    setMutationError('')
    try {
      await updateNotice.mutateAsync({
        id: notice.id,
        request: { active: !notice.active },
      })
    } catch (error) {
      setMutationError(getAdminErrorMessage(error, '공지 상태 변경에 실패했습니다.'))
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setMutationError('')
    try {
      await deleteNotice.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch (error) {
      setMutationError(getAdminErrorMessage(error, '공지 삭제에 실패했습니다.'))
    }
  }

  const listError = noticesQuery.isError
    ? getAdminErrorMessage(noticesQuery.error, '공지 목록을 불러오지 못했습니다.')
    : ''

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">공지 관리</h1>
          <p className="mt-1 text-sm text-neutral-500">관리자 공지를 API 데이터로 조회하고 게시 상태를 관리합니다.</p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          새 공지
        </button>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-4" aria-label="공지 필터">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="notice-type-filter" className="block text-sm font-medium text-neutral-700 mb-1">유형</label>
            <select
              id="notice-type-filter"
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value as 'ALL' | NoticeType)
                resetToFirstPage()
              }}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
            >
              <option value="ALL">전체 유형</option>
              {NOTICE_TYPE_OPTIONS.map(type => (
                <option key={type} value={type}>{NOTICE_TYPE_LABELS[type]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="notice-active-filter" className="block text-sm font-medium text-neutral-700 mb-1">상태</label>
            <select
              id="notice-active-filter"
              value={activeFilter}
              onChange={(event) => {
                setActiveFilter(event.target.value as ActiveFilter)
                resetToFirstPage()
              }}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
            >
              <option value="ALL">전체 상태</option>
              <option value="ACTIVE">활성</option>
              <option value="INACTIVE">비활성</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setTypeFilter('ALL')
                setActiveFilter('ALL')
                setPage(0)
              }}
              className="w-full px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            >
              필터 초기화
            </button>
          </div>
        </div>
      </section>

      {noticesQuery.isLoading && (
        <div role="status" className="flex items-center gap-2 text-neutral-500 py-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-primary-600" />
          <span className="text-sm">공지 목록을 불러오는 중입니다.</span>
        </div>
      )}

      {(listError || mutationError) && (
        <div role="alert" className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
          {listError || mutationError}
        </div>
      )}

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500">제목</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500">유형</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500">상태</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500">게시 시작</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500">생성일</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {!noticesQuery.isLoading && !listError && notices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-neutral-500">
                  등록된 공지가 없습니다.
                </td>
              </tr>
            )}
            {notices.map(notice => (
              <tr key={notice.id} className="hover:bg-neutral-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-neutral-900">{notice.title}</div>
                  <div className="mt-1 line-clamp-2 text-sm text-neutral-500">{notice.content || '내용 없음'}</div>
                </td>
                <td className="px-6 py-4 text-sm text-neutral-600">{NOTICE_TYPE_LABELS[notice.type]}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${notice.active ? 'bg-success/10 text-success' : 'bg-neutral-100 text-neutral-600'}`}>
                    {notice.active ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-neutral-500">{formatDate(notice.noticeAt)}</td>
                <td className="px-6 py-4 text-sm text-neutral-500">{formatDate(notice.createdAt)}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(notice)}
                    disabled={updateNotice.isPending}
                    className="px-3 py-1 mr-2 rounded-lg border border-neutral-300 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {notice.active ? '비활성화' : '활성화'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditForm(notice)}
                    aria-label={`${notice.title} 수정`}
                    className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-600"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(notice)}
                    aria-label={`${notice.title} 삭제`}
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

      <div className="flex items-center justify-between text-sm text-neutral-600">
        <span>총 {totalElements}개 공지</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage(previous => Math.max(previous - 1, 0))}
            disabled={page === 0 || noticesQuery.isLoading}
            className="px-3 py-1 rounded-lg border border-neutral-300 disabled:opacity-50"
          >
            이전
          </button>
          <span className="px-2 py-1">{page + 1} / {Math.max(totalPages, 1)}</span>
          <button
            type="button"
            onClick={() => setPage(previous => previous + 1)}
            disabled={page + 1 >= Math.max(totalPages, 1) || noticesQuery.isLoading}
            className="px-3 py-1 rounded-lg border border-neutral-300 disabled:opacity-50"
          >
            다음
          </button>
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="notice-form-title">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
            <h2 id="notice-form-title" className="text-lg font-semibold mb-4">
              {editingNotice ? '공지 수정' : '새 공지 작성'}
            </h2>
            {formError && (
              <div role="alert" className="mb-4 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
                {formError}
              </div>
            )}
            <form aria-label={editingNotice ? '공지 수정 폼' : '공지 작성 폼'} className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="notice-title" className="block text-sm font-medium text-neutral-700 mb-1">제목</label>
                <input
                  id="notice-title"
                  type="text"
                  value={formData.title}
                  onChange={event => setFormData({ ...formData, title: event.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="notice-content" className="block text-sm font-medium text-neutral-700 mb-1">내용</label>
                <textarea
                  id="notice-content"
                  value={formData.content}
                  onChange={event => setFormData({ ...formData, content: event.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  rows={4}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="notice-type" className="block text-sm font-medium text-neutral-700 mb-1">유형</label>
                  <select
                    id="notice-type"
                    value={formData.type}
                    onChange={event => setFormData({ ...formData, type: event.target.value as NoticeType })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  >
                    {NOTICE_TYPE_OPTIONS.map(type => (
                      <option key={type} value={type}>{NOTICE_TYPE_LABELS[type]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="notice-active" className="block text-sm font-medium text-neutral-700 mb-1">게시 상태</label>
                  <select
                    id="notice-active"
                    value={formData.active ? 'true' : 'false'}
                    onChange={event => setFormData({ ...formData, active: event.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  >
                    <option value="true">활성</option>
                    <option value="false">비활성</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="notice-publish-start" className="block text-sm font-medium text-neutral-700 mb-1">게시 시작일</label>
                  <input
                    id="notice-publish-start"
                    type="datetime-local"
                    value={formData.publishStart}
                    onChange={event => setFormData({ ...formData, publishStart: event.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="notice-publish-end" className="block text-sm font-medium text-neutral-700 mb-1">게시 종료일</label>
                  <input
                    id="notice-publish-end"
                    type="datetime-local"
                    value={formData.publishEnd}
                    onChange={event => setFormData({ ...formData, publishEnd: event.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  />
                  <p className="mt-1 text-xs text-neutral-500">종료일은 현재 API 저장 필드가 없어 유효성 검증에만 사용됩니다.</p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {isSubmitting ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="공지 삭제"
        description={deleteTarget ? `${deleteTarget.title} 공지를 삭제하시겠습니까?` : '정말로 이 공지를 삭제하시겠습니까?'}
        variant="destructive"
        confirmLabel={isDeleting ? '삭제 중...' : '삭제'}
      />
    </div>
  )
}
