/**
 * AI suggestion TypeScript types.
 * Matches backend AISuggestionResponse and workflow request DTOs.
 *
 * @author StockOps Team
 * @since 2.0
 */

import type { ScopeType } from '@/types/auth'

export type AISuggestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED'

export type AISuggestionAction = 'APPROVE' | 'REJECT' | 'EXECUTE'

export type AISuggestionSeverity = 'INFO' | 'WARNING' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | (string & {})

export type AISuggestionApprovalMode = 'MANUAL' | 'AUTO' | (string & {})

export interface AISuggestionScopeMetadata {
  targetScopeType: string | null
  targetScopeId: number | null
  requestedScopeType: ScopeType | string | null
  requestedScopeId: number | null
  visibleToApp: string | null
  approvalMode: AISuggestionApprovalMode | null
  sourceType: string | null
}

export interface AISuggestionAuditSummary {
  createdByUserId: number | null
  createdAt: string | null
  updatedAt: string | null
  reviewedByUserId: number | null
  reviewedAt: string | null
  approvedByUserId: number | null
  approvedAt: string | null
  executedAt: string | null
  version: number | null
  source: string | null
  createdFromApp: string | null
}

export interface AISuggestion {
  id: number
  type: string
  severity: AISuggestionSeverity
  title: string
  summary: string
  reason: string
  recommendedAction: string
  targetType: string | null
  targetId: number | null
  status: AISuggestionStatus
  allowedActions: AISuggestionAction[]
  scopeMetadata: AISuggestionScopeMetadata
  auditSummary: AISuggestionAuditSummary
  payloadJson: string | null
  confidenceScore: number | null
  source: string
  sourceType: string
  createdByUserId: number | null
  createdFromApp: string | null
  forecastSourceType: string | null
  forecastSourceId: number | null
  forecastModelVersion: string | null
  forecastGeneratedAt: string | null
  forecastSourcePayloadJson: string | null
  visibleToApp: string
  approvalMode: AISuggestionApprovalMode
  requestedOnBehalfUserId: number | null
  requestedScopeType: ScopeType | string | null
  requestedScopeId: number | null
  expiresAt: string | null
  errorMessage: string | null
}

export interface AISuggestionListFilter {
  status?: AISuggestionStatus
  type?: string
  severity?: AISuggestionSeverity
  targetType?: string
  targetId?: number
  sourceType?: string
  visibleToApp?: string
  approvalMode?: AISuggestionApprovalMode
  targetScopeType?: ScopeType | string
  targetScopeId?: number
  page?: number
  size?: number
}

export interface AISuggestionCreateRequest {
  type: string
  severity: AISuggestionSeverity
  title: string
  summary: string
  reason: string
  recommendedAction: string
  targetType?: string | null
  targetId?: number | null
  targetScopeType: string
  targetScopeId: number
  payloadJson?: string | null
  confidenceScore?: number | null
  source: string
  sourceType: string
  createdFromApp?: string | null
  forecastSourceType?: string | null
  forecastSourceId?: number | null
  forecastModelVersion?: string | null
  forecastGeneratedAt?: string | null
  forecastSourcePayloadJson?: string | null
  visibleToApp: string
  approvalMode: AISuggestionApprovalMode
  requestedOnBehalfUserId?: number | null
  requestedScopeType?: ScopeType | string | null
  requestedScopeId?: number | null
  expiresAt?: string | null
}

export interface AISuggestionRejectRequest {
  rejectionReason: string
}

export interface AISuggestionExecuteRequest {
  executionResult?: string | null
}

export type AISuggestionErrorStatus = 400 | 401 | 403 | 409

export interface AISuggestionApiErrorResponse {
  timestamp?: string
  status?: AISuggestionErrorStatus | number
  error?: string
  message?: string
  path?: string
  details?: unknown
}
