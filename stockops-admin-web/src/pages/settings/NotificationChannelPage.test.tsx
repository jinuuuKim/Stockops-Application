import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
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

const createMutateAsync = vi.fn()
const updateMutateAsync = vi.fn()
const deleteMutateAsync = vi.fn()
const testMutateAsync = vi.fn()
const refetchCenters = vi.fn()

const fullTeamsWebhookUrl = 'https://contoso.webhook.office.com/webhookb2/raw-secret-token'

function createMockMutation<T>(mutateAsync: ReturnType<typeof vi.fn>, overrides?: Partial<T>): T {
  return {
    mutateAsync,
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
        { type: 'WEBHOOK', enabled: true, webhookProvider: 'TEAMS', webhookUrl: fullTeamsWebhookUrl },
      ],
      active: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      centerId: 1,
      warehouseId: null,
      alertType: 'HUMIDITY',
      channels: [
        { type: 'EMAIL', enabled: true, webhookProvider: null },
      ],
      active: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ]
}

function selectCenter() {
  fireEvent.change(screen.getByLabelText('센터 선택'), { target: { value: '1' } })
}

describe('NotificationChannelPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createMutateAsync.mockResolvedValue({})
    updateMutateAsync.mockResolvedValue({})
    deleteMutateAsync.mockResolvedValue(undefined)
    testMutateAsync.mockResolvedValue({ success: true, message: 'OK', providerType: 'TEAMS' })

    vi.mocked(useCenters).mockReturnValue({
      data: [{ id: 1, code: 'C01', name: '강남센터' }],
      isLoading: false,
      isError: false,
      refetch: refetchCenters,
    } as unknown as ReturnType<typeof useCenters>)
    vi.mocked(useWarehousesByCenter).mockReturnValue({
      data: [{ id: 1, code: 'W01', name: '강남 1창고' }],
    } as ReturnType<typeof useWarehousesByCenter>)
    vi.mocked(useNotificationChannelConfigs).mockReturnValue({
      data: createConfigs(),
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useNotificationChannelConfigs>)
    vi.mocked(useCreateNotificationChannelConfig).mockReturnValue(
      createMockMutation<ReturnType<typeof useCreateNotificationChannelConfig>>(createMutateAsync)
    )
    vi.mocked(useUpdateNotificationChannelConfig).mockReturnValue(
      createMockMutation<ReturnType<typeof useUpdateNotificationChannelConfig>>(updateMutateAsync)
    )
    vi.mocked(useDeleteNotificationChannelConfig).mockReturnValue(
      createMockMutation<ReturnType<typeof useDeleteNotificationChannelConfig>>(deleteMutateAsync)
    )
    vi.mocked(useTestWebhook).mockReturnValue(
      createMockMutation<ReturnType<typeof useTestWebhook>>(testMutateAsync)
    )
  })

  it('renders Teams-only page title and copy', () => {
    render(<NotificationChannelPage />)
    expect(screen.getByText('Microsoft Teams 알림 채널 설정')).toBeInTheDocument()
    expect(screen.getByText('이벤트 유형별 Microsoft Teams webhook 알림 채널을 설정하세요.')).toBeInTheDocument()
  })

  it('lists Teams channels only and masks saved webhook URLs', () => {
    render(<NotificationChannelPage />)
    selectCenter()

    expect(screen.getByText('Teams 채널 설정 목록')).toBeInTheDocument()
    expect(screen.getByText('TEMPERATURE')).toBeInTheDocument()
    expect(screen.queryByText('HUMIDITY')).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(fullTeamsWebhookUrl)
    expect(screen.getByText('https://contoso.webhook.office.com/••••••••••••••••')).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('oken')
  })

  it('shows honest empty state when a center has no Teams channels', () => {
    vi.mocked(useNotificationChannelConfigs).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useNotificationChannelConfigs>)
    render(<NotificationChannelPage />)
    selectCenter()
    expect(screen.getByText('등록된 Microsoft Teams 채널이 없습니다.')).toBeInTheDocument()
  })

  it('shows loading and error states', () => {
    vi.mocked(useNotificationChannelConfigs).mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useNotificationChannelConfigs>)
    const { rerender } = render(<NotificationChannelPage />)
    expect(screen.getByRole('status')).toHaveTextContent('Microsoft Teams 채널 설정을 불러오는 중...')

    vi.mocked(useNotificationChannelConfigs).mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useNotificationChannelConfigs>)
    rerender(<NotificationChannelPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('Microsoft Teams 채널 설정을 불러오지 못했습니다.')
  })

  it('shows center list error state with retry action', () => {
    vi.mocked(useCenters).mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      refetch: refetchCenters,
    } as unknown as ReturnType<typeof useCenters>)

    render(<NotificationChannelPage />)

    expect(screen.getByRole('alert')).toHaveTextContent('센터 목록을 불러오지 못했습니다. 다시 시도해 주세요.')
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(refetchCenters).toHaveBeenCalledTimes(1)
  })

  it('creates a Teams channel with a valid webhook URL', async () => {
    render(<NotificationChannelPage />)
    selectCenter()
    fireEvent.click(screen.getByRole('button', { name: '새 Teams 설정' }))

    fireEvent.change(screen.getByLabelText(/Teams webhook URL/), {
      target: { value: fullTeamsWebhookUrl },
    })
    fireEvent.submit(screen.getByRole('form', { name: '새 Teams 채널 설정 폼' }))

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith({
        centerId: 1,
        warehouseId: null,
        alertType: 'TEMPERATURE',
        active: true,
        channels: [
          {
            type: 'WEBHOOK',
            enabled: true,
            webhookProvider: 'TEAMS',
            webhookUrl: fullTeamsWebhookUrl,
          },
        ],
      })
    })
  })

  it('blocks invalid Teams webhook URLs', async () => {
    render(<NotificationChannelPage />)
    selectCenter()
    fireEvent.click(screen.getByRole('button', { name: '새 Teams 설정' }))

    fireEvent.change(screen.getByLabelText(/Teams webhook URL/), {
      target: { value: 'http://example.com/not-teams' },
    })
    fireEvent.submit(screen.getByRole('form', { name: '새 Teams 채널 설정 폼' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('유효한 Microsoft Teams webhook URL을 입력하세요.')
    expect(createMutateAsync).not.toHaveBeenCalled()
  })

  it('edits without displaying the saved raw webhook URL', async () => {
    render(<NotificationChannelPage />)
    selectCenter()
    fireEvent.click(screen.getByTitle('수정'))

    expect(screen.getByText('Teams 채널 설정 수정')).toBeInTheDocument()
    expect(screen.getByText('https://••••••••••••••••/Teams webhook 저장됨')).toBeInTheDocument()
    expect(screen.getByLabelText(/Teams webhook URL/)).toHaveValue('')
    expect(document.body).not.toHaveTextContent(fullTeamsWebhookUrl)

    fireEvent.submit(screen.getByRole('form', { name: 'Teams 채널 설정 수정 폼' }))
    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: 1,
        data: {
          centerId: 1,
          warehouseId: null,
          alertType: 'TEMPERATURE',
          active: true,
          channels: [
            { type: 'EMAIL', enabled: true, webhookProvider: null },
            { type: 'WEBHOOK', enabled: true, webhookProvider: 'TEAMS' },
          ],
        },
      })
    })
  })

  it('toggles Teams channel active state from the list', async () => {
    render(<NotificationChannelPage />)
    selectCenter()
    fireEvent.click(screen.getByTitle('Teams 채널 비활성화'))

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: 1,
        data: {
          centerId: 1,
          warehouseId: null,
          alertType: 'TEMPERATURE',
          active: false,
          channels: [
            { type: 'EMAIL', enabled: true, webhookProvider: null },
            { type: 'WEBHOOK', enabled: true, webhookProvider: 'TEAMS' },
          ],
        },
      })
    })
  })

  it('shows Teams test-send success and failure status', async () => {
    render(<NotificationChannelPage />)
    selectCenter()
    fireEvent.click(screen.getByTitle('Teams 테스트 전송'))

    expect(await screen.findByText(/성공: Microsoft Teams 테스트 전송 성공/)).toBeInTheDocument()

    testMutateAsync.mockResolvedValueOnce({
      success: false,
      message: `Endpoint disabled for ${fullTeamsWebhookUrl}`,
      providerType: 'TEAMS',
    })
    fireEvent.click(screen.getByTitle('Teams 테스트 전송'))

    expect(await screen.findByText(/실패: Microsoft Teams 테스트 전송 실패/)).toBeInTheDocument()
    expect(document.body).not.toHaveTextContent('Endpoint disabled')
    expect(document.body).not.toHaveTextContent(fullTeamsWebhookUrl)
  })

  it('deletes a Teams channel after confirmation', async () => {
    render(<NotificationChannelPage />)
    selectCenter()
    fireEvent.click(screen.getByTitle('삭제'))

    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText('Teams 채널 설정 삭제')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(deleteMutateAsync).toHaveBeenCalledWith(1)
    })
  })
})
