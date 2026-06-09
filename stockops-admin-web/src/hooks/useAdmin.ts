import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import {
  createAdminNotice,
  createAdminUser,
  deleteAdminNotice,
  deleteAdminUser,
  getActiveAdminNotices,
  getAdminDashboardSummary,
  getAdminNotices,
  getAdminRoles,
  getAdminStats,
  getAdminUsers,
  getAuditLogs,
  getRecentAuditLogs,
  updateAdminNotice,
  updateAdminUser,
} from '@/api/admin'
import type {
  AdminApiErrorResponse,
  AdminDashboardSummary,
  AdminNotice,
  AdminPageResponse,
  AdminRole,
  AdminStats,
  AdminUser,
  AuditLog,
  AuditLogFilter,
  CreateAdminUserRequest,
  CreateNoticeRequest,
  NoticeListFilter,
  PageRequest,
  UpdateAdminUserRequest,
  UpdateNoticeRequest,
} from '@/types/admin'

const ADMIN_QUERY_KEY = ['admin'] as const

export const adminQueryKeys = {
  all: ADMIN_QUERY_KEY,
  users: (request: PageRequest = {}) => [...ADMIN_QUERY_KEY, 'users', request] as const,
  roles: [...ADMIN_QUERY_KEY, 'roles'] as const,
  notices: (filter: NoticeListFilter = {}) => [...ADMIN_QUERY_KEY, 'notices', filter] as const,
  activeNotices: [...ADMIN_QUERY_KEY, 'notices', 'active'] as const,
  auditLogs: (filter: AuditLogFilter = {}) => [...ADMIN_QUERY_KEY, 'audit-logs', filter] as const,
  recentAuditLogs: [...ADMIN_QUERY_KEY, 'audit-logs', 'recent'] as const,
  dashboardSummary: [...ADMIN_QUERY_KEY, 'dashboard', 'summary'] as const,
  stats: [...ADMIN_QUERY_KEY, 'stats'] as const,
}

type AdminAxiosError = AxiosError<AdminApiErrorResponse>

export function useAdminUsers(request: PageRequest = {}): UseQueryResult<AdminPageResponse<AdminUser>, AdminAxiosError> {
  return useQuery({
    queryKey: adminQueryKeys.users(request),
    queryFn: () => getAdminUsers(request),
    staleTime: 60_000,
  })
}

export function useCreateAdminUser(): UseMutationResult<AdminUser, AdminAxiosError, CreateAdminUserRequest> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

export function useUpdateAdminUser(): UseMutationResult<AdminUser, AdminAxiosError, { id: number; request: UpdateAdminUserRequest }> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }) => updateAdminUser(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

export function useDeleteAdminUser(): UseMutationResult<void, AdminAxiosError, number> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

export function useAdminRoles(): UseQueryResult<AdminRole[], AdminAxiosError> {
  return useQuery({
    queryKey: adminQueryKeys.roles,
    queryFn: getAdminRoles,
    staleTime: 60_000,
  })
}

export function useAdminNotices(filter: NoticeListFilter = {}): UseQueryResult<AdminPageResponse<AdminNotice>, AdminAxiosError> {
  return useQuery({
    queryKey: adminQueryKeys.notices(filter),
    queryFn: () => getAdminNotices(filter),
    staleTime: 60_000,
  })
}

export function useActiveAdminNotices(): UseQueryResult<AdminNotice[], AdminAxiosError> {
  return useQuery({
    queryKey: adminQueryKeys.activeNotices,
    queryFn: getActiveAdminNotices,
    staleTime: 60_000,
  })
}

export function useCreateAdminNotice(): UseMutationResult<AdminNotice, AdminAxiosError, CreateNoticeRequest> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAdminNotice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] })
    },
  })
}

export function useUpdateAdminNotice(): UseMutationResult<AdminNotice, AdminAxiosError, { id: number; request: UpdateNoticeRequest }> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, request }) => updateAdminNotice(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] })
    },
  })
}

export function useDeleteAdminNotice(): UseMutationResult<void, AdminAxiosError, number> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteAdminNotice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] })
    },
  })
}

export function useAuditLogs(filter: AuditLogFilter = {}): UseQueryResult<AdminPageResponse<AuditLog>, AdminAxiosError> {
  return useQuery({
    queryKey: adminQueryKeys.auditLogs(filter),
    queryFn: () => getAuditLogs(filter),
    staleTime: 30_000,
  })
}

export function useRecentAuditLogs(): UseQueryResult<AuditLog[], AdminAxiosError> {
  return useQuery({
    queryKey: adminQueryKeys.recentAuditLogs,
    queryFn: getRecentAuditLogs,
    staleTime: 30_000,
  })
}

export function useAdminDashboardSummary(): UseQueryResult<AdminDashboardSummary, AdminAxiosError> {
  return useQuery({
    queryKey: adminQueryKeys.dashboardSummary,
    queryFn: getAdminDashboardSummary,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useAdminStats(): UseQueryResult<AdminStats, AdminAxiosError> {
  return useQuery({
    queryKey: adminQueryKeys.stats,
    queryFn: getAdminStats,
    staleTime: 30_000,
  })
}
