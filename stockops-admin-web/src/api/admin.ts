import api from '@/lib/api'
import { getServerErrorMessage } from '@/lib/httpError'
import type {
  AdminDashboardSummary,
  AdminNotice,
  AdminRole,
  AdminStats,
  AdminUser,
  AuditLog,
  AuditLogFilter,
  CreateAdminUserRequest,
  CreateNoticeRequest,
  AdminPageResponse,
  NoticeListFilter,
  PageRequest,
  UpdateAdminUserRequest,
  UpdateNoticeRequest,
} from '@/types/admin'

function emptyPageResponse<T>(page = 0, size = 20): AdminPageResponse<T> {
  return {
    content: [],
    totalElements: 0,
    totalPages: 0,
    size,
    number: page,
  }
}

function normalizePageResponse<T>(data: AdminPageResponse<T> | T[] | null | undefined, page = 0, size = 20): AdminPageResponse<T> {
  if (Array.isArray(data)) {
    return {
      content: data,
      totalElements: data.length,
      totalPages: data.length === 0 ? 0 : 1,
      size,
      number: page,
    }
  }

  if (!data || !Array.isArray(data.content)) {
    return emptyPageResponse<T>(page, size)
  }

  return {
    ...data,
    content: data.content,
    totalElements: data.totalElements ?? data.content.length,
    totalPages: data.totalPages ?? (data.content.length === 0 ? 0 : 1),
    size: data.size ?? size,
    number: data.number ?? page,
  }
}

function buildParams(filter: Record<string, unknown>): Record<string, string | number | boolean> {
  return Object.entries(filter).reduce<Record<string, string | number | boolean>>((params, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params[key] = value as string | number | boolean
    }
    return params
  }, {})
}

export function getAdminErrorMessage(error: unknown, fallback = '요청 처리 중 오류가 발생했습니다.'): string {
  return getServerErrorMessage(error, fallback)
}

export async function getAdminUsers(request: PageRequest = {}): Promise<AdminPageResponse<AdminUser>> {
  const page = request.page ?? 0
  const size = request.size ?? 20
  const response = await api.get<AdminPageResponse<AdminUser> | AdminUser[]>('/v1/users', {
    params: { page, size },
  })
  return normalizePageResponse(response.data, page, size)
}

export async function createAdminUser(request: CreateAdminUserRequest): Promise<AdminUser> {
  const response = await api.post<AdminUser>('/v1/users', request)
  return response.data
}

export async function updateAdminUser(id: number, request: UpdateAdminUserRequest): Promise<AdminUser> {
  const response = await api.put<AdminUser>(`/v1/users/${id}`, request)
  return response.data
}

export async function deleteAdminUser(id: number): Promise<void> {
  await api.delete(`/v1/users/${id}`)
}

export async function getAdminRoles(): Promise<AdminRole[]> {
  const response = await api.get<AdminRole[] | AdminPageResponse<AdminRole>>('/v1/roles')

  if (Array.isArray(response.data)) {
    return response.data
  }

  return normalizePageResponse(response.data).content
}

export async function getAdminNotices(filter: NoticeListFilter = {}): Promise<AdminPageResponse<AdminNotice>> {
  const page = filter.page ?? 0
  const size = filter.size ?? 20
  const response = await api.get<AdminPageResponse<AdminNotice> | AdminNotice[]>('/v1/notices', {
    params: buildParams({ ...filter, page, size }),
  })
  return normalizePageResponse(response.data, page, size)
}

export async function getActiveAdminNotices(): Promise<AdminNotice[]> {
  const response = await api.get<AdminNotice[]>('/v1/notices/active')
  return Array.isArray(response.data) ? response.data : []
}

export async function createAdminNotice(request: CreateNoticeRequest): Promise<AdminNotice> {
  const response = await api.post<AdminNotice>('/v1/notices', request)
  return response.data
}

export async function updateAdminNotice(id: number, request: UpdateNoticeRequest): Promise<AdminNotice> {
  const response = await api.put<AdminNotice>(`/v1/notices/${id}`, request)
  return response.data
}

export async function deleteAdminNotice(id: number): Promise<void> {
  await api.delete(`/v1/notices/${id}`)
}

export async function getAuditLogs(filter: AuditLogFilter = {}): Promise<AdminPageResponse<AuditLog>> {
  const page = filter.page ?? 0
  const size = filter.size ?? 20
  const response = await api.get<AdminPageResponse<AuditLog> | AuditLog[]>('/v1/audit-logs', {
    params: buildParams({ ...filter, page, size }),
  })
  return normalizePageResponse(response.data, page, size)
}

export async function getRecentAuditLogs(): Promise<AuditLog[]> {
  const response = await api.get<AuditLog[]>('/v1/audit-logs/recent')
  return Array.isArray(response.data) ? response.data : []
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const response = await api.get<AdminDashboardSummary>('/v1/dashboard/summary')
  return response.data
}

export async function getAdminStats(): Promise<AdminStats> {
  const response = await api.get<AdminStats>('/v1/admin/stats')
  return response.data
}
