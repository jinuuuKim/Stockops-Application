import api from '@/lib/api'
import type {
  AISuggestion,
  AISuggestionCreateRequest,
  AISuggestionExecuteRequest,
  AISuggestionListFilter,
  AISuggestionRejectRequest,
} from '@/types/aiSuggestion'

function buildParams(filter: AISuggestionListFilter = {}): Record<string, string | number> {
  const params: Record<string, string | number> = {}

  if (filter.status) params.status = filter.status
  if (filter.type) params.type = filter.type
  if (filter.severity) params.severity = filter.severity
  if (filter.targetType) params.targetType = filter.targetType
  if (filter.targetId != null) params.targetId = filter.targetId
  if (filter.sourceType) params.sourceType = filter.sourceType
  if (filter.visibleToApp) params.visibleToApp = filter.visibleToApp
  if (filter.approvalMode) params.approvalMode = filter.approvalMode
  if (filter.targetScopeType) params.targetScopeType = filter.targetScopeType
  if (filter.targetScopeId != null) params.targetScopeId = filter.targetScopeId
  if (filter.page != null) params.page = filter.page
  if (filter.size != null) params.size = filter.size

  return params
}

export async function listSuggestions(filter: AISuggestionListFilter = {}): Promise<AISuggestion[]> {
  const response = await api.get<AISuggestion[]>('/v1/ai/suggestions', {
    params: buildParams(filter),
  })
  return response.data
}

export async function getSuggestion(id: number): Promise<AISuggestion> {
  const response = await api.get<AISuggestion>(`/v1/ai/suggestions/${id}`)
  return response.data
}

export async function createSuggestion(request: AISuggestionCreateRequest): Promise<AISuggestion> {
  const response = await api.post<AISuggestion>('/v1/ai/suggestions', request)
  return response.data
}

export async function approveSuggestion(id: number): Promise<AISuggestion> {
  const response = await api.post<AISuggestion>(`/v1/ai/suggestions/${id}/approve`)
  return response.data
}

export async function rejectSuggestion(id: number, request: AISuggestionRejectRequest): Promise<AISuggestion> {
  const response = await api.post<AISuggestion>(`/v1/ai/suggestions/${id}/reject`, request)
  return response.data
}

export async function executeSuggestion(id: number, request: AISuggestionExecuteRequest = {}): Promise<AISuggestion> {
  const response = await api.post<AISuggestion>(`/v1/ai/suggestions/${id}/execute`, request)
  return response.data
}
