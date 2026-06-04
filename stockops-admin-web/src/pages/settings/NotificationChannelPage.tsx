/**
 * Notification channel configuration page.
 * Admin can configure which channels (SMS, Email, Webhook with provider selection)
 * are used per alert type per center/warehouse.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Edit2, Send, CheckCircle, XCircle } from 'lucide-react'
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
  ChannelType,
  WebhookProviderType,
  WebhookTestResult,
} from '@/types/notificationChannel'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { showToast } from '@/lib/toast'

const ALERT_TYPES = [
  'TEMPERATURE',
  'HUMIDITY',
  'AIR_QUALITY',
  'DOOR',
  'MOTION',
  'CO2',
  'TVOC',
  'PRESSURE',
]

const CHANNEL_TYPES: { value: ChannelType; label: string }[] = [
  { value: 'SMS', label: 'SMS' },
  { value: 'EMAIL', label: '이메일' },
  { value: 'WEBHOOK', label: '웹훅' },
]

const WEBHOOK_PROVIDERS: { value: WebhookProviderType; label: string }[] = [
  { value: 'SLACK', label: 'Slack' },
  { value: 'NOTION', label: 'Notion' },
  { value: 'DISCORD', label: 'Discord' },
  { value: 'TEAMS', label: 'Microsoft Teams' },
  { value: 'GENERIC', label: 'Generic' },
]

function defaultChannels(): ChannelEntryRequest[] {
  return [
    { type: 'SMS', enabled: false, webhookProvider: null },
    { type: 'EMAIL', enabled: true, webhookProvider: null },
    { type: 'WEBHOOK', enabled: false, webhookProvider: 'SLACK' },
  ]
}

function emptyForm(): NotificationChannelConfigRequest {
  return {
    centerId: 0,
    warehouseId: null,
    alertType: 'TEMPERATURE',
    channels: defaultChannels(),
    active: true,
  }
}

export function NotificationChannelPage() {
  const [selectedCenterId, setSelectedCenterId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<NotificationChannelConfig | null>(null)
  const [formData, setFormData] = useState<NotificationChannelConfigRequest>(emptyForm())
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [testResults, setTestResults] = useState<Record<number, WebhookTestResult | null>>({})

  const { data: centers, isLoading: centersLoading } = useCenters()
  const { data: warehouses } = useWarehousesByCenter(selectedCenterId)
  const { data: configs, isLoading: configsLoading } = useNotificationChannelConfigs(selectedCenterId)

  const createMutation = useCreateNotificationChannelConfig()
  const updateMutation = useUpdateNotificationChannelConfig()
  const deleteMutation = useDeleteNotificationChannelConfig()
  const testWebhookMutation = useTestWebhook()

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  useEffect(() => {
    if (selectedCenterId && centers && centers.length > 0 && !isModalOpen) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- keeps new channel forms aligned with the selected settings center. */
      setFormData((prev) => ({ ...prev, centerId: selectedCenterId }))
    }
  }, [selectedCenterId, centers, isModalOpen])

  const openCreateModal = () => {
    setEditingConfig(null)
    setFormData(emptyForm())
    if (selectedCenterId) {
      setFormData((prev) => ({ ...prev, centerId: selectedCenterId }))
    } else if (centers && centers.length > 0) {
      setFormData((prev) => ({ ...prev, centerId: centers[0].id }))
    }
    setIsModalOpen(true)
  }

  const openEditModal = (config: NotificationChannelConfig) => {
    setEditingConfig(config)
    setFormData({
      centerId: config.centerId,
      warehouseId: config.warehouseId,
      alertType: config.alertType,
      channels: config.channels.map((ch) => ({
        type: ch.type,
        enabled: ch.enabled,
        webhookProvider: ch.webhookProvider,
      })),
      active: config.active,
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingConfig(null)
    setFormData(emptyForm())
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      if (editingConfig) {
        await updateMutation.mutateAsync({ id: editingConfig.id, data: formData })
        showToast({ message: '채널 설정이 수정되었습니다.', variant: 'success' })
      } else {
        await createMutation.mutateAsync(formData)
        showToast({ message: '채널 설정이 생성되었습니다.', variant: 'success' })
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
      showToast({ message: '채널 설정이 삭제되었습니다.', variant: 'success' })
      setDeleteTarget(null)
    } catch {
      // error handled by interceptor
    }
  }

  const handleTestWebhook = async (configId: number) => {
    setTestResults((prev) => ({ ...prev, [configId]: null }))
    try {
      const result = await testWebhookMutation.mutateAsync(configId)
      setTestResults((prev) => ({ ...prev, [configId]: result }))
      if (result.success) {
        showToast({ message: '웹훅 테스트 성공!', variant: 'success' })
      } else {
        showToast({ message: `웹훅 테스트 실패: ${result.message}`, variant: 'error' })
      }
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [configId]: { success: false, message: '요청 실패', providerType: null },
      }))
    }
  }

  const toggleChannel = (index: number, enabled: boolean) => {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels.map((ch, i) =>
        i === index ? { ...ch, enabled } : ch
      ),
    }))
  }

  const updateWebhookProvider = (index: number, provider: string) => {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels.map((ch, i) =>
        i === index ? { ...ch, webhookProvider: provider } : ch
      ),
    }))
  }

  const addChannel = () => {
    setFormData((prev) => ({
      ...prev,
      channels: [...prev.channels, { type: 'WEBHOOK', enabled: false, webhookProvider: 'SLACK' }],
    }))
  }

  const removeChannel = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels.filter((_, i) => i !== index),
    }))
  }

  const getChannelLabel = (type: string) => {
    return CHANNEL_TYPES.find((ct) => ct.value === type)?.label ?? type
  }

  const getProviderLabel = (provider: string | null) => {
    if (!provider) return '-'
    return WEBHOOK_PROVIDERS.find((wp) => wp.value === provider)?.label ?? provider
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">알림 채널 설정</h1>
        <p className="text-text-secondary mt-1">
          알림 유형별로 SMS, 이메일, 웹훅 채널을 설정하세요.
        </p>
      </div>

      {/* Center selector */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <label htmlFor="centerFilter" className="block text-sm font-medium text-neutral-700 mb-2">센터 선택</label>
        <select
          id="centerFilter"
          value={selectedCenterId ?? ''}
          onChange={(e) => setSelectedCenterId(e.target.value ? Number(e.target.value) : null)}
          className="w-full max-w-md px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={centersLoading}
        >
          <option value="">센터를 선택하세요</option>
          {centers?.map((center) => (
            <option key={center.id} value={center.id}>
              {center.name}
            </option>
          ))}
        </select>
      </div>

      {/* Config list */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">채널 설정 목록</h2>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            disabled={!selectedCenterId}
          >
            <Plus className="w-4 h-4" />
            새 설정
          </button>
        </div>

        {configsLoading ? (
          <p className="text-text-secondary">설정을 불러오는 중...</p>
        ) : !selectedCenterId ? (
          <p className="text-text-secondary">센터를 선택하여 설정을 확인하세요.</p>
        ) : configs && configs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">알림 유형</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">창고</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">채널</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">상태</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">관리</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((config) => (
                  <tr key={config.id} className="border-b border-neutral-100">
                    <td className="py-3 px-4 text-text-primary">{config.alertType}</td>
                    <td className="py-3 px-4 text-text-secondary">
                      {config.warehouseId ? `창고 ${config.warehouseId}` : '전체 (센터)'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {config.channels.filter((ch) => ch.enabled).map((ch) => (
                          <span
                            key={`${ch.type}-${ch.webhookProvider ?? 'none'}`}
                            className="px-2 py-0.5 text-xs bg-primary-50 text-primary-700 rounded"
                          >
                            {getChannelLabel(ch.type)}
                            {ch.type === 'WEBHOOK' && ch.webhookProvider && ` (${getProviderLabel(ch.webhookProvider)})`}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {config.active ? (
                        <span className="px-2 py-0.5 text-xs bg-success/10 text-success rounded">활성</span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs bg-neutral-200 text-text-secondary rounded">비활성</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {config.channels.some((ch) => ch.type === 'WEBHOOK' && ch.enabled) && (
                          <button
                            type="button"
                            onClick={() => handleTestWebhook(config.id)}
                            className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                            title="웹훅 테스트"
                            disabled={testWebhookMutation.isPending}
                          >
                            <Send className="w-4 h-4 text-blue-500" />
                          </button>
                        )}
                        {testResults[config.id] && (
                          testResults[config.id]!.success ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-error" />
                          )
                        )}
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
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-text-secondary">등록된 채널 설정이 없습니다.</p>
        )}
      </div>

      {/* Config form modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-neutral-900">
                {editingConfig ? '채널 설정 수정' : '새 채널 설정'}
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
              aria-label={editingConfig ? '채널 설정 수정 폼' : '새 채널 설정 폼'}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
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

              {/* Alert type */}
              <div>
                <label htmlFor="configAlertType" className="block text-sm font-medium text-neutral-700 mb-1">
                  알림 유형 <span className="text-error">*</span>
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
                  {ALERT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {editingConfig && (
                  <p className="text-xs text-neutral-500 mt-1">알림 유형은 수정할 수 없습니다</p>
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
                  설정 활성화
                </label>
              </div>

              {/* Channels */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-neutral-700">알림 채널</h3>
                  <button
                    type="button"
                    onClick={addChannel}
                    className="flex items-center gap-1 px-2 py-1 text-sm border border-neutral-300 rounded hover:bg-neutral-50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    웹훅 추가
                  </button>
                </div>

                {formData.channels.map((channel, index) => (
                  <div
                    key={`${channel.type}-${channel.webhookProvider ?? 'none'}-${formData.channels.slice(0, index).filter(c => c.type === channel.type && c.webhookProvider === channel.webhookProvider).length}`}
                    className="border border-neutral-200 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <select
                          value={channel.type}
                          onChange={(e) => {
                            const newType = e.target.value as ChannelType
                            setFormData((prev) => ({
                              ...prev,
                              channels: prev.channels.map((ch, i) =>
                                i === index
                                  ? {
                                      ...ch,
                                      type: newType,
                                      webhookProvider: newType === 'WEBHOOK' ? (ch.webhookProvider ?? 'SLACK') : null,
                                    }
                                  : ch
                              ),
                            }))
                          }}
                          className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          disabled={channel.type !== 'WEBHOOK' && formData.channels.filter((c) => c.type === channel.type).length === 1}
                        >
                          {CHANNEL_TYPES.map((ct) => (
                            <option key={ct.value} value={ct.value}>
                              {ct.label}
                            </option>
                          ))}
                        </select>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={channel.enabled}
                            onChange={(e) => toggleChannel(index, e.target.checked)}
                            className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                          />
                          <span className="text-sm text-neutral-700">활성</span>
                        </label>
                      </div>
                      {channel.type === 'WEBHOOK' && formData.channels.filter((c) => c.type === 'WEBHOOK').length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeChannel(index)}
                          className="p-1 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-error" />
                        </button>
                      )}
                    </div>

                    {channel.type === 'WEBHOOK' && (
                      <div>
                        <label htmlFor={`provider-${index}`} className="block text-sm font-medium text-neutral-700 mb-1">
                          웹훅 제공자
                        </label>
                        <select
                          id={`provider-${index}`}
                          value={channel.webhookProvider ?? 'SLACK'}
                          onChange={(e) => updateWebhookProvider(index, e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          disabled={!channel.enabled}
                        >
                          {WEBHOOK_PROVIDERS.map((wp) => (
                            <option key={wp.value} value={wp.value}>
                              {wp.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
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
        title="채널 설정 삭제"
        description="이 알림 채널 설정을 삭제하시겠습니까? 삭제된 설정은 비활성화 상태로 변경됩니다."
        variant="destructive"
        confirmLabel="삭제"
      />
    </div>
  )
}
