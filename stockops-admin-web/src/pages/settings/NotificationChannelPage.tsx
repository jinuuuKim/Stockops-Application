/**
 * Microsoft Teams notification channel configuration page.
 * Admin can configure Teams webhook delivery per event type per center/warehouse.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useState, useEffect, useMemo } from 'react'
import { X, Plus, Trash2, Edit2, Send, CheckCircle, XCircle, Power } from 'lucide-react'
import { useCenters } from '@/hooks/useCenter'
import { useWarehousesByCenter } from '@/hooks/useWarehouse'
import {
  useNotificationChannelConfigs,
  useCreateNotificationChannelConfig,
  useUpdateNotificationChannelConfig,
  useDeleteNotificationChannelConfig,
  useTestWebhook,
} from '@/hooks/useNotificationChannelConfigs'
import type {
  NotificationChannelConfig,
  NotificationChannelConfigRequest,
  ChannelEntryRequest,
} from '@/types/notificationChannel'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { showToast } from '@/lib/toast'

const EVENT_TYPES = [
  { value: 'TEMPERATURE', label: '온도' },
  { value: 'HUMIDITY', label: '습도' },
  { value: 'AIR_QUALITY', label: '공기질' },
  { value: 'DOOR', label: '문 열림' },
  { value: 'MOTION', label: '움직임' },
  { value: 'CO2', label: '이산화탄소' },
  { value: 'TVOC', label: 'TVOC' },
  { value: 'PRESSURE', label: '압력' },
]

type TeamsChannelEntryRequest = ChannelEntryRequest & {
  webhookUrl?: string
}

type TeamsFormData = Omit<NotificationChannelConfigRequest, 'channels'> & {
  channels: TeamsChannelEntryRequest[]
}

type TestResultState = {
  status: 'success' | 'failure'
  message: string
}

const MASKED_WEBHOOK_FALLBACK = 'https://••••••••••••••••/Teams webhook 저장됨'
const TEST_SUCCESS_MESSAGE = 'Microsoft Teams 테스트 전송 성공'
const TEST_FAILURE_MESSAGE = 'Microsoft Teams 테스트 전송 실패'

function defaultChannels(): TeamsChannelEntryRequest[] {
  return [
    { type: 'WEBHOOK', enabled: true, webhookProvider: 'TEAMS', webhookUrl: '' },
  ]
}

function emptyForm(): TeamsFormData {
  return {
    centerId: 0,
    warehouseId: null,
    alertType: 'TEMPERATURE',
    channels: defaultChannels(),
    active: true,
  }
}

function findTeamsChannel(config: NotificationChannelConfig) {
  return config.channels.find((channel) => channel.type === 'WEBHOOK' && channel.webhookProvider === 'TEAMS')
}

function maskWebhookUrl(value?: string | null): string {
  if (!value) return MASKED_WEBHOOK_FALLBACK

  if (value.includes('•')) return value

  try {
    const url = new URL(value)
    return `${url.protocol}//${url.hostname}/••••••••••••••••`
  } catch {
    return '••••••••••••••••'
  }
}

function isValidTeamsWebhookUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return false
    return url.hostname.endsWith('webhook.office.com') || url.hostname.endsWith('logic.azure.com')
  } catch {
    return false
  }
}

function buildTeamsRequest(formData: TeamsFormData, existingConfig?: NotificationChannelConfig): NotificationChannelConfigRequest {
  const teamsChannel = formData.channels[0]
  const trimmedWebhookUrl = teamsChannel.webhookUrl?.trim()
  const nextTeamsChannel: TeamsChannelEntryRequest = {
    type: 'WEBHOOK',
    enabled: teamsChannel.enabled,
    webhookProvider: 'TEAMS',
    ...(trimmedWebhookUrl ? { webhookUrl: trimmedWebhookUrl } : {}),
  }
  const channels = existingConfig
    ? existingConfig.channels.map((channel) => (
        channel.type === 'WEBHOOK' && channel.webhookProvider === 'TEAMS'
          ? nextTeamsChannel
          : {
              type: channel.type,
              enabled: channel.enabled,
              webhookProvider: channel.webhookProvider,
            }
      ))
    : [nextTeamsChannel]

  return {
    centerId: formData.centerId,
    warehouseId: formData.warehouseId,
    alertType: formData.alertType,
    active: formData.active,
    channels,
  }
}

function buildTeamsRequestFromConfig(config: NotificationChannelConfig, active: boolean): NotificationChannelConfigRequest {
  return {
    centerId: config.centerId,
    warehouseId: config.warehouseId,
    alertType: config.alertType,
    active,
    channels: config.channels.map((channel) => ({
      type: channel.type,
      enabled: channel.enabled,
      webhookProvider: channel.webhookProvider,
    })),
  }
}

export function NotificationChannelPage() {
  const [selectedCenterId, setSelectedCenterId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<NotificationChannelConfig | null>(null)
  const [formData, setFormData] = useState<TeamsFormData>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [testingConfigId, setTestingConfigId] = useState<number | null>(null)
  const [testResults, setTestResults] = useState<Record<number, TestResultState | null>>({})

  const {
    data: centers,
    isLoading: centersLoading,
    isError: centersIsError,
    refetch: refetchCenters,
  } = useCenters()
  const { data: warehouses } = useWarehousesByCenter(selectedCenterId)
  const {
    data: configs,
    isLoading: configsLoading,
    isError: configsIsError,
  } = useNotificationChannelConfigs(selectedCenterId)

  const createMutation = useCreateNotificationChannelConfig()
  const updateMutation = useUpdateNotificationChannelConfig()
  const deleteMutation = useDeleteNotificationChannelConfig()
  const testWebhookMutation = useTestWebhook()

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  const teamsConfigs = useMemo(
    () => (configs ?? []).filter((config) => findTeamsChannel(config)),
    [configs]
  )

  useEffect(() => {
    if (selectedCenterId && centers && centers.length > 0 && !isModalOpen) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- keeps new channel forms aligned with the selected settings center. */
      setFormData((prev) => ({ ...prev, centerId: selectedCenterId }))
    }
  }, [selectedCenterId, centers, isModalOpen])

  const openCreateModal = () => {
    setEditingConfig(null)
    setFormError(null)
    setFormData(emptyForm())
    if (selectedCenterId) {
      setFormData((prev) => ({ ...prev, centerId: selectedCenterId }))
    } else if (centers && centers.length > 0) {
      setFormData((prev) => ({ ...prev, centerId: centers[0].id }))
    }
    setIsModalOpen(true)
  }

  const openEditModal = (config: NotificationChannelConfig) => {
    const teamsChannel = findTeamsChannel(config)
    setEditingConfig(config)
    setFormError(null)
    setFormData({
      centerId: config.centerId,
      warehouseId: config.warehouseId,
      alertType: config.alertType,
      channels: [
        {
          type: 'WEBHOOK',
          enabled: teamsChannel?.enabled ?? true,
          webhookProvider: 'TEAMS',
          webhookUrl: '',
        },
      ],
      active: config.active,
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingConfig(null)
    setFormData(emptyForm())
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const teamsChannel = formData.channels[0]
    const webhookUrl = teamsChannel.webhookUrl?.trim() ?? ''

    if (!editingConfig && !webhookUrl) {
      setFormError('Microsoft Teams webhook URL을 입력하세요.')
      return
    }

    if (webhookUrl && !isValidTeamsWebhookUrl(webhookUrl)) {
      setFormError('유효한 Microsoft Teams webhook URL을 입력하세요. HTTPS Teams webhook 주소만 사용할 수 있습니다.')
      return
    }

    const request = buildTeamsRequest(formData, editingConfig ?? undefined)

    try {
      if (editingConfig) {
        await updateMutation.mutateAsync({ id: editingConfig.id, data: request })
        showToast({ message: 'Microsoft Teams 채널 설정이 수정되었습니다.', variant: 'success' })
      } else {
        await createMutation.mutateAsync(request)
        showToast({ message: 'Microsoft Teams 채널 설정이 생성되었습니다.', variant: 'success' })
      }
      closeModal()
    } catch {
      // error handled by interceptor
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget)
      showToast({ message: 'Microsoft Teams 채널 설정이 삭제되었습니다.', variant: 'success' })
      setDeleteTarget(null)
    } catch {
      // error handled by interceptor
    }
  }

  const handleTestWebhook = async (configId: number) => {
    setTestResults((prev) => ({ ...prev, [configId]: null }))
    setTestingConfigId(configId)
    try {
      const result = await testWebhookMutation.mutateAsync(configId)
      setTestResults((prev) => ({
        ...prev,
        [configId]: {
          status: result.success ? 'success' : 'failure',
          message: result.success ? TEST_SUCCESS_MESSAGE : TEST_FAILURE_MESSAGE,
        },
      }))
      if (result.success) {
        showToast({ message: 'Microsoft Teams 테스트 전송에 성공했습니다.', variant: 'success' })
      } else {
        showToast({ message: TEST_FAILURE_MESSAGE, variant: 'error' })
      }
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [configId]: { status: 'failure', message: TEST_FAILURE_MESSAGE },
      }))
    } finally {
      setTestingConfigId(null)
    }
  }

  const handleToggleActive = async (config: NotificationChannelConfig) => {
    const nextActive = !config.active
    try {
      await updateMutation.mutateAsync({ id: config.id, data: buildTeamsRequestFromConfig(config, nextActive) })
      showToast({
        message: nextActive ? 'Microsoft Teams 채널이 활성화되었습니다.' : 'Microsoft Teams 채널이 비활성화되었습니다.',
        variant: 'success',
      })
    } catch {
      return
    }
  }

  const toggleTeamsChannel = (enabled: boolean) => {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels.map((channel) => ({ ...channel, enabled })),
    }))
  }

  const updateTeamsWebhookUrl = (webhookUrl: string) => {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels.map((channel) => ({ ...channel, webhookUrl })),
    }))
    if (formError) setFormError(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Microsoft Teams 알림 채널 설정</h1>
        <p className="text-text-secondary mt-1">
          이벤트 유형별 Microsoft Teams webhook 알림 채널을 설정하세요.
        </p>
      </div>

      {/* Center selector */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <label htmlFor="centerFilter" className="block text-sm font-medium text-neutral-700 mb-2">센터 선택</label>
        {centersLoading ? (
          <p className="text-sm text-text-secondary" role="status">센터 목록을 불러오는 중...</p>
        ) : centersIsError ? (
          <div className="max-w-md rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error" role="alert">
            <p>센터 목록을 불러오지 못했습니다. 다시 시도해 주세요.</p>
            <button
              type="button"
              onClick={() => void refetchCenters()}
              className="mt-3 inline-flex items-center rounded-lg bg-error px-3 py-2 text-white hover:bg-error/90 transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <select
            id="centerFilter"
            value={selectedCenterId ?? ''}
            onChange={(e) => setSelectedCenterId(e.target.value ? Number(e.target.value) : null)}
            className="w-full max-w-md px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">센터를 선택하세요</option>
            {centers?.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Config list */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Teams 채널 설정 목록</h2>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            disabled={!selectedCenterId}
          >
            <Plus className="w-4 h-4" />
            새 Teams 설정
          </button>
        </div>

        {configsLoading ? (
          <p className="text-text-secondary" role="status">Microsoft Teams 채널 설정을 불러오는 중...</p>
        ) : configsIsError ? (
          <div className="rounded-lg border border-error/30 bg-error/5 p-4 text-sm text-error" role="alert">
            Microsoft Teams 채널 설정을 불러오지 못했습니다. 잠시 후 다시 시도하세요.
          </div>
        ) : !selectedCenterId ? (
          <p className="text-text-secondary">센터를 선택하면 Microsoft Teams 채널 설정을 확인할 수 있습니다.</p>
        ) : teamsConfigs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">이벤트 유형</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">창고</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Teams webhook</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">상태</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">테스트 결과</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">관리</th>
                </tr>
              </thead>
              <tbody>
                {teamsConfigs.map((config) => {
                  const teamsChannel = findTeamsChannel(config)
                  const isEnabled = Boolean(config.active && teamsChannel?.enabled)
                  const testResult = testResults[config.id]
                  const isTesting = testingConfigId === config.id

                  return (
                    <tr key={config.id} className="border-b border-neutral-100">
                      <td className="py-3 px-4 text-text-primary">{config.alertType}</td>
                      <td className="py-3 px-4 text-text-secondary">
                        {config.warehouseId ? `창고 ${config.warehouseId}` : '전체 센터'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 text-xs bg-primary-50 text-primary-700 rounded">Microsoft Teams</span>
                          <p className="text-xs font-mono text-text-secondary">
                            {maskWebhookUrl(teamsChannel?.webhookUrlMasked ?? teamsChannel?.webhookUrl)}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {isEnabled ? (
                          <span className="px-2 py-0.5 text-xs bg-success/10 text-success rounded">활성</span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs bg-neutral-200 text-text-secondary rounded">비활성</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isTesting ? (
                          <span className="text-sm text-text-secondary" role="status">Teams 테스트 전송 중...</span>
                        ) : testResult ? (
                          <span className={`inline-flex items-center gap-1 text-sm ${testResult.status === 'success' ? 'text-success' : 'text-error'}`}>
                            {testResult.status === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            {testResult.status === 'success' ? '성공' : '실패'}: {testResult.message}
                          </span>
                        ) : (
                          <span className="text-sm text-text-secondary">아직 테스트하지 않음</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleTestWebhook(config.id)}
                            className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Teams 테스트 전송"
                            disabled={!isEnabled || isTesting || testWebhookMutation.isPending}
                          >
                            <Send className="w-4 h-4 text-blue-500" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(config)}
                            className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50"
                            title={config.active ? 'Teams 채널 비활성화' : 'Teams 채널 활성화'}
                            disabled={isMutating}
                          >
                            <Power className="w-4 h-4 text-text-secondary" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(config)}
                            className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
                            title="수정"
                          >
                            <Edit2 className="w-4 h-4 text-text-secondary" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(config.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4 text-error" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-center">
            <p className="font-medium text-text-primary">등록된 Microsoft Teams 채널이 없습니다.</p>
            <p className="mt-1 text-sm text-text-secondary">새 Teams 설정을 추가하면 이벤트 유형별 테스트 전송과 활성화 상태를 관리할 수 있습니다.</p>
          </div>
        )}
      </div>

      {/* Config form modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-neutral-900">
                {editingConfig ? 'Teams 채널 설정 수정' : '새 Teams 채널 설정'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
                disabled={isMutating}
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            <form
              aria-label={editingConfig ? 'Teams 채널 설정 수정 폼' : '새 Teams 채널 설정 폼'}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {formError && (
                <div className="rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error" role="alert">
                  {formError}
                </div>
              )}

              {/* Center */}
              <div>
                <label htmlFor="configCenter" className="block text-sm font-medium text-neutral-700 mb-1">
                  센터 <span className="text-error">*</span>
                </label>
                <select
                  id="configCenter"
                  value={formData.centerId || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, centerId: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  disabled={!!editingConfig}
                >
                  <option value="">센터를 선택하세요</option>
                  {centers?.map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
                {editingConfig && (
                  <p className="text-xs text-neutral-500 mt-1">센터는 수정할 수 없습니다</p>
                )}
              </div>

              {/* Warehouse */}
              <div>
                <label htmlFor="configWarehouse" className="block text-sm font-medium text-neutral-700 mb-1">창고 (선택)</label>
                <select
                  id="configWarehouse"
                  value={formData.warehouseId ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      warehouseId: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">전체 센터 적용</option>
                  {warehouses?.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Event type */}
              <div>
                <label htmlFor="configAlertType" className="block text-sm font-medium text-neutral-700 mb-1">
                  이벤트 유형 <span className="text-error">*</span>
                </label>
                <select
                  id="configAlertType"
                  value={formData.alertType}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, alertType: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  disabled={!!editingConfig}
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} ({type.value})
                    </option>
                  ))}
                </select>
                {editingConfig && (
                  <p className="text-xs text-neutral-500 mt-1">이벤트 유형은 수정할 수 없습니다</p>
                )}
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="configActive"
                  checked={formData.active}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, active: e.target.checked }))
                  }
                  className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="configActive" className="text-sm text-neutral-700">
                  Teams 채널 설정 활성화
                </label>
              </div>

              <div className="border border-neutral-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-700">Microsoft Teams</h3>
                    <p className="text-xs text-neutral-500">Teams webhook URL은 저장 후 화면에 전체 표시하지 않습니다.</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.channels[0]?.enabled ?? true}
                      onChange={(e) => toggleTeamsChannel(e.target.checked)}
                      className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-neutral-700">Teams 전송 활성</span>
                  </label>
                </div>

                {editingConfig && (
                  <div className="rounded-lg bg-neutral-50 p-3">
                    <p className="text-xs font-medium text-neutral-600">저장된 Teams webhook</p>
                    <p className="mt-1 text-xs font-mono text-text-secondary">{MASKED_WEBHOOK_FALLBACK}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="teamsWebhookUrl" className="block text-sm font-medium text-neutral-700 mb-1">
                    Teams webhook URL {!editingConfig && <span className="text-error">*</span>}
                  </label>
                  <input
                    id="teamsWebhookUrl"
                    type="url"
                    value={formData.channels[0]?.webhookUrl ?? ''}
                    onChange={(e) => updateTeamsWebhookUrl(e.target.value)}
                    placeholder="https://...webhook.office.com/..."
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    autoComplete="off"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    {editingConfig
                      ? '변경할 때만 새 Microsoft Teams webhook URL을 입력하세요. 기존 URL은 보안상 표시하지 않습니다.'
                      : 'Microsoft Teams에서 발급한 HTTPS webhook URL만 저장할 수 있습니다.'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
                  disabled={isMutating}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  disabled={isMutating}
                >
                  {isMutating ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Teams 채널 설정 삭제"
        description="이 Microsoft Teams 채널 설정을 삭제하시겠습니까? 삭제된 설정은 비활성화 상태로 변경됩니다."
        variant="destructive"
        confirmLabel="삭제"
      />
    </div>
  )
}
