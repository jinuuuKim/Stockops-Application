import type { ScopeMetadata, ScopeType } from '@/types/auth'
import type { DashboardSummary } from '@/types/dashboard'

export interface AdminPageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export interface PageRequest {
  page?: number
  size?: number
}

export type AdminRoleName = 'ADMIN' | 'MANAGER' | 'STAFF' | 'USER'

export interface AdminScopeAssignmentRequest {
  scope: ScopeType
  centerId: number | null
  warehouseId: number | null
}

export interface AdminUser {
  id: number
  email: string
  name: string
  role: AdminRoleName
  scopeMetadata: ScopeMetadata
  createdAt: string
  updatedAt: string
}

export interface AdminRole {
  id: number
  name: AdminRoleName | string
  description: string | null
  scopeMetadata: ScopeMetadata
  createdAt: string
  permissions?: string[]
}

export interface CreateAdminUserRequest {
  email: string
  password: string
  name: string
  role?: AdminRoleName
  scopeAssignments?: AdminScopeAssignmentRequest[]
}

export interface UpdateAdminUserRequest {
  name?: string
  role?: AdminRoleName
  scopeAssignments?: AdminScopeAssignmentRequest[]
}

export type NoticeType = 'SYSTEM' | 'MAINTENANCE' | 'UPDATE'

export interface AdminNotice {
  id: number
  title: string
  content: string
  type: NoticeType
  active: boolean
  createdBy: number | null
  noticeAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateNoticeRequest {
  title: string
  content: string
  type?: NoticeType
  active?: boolean
  createdBy?: number | null
  noticeAt?: string | null
}

export interface UpdateNoticeRequest {
  title?: string
  content?: string
  type?: NoticeType
  active?: boolean
  noticeAt?: string | null
}

export interface NoticeListFilter extends PageRequest {
  type?: NoticeType
  active?: boolean
}

export interface AuditLog {
  id: number
  entityType: string
  entityId: number | null
  targetIdentifier: string | null
  action: string
  oldValue: string | null
  newValue: string | null
  performedBy: number | null
  performedByName: string | null
  performedByEmail: string | null
  performedAt: string
  ipAddress?: string | null
  userAgent?: string | null
}

export interface AuditLogFilter extends PageRequest {
  entityType?: string
  entityId?: number
  userId?: number
  startDate?: string
  endDate?: string
}

export interface AdminStats {
  totalUsers: number
  totalProducts: number
  totalOrders: number
  lowStockCount: number
}

export type AdminDashboardSummary = DashboardSummary

export interface AdminApiErrorResponse {
  message?: string
  error?: string
  status?: number
}
