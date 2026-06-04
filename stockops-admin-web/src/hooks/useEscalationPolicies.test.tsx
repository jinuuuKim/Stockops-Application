import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useEscalationPolicies,
  useCreateEscalationPolicy,
  useUpdateEscalationPolicy,
  useDeleteEscalationPolicy,
  useActiveAlerts,
  useAcknowledgeAlert,
} from './useEscalationPolicies'
import api from '@/lib/api'
import type { EscalationPolicy, EscalationPolicyRequest, PendingAlert } from '@/types/escalation'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useEscalationPolicies', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('fetches policies when centerId is provided', async () => {
    const mockPolicies: EscalationPolicy[] = [
      { id: 1, centerId: 1, warehouseId: null, alertType: 'TEMPERATURE', active: true, rules: [], createdAt: '', updatedAt: '' },
    ]
    vi.mocked(api.get).mockResolvedValue({ data: mockPolicies })

    const { result } = renderHook(() => useEscalationPolicies(1), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockPolicies)
    expect(api.get).toHaveBeenCalledWith('/v1/escalation-policies', { params: { centerId: 1, warehouseId: undefined, alertType: undefined } })
  })

  it('does not fetch when centerId is null', () => {
    const { result } = renderHook(() => useEscalationPolicies(null), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
    expect(api.get).not.toHaveBeenCalled()
  })

  it('create mutation invalidates policies cache on success', async () => {
    const createdPolicy: EscalationPolicy = { id: 1, centerId: 1, warehouseId: null, alertType: 'TEMPERATURE', active: true, rules: [], createdAt: '', updatedAt: '' }
    vi.mocked(api.post).mockResolvedValue({ data: createdPolicy })

    const { result } = renderHook(() => useCreateEscalationPolicy(), { wrapper: createWrapper() })

    const request: EscalationPolicyRequest = { centerId: 1, warehouseId: null, alertType: 'TEMPERATURE', active: true, rules: [] }
    result.current.mutate(request)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(createdPolicy)
    expect(api.post).toHaveBeenCalledWith('/v1/escalation-policies', request)
  })

  it('update mutation calls PUT and invalidates cache', async () => {
    const updatedPolicy: EscalationPolicy = { id: 1, centerId: 1, warehouseId: null, alertType: 'HUMIDITY', active: true, rules: [], createdAt: '', updatedAt: '' }
    vi.mocked(api.put).mockResolvedValue({ data: updatedPolicy })

    const { result } = renderHook(() => useUpdateEscalationPolicy(), { wrapper: createWrapper() })

    const request: EscalationPolicyRequest = { centerId: 1, warehouseId: null, alertType: 'HUMIDITY', active: true, rules: [] }
    result.current.mutate({ id: 1, data: request })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.put).toHaveBeenCalledWith('/v1/escalation-policies/1', request)
  })

  it('delete mutation calls DELETE and invalidates cache', async () => {
    vi.mocked(api.delete).mockResolvedValue({})

    const { result } = renderHook(() => useDeleteEscalationPolicy(), { wrapper: createWrapper() })

    result.current.mutate(1)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/v1/escalation-policies/1')
  })
})

describe('useActiveAlerts', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('fetches pending alerts', async () => {
    const mockAlerts: PendingAlert[] = [
      { id: 1, alertType: 'TEMPERATURE', centerId: 1, warehouseId: 1, sensorId: 1, message: 'Too hot', severity: 'HIGH', status: 'PENDING', currentLevel: 1, acknowledgedAt: null, acknowledgedBy: null, createdAt: '', updatedAt: '' },
    ]
    vi.mocked(api.get).mockResolvedValue({ data: mockAlerts })

    const { result } = renderHook(() => useActiveAlerts(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockAlerts)
    expect(api.get).toHaveBeenCalledWith('/v1/pending-alerts', { params: { status: 'PENDING' } })
  })
})

describe('useAcknowledgeAlert', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('acknowledges alert and invalidates cache', async () => {
    const mockAlert: PendingAlert = {
      id: 1, alertType: 'TEMPERATURE', centerId: 1, warehouseId: 1, sensorId: 1,
      message: 'Too hot', severity: 'HIGH', status: 'ACKNOWLEDGED', currentLevel: 1,
      acknowledgedAt: '2024-01-01T00:00:00Z', acknowledgedBy: 'admin', createdAt: '', updatedAt: '',
    }
    vi.mocked(api.post).mockResolvedValue({ data: mockAlert })

    const { result } = renderHook(() => useAcknowledgeAlert(), { wrapper: createWrapper() })

    result.current.mutate(1)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockAlert)
    expect(api.post).toHaveBeenCalledWith('/v1/pending-alerts/1/acknowledge')
  })
})
