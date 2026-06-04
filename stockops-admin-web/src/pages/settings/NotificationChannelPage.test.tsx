import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NotificationChannelPage } from './NotificationChannelPage'
import type { NotificationChannelConfig } from '@/types/notificationChannel'

vi.mock('@/hooks/useCenter', () => ({
  useCenters: vi.fn(),
}))

vi.mock('@/hooks/useWarehouse', () => ({
  useWarehousesByCenter: vi.fn(),
}))

vi.mock('@/hooks/useNotificationChannelConfigs', () => ({
  useNotificationChannelConfigs: vi.fn(),
  useCreateNotificationChannelConfig: vi.fn(),
  useUpdateNotificationChannelConfig: vi.fn(),
  useDeleteNotificationChannelConfig: vi.fn(),
  useTestWebhook: vi.fn(),
}))

vi.mock('@/lib/toast', () => ({
  showToast: vi.fn(),
}))

import { useCenters } from '@/hooks/useCenter'
import { useWarehousesByCenter } from '@/hooks/useWarehouse'
import {
  useNotificationChannelConfigs,
  useCreateNotificationChannelConfig,
  useUpdateNotificationChannelConfig,
  useDeleteNotificationChannelConfig,
  useTestWebhook,
} from '@/hooks/useNotificationChannelConfigs'

const mockMutateAsync = vi.fn()

function createMockMutation<T>(overrides?: Partial<T>): T {
  return {
    mutateAsync: mockMutateAsync,
    isPending: false,
    ...overrides,
  } as unknown as T
}

function createConfigs(): NotificationChannelConfig[] {
  return [
    {
      id: 1,
      centerId: 1,
      warehouseId: null,
      alertType: 'TEMPERATURE',
      channels: [
        { type: 'EMAIL', enabled: true, webhookProvider: null },
        { type: 'WEBHOOK', enabled: true, webhookProvider: 'SLACK' },
      ],
      active: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ]
}

describe('NotificationChannelPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCenters).mockReturnValue({
      data: [{ id: 1, code: 'C01', name: '강남센터' }],
      isLoading: false,
    } as ReturnType<typeof useCenters>)
    vi.mocked(useWarehousesByCenter).mockReturnValue({
      data: [{ id: 1, code: 'W01', name: '강남 1창고' }],
    } as ReturnType<typeof useWarehousesByCenter>)
    vi.mocked(useNotificationChannelConfigs).mockReturnValue({
      data: createConfigs(),
      isLoading: false,
    } as ReturnType<typeof useNotificationChannelConfigs>)
    vi.mocked(useCreateNotificationChannelConfig).mockReturnValue(createMockMutation<ReturnType<typeof useCreateNotificationChannelConfig>>())
    vi.mocked(useUpdateNotificationChannelConfig).mockReturnValue(createMockMutation<ReturnType<typeof useUpdateNotificationChannelConfig>>())
    vi.mocked(useDeleteNotificationChannelConfig).mockReturnValue(createMockMutation<ReturnType<typeof useDeleteNotificationChannelConfig>>())
    vi.mocked(useTestWebhook).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ success: true, message: 'OK', providerType: 'SLACK' }),
      isPending: false,
    } as unknown as ReturnType<typeof useTestWebhook>)
  })

  it('renders page title and description', () => {
    render(<NotificationChannelPage />)
    expect(screen.getByText('알림 채널 설정')).toBeInTheDocument()
    expect(screen.getByText('알림 유형별로 SMS, 이메일, 웹훅 채널을 설정하세요.')).toBeInTheDocument()
  })

  it('shows center selector', () => {
    render(<NotificationChannelPage />)
    expect(screen.getByLabelText('센터 선택')).toBeInTheDocument()
  })

  it('shows config list after selecting center', () => {
    render(<NotificationChannelPage />)
    fireEvent.change(screen.getByLabelText('센터 선택'), { target: { value: '1' } })
    expect(screen.getByText('채널 설정 목록')).toBeInTheDocument()
    expect(screen.getByText('TEMPERATURE')).toBeInTheDocument()
  })

  it('disables new config button when no center selected', () => {
    vi.mocked(useNotificationChannelConfigs).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useNotificationChannelConfigs>)
    render(<NotificationChannelPage />)
    const btn = screen.getByText('새 설정')
    expect(btn).toBeDisabled()
  })

  it('opens create modal when new config button clicked', () => {
    render(<NotificationChannelPage />)
    fireEvent.change(screen.getByLabelText('센터 선택'), { target: { value: '1' } })
    fireEvent.click(screen.getByText('새 설정'))
    expect(screen.getByText('새 채널 설정')).toBeInTheDocument()
  })

  it('opens edit modal when edit button clicked', () => {
    render(<NotificationChannelPage />)
    fireEvent.change(screen.getByLabelText('센터 선택'), { target: { value: '1' } })
    fireEvent.click(screen.getByTitle('수정'))
    expect(screen.getByText('채널 설정 수정')).toBeInTheDocument()
  })

  it('submits create form successfully', async () => {
    render(<NotificationChannelPage />)
    fireEvent.change(screen.getByLabelText('센터 선택'), { target: { value: '1' } })
    fireEvent.click(screen.getByText('새 설정'))
    const form = screen.getByRole('form', { name: '새 채널 설정 폼' })
    fireEvent.submit(form)
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled()
    })
  })

  it('triggers webhook test when test button clicked', async () => {
    const testMock = vi.fn().mockResolvedValue({ success: true, message: 'OK', providerType: 'SLACK' })
    vi.mocked(useTestWebhook).mockReturnValue({
      mutateAsync: testMock,
      isPending: false,
    } as unknown as ReturnType<typeof useTestWebhook>)
    render(<NotificationChannelPage />)
    fireEvent.change(screen.getByLabelText('센터 선택'), { target: { value: '1' } })
    await waitFor(() => screen.getByTitle('웹훅 테스트'))
    fireEvent.click(screen.getByTitle('웹훅 테스트'))
    await waitFor(() => {
      expect(testMock).toHaveBeenCalledWith(1)
    })
  })
})
