/**
 * Settings page with tabbed navigation for system configuration.
 * Provides UI for general settings, user management, permissions, notifications, API, and backup.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ChevronRight, Database, Key, Loader2, Lock, Pencil, Plus, Settings, Shield, Bell, Trash2, Users } from 'lucide-react'
import { getAdminErrorMessage } from '@/api/admin'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useAdminRoles, useAdminUsers, useCreateAdminUser, useDeleteAdminUser, useUpdateAdminUser } from '@/hooks/useAdmin'
import { useAuthStore } from '@/stores/authStore'
import type { AdminRole, AdminRoleName, AdminUser } from '@/types/admin'
import type { AuthenticatedUser } from '@/types/auth'

type TabId = 'general' | 'users' | 'permissions' | 'notifications' | 'api' | 'backup'

type UserFormState = {
  email: string
  password: string
  name: string
  role: AdminRoleName
}

interface Tab {
  id: TabId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const tabs: Tab[] = [
  { id: 'general', label: '일반', icon: Settings },
  { id: 'users', label: '사용자 관리', icon: Users },
  { id: 'permissions', label: '권한 설정', icon: Shield },
  { id: 'notifications', label: '알림', icon: Bell },
  { id: 'api', label: 'API & 연동', icon: Key },
  { id: 'backup', label: '백업 & 복구', icon: Database },
]

const userRoles: AdminRoleName[] = ['ADMIN', 'MANAGER', 'STAFF', 'USER']
const usersPageSize = 10

const emptyUserForm: UserFormState = {
  email: '',
  password: '',
  name: '',
  role: 'USER',
}

function formatDateTime(value: string) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isCurrentAdminUser(user: Pick<AdminUser, 'id' | 'role'>, currentUser: AuthenticatedUser | null | undefined) {
  return currentUser?.id === user.id && currentUser.role === 'ADMIN' && user.role === 'ADMIN'
}

function getScopeSummary(scopeMetadata: AdminRole['scopeMetadata'] | AdminUser['scopeMetadata'] | null | undefined) {
  if (!scopeMetadata) return '범위 정보 없음'
  if (scopeMetadata.global) return '전체 범위'

  const scopeLabels = [
    scopeMetadata.centerIds.length > 0 ? `센터 ${scopeMetadata.centerIds.length}개` : null,
    scopeMetadata.warehouseIds.length > 0 ? `창고 ${scopeMetadata.warehouseIds.length}개` : null,
  ].filter(Boolean)

  return scopeLabels.length > 0 ? scopeLabels.join(' · ') : '개별 범위 미설정'
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('general')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">설정</h1>
        <p className="text-text-secondary mt-1">시스템 설정 및 관리를 확인하세요.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64 shrink-0">
          <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 bg-white rounded-xl border border-neutral-200 p-2 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 sm:px-4 py-3 min-h-[44px] rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-text-secondary hover:bg-neutral-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
                {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto hidden lg:block" />}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 bg-white rounded-xl border border-neutral-200 p-6">
          {activeTab === 'general' && <GeneralSettings />}
          {activeTab === 'users' && <UsersSettings />}
          {activeTab === 'permissions' && <PermissionsSettings />}
          {activeTab === 'notifications' && <NotificationsSettings />}
          {activeTab === 'api' && <ApiSettings />}
          {activeTab === 'backup' && <BackupSettings />}
        </div>
      </div>
    </div>
  )
}

function GeneralSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">일반 설정</h2>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-900">일반 설정 저장은 아직 지원하지 않습니다.</h3>
            <p className="mt-2 text-sm text-amber-800">
              현재 백엔드에 `/api/v1/settings` 또는 일반 설정 컨트롤러가 없어 창고 정보, 언어, 시간대 값을 불러오거나 저장할 수 없습니다.
              임시 값을 입력받는 대신 실제 계약이 추가될 때까지 이 영역을 비활성화합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { label: '창고 정보', detail: '센터/창고 관리 API 계약에서 제공될 때 표시합니다.' },
          { label: '언어 및 시간대', detail: '일반 설정 저장 계약이 없어 변경할 수 없습니다.' },
          { label: '운영 정책', detail: '정책 조회/수정 엔드포인트가 확정되면 연결합니다.' },
          { label: '저장/초기화', detail: '지원되는 저장 API가 없어 버튼을 제공하지 않습니다.' },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 opacity-80" aria-disabled="true">
            <p className="font-medium text-text-primary">{item.label}</p>
            <p className="mt-1 text-sm text-text-secondary">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function UsersSettings() {
  const currentUser = useAuthStore((state) => state.user)
  const [page, setPage] = useState(0)
  const [form, setForm] = useState<UserFormState>(emptyUserForm)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const usersQuery = useAdminUsers({ page, size: usersPageSize })
  const createUser = useCreateAdminUser()
  const updateUser = useUpdateAdminUser()
  const deleteUser = useDeleteAdminUser()

  const usersPage = usersQuery.data
  const users = usersPage?.content ?? []
  const totalPages = usersPage?.totalPages ?? 0
  const totalElements = usersPage?.totalElements ?? 0
  const displayPage = (usersPage?.number ?? page) + 1
  const isSaving = createUser.isPending || updateUser.isPending
  const isDeleting = deleteUser.isPending

  const openCreateForm = () => {
    setEditingUser(null)
    setForm(emptyUserForm)
    setActionError(null)
    setIsFormOpen(true)
  }

  const openEditForm = (user: AdminUser) => {
    setEditingUser(user)
    setForm({
      email: user.email,
      password: '',
      name: user.name,
      role: user.role,
    })
    setActionError(null)
    setIsFormOpen(true)
  }

  const closeForm = () => {
    if (isSaving) return
    setIsFormOpen(false)
    setEditingUser(null)
    setForm(emptyUserForm)
    setActionError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setActionError(null)

    const name = form.name.trim()
    const email = form.email.trim()

    try {
      if (editingUser) {
        const selfAdminEdit = isCurrentAdminUser(editingUser, currentUser)
        await updateUser.mutateAsync({
          id: editingUser.id,
          request: {
            name,
            role: selfAdminEdit ? 'ADMIN' : form.role,
          },
        })
      } else {
        await createUser.mutateAsync({
          email,
          password: form.password,
          name,
          role: form.role,
        })
        setPage(0)
      }

      closeForm()
    } catch (error) {
      setActionError(getAdminErrorMessage(error, '사용자 저장 중 오류가 발생했습니다.'))
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setActionError(null)

    if (isCurrentAdminUser(deleteTarget, currentUser)) {
      setActionError('현재 로그인한 관리자의 ADMIN 권한은 직접 제거할 수 없습니다. 다른 관리자에게 변경을 요청하세요.')
      setDeleteTarget(null)
      return
    }

    try {
      await deleteUser.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
      if (users.length === 1 && page > 0) {
        setPage(page - 1)
      }
    } catch (error) {
      setActionError(getAdminErrorMessage(error, '사용자 삭제 중 오류가 발생했습니다.'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">사용자 관리</h2>
          <p className="mt-1 text-sm text-text-secondary">실제 사용자 API에서 계정을 조회하고 생성, 수정, 삭제합니다.</p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          사용자 추가
        </button>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        계정 비활성화/재활성화는 백엔드 엔드포인트가 없어 현재 지원하지 않습니다. 이 화면에서는 상태 변경 버튼을 비활성화하고, 삭제만 실제 API로 처리합니다.
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        현재 로그인한 관리자의 ADMIN 역할은 이 화면에서 제거할 수 없습니다. 본인 계정 삭제와 역할 강등을 막아 관리자 접근 권한이 사라지는 상황을 예방합니다.
      </div>

      {actionError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {isFormOpen && (
        <form aria-label={editingUser ? '사용자 수정 폼' : '사용자 추가 폼'} onSubmit={handleSubmit} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">{editingUser ? '사용자 수정' : '사용자 추가'}</h3>
            <button type="button" onClick={closeForm} className="text-sm text-text-secondary hover:text-text-primary">
              닫기
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="user-email" className="block text-sm font-medium text-neutral-700 mb-1">이메일</label>
              <input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                disabled={Boolean(editingUser) || isSaving}
                required
                className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg disabled:bg-neutral-100"
              />
            </div>
            {!editingUser && (
              <div>
                <label htmlFor="user-password" className="block text-sm font-medium text-neutral-700 mb-1">초기 비밀번호</label>
                <input
                  id="user-password"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  disabled={isSaving}
                  required
                  className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg"
                />
              </div>
            )}
            <div>
              <label htmlFor="user-name" className="block text-sm font-medium text-neutral-700 mb-1">이름</label>
              <input
                id="user-name"
                type="text"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                disabled={isSaving}
                required
                className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="user-role" className="block text-sm font-medium text-neutral-700 mb-1">역할</label>
              <select
                id="user-role"
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as AdminRoleName }))}
                disabled={isSaving || (editingUser ? isCurrentAdminUser(editingUser, currentUser) : false)}
                className="w-full px-3 py-2 min-h-[44px] text-base border border-neutral-300 rounded-lg"
              >
                {userRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              {editingUser && isCurrentAdminUser(editingUser, currentUser) && (
                <p className="mt-1 text-xs text-amber-700">본인 관리자 계정의 ADMIN 역할은 직접 제거할 수 없습니다.</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={closeForm} disabled={isSaving} className="px-4 py-2 min-h-[44px] border border-neutral-300 rounded-lg hover:bg-neutral-100 disabled:opacity-60">
              취소
            </button>
            <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingUser ? '수정 저장' : '사용자 생성'}
            </button>
          </div>
        </form>
      )}

      {usersQuery.isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-8 text-text-secondary" role="status">
          <Loader2 className="h-5 w-5 animate-spin" />
          사용자 목록을 불러오는 중입니다.
        </div>
      )}

      {usersQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center" role="alert">
          <p className="font-medium text-red-800">사용자 목록을 불러오지 못했습니다.</p>
          <p className="mt-2 text-sm text-red-700">{getAdminErrorMessage(usersQuery.error, '사용자 목록 조회 중 오류가 발생했습니다.')}</p>
          <button type="button" onClick={() => usersQuery.refetch()} className="mt-4 px-4 py-2 min-h-[44px] rounded-lg border border-red-300 bg-white text-red-700 hover:bg-red-50">
            다시 시도
          </button>
        </div>
      )}

      {!usersQuery.isLoading && !usersQuery.isError && users.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
          <p className="font-medium text-text-primary">등록된 사용자가 없습니다.</p>
          <p className="mt-2 text-sm text-text-secondary">사용자 추가 버튼으로 실제 계정을 생성하세요. 임시 사용자 데이터는 표시하지 않습니다.</p>
        </div>
      )}

      {!usersQuery.isLoading && !usersQuery.isError && users.length > 0 && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full min-w-[760px]">
              <thead className="bg-neutral-50">
                <tr className="border-b border-neutral-200">
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">이메일</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">이름</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">역할</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">생성일</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">상태</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-text-secondary">작업</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const selfAdmin = isCurrentAdminUser(user, currentUser)

                  return (
                  <tr key={user.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-3 text-sm text-text-primary">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-text-primary">{user.name}</td>
                    <td className="px-4 py-3 text-sm text-text-primary">{user.role}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{formatDateTime(user.createdAt)}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        type="button"
                        disabled
                        title="비활성화/재활성화 백엔드 엔드포인트가 없어 지원하지 않습니다."
                        className="rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500"
                      >
                        상태 변경 미지원
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(user)}
                          aria-label={`${user.email} 수정`}
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
                        >
                          <Pencil className="h-4 w-4" />
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(user)}
                          aria-label={`${user.email} 삭제`}
                          disabled={selfAdmin}
                          title={selfAdmin ? '현재 로그인한 관리자의 ADMIN 접근 권한 보호를 위해 본인 삭제는 차단됩니다.' : undefined}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-transparent"
                        >
                          <Trash2 className="h-4 w-4" />
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-secondary">총 {totalElements.toLocaleString()}명 · {displayPage} / {Math.max(totalPages, 1)} 페이지</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(current - 1, 0))}
                disabled={page === 0}
                className="px-4 py-2 min-h-[44px] rounded-lg border border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                이전
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={totalPages === 0 || page + 1 >= totalPages}
                className="px-4 py-2 min-h-[44px] rounded-lg border border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                다음
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null)
        }}
        onConfirm={handleConfirmDelete}
        title="사용자 삭제"
        description={deleteTarget ? `${deleteTarget.email} 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.` : ''}
        confirmLabel={isDeleting ? '삭제 중...' : '삭제'}
        variant="destructive"
      />
    </div>
  )
}

function PermissionsSettings() {
  const rolesQuery = useAdminRoles()
  const roles = rolesQuery.data ?? []
  const hasBackendPermissions = roles.some((role) => Array.isArray(role.permissions) && role.permissions.length > 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">권한 설정</h2>
        <p className="mt-1 text-sm text-text-secondary">
          역할 목록은 실제 `/api/v1/roles` 응답에서 조회하며, 권한 변경은 백엔드 쓰기 계약이 없어 읽기 전용으로 표시합니다.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        역할-권한 매트릭스 저장 엔드포인트와 권한 카탈로그 응답이 확인되지 않았습니다. 정적 체크박스나 임시 권한을 만들지 않고, 백엔드가 제공하는 역할 정보만 표시합니다.
      </div>

      {rolesQuery.isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-8 text-text-secondary" role="status">
          <Loader2 className="h-5 w-5 animate-spin" />
          역할 목록을 불러오는 중입니다.
        </div>
      )}

      {rolesQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center" role="alert">
          <p className="font-medium text-red-800">역할 목록을 불러오지 못했습니다.</p>
          <p className="mt-2 text-sm text-red-700">{getAdminErrorMessage(rolesQuery.error, '역할 목록 조회 중 오류가 발생했습니다.')}</p>
          <button type="button" onClick={() => rolesQuery.refetch()} className="mt-4 px-4 py-2 min-h-[44px] rounded-lg border border-red-300 bg-white text-red-700 hover:bg-red-50">
            다시 시도
          </button>
        </div>
      )}

      {!rolesQuery.isLoading && !rolesQuery.isError && roles.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
          <p className="font-medium text-text-primary">표시할 역할이 없습니다.</p>
          <p className="mt-2 text-sm text-text-secondary">`GET /api/v1/roles` 응답에 포함된 역할만 표시합니다. 임시 역할은 만들지 않습니다.</p>
        </div>
      )}

      {!rolesQuery.isLoading && !rolesQuery.isError && roles.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full min-w-[720px]">
            <thead className="bg-neutral-50">
              <tr className="border-b border-neutral-200">
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">역할</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">설명</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">데이터 범위</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">권한</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">생성일</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 text-sm font-medium text-text-primary">{role.name}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{role.description || '설명 없음'}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{getScopeSummary(role.scopeMetadata)}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {role.permissions && role.permissions.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.map((permission) => (
                          <span key={permission} className="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-700">{permission}</span>
                        ))}
                      </div>
                    ) : (
                      <span>백엔드 응답에 권한 목록이 포함되지 않았습니다.</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{formatDateTime(role.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!hasBackendPermissions && !rolesQuery.isLoading && !rolesQuery.isError && roles.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-text-secondary">
          현재 역할 응답에는 권한 코드 목록이 포함되지 않습니다. 권한 카탈로그와 역할-권한 수정 API가 추가되면 이 영역을 매트릭스로 전환합니다.
        </div>
      )}
    </div>
  )
}

function NotificationsSettings() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">알림 설정</h2>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-medium text-blue-900">알림 채널 상세 설정</h3>
            <p className="text-sm text-blue-700 mt-1">
              알림 채널은 별도 관리 화면에서 실제 백엔드 계약에 맞춰 설정합니다. 이 탭에서는 임시 체크박스나 저장 버튼을 제공하지 않습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings/notification-channels')}
            className="px-4 py-2 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            채널 설정 관리
          </button>
        </div>
      </div>
    </div>
  )
}

function ApiSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">API 및 연동</h2>

      <div className="space-y-4">
        <div className="form-section">
          <h3 className="text-sm font-medium text-text-secondary mb-3">API 키</h3>
          <div className="space-y-3">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <p className="font-medium text-text-primary">운영 API 키</p>
              <p className="mt-1 text-sm text-text-secondary">API 키 관리 백엔드 계약이 없어 생성, 조회, 폐기를 지원하지 않습니다. 실제 키 값이나 상태를 임시로 표시하지 않습니다.</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <p className="font-medium text-text-primary">테스트 API 키</p>
              <p className="mt-1 text-sm text-text-secondary">테스트 키 관리 엔드포인트가 확인되지 않아 비활성화했습니다.</p>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="text-sm font-medium text-text-secondary mb-3">외부 연동</h3>
          <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4">
            <p className="font-medium text-text-primary">외부 연동 관리는 아직 지원하지 않습니다.</p>
            <p className="mt-1 text-sm text-text-secondary">
              API 키/외부 연동 관리 계약이 확정되기 전까지 연결 상태나 설정 버튼을 표시하지 않습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function BackupSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">백업 및 복구</h2>

      <div className="space-y-6">
        <div className="p-4 bg-neutral-50 rounded-lg">
          <h3 className="text-sm font-medium text-text-secondary mb-3">자동 백업</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-text-light">마지막 백업</p>
              <p className="font-medium">연동 안 됨</p>
            </div>
            <div>
              <p className="text-xs text-text-light">다음 백업</p>
              <p className="font-medium">예약 없음</p>
            </div>
            <div>
              <p className="text-xs text-text-light">백업 주기</p>
              <p className="font-medium">미설정</p>
            </div>
          </div>
          <p className="text-sm text-text-secondary">
            백업/복구 API 계약이 없어 백업 실행, 복구, 스케줄 변경을 지원하지 않습니다. 실제 백업 상태를 임시 데이터로 표시하지 않습니다.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-3">백업 이력</h3>
          <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-text-secondary">
            백업 기록이 없습니다. 연결된 백업 서비스에서 생성된 내역만 표시됩니다.
          </div>
        </div>
      </div>
    </div>
  )
}
