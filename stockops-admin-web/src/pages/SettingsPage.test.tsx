import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { SettingsPage } from './SettingsPage'
import { useAuthStore } from '@/stores/authStore'
import type { AdminPageResponse, AdminRole, AdminUser } from '@/types/admin'
import type { AuthenticatedUser } from '@/types/auth'

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}))

vi.mock('@/hooks/useAdmin', () => ({
  useAdminUsers: vi.fn(),
  useAdminRoles: vi.fn(),
  useCreateAdminUser: vi.fn(),
  useUpdateAdminUser: vi.fn(),
  useDeleteAdminUser: vi.fn(),
}))

import { useAdminRoles, useAdminUsers, useCreateAdminUser, useDeleteAdminUser, useUpdateAdminUser } from '@/hooks/useAdmin'

const createMutateAsync = vi.fn()
const updateMutateAsync = vi.fn()
const deleteMutateAsync = vi.fn()
const refetchUsers = vi.fn()

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 1,
    email: 'admin@stockops.test',
    name: 'Admin User',
    role: 'ADMIN',
    scopeMetadata: {
      global: true,
      assignments: [],
      centerIds: [],
      warehouseIds: [],
    },
    createdAt: '2026-06-05T09:00:00Z',
    updatedAt: '2026-06-05T09:00:00Z',
    ...overrides,
  }
}

function buildAuthUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 99,
    email: 'current-admin@stockops.test',
    name: 'Current Admin',
    role: 'ADMIN',
    permissions: ['ROLE_READ'],
    scopeMetadata: {
      global: true,
      assignments: [],
      centerIds: [],
      warehouseIds: [],
    },
    ...overrides,
  }
}

function buildRole(overrides: Partial<AdminRole> = {}): AdminRole {
  return {
    id: 1,
    name: 'ADMIN',
    description: '시스템 관리자',
    scopeMetadata: {
      global: true,
      assignments: [],
      centerIds: [],
      warehouseIds: [],
    },
    createdAt: '2026-06-05T09:00:00Z',
    ...overrides,
  }
}

function buildUsersPage(users: AdminUser[], overrides: Partial<AdminPageResponse<AdminUser>> = {}): AdminPageResponse<AdminUser> {
  return {
    content: users,
    totalElements: users.length,
    totalPages: users.length === 0 ? 0 : 1,
    size: 10,
    number: 0,
    ...overrides,
  }
}

function mockUsersQuery(overrides: Record<string, unknown> = {}) {
  vi.mocked(useAdminUsers).mockReturnValue({
    data: buildUsersPage([buildUser()]),
    isLoading: false,
    isError: false,
    error: null,
    refetch: refetchUsers,
    ...overrides,
  } as unknown as ReturnType<typeof useAdminUsers>)
}

function mockRolesQuery(overrides: Record<string, unknown> = {}) {
  vi.mocked(useAdminRoles).mockReturnValue({
    data: [buildRole(), buildRole({ id: 2, name: 'MANAGER', description: null })],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useAdminRoles>)
}

function renderUsersTab() {
  render(<SettingsPage />)
  fireEvent.click(screen.getByRole('button', { name: /사용자 관리/ }))
}

function renderPermissionsTab() {
  render(<SettingsPage />)
  fireEvent.click(screen.getByRole('button', { name: /권한 설정/ }))
}

function renderNotificationsTab() {
  render(<SettingsPage />)
  fireEvent.click(screen.getByRole('button', { name: /알림/ }))
}

describe('SettingsPage settings and permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsersQuery()
    mockRolesQuery()
    vi.mocked(useCreateAdminUser).mockReturnValue({
      mutateAsync: createMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateAdminUser>)
    vi.mocked(useUpdateAdminUser).mockReturnValue({
      mutateAsync: updateMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateAdminUser>)
    vi.mocked(useDeleteAdminUser).mockReturnValue({
      mutateAsync: deleteMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteAdminUser>)
    useAuthStore.setState({ token: 'test-token', user: buildAuthUser(), isRestoring: false, hasTriedRestore: true })
  })

  it('shows an honest disabled state for unsupported general settings', () => {
    render(<SettingsPage />)

    expect(screen.getByText('일반 설정 저장은 아직 지원하지 않습니다.')).toBeInTheDocument()
    expect(screen.getByText(/`\/api\/v1\/settings` 또는 일반 설정 컨트롤러가 없어/)).toBeInTheDocument()
    expect(screen.getByText('저장/초기화')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument()
  })

  it('shows backend roles as read-only permission data without static checkboxes', () => {
    renderPermissionsTab()

    expect(screen.getByText(/역할 목록은 실제 `\/api\/v1\/roles` 응답에서 조회/)).toBeInTheDocument()
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
    expect(screen.getByText('MANAGER')).toBeInTheDocument()
    expect(screen.getByText('시스템 관리자')).toBeInTheDocument()
    expect(screen.getAllByText('백엔드 응답에 권한 목록이 포함되지 않았습니다.')).toHaveLength(2)
    expect(screen.getByText(/권한 카탈로그와 역할-권한 수정 API가 추가되면/)).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: '권한 저장' })).not.toBeInTheDocument()
  })

  it('renders backend-provided role permissions as read-only badges when present', () => {
    mockRolesQuery({ data: [buildRole({ permissions: ['ROLE_READ', 'USER_UPDATE'] })] })

    renderPermissionsTab()

    expect(screen.getByText('ROLE_READ')).toBeInTheDocument()
    expect(screen.getByText('USER_UPDATE')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '권한 저장' })).not.toBeInTheDocument()
  })

  it('links to notification channel settings without fake notification controls', () => {
    renderNotificationsTab()

    expect(screen.getByText(/임시 체크박스나 저장 버튼을 제공하지 않습니다/)).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '채널 설정 관리' }))
    expect(navigateMock).toHaveBeenCalledWith('/settings/notification-channels')
  })
})

describe('SettingsPage user management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsersQuery()
    mockRolesQuery()
    vi.mocked(useCreateAdminUser).mockReturnValue({
      mutateAsync: createMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateAdminUser>)
    vi.mocked(useUpdateAdminUser).mockReturnValue({
      mutateAsync: updateMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateAdminUser>)
    vi.mocked(useDeleteAdminUser).mockReturnValue({
      mutateAsync: deleteMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteAdminUser>)
    createMutateAsync.mockResolvedValue(buildUser({ id: 2, email: 'new@stockops.test' }))
    updateMutateAsync.mockResolvedValue(buildUser({ name: 'Updated User', role: 'MANAGER' }))
    deleteMutateAsync.mockResolvedValue(undefined)
    useAuthStore.setState({ token: 'test-token', user: buildAuthUser(), isRestoring: false, hasTriedRestore: true })
  })

  it('lists users from the admin users hook and shows unsupported status action honestly', () => {
    renderUsersTab()

    expect(screen.getByText('admin@stockops.test')).toBeInTheDocument()
    expect(screen.getByText('Admin User')).toBeInTheDocument()
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
    expect(screen.getByText(/계정 비활성화\/재활성화는 백엔드 엔드포인트가 없어/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '상태 변경 미지원' })).toBeDisabled()
  })

  it('shows the loading state for the user list', () => {
    mockUsersQuery({ data: undefined, isLoading: true })
    renderUsersTab()
    expect(screen.getByRole('status')).toHaveTextContent('사용자 목록을 불러오는 중입니다.')
  })

  it('shows the error state for the user list', () => {
    mockUsersQuery({ data: undefined, isLoading: false, isError: true, error: new Error('load failed') })
    renderUsersTab()
    expect(screen.getByRole('alert')).toHaveTextContent('사용자 목록을 불러오지 못했습니다.')
  })

  it('shows the empty state for the user list', () => {
    mockUsersQuery({ data: buildUsersPage([]) })
    renderUsersTab()
    expect(screen.getByText('등록된 사용자가 없습니다.')).toBeInTheDocument()
  })

  it('requests the next page when pagination advances', async () => {
    vi.mocked(useAdminUsers).mockImplementation((request) => ({
      data: buildUsersPage([buildUser()], {
        totalElements: 11,
        totalPages: 2,
        number: request?.page ?? 0,
      }),
      isLoading: false,
      isError: false,
      error: null,
      refetch: refetchUsers,
    } as unknown as ReturnType<typeof useAdminUsers>))

    renderUsersTab()
    fireEvent.click(screen.getByRole('button', { name: '다음' }))

    await waitFor(() => {
      expect(useAdminUsers).toHaveBeenLastCalledWith({ page: 1, size: 10 })
    })
  })

  it('creates a user with backend role names', async () => {
    renderUsersTab()

    fireEvent.click(screen.getByRole('button', { name: '사용자 추가' }))
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'new@stockops.test' } })
    fireEvent.change(screen.getByLabelText('초기 비밀번호'), { target: { value: 'secret-password' } })
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: 'New Admin' } })
    fireEvent.change(screen.getByLabelText('역할'), { target: { value: 'ADMIN' } })
    fireEvent.submit(screen.getByRole('form', { name: '사용자 추가 폼' }))

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith({
        email: 'new@stockops.test',
        password: 'secret-password',
        name: 'New Admin',
        role: 'ADMIN',
      })
    })
  })

  it('edits only name and role for an existing user', async () => {
    renderUsersTab()

    fireEvent.click(screen.getByRole('button', { name: 'admin@stockops.test 수정' }))
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: 'Renamed Manager' } })
    fireEvent.change(screen.getByLabelText('역할'), { target: { value: 'MANAGER' } })
    fireEvent.submit(screen.getByRole('form', { name: '사용자 수정 폼' }))

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: 1,
        request: {
          name: 'Renamed Manager',
          role: 'MANAGER',
        },
      })
    })
  })

  it('prevents the current administrator from removing their own ADMIN role', async () => {
    useAuthStore.setState({ user: buildAuthUser({ id: 1, email: 'admin@stockops.test' }) })
    renderUsersTab()

    fireEvent.click(screen.getByRole('button', { name: 'admin@stockops.test 수정' }))
    expect(screen.getByLabelText('역할')).toBeDisabled()
    expect(screen.getByText('본인 관리자 계정의 ADMIN 역할은 직접 제거할 수 없습니다.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: 'Still Admin' } })
    fireEvent.submit(screen.getByRole('form', { name: '사용자 수정 폼' }))

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: 1,
        request: {
          name: 'Still Admin',
          role: 'ADMIN',
        },
      })
    })
  })

  it('prevents deleting the current administrator account', () => {
    useAuthStore.setState({ user: buildAuthUser({ id: 1, email: 'admin@stockops.test' }) })
    renderUsersTab()

    expect(screen.getByRole('button', { name: 'admin@stockops.test 삭제' })).toBeDisabled()
  })

  it('deletes a user after confirmation', async () => {
    renderUsersTab()

    fireEvent.click(screen.getByRole('button', { name: 'admin@stockops.test 삭제' }))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('admin@stockops.test 계정을 삭제하시겠습니까?')
    fireEvent.click(within(dialog).getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(deleteMutateAsync).toHaveBeenCalledWith(1)
    })
  })
})
