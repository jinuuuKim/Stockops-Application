import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NoticeManagement } from './NoticeManagement'
import type { AdminNotice, AdminPageResponse } from '@/types/admin'

vi.mock('@/hooks/useAdmin', () => ({
  useAdminNotices: vi.fn(),
  useCreateAdminNotice: vi.fn(),
  useUpdateAdminNotice: vi.fn(),
  useDeleteAdminNotice: vi.fn(),
}))

import {
  useAdminNotices,
  useCreateAdminNotice,
  useDeleteAdminNotice,
  useUpdateAdminNotice,
} from '@/hooks/useAdmin'

const createMutateAsync = vi.fn()
const updateMutateAsync = vi.fn()
const deleteMutateAsync = vi.fn()

function buildNotice(overrides: Partial<AdminNotice> = {}): AdminNotice {
  return {
    id: 1,
    title: '시스템 점검 안내',
    content: '오늘 밤 시스템 점검이 있습니다.',
    type: 'SYSTEM',
    active: true,
    createdBy: 1,
    noticeAt: '2026-06-05T09:00:00Z',
    createdAt: '2026-06-05T08:00:00Z',
    updatedAt: '2026-06-05T08:30:00Z',
    ...overrides,
  }
}

function buildNoticesPage(notices: AdminNotice[], overrides: Partial<AdminPageResponse<AdminNotice>> = {}): AdminPageResponse<AdminNotice> {
  return {
    content: notices,
    totalElements: notices.length,
    totalPages: notices.length === 0 ? 0 : 1,
    size: 10,
    number: 0,
    ...overrides,
  }
}

function mockNoticesQuery(overrides: Record<string, unknown> = {}) {
  vi.mocked(useAdminNotices).mockReturnValue({
    data: buildNoticesPage([buildNotice()]),
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  } as unknown as ReturnType<typeof useAdminNotices>)
}

function mockMutations() {
  vi.mocked(useCreateAdminNotice).mockReturnValue({
    mutateAsync: createMutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useCreateAdminNotice>)
  vi.mocked(useUpdateAdminNotice).mockReturnValue({
    mutateAsync: updateMutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateAdminNotice>)
  vi.mocked(useDeleteAdminNotice).mockReturnValue({
    mutateAsync: deleteMutateAsync,
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteAdminNotice>)
}

describe('NoticeManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNoticesQuery()
    mockMutations()
    createMutateAsync.mockResolvedValue(buildNotice({ id: 2, title: '신규 공지' }))
    updateMutateAsync.mockResolvedValue(buildNotice({ active: false }))
    deleteMutateAsync.mockResolvedValue(undefined)
  })

  it('lists notices from the admin notices hook and sends filters to the API hook', async () => {
    render(<NoticeManagement />)

    expect(screen.getByText('시스템 점검 안내')).toBeInTheDocument()
    expect(screen.getByText('오늘 밤 시스템 점검이 있습니다.')).toBeInTheDocument()
    expect(screen.getAllByText('시스템').length).toBeGreaterThanOrEqual(1)
    expect(useAdminNotices).toHaveBeenLastCalledWith({ page: 0, size: 10 })

    fireEvent.change(screen.getByLabelText('유형'), { target: { value: 'MAINTENANCE' } })
    fireEvent.change(screen.getByLabelText('상태'), { target: { value: 'ACTIVE' } })

    await waitFor(() => {
      expect(useAdminNotices).toHaveBeenLastCalledWith({
        page: 0,
        size: 10,
        type: 'MAINTENANCE',
        active: true,
      })
    })
  })

  it('shows loading, error, and empty list states', () => {
    mockNoticesQuery({ data: undefined, isLoading: true })
    const { rerender } = render(<NoticeManagement />)
    expect(screen.getByRole('status')).toHaveTextContent('공지 목록을 불러오는 중입니다.')

    mockNoticesQuery({ data: undefined, isLoading: false, isError: true, error: new Error('load failed') })
    rerender(<NoticeManagement />)
    expect(screen.getByRole('alert')).toHaveTextContent('공지 목록을 불러오지 못했습니다.')

    mockNoticesQuery({ data: buildNoticesPage([]), isLoading: false, isError: false, error: null })
    rerender(<NoticeManagement />)
    expect(screen.getByText('등록된 공지가 없습니다.')).toBeInTheDocument()
  })

  it('creates a notice with supported backend fields', async () => {
    render(<NoticeManagement />)

    fireEvent.click(screen.getByRole('button', { name: '새 공지' }))
    const form = screen.getByRole('form', { name: '공지 작성 폼' })
    fireEvent.change(within(form).getByLabelText('제목'), { target: { value: '신규 공지' } })
    fireEvent.change(within(form).getByLabelText('내용'), { target: { value: '새로운 운영 공지입니다.' } })
    fireEvent.change(within(form).getByLabelText('유형'), { target: { value: 'UPDATE' } })
    fireEvent.change(within(form).getByLabelText('게시 상태'), { target: { value: 'false' } })
    fireEvent.change(within(form).getByLabelText('게시 시작일'), { target: { value: '2026-06-05T09:00' } })
    fireEvent.change(within(form).getByLabelText('게시 종료일'), { target: { value: '2026-06-06T09:00' } })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith({
        title: '신규 공지',
        content: '새로운 운영 공지입니다.',
        type: 'UPDATE',
        active: false,
        noticeAt: new Date('2026-06-05T09:00').toISOString(),
      })
    })
  })

  it('blocks invalid publication windows before saving', async () => {
    render(<NoticeManagement />)

    fireEvent.click(screen.getByRole('button', { name: '새 공지' }))
    const form = screen.getByRole('form', { name: '공지 작성 폼' })
    fireEvent.change(within(form).getByLabelText('제목'), { target: { value: '기간 오류 공지' } })
    fireEvent.change(within(form).getByLabelText('게시 시작일'), { target: { value: '2026-06-06T09:00' } })
    fireEvent.change(within(form).getByLabelText('게시 종료일'), { target: { value: '2026-06-05T09:00' } })
    fireEvent.submit(form)

    expect(await screen.findByRole('alert')).toHaveTextContent('게시 종료일은 게시 시작일 이후여야 합니다.')
    expect(createMutateAsync).not.toHaveBeenCalled()
  })

  it('edits an existing notice', async () => {
    render(<NoticeManagement />)

    fireEvent.click(screen.getByRole('button', { name: '시스템 점검 안내 수정' }))
    const form = screen.getByRole('form', { name: '공지 수정 폼' })
    fireEvent.change(within(form).getByLabelText('제목'), { target: { value: '수정된 공지' } })
    fireEvent.change(within(form).getByLabelText('유형'), { target: { value: 'MAINTENANCE' } })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: 1,
        request: expect.objectContaining({
          title: '수정된 공지',
          content: '오늘 밤 시스템 점검이 있습니다.',
          type: 'MAINTENANCE',
          active: true,
        }),
      })
    })
  })

  it('activates or deactivates notices through the update mutation', async () => {
    render(<NoticeManagement />)

    fireEvent.click(screen.getByRole('button', { name: '비활성화' }))

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: 1,
        request: { active: false },
      })
    })
  })

  it('deletes a notice after confirmation', async () => {
    render(<NoticeManagement />)

    fireEvent.click(screen.getByRole('button', { name: '시스템 점검 안내 삭제' }))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('시스템 점검 안내 공지를 삭제하시겠습니까?')
    fireEvent.click(within(dialog).getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(deleteMutateAsync).toHaveBeenCalledWith(1)
    })
  })
})
