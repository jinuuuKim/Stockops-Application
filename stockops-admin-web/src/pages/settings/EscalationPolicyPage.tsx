/**
 * Escalation policy management page with CRUD and active alerts dashboard.
 * Admin can configure multi-level notification rules and acknowledge pending alerts.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useState, useEffect, useMemo } from 'react'
import { X, Plus, Trash2, Edit2, AlertTriangle, CheckCircle, Zap } from 'lucide-react'
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
import type {
  EscalationPolicy,
  EscalationPolicyRequest,
  EscalationRuleRequest,
  PendingAlert,
} from '@/types/escalation'
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

const ALL_ROLES = [
  { value: 'ROLE_ADMIN', label: '관리자' },
  { value: 'ROLE_CENTER_MANAGER', label: '센터 관리자' },
  { value: 'ROLE_WAREHOUSE_MANAGER', label: '창고 관리자' },
  { value: 'ROLE_USER', label: '일반 사용자' },
]

const ALL_CHANNELS = [
  { value: 'SMS', label: 'SMS' },
  { value: 'EMAIL', label: '이메일' },
]

function emptyRule(level: number): EscalationRuleRequest {
  return {
    level,
    delayMinutes: 0,
    notifyRoles: [],
    channels: ['EMAIL'],
  }
}

function emptyForm(): EscalationPolicyRequest {
  return {
    centerId: 0,
    warehouseId: null,
    alertType: 'TEMPERATURE',
    active: true,
    rules: [emptyRule(1)],
  }
}

function computeNextEscalationAt(
  alert: PendingAlert,
  policies: EscalationPolicy[] | undefined
): string | null {
  if (!policies) return null
  const policy = policies.find(
    (p) =>
      p.centerId === alert.centerId &&
      (p.warehouseId === alert.warehouseId ||
        (p.warehouseId === null && alert.warehouseId === null)) &&
      p.alertType === alert.alertType &&
      p.active
  )
  if (!policy) return null
  const nextRule = policy.rules.find((r) => r.level === alert.currentLevel + 1)
  if (!nextRule) return null
  const created = new Date(alert.createdAt)
  let totalDelay = 0
  for (const rule of policy.rules) {
    if (rule.level <= alert.currentLevel + 1) {
      totalDelay += rule.delayMinutes
    }
  }
  const nextTime = new Date(created.getTime() + totalDelay * 60000)
  return nextTime.toLocaleString('ko-KR')
}

export function EscalationPolicyPage() {
  const [selectedCenterId, setSelectedCenterId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<EscalationPolicy | null>(null)
  const [formData, setFormData] = useState<EscalationPolicyRequest>(emptyForm())
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  const {
    data: centers,
    isLoading: centersLoading,
    isError: centersIsError,
    refetch: refetchCenters,
  } = useCenters()
  const { data: warehouses } = useWarehousesByCenter(selectedCenterId)
  const {
    data: policies,
    isLoading: policiesLoading,
    isError: policiesIsError,
  } = useEscalationPolicies(selectedCenterId)
  const {
    data: alerts,
    isLoading: alertsLoading,
    isError: alertsIsError,
  } = useActiveAlerts()

  const createMutation = useCreateEscalationPolicy()
  const updateMutation = useUpdateEscalationPolicy()
  const deleteMutation = useDeleteEscalationPolicy()
  const acknowledgeMutation = useAcknowledgeAlert()

  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  useEffect(() => {
    if (selectedCenterId && centers && centers.length > 0 && !isModalOpen) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- keeps new policy forms aligned with the selected settings center. */
      setFormData((prev) => ({ ...prev, centerId: selectedCenterId }))
    }
  }, [selectedCenterId, centers, isModalOpen])

  const openCreateModal = () => {
    setEditingPolicy(null)
    setFormData(emptyForm())
    if (selectedCenterId) {
      setFormData((prev) => ({ ...prev, centerId: selectedCenterId }))
    } else if (centers && centers.length > 0) {
      setFormData((prev) => ({ ...prev, centerId: centers[0].id }))
    }
    setIsModalOpen(true)
  }

  const openEditModal = (policy: EscalationPolicy) => {
    setEditingPolicy(policy)
    setFormData({
      centerId: policy.centerId,
      warehouseId: policy.warehouseId,
      alertType: policy.alertType,
      active: policy.active,
      rules: policy.rules.map((r) => ({
        level: r.level,
        delayMinutes: r.delayMinutes,
        notifyRoles: [...r.notifyRoles],
        channels: [...r.channels],
      })),
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPolicy(null)
    setFormData(emptyForm())
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (formData.rules.length === 0) {
      showToast({ message: '최소 1개의 에스컬레이션 규칙이 필요합니다.', variant: 'error' })
      return
    }
    try {
      if (editingPolicy) {
        await updateMutation.mutateAsync({ id: editingPolicy.id, data: formData })
        showToast({ message: '정책이 수정되었습니다.', variant: 'success' })
      } else {
        await createMutation.mutateAsync(formData)
        showToast({ message: '정책이 생성되었습니다.', variant: 'success' })
      }
      closeModal()
    } catch {
      return
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget)
      showToast({ message: '정책이 삭제되었습니다.', variant: 'success' })
      setDeleteTarget(null)
    } catch {
      return
    }
  }

  const handleAcknowledge = async (alertId: number) => {
    try {
      await acknowledgeMutation.mutateAsync(alertId)
      showToast({ message: '알림이 확인 처리되었습니다.', variant: 'success' })
    } catch {
      return
    }
  }

  const updateRule = (index: number, updates: Partial<EscalationRuleRequest>) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.map((r, i) => (i === index ? { ...r, ...updates } : r)),
    }))
  }

  const toggleRole = (index: number, role: string) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.map((r, i) => {
        if (i !== index) return r
        const roles = r.notifyRoles.includes(role)
          ? r.notifyRoles.filter((x) => x !== role)
          : [...r.notifyRoles, role]
        return { ...r, notifyRoles: roles }
      }),
    }))
  }

  const toggleChannel = (index: number, channel: string) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.map((r, i) => {
        if (i !== index) return r
        const channels = r.channels.includes(channel)
          ? r.channels.filter((x) => x !== channel)
          : [...r.channels, channel]
        return { ...r, channels }
      }),
    }))
  }

  const addRule = () => {
    if (formData.rules.length >= 3) return
    setFormData((prev) => ({
      ...prev,
      rules: [...prev.rules, emptyRule(prev.rules.length + 1)],
    }))
  }

  const removeRule = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules
        .filter((_, i) => i !== index)
        .map((r, i) => ({ ...r, level: i + 1 })),
    }))
  }

  const selectedCenterName = useMemo(() => {
    if (!selectedCenterId || !centers) return ''
    return centers.find((c) => c.id === selectedCenterId)?.name || ''
  }, [selectedCenterId, centers])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">알림 에스컬레이션</h1>
        <p className="text-text-secondary mt-1">
          에스컬레이션 정책을 관리하고 활성 알림을 확인하세요.
        </p>
      </div>

      {/* Center selector */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <label htmlFor="centerFilter" className="block text-sm font-medium text-neutral-700 mb-2">센터 선택</label>
        {centersIsError ? (
          <div className="rounded-lg border border-error/20 bg-error/5 p-4 text-sm text-error">
            <p>센터 목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.</p>
            <button
              type="button"
              onClick={() => refetchCenters()}
              className="mt-3 inline-flex items-center rounded-lg bg-error px-3 py-1.5 text-sm font-medium text-white hover:bg-error/90 transition-colors"
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
            disabled={centersLoading}
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

      {/* Policy list */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">
            에스컬레이션 정책
            {selectedCenterName && (
              <span className="text-sm font-normal text-text-secondary ml-2">
                ({selectedCenterName})
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            disabled={!selectedCenterId}
          >
            <Plus className="w-4 h-4" />
            새 정책
          </button>
        </div>

        {policiesLoading ? (
          <p className="text-text-secondary">정책을 불러오는 중...</p>
        ) : policiesIsError ? (
          <p className="text-error">정책 목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.</p>
        ) : !selectedCenterId ? (
          <p className="text-text-secondary">센터를 선택하여 정책을 확인하세요.</p>
        ) : policies && policies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">알림 유형</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">창고</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">상태</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">규칙 수</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">관리</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr key={policy.id} className="border-b border-neutral-100">
                    <td className="py-3 px-4 text-text-primary">{policy.alertType}</td>
                    <td className="py-3 px-4 text-text-secondary">
                      {policy.warehouseId ? `창고 ${policy.warehouseId}` : '전체 (센터)'}
                    </td>
                    <td className="py-3 px-4">
                      {policy.active ? (
                        <span className="px-2 py-0.5 text-xs bg-success/10 text-success rounded">활성</span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs bg-neutral-200 text-text-secondary rounded">비활성</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">{policy.rules.length}단계</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(policy)}
                          className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
                          title="수정"
                        >
                          <Edit2 className="w-4 h-4 text-text-secondary" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(policy.id)}
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
          <p className="text-text-secondary">등록된 정책이 없습니다.</p>
        )}
      </div>

      {/* Active alerts */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-warning" />
          <h2 className="text-lg font-semibold text-text-primary">활성 알림</h2>
        </div>

        {alertsLoading ? (
          <p className="text-text-secondary">알림을 불러오는 중...</p>
        ) : alertsIsError ? (
          <p className="text-error">활성 알림을 불러오지 못했습니다. 잠시 후 다시 시도하세요.</p>
        ) : alerts && alerts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">알림 유형</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">메시지</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">위치</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">심각도</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">상태</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">생성 시간</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">다음 에스컬레이션</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">확인</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id} className="border-b border-neutral-100">
                    <td className="py-3 px-4 text-text-primary">{alert.alertType}</td>
                    <td className="py-3 px-4 text-text-secondary">{alert.message}</td>
                    <td className="py-3 px-4 text-text-secondary">
                      센터 {alert.centerId}
                      {alert.warehouseId ? ` / 창고 ${alert.warehouseId}` : ''}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 text-xs rounded ${
                          alert.severity === 'CRITICAL'
                            ? 'bg-error/10 text-error'
                            : alert.severity === 'WARNING'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-info/10 text-info'
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-xs bg-neutral-200 text-text-secondary rounded">
                        {alert.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary">
                      {new Date(alert.createdAt).toLocaleString('ko-KR')}
                    </td>
                    <td className="py-3 px-4 text-sm text-text-secondary">
                      {computeNextEscalationAt(alert, policies) ?? '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={acknowledgeMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          ACK
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-text-secondary">활성 알림이 없습니다.</p>
        )}
      </div>

      {/* Policy form modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-primary-600" />
                <h2 className="text-xl font-bold text-neutral-900">
                  {editingPolicy ? '정책 수정' : '새 정책'}
                </h2>
              </div>
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
              aria-label={editingPolicy ? '정책 수정 폼' : '새 정책 폼'}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* Center */}
              <div>
                <label htmlFor="policyCenter" className="block text-sm font-medium text-neutral-700 mb-1">
                  센터 <span className="text-error">*</span>
                </label>
                <select
                  id="policyCenter"
                  value={formData.centerId || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, centerId: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  disabled={!!editingPolicy}
                >
                  <option value="">센터를 선택하세요</option>
                  {centers?.map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
                {editingPolicy && (
                  <p className="text-xs text-neutral-500 mt-1">센터는 수정할 수 없습니다</p>
                )}
              </div>

              {/* Warehouse */}
              <div>
                <label htmlFor="policyWarehouse" className="block text-sm font-medium text-neutral-700 mb-1">창고 (선택)</label>
                <select
                  id="policyWarehouse"
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
                <label htmlFor="policyAlertType" className="block text-sm font-medium text-neutral-700 mb-1">
                  알림 유형 <span className="text-error">*</span>
                </label>
                <select
                  id="policyAlertType"
                  value={formData.alertType}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, alertType: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  disabled={!!editingPolicy}
                >
                  {ALERT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {editingPolicy && (
                  <p className="text-xs text-neutral-500 mt-1">알림 유형은 수정할 수 없습니다</p>
                )}
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="policyActive"
                  checked={formData.active}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, active: e.target.checked }))
                  }
                  className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="policyActive" className="text-sm text-neutral-700">
                  정책 활성화
                </label>
              </div>

              {/* Rules */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-neutral-700">에스컬레이션 규칙</h3>
                  <button
                    type="button"
                    onClick={addRule}
                    disabled={formData.rules.length >= 3}
                    className="flex items-center gap-1 px-2 py-1 text-sm border border-neutral-300 rounded hover:bg-neutral-50 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    규칙 추가
                  </button>
                </div>

                {formData.rules.map((rule, index) => (
                  <div
                    key={rule.level}
                    className="border border-neutral-200 rounded-lg p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-neutral-900">
                        레벨 {rule.level}
                      </span>
                      {formData.rules.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRule(index)}
                          className="p-1 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-error" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor={`delay-${rule.level}`} className="block text-sm font-medium text-neutral-700 mb-1">
                          지연 시간 (분) <span className="text-error">*</span>
                        </label>
                        <input
                          id={`delay-${rule.level}`}
                          type="number"
                          min="0"
                          value={rule.delayMinutes}
                          onChange={(e) =>
                            updateRule(index, { delayMinutes: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <span className="block text-sm font-medium text-neutral-700 mb-2">
                        알림 대상 역할
                      </span>
                      <div className="flex flex-wrap gap-3">
                        {ALL_ROLES.map((role) => (
                          <label key={role.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rule.notifyRoles.includes(role.value)}
                              onChange={() => toggleRole(index, role.value)}
                              className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                            />
                            <span className="text-sm text-neutral-700">{role.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="block text-sm font-medium text-neutral-700 mb-2">
                        알림 채널
                      </span>
                      <div className="flex flex-wrap gap-3">
                        {ALL_CHANNELS.map((channel) => (
                          <label key={channel.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rule.channels.includes(channel.value)}
                              onChange={() => toggleChannel(index, channel.value)}
                              className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                            />
                            <span className="text-sm text-neutral-700">{channel.label}</span>
                          </label>
                        ))}
                      </div>
                      {rule.channels.some((channel) => !ALL_CHANNELS.some((item) => item.value === channel)) && (
                        <p className="mt-2 text-xs text-neutral-500">
                          지원하지 않는 채널은 표시되지 않습니다.
                        </p>
                      )}
                    </div>
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
        title="정책 삭제"
        description="이 에스컬레이션 정책을 삭제하시겠습니까? 삭제된 정책은 비활성화 상태로 변경됩니다."
        variant="destructive"
        confirmLabel="삭제"
      />
    </div>
  )
}
