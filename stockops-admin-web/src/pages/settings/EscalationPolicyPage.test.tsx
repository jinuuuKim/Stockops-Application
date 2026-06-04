import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EscalationPolicyPage } from './EscalationPolicyPage'
import type { EscalationPolicy, PendingAlert } from '@/types/escalation'

vi.mock('@/hooks/useCenter', () => ({
  useCenters: vi.fn(),
}))

vi.mock('@/hooks/useWarehouse', () => ({
  useWarehousesByCenter: vi.fn(),
}))

vi.mock('@/hooks/useEscalationPolicies', () => ({
  useEscalationPolicies: vi.fn(),
  useCreateEscalationPolicy: vi.fn(),
  useUpdateEscalationPolicy: vi.fn(),
  useDeleteEscalationPolicy: vi.fn(),
  useActiveAlerts: vi.fn(),
  useAcknowledgeAlert: vi.fn(),
}))

vi.mock('@/lib/toast', () => ({
  showToast: vi.fn(),
}))

import { useCenters } from '@/hooks/useCenter'
import { useWarehousesByCenter } from '@/hooks/useWarehouse'
import {
  useEscalationPolicies,
  useCreateEscalationPolicy,
  useUpdateEscalationPolicy,
  useDeleteEscalationPolicy,
  useActiveAlerts,
  useAcknowledgeAlert,
} from '@/hooks/useEscalationPolicies'

const mockMutateAsync = vi.fn()

function createMockMutation<T>(overrides?: Partial<T>): T {
  return {
    mutateAsync: mockMutateAsync,
    isPending: false,
    ...overrides,
  } as unknown as T
}

function createPolicies(): EscalationPolicy[] {
  return [
    {
      id: 1,
      centerId: 1,
      warehouseId: null,
      alertType: 'TEMPERATURE',
      active: true,
      rules: [
        { id: 1, level: 1, delayMinutes: 10, notifyRoles: ['ROLE_ADMIN'], channels: ['EMAIL'] },
      ],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ]
}

function createAlerts(): PendingAlert[] {
  return [
    {
      id: 1,
      alertType: 'TEMPERATURE',
      centerId: 1,
      warehouseId: 1,
      sensorId: 1,
      message: 'Temp high',
      severity: 'CRITICAL',
      status: 'PENDING',
      currentLevel: 1,
      acknowledgedAt: null,
      acknowledgedBy: null,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    },
  ]
}

describe('EscalationPolicyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCenters).mockReturnValue({
      data: [{ id: 1, code: 'C01', name: '강남센터' }],
      isLoading: false,
    } as ReturnType<typeof useCenters>)
    vi.mocked(useWarehousesByCenter).mockReturnValue({
      data: [{ id: 1, code: 'W01', name: '강남 1창고' }],
    } as ReturnType<typeof useWarehousesByCenter>)
    vi.mocked(useEscalationPolicies).mockReturnValue({
      data: createPolicies(),
      isLoading: false,
    } as ReturnType<typeof useEscalationPolicies>)
    vi.mocked(useActiveAlerts).mockReturnValue({
      data: createAlerts(),
      isLoading: false,
    } as ReturnType<typeof useActiveAlerts>)
    vi.mocked(useCreateEscalationPolicy).mockReturnValue(createMockMutation<ReturnType<typeof useCreateEscalationPolicy>>())
    vi.mocked(useUpdateEscalationPolicy).mockReturnValue(createMockMutation<ReturnType<typeof useUpdateEscalationPolicy>>())
    vi.mocked(useDeleteEscalationPolicy).mockReturnValue(createMockMutation<ReturnType<typeof useDeleteEscalationPolicy>>())
    vi.mocked(useAcknowledgeAlert).mockReturnValue(createMockMutation<ReturnType<typeof useAcknowledgeAlert>>())
  })

  it('renders page title and description', () => {
    render(<EscalationPolicyPage />)
    expect(screen.getByText('알림 에스컬레이션')).toBeInTheDocument()
    expect(screen.getByText('에스컬레이션 정책을 관리하고 활성 알림을 확인하세요.')).toBeInTheDocument()
  })

  it('shows center selector', () => {
    render(<EscalationPolicyPage />)
    expect(screen.getByLabelText('센터 선택')).toBeInTheDocument()
  })

  it('shows policy list after selecting center', () => {
    render(<EscalationPolicyPage />)
    fireEvent.change(screen.getByLabelText('센터 선택'), { target: { value: '1' } })
    expect(screen.getByText('에스컬레이션 정책')).toBeInTheDocument()
    expect(screen.getAllByText('TEMPERATURE').length).toBeGreaterThan(0)
  })

  it('disables new policy button when no center selected', () => {
    vi.mocked(useEscalationPolicies).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useEscalationPolicies>)
    render(<EscalationPolicyPage />)
    const btn = screen.getByText('새 정책')
    expect(btn).toBeDisabled()
  })

  it('opens create modal when new policy button clicked', () => {
    render(<EscalationPolicyPage />)
    fireEvent.change(screen.getByLabelText('센터 선택'), { target: { value: '1' } })
    fireEvent.click(screen.getByText('새 정책'))
    expect(screen.getByRole('form', { name: '새 정책 폼' })).toBeInTheDocument()
  })

  it('opens edit modal when edit button clicked', () => {
    render(<EscalationPolicyPage />)
    fireEvent.change(screen.getByLabelText('센터 선택'), { target: { value: '1' } })
    fireEvent.click(screen.getByTitle('수정'))
    expect(screen.getByText('정책 수정')).toBeInTheDocument()
  })

  it('submits create form successfully', async () => {
    render(<EscalationPolicyPage />)
    fireEvent.change(screen.getByLabelText('센터 선택'), { target: { value: '1' } })
    fireEvent.click(screen.getByText('새 정책'))
    const form = screen.getByRole('form', { name: '새 정책 폼' })
    fireEvent.submit(form)
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled()
    })
  })

  it('renders active alerts section', () => {
    render(<EscalationPolicyPage />)
    expect(screen.getByText('활성 알림')).toBeInTheDocument()
    expect(screen.getByText('Temp high')).toBeInTheDocument()
  })

  it('shows alert severity badge', () => {
    render(<EscalationPolicyPage />)
    expect(screen.getByText('CRITICAL')).toBeInTheDocument()
  })

  it('calls acknowledge mutation when ACK button clicked', async () => {
    const ackMock = vi.fn().mockResolvedValue({})
    vi.mocked(useAcknowledgeAlert).mockReturnValue({
      mutateAsync: ackMock,
      isPending: false,
    } as unknown as ReturnType<typeof useAcknowledgeAlert>)
    render(<EscalationPolicyPage />)
    await waitFor(() => screen.getByText('ACK'))
    fireEvent.click(screen.getByText('ACK'))
    await waitFor(() => {
      expect(ackMock).toHaveBeenCalledWith(1)
    })
  })
})
