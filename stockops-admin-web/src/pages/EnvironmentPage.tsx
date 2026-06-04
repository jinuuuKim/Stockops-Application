/**
 * Environment monitoring page backed by live API data.
 * Replaces mock telemetry with dashboard, alert, history, sensor, and controller hooks.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  Clock3,
  Loader2,
  RefreshCw,
  Thermometer,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { showErrorToast } from '@/lib/httpError'
import {
  useCreateController,
  useCreateSensor,
  useDeleteController,
  useDeleteSensor,
  useEnvironmentAlerts,
  useEnvironmentDashboard,
  useReactivateController,
  useReactivateSensor,
  useSensors,
  useSensorHistory,
  useUpdateController,
  useUpdateSensor,
  useControllers,
} from '@/hooks/useEnvironment'
import { useControllerCommand, useControllerCommands } from '@/hooks/useControllerCommand'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { ConnectionStatus } from '@/hooks/useWebSocket'
import type {
  AlertSeverity,
  ControllerCommand,
  ControllerStatus,
  ControllerType,
  DashboardLatestReading,
  EnvironmentController,
  SensorAlert,
  SensorDevice,
  SensorType,
} from '@/types/environment'

const SENSOR_TYPES: SensorType[] = [
  'TEMPERATURE',
  'HUMIDITY',
  'AIR_QUALITY',
  'DOOR',
  'MOTION',
  'CO2',
  'TVOC',
  'PRESSURE',
]

interface SensorFormState {
  siteId: string
  sensorId: string
  sensorType: SensorType
  location: string
  mqttTopic: string
  sourceChannel: string
}

const INITIAL_SENSOR_FORM: SensorFormState = {
  siteId: '',
  sensorId: '',
  sensorType: 'TEMPERATURE',
  location: '',
  mqttTopic: '',
  sourceChannel: '',
}

const SENSOR_TOPIC_PATTERN = /^sensimul\/sites\/[^/]+\/sensors\/[^/]+$/

const CONTROLLER_TYPES: ControllerType[] = [
  'COOLING',
  'HEATING',
  'HUMIDIFYING',
  'DEHUMIDIFYING',
  'VENTILATION',
  'AIR_PURIFIER',
]

const CONTROLLER_STATUSES: ControllerStatus[] = ['INACTIVE', 'READY', 'RUNNING', 'ERROR']

interface ControllerFormState {
  siteId: string
  controllerId: string
  name: string
  controllerType: ControllerType
  status: ControllerStatus
  outputLevel: number
}

const INITIAL_CONTROLLER_FORM: ControllerFormState = {
  siteId: '',
  controllerId: '',
  name: '',
  controllerType: 'COOLING',
  status: 'INACTIVE',
  outputLevel: 0,
}

function buildSensorTopic(siteId: string, sensorId: string): string {
  if (!siteId && !sensorId) {
    return ''
  }

  return `sensimul/sites/${siteId}/sensors/${sensorId}`
}

export function EnvironmentPage() {
  const queryClient = useQueryClient()
  const [sensorForm, setSensorForm] = useState<SensorFormState>(INITIAL_SENSOR_FORM)
  const [editingSensorId, setEditingSensorId] = useState<number | null>(null)
  const [selectedSensorId, setSelectedSensorId] = useState<number | null>(null)
  const [lastDeletedSensor, setLastDeletedSensor] = useState<SensorDevice | null>(null)

  const [controllerForm, setControllerForm] = useState<ControllerFormState>(INITIAL_CONTROLLER_FORM)
  const [editingControllerId, setEditingControllerId] = useState<number | null>(null)
  const [selectedControllerId, setSelectedControllerId] = useState<number | null>(null)
  const [lastDeletedController, setLastDeletedController] = useState<EnvironmentController | null>(null)
  const [confirmDeleteControllerId, setConfirmDeleteControllerId] = useState<number | null>(null)
  const [controllerOutputLevel, setControllerOutputLevel] = useState(0)

  const dashboardQuery = useEnvironmentDashboard()
  const alertsQuery = useEnvironmentAlerts(30)
  const sensorsQuery = useSensors(0, 100)
  const controllersQuery = useControllers(0, 100)

  const sensors = useMemo(() => sensorsQuery.data?.content ?? [], [sensorsQuery.data?.content])
  const controllers = useMemo(() => controllersQuery.data?.content ?? [], [controllersQuery.data?.content])

  const { lastMessage, connectionStatus } = useWebSocket('/topic/environment')
  const [liveReadings, setLiveReadings] = useState<Map<number, DashboardLatestReading>>(new Map())

  useEffect(() => {
    if (!lastMessage || lastMessage.eventType !== 'ENV_SENSOR') return

    const payload = lastMessage as unknown as {
      sensorId: string
      sensorType: string
      value: number
      locationId: string
      timestamp: string
    }

    const sensor = sensors.find((s) => s.sensorId === payload.sensorId)
    if (!sensor) return

    /* eslint-disable react-hooks/set-state-in-effect -- realtime sensor payloads update the live readings cache. */
    setLiveReadings((prev) => {
      const next = new Map(prev)
      next.set(sensor.id, {
        sensorId: sensor.id,
        sensorName: sensor.name,
        sensorType: payload.sensorType as SensorType,
        location: payload.locationId,
        value: payload.value,
        valueKind: payload.sensorType,
        unit: inferUnitFromSensorType(payload.sensorType as SensorType),
        status: 'NORMAL',
        recordedAt: payload.timestamp,
      })
      return next
    })
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [lastMessage, sensors])

  const mergedLatestReadings = useMemo(() => {
    const base = dashboardQuery.data?.latestReadings ?? []
    const liveMap = new Map(liveReadings)
    const merged = base.map((reading) => {
      const live = liveMap.get(reading.sensorId)
      if (live) {
        liveMap.delete(reading.sensorId)
        return live
      }
      return reading
    })
    return merged.concat(Array.from(liveMap.values()))
  }, [dashboardQuery.data?.latestReadings, liveReadings])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (selectedSensorId === null && sensors.length > 0) {
      setSelectedSensorId(sensors[0].id)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selectedSensorId, sensors])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (selectedControllerId === null && controllers.length > 0) {
      setSelectedControllerId(controllers[0].id)
      setControllerOutputLevel(controllers[0].outputLevel)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [controllers, selectedControllerId])

  const selectedController = useMemo(
    () => controllers.find((controller) => controller.id === selectedControllerId) ?? null,
    [controllers, selectedControllerId],
  )

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (selectedController) {
      setControllerOutputLevel(selectedController.outputLevel)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selectedController])

  const historyQuery = useSensorHistory(selectedSensorId, 30)
  const commandHistoryQuery = useControllerCommands(selectedControllerId, 10)

  const createSensorMutation = useCreateSensor()
  const updateSensorMutation = useUpdateSensor()
  const deleteSensorMutation = useDeleteSensor()
  const reactivateSensorMutation = useReactivateSensor()

  const createControllerMutation = useCreateController()
  const updateControllerMutation = useUpdateController()
  const deleteControllerMutation = useDeleteController()
  const reactivateControllerMutation = useReactivateController()
  const commandMutation = useControllerCommand(selectedControllerId ?? 0)

  const isAnyLoading =
    dashboardQuery.isLoading || alertsQuery.isLoading || sensorsQuery.isLoading || controllersQuery.isLoading

  const topAlert = alertsQuery.data?.[0] ?? null

  async function handleRefresh(): Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['environment', 'dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['environment', 'alerts'] }),
      queryClient.invalidateQueries({ queryKey: ['environment', 'sensors'] }),
      queryClient.invalidateQueries({ queryKey: ['environment', 'controllers'] }),
      queryClient.invalidateQueries({ queryKey: ['environment', 'history'] }),
    ])
  }

  function resetSensorForm(): void {
    setSensorForm(INITIAL_SENSOR_FORM)
    setEditingSensorId(null)
  }

  function handleEditSensor(sensor: SensorDevice): void {
    setEditingSensorId(sensor.id)
    setSensorForm({
      siteId: sensor.siteId,
      sensorId: sensor.sensorId,
      sensorType: sensor.sensorType,
      location: sensor.location,
      mqttTopic: sensor.mqttTopic,
      sourceChannel: sensor.sourceChannel,
    })
  }

  async function handleSubmitSensor(event: { preventDefault: () => void }): Promise<void> {
    event.preventDefault()

    if (!SENSOR_TOPIC_PATTERN.test(sensorForm.mqttTopic)) {
      showErrorToast('MQTT topic은 sensimul/sites/{siteId}/sensors/{sensorId} 형식이어야 합니다.')
      return
    }

    if (sensorForm.mqttTopic !== buildSensorTopic(sensorForm.siteId, sensorForm.sensorId)) {
      showErrorToast('MQTT topic은 입력한 Site ID와 Sensor ID 조합과 일치해야 합니다.')
      return
    }

    try {
      const sensor =
        editingSensorId === null
          ? await createSensorMutation.mutateAsync(sensorForm)
          : await updateSensorMutation.mutateAsync({ id: editingSensorId, data: sensorForm })
      resetSensorForm()
      setSelectedSensorId(sensor.id)
    } catch {
      // Global axios/toast path already handles messaging.
    }
  }

  async function handleDeleteSensor(sensor: SensorDevice): Promise<void> {
    try {
      await deleteSensorMutation.mutateAsync(sensor.id)
      setLastDeletedSensor(sensor)
      if (editingSensorId === sensor.id) {
        resetSensorForm()
      }
      if (selectedSensorId === sensor.id) {
        setSelectedSensorId(null)
      }
    } catch {
      // interceptor/mutation path handles UI error
    }
  }

  async function handleReactivateLastSensor(): Promise<void> {
    if (!lastDeletedSensor) {
      return
    }

    try {
      const sensor = await reactivateSensorMutation.mutateAsync(lastDeletedSensor.id)
      setSelectedSensorId(sensor.id)
      setLastDeletedSensor(null)
    } catch {
      // interceptor/mutation path handles UI error
    }
  }

  function resetControllerForm(): void {
    setControllerForm(INITIAL_CONTROLLER_FORM)
    setEditingControllerId(null)
  }

  function handleEditController(controller: EnvironmentController): void {
    setEditingControllerId(controller.id)
    setControllerForm({
      siteId: controller.siteId ?? '',
      controllerId: controller.controllerId,
      name: controller.name,
      controllerType: controller.controllerType,
      status: controller.status,
      outputLevel: controller.outputLevel,
    })
  }

  async function handleSubmitController(event: { preventDefault: () => void }): Promise<void> {
    event.preventDefault()

    if (!controllerForm.siteId.trim()) {
      showErrorToast('Site ID를 입력해주세요.')
      return
    }
    if (!controllerForm.controllerId.trim()) {
      showErrorToast('Controller ID를 입력해주세요.')
      return
    }
    if (!controllerForm.name.trim()) {
      showErrorToast('제어기 이름을 입력해주세요.')
      return
    }

    try {
      const controller =
        editingControllerId === null
          ? await createControllerMutation.mutateAsync(controllerForm)
          : await updateControllerMutation.mutateAsync({ id: editingControllerId, data: controllerForm })
      resetControllerForm()
      setSelectedControllerId(controller.id)
    } catch {
      // Global axios/toast path already handles messaging.
    }
  }

  async function handleDeleteController(controller: EnvironmentController): Promise<void> {
    try {
      await deleteControllerMutation.mutateAsync(controller.id)
      setLastDeletedController(controller)
      setConfirmDeleteControllerId(null)
      if (editingControllerId === controller.id) {
        resetControllerForm()
      }
      if (selectedControllerId === controller.id) {
        setSelectedControllerId(null)
      }
    } catch {
      // interceptor/mutation path handles UI error
    }
  }

  async function handleReactivateLastController(): Promise<void> {
    if (!lastDeletedController) {
      return
    }

    try {
      const controller = await reactivateControllerMutation.mutateAsync(lastDeletedController.id)
      setSelectedControllerId(controller.id)
      setLastDeletedController(null)
    } catch {
      // interceptor/mutation path handles UI error
    }
  }

  async function handleSendControllerCommand(status: 'on' | 'off'): Promise<void> {
    if (!selectedControllerId) {
      showErrorToast('제어기를 먼저 선택해주세요.')
      return
    }

    try {
      await commandMutation.mutateAsync({ status, outputLevel: controllerOutputLevel })
    } catch {
      // mutation hook shows toast and rolls back optimistic state
    }
  }

  const pageError =
    dashboardQuery.error ?? alertsQuery.error ?? sensorsQuery.error ?? controllersQuery.error ?? undefined

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">🌡️ 환경 모니터링</h1>
          <p className="mt-1 text-text-secondary">실시간 센서, 알림, 히스토리, 제어기 명령 상태를 확인하세요.</p>
        </div>
        <div className="flex flex-col items-end gap-2 self-start">
          <ConnectionStatusDot status={connectionStatus} />
          <button
            type="button"
            onClick={() => {
              void handleRefresh()
            }}
            disabled={isAnyLoading}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isAnyLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {pageError ? (
        <ErrorPanel title="환경 데이터를 불러오지 못했습니다." message={pageError.message} />
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Thermometer className="h-6 w-6" />}
          title="등록 센서"
          value={String(dashboardQuery.data?.totalSensors ?? 0)}
          helper={`활성 ${dashboardQuery.data?.activeSensors ?? 0}대`}
          tone="normal"
        />
        <SummaryCard
          icon={<CheckCircle className="h-6 w-6" />}
          title="정상 알림"
          value={String(dashboardQuery.data?.normalCount ?? 0)}
          helper="최근 30일 기준"
          tone="normal"
        />
        <SummaryCard
          icon={<AlertTriangle className="h-6 w-6" />}
          title="주의 알림"
          value={String(dashboardQuery.data?.warningCount ?? 0)}
          helper="경고 상태 확인 필요"
          tone="warning"
        />
        <SummaryCard
          icon={<XCircle className="h-6 w-6" />}
          title="위험 알림"
          value={String(dashboardQuery.data?.dangerCount ?? 0)}
          helper="즉시 조치 필요"
          tone="danger"
        />
      </div>

      {topAlert ? <TopAlertBanner alert={topAlert} /> : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">📈 최신 센서 요약</h2>
          {dashboardQuery.isLoading ? (
            <SectionLoading label="대시보드 집계 로딩 중" />
          ) : (
            <div className="space-y-3">
              {mergedLatestReadings.length > 0 ? (
                mergedLatestReadings.map((reading) => (
                  <button
                    key={reading.sensorId}
                    type="button"
                    onClick={() => setSelectedSensorId(reading.sensorId)}
                    className={`flex w-full items-start justify-between rounded-lg border px-4 py-3 text-left hover:bg-neutral-50 ${
                      selectedSensorId === reading.sensorId ? 'border-primary bg-primary/5' : 'border-neutral-200'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-text-primary">{reading.sensorName ?? `센서 #${reading.sensorId}`}</p>
                      <p className="text-sm text-text-secondary">
                        {reading.location ?? '위치 미지정'} · {reading.sensorType ?? '유형 미지정'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-text-primary">
                        {formatReadingValue(reading.value, reading.unit)}
                      </p>
                      <p className="text-xs text-text-light">{formatDateTime(reading.recordedAt)}</p>
                    </div>
                  </button>
                ))
              ) : (
                <EmptyState message="표시할 최신 센서 데이터가 없습니다." />
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">📋 최근 알림 (30일)</h2>
          {alertsQuery.isLoading ? (
            <SectionLoading label="알림 로딩 중" />
          ) : alertsQuery.error ? (
            <ErrorPanel title="알림을 불러오지 못했습니다." message={alertsQuery.error.message} />
          ) : (alertsQuery.data?.length ?? 0) > 0 ? (
            <div className="space-y-3">
              {alertsQuery.data?.map((alert) => (
                <div key={alert.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={alert.severity} />
                      <span className="text-sm font-medium text-text-primary">{alert.alertType}</span>
                    </div>
                    <span className="text-xs text-text-light">{formatDateTime(alert.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-text-primary">{alert.message}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {alert.sensorName ?? `센서 #${alert.sensorId ?? '-'}`} ·{' '}
                    {alert.acknowledged ? `확인됨 (${alert.acknowledgedBy ?? 'unknown'})` : '미확인'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="최근 30일 알림이 없습니다." />
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">📍 센서 관리</h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {editingSensorId !== null ? (
                <button
                  type="button"
                  onClick={resetSensorForm}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-text-secondary hover:bg-neutral-50"
                >
                  새 센서 등록
                </button>
              ) : null}
              {lastDeletedSensor ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleReactivateLastSensor()
                  }}
                  disabled={reactivateSensorMutation.isPending}
                  className="rounded-lg border border-primary px-3 py-2 text-sm text-primary hover:bg-primary/5 disabled:opacity-60"
                >
                  최근 삭제 센서 복구
                </button>
              ) : null}
            </div>
          </div>

          <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={(event) => void handleSubmitSensor(event)}>
            <InputField
              label="Site ID"
              value={sensorForm.siteId}
              onChange={(value) =>
                setSensorForm((prev) => ({
                  ...prev,
                  siteId: value,
                  mqttTopic: buildSensorTopic(value, prev.sensorId),
                  sourceChannel:
                    prev.sourceChannel === '' || prev.sourceChannel === prev.siteId ? value : prev.sourceChannel,
                }))
              }
              placeholder="site-a"
            />
            <InputField
              label="Sensor ID"
              value={sensorForm.sensorId}
              onChange={(value) =>
                setSensorForm((prev) => ({
                  ...prev,
                  sensorId: value,
                  mqttTopic: buildSensorTopic(prev.siteId, value),
                }))
              }
              placeholder="temp-001"
            />
            <label className="flex flex-col gap-2 text-sm text-text-secondary">
              <span>Sensor Type</span>
              <select
                value={sensorForm.sensorType}
                onChange={(event) =>
                  setSensorForm((prev) => ({ ...prev, sensorType: event.target.value as SensorType }))
                }
                className="rounded-lg border border-neutral-200 px-3 py-2 text-text-primary outline-none focus:border-primary"
              >
                {SENSOR_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <InputField
              label="Location"
              value={sensorForm.location}
              onChange={(value) => setSensorForm((prev) => ({ ...prev, location: value }))}
              placeholder="냉장고 A"
            />
            <div className="md:col-span-2">
              <InputField
                label="MQTT Topic"
                value={sensorForm.mqttTopic}
                onChange={(value) => setSensorForm((prev) => ({ ...prev, mqttTopic: value }))}
                placeholder="sensimul/sites/site-a/sensors/temp-001"
              />
              <p className="mt-1 text-xs text-text-light">
                형식: sensimul/sites/{'{'}siteId{'}'}/sensors/{'{'}sensorId{'}'}
              </p>
            </div>
            <InputField
              label="Source Channel"
              value={sensorForm.sourceChannel}
              onChange={(value) => setSensorForm((prev) => ({ ...prev, sourceChannel: value }))}
              placeholder="site-a"
            />
            <div className="md:col-span-2 flex justify-end">
              <div className="flex gap-2">
                {editingSensorId !== null ? (
                  <button
                    type="button"
                    onClick={resetSensorForm}
                    className="rounded-lg border border-neutral-200 px-4 py-2 text-text-secondary hover:bg-neutral-50"
                  >
                    취소
                  </button>
                ) : null}
                <button
                  type="submit"
                  disabled={createSensorMutation.isPending || updateSensorMutation.isPending}
                  className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90 disabled:opacity-60"
                >
                  {createSensorMutation.isPending || updateSensorMutation.isPending
                    ? editingSensorId === null
                      ? '등록 중...'
                      : '수정 중...'
                    : editingSensorId === null
                      ? '센서 등록'
                      : '센서 수정 저장'}
                </button>
              </div>
            </div>
          </form>

          {sensorsQuery.isLoading ? (
            <div className="mt-6">
              <SectionLoading label="센서 목록 로딩 중" />
            </div>
          ) : sensorsQuery.error ? (
            <div className="mt-6">
              <ErrorPanel title="센서 목록을 불러오지 못했습니다." message={sensorsQuery.error.message} />
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-sm text-text-secondary">
                    <th className="px-3 py-2">센서</th>
                    <th className="px-3 py-2">위치</th>
                    <th className="px-3 py-2">유형</th>
                    <th className="px-3 py-2">상태</th>
                    <th className="px-3 py-2">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {sensors.map((sensor) => (
                    <tr key={sensor.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedSensorId(sensor.id)}
                          className="text-left"
                        >
                          <div className="font-medium text-text-primary">{sensor.name}</div>
                          <div className="text-xs text-text-light">
                            {sensor.siteId}/{sensor.sensorId}
                          </div>
                        </button>
                      </td>
                      <td className="px-3 py-3 text-sm text-text-secondary">{sensor.location}</td>
                      <td className="px-3 py-3 text-sm text-text-secondary">{sensor.sensorType}</td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-success/10 px-2 py-1 text-xs text-success">
                          {sensor.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditSensor(sensor)}
                            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-text-secondary hover:bg-neutral-100"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleDeleteSensor(sensor)
                            }}
                            disabled={deleteSensorMutation.isPending}
                            className="inline-flex items-center gap-1 rounded-lg border border-error/30 px-3 py-1.5 text-sm text-error hover:bg-error/5 disabled:opacity-60"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sensors.length === 0 ? <EmptyState message="등록된 센서가 없습니다." /> : null}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">📚 센서 히스토리</h2>
          {selectedSensorId === null ? (
            <EmptyState message="히스토리를 볼 센서를 선택해주세요." />
          ) : historyQuery.isLoading ? (
            <SectionLoading label="센서 히스토리 로딩 중" />
          ) : historyQuery.error ? (
            <ErrorPanel title="센서 히스토리를 불러오지 못했습니다." message={historyQuery.error.message} />
          ) : (historyQuery.data?.length ?? 0) > 0 ? (
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-sm text-text-secondary">
                    <th className="px-3 py-2">시각</th>
                    <th className="px-3 py-2">값</th>
                    <th className="px-3 py-2">종류</th>
                    <th className="px-3 py-2">상태</th>
                    <th className="px-3 py-2">시퀀스</th>
                  </tr>
                </thead>
                <tbody>
                  {historyQuery.data?.map((row, index) => (
                    <tr key={`${row.recordedAt}-${row.sequenceId ?? index}`} className="border-b border-neutral-100">
                      <td className="px-3 py-2 text-sm text-text-secondary">{formatDateTime(row.recordedAt)}</td>
                      <td className="px-3 py-2 font-medium text-text-primary">
                        {formatReadingValue(row.value, row.unit)}
                      </td>
                      <td className="px-3 py-2 text-sm text-text-secondary">{row.valueKind}</td>
                      <td className="px-3 py-2 text-sm text-text-secondary">{row.status}</td>
                      <td className="px-3 py-2 text-sm text-text-light">{row.sequenceId ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="선택한 센서의 최근 30일 히스토리가 없습니다." />
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-xl border border-neutral-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">🎛️ 제어기 관리</h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {editingControllerId !== null ? (
                <button
                  type="button"
                  onClick={resetControllerForm}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-text-secondary hover:bg-neutral-50"
                >
                  새 제어기 등록
                </button>
              ) : null}
              {lastDeletedController ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleReactivateLastController()
                  }}
                  disabled={reactivateControllerMutation.isPending}
                  className="rounded-lg border border-primary px-3 py-2 text-sm text-primary hover:bg-primary/5 disabled:opacity-60"
                >
                  최근 삭제 제어기 복구
                </button>
              ) : null}
            </div>
          </div>

          <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={(event) => void handleSubmitController(event)}>
            <InputField
              label="Site ID"
              value={controllerForm.siteId}
              onChange={(value) => setControllerForm((prev) => ({ ...prev, siteId: value }))}
              placeholder="site-a"
            />
            <InputField
              label="Controller ID"
              value={controllerForm.controllerId}
              onChange={(value) => setControllerForm((prev) => ({ ...prev, controllerId: value }))}
              placeholder="ctrl-001"
              disabled={editingControllerId !== null}
            />
            <InputField
              label="이름"
              value={controllerForm.name}
              onChange={(value) => setControllerForm((prev) => ({ ...prev, name: value }))}
              placeholder="냉장고 A 제어기"
            />
            <label className="flex flex-col gap-2 text-sm text-text-secondary">
              <span>제어기 유형</span>
              <select
                value={controllerForm.controllerType}
                onChange={(event) =>
                  setControllerForm((prev) => ({ ...prev, controllerType: event.target.value as ControllerType }))
                }
                className="rounded-lg border border-neutral-200 px-3 py-2 text-text-primary outline-none focus:border-primary"
              >
                {CONTROLLER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-text-secondary">
              <span>초기 상태</span>
              <select
                value={controllerForm.status}
                onChange={(event) =>
                  setControllerForm((prev) => ({ ...prev, status: event.target.value as ControllerStatus }))
                }
                className="rounded-lg border border-neutral-200 px-3 py-2 text-text-primary outline-none focus:border-primary"
              >
                {CONTROLLER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-2 text-sm text-text-secondary">
              <span>출력 레벨: {controllerForm.outputLevel}%</span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={controllerForm.outputLevel}
                onChange={(event) => setControllerForm((prev) => ({ ...prev, outputLevel: Number(event.target.value) }))}
                className="w-full accent-primary"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <div className="flex gap-2">
                {editingControllerId !== null ? (
                  <button
                    type="button"
                    onClick={resetControllerForm}
                    className="rounded-lg border border-neutral-200 px-4 py-2 text-text-secondary hover:bg-neutral-50"
                  >
                    취소
                  </button>
                ) : null}
                <button
                  type="submit"
                  disabled={createControllerMutation.isPending || updateControllerMutation.isPending}
                  className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90 disabled:opacity-60"
                >
                  {createControllerMutation.isPending || updateControllerMutation.isPending
                    ? editingControllerId === null
                      ? '등록 중...'
                      : '수정 중...'
                    : editingControllerId === null
                      ? '제어기 등록'
                      : '제어기 수정 저장'}
                </button>
              </div>
            </div>
          </form>

          {controllersQuery.isLoading ? (
            <div className="mt-6">
              <SectionLoading label="제어기 목록 로딩 중" />
            </div>
          ) : controllersQuery.error ? (
            <div className="mt-6">
              <ErrorPanel title="제어기 목록을 불러오지 못했습니다." message={controllersQuery.error.message} />
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-sm text-text-secondary">
                    <th className="px-3 py-2">제어기</th>
                    <th className="px-3 py-2">유형</th>
                    <th className="px-3 py-2">상태</th>
                    <th className="px-3 py-2">출력</th>
                    <th className="px-3 py-2">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {controllers.map((controller) => (
                    <tr key={controller.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedControllerId(controller.id)
                            setControllerOutputLevel(controller.outputLevel)
                          }}
                          className="text-left"
                        >
                          <div className="font-medium text-text-primary">{controller.name}</div>
                          <div className="text-xs text-text-light">
                            {controller.siteId ?? '-'}/{controller.controllerId}
                          </div>
                        </button>
                      </td>
                      <td className="px-3 py-3 text-sm text-text-secondary">{controller.controllerType}</td>
                      <td className="px-3 py-3">
                        <ControllerStatusBadge status={controller.status} />
                      </td>
                      <td className="px-3 py-3 text-sm text-text-primary">{controller.outputLevel}%</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditController(controller)}
                            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-text-secondary hover:bg-neutral-100"
                          >
                            수정
                          </button>
                          {confirmDeleteControllerId === controller.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  void handleDeleteController(controller)
                                }}
                                disabled={deleteControllerMutation.isPending}
                                className="inline-flex items-center gap-1 rounded-lg bg-error px-3 py-1.5 text-sm text-white hover:bg-error/90 disabled:opacity-60"
                              >
                                확인
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteControllerId(null)}
                                className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-text-secondary hover:bg-neutral-50"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteControllerId(controller.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-error/30 px-3 py-1.5 text-sm text-error hover:bg-error/5"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              삭제
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {controllers.length === 0 ? <EmptyState message="등록된 제어기가 없습니다." /> : null}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">🎛️ 제어 명령</h2>
          {selectedControllerId === null ? (
            <EmptyState message="명령을 보낼 제어기를 선택해주세요." />
          ) : selectedController ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-text-primary">{selectedController.name}</p>
                    <p className="text-sm text-text-secondary">
                      {selectedController.controllerType} · 현재 상태 {selectedController.status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleSendControllerCommand('on')
                      }}
                      disabled={commandMutation.isPending}
                      className="rounded-lg bg-success px-4 py-2 text-sm text-white hover:bg-success/90 disabled:opacity-60"
                    >
                      ON
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleSendControllerCommand('off')
                      }}
                      disabled={commandMutation.isPending}
                      className="rounded-lg bg-error px-4 py-2 text-sm text-white hover:bg-error/90 disabled:opacity-60"
                    >
                      OFF
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm text-text-secondary">
                    <span>출력 레벨</span>
                    <span className="font-medium text-text-primary">{controllerOutputLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={controllerOutputLevel}
                    onChange={(event) => setControllerOutputLevel(Number(event.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-text-secondary">🧾 명령 이력</h3>
                {commandHistoryQuery.isLoading ? (
                  <SectionLoading label="명령 이력 로딩 중" />
                ) : commandHistoryQuery.error ? (
                  <ErrorPanel title="명령 이력을 불러오지 못했습니다." message={commandHistoryQuery.error.message} />
                ) : (commandHistoryQuery.data?.length ?? 0) > 0 ? (
                  <div className="max-h-[400px] space-y-3 overflow-auto">
                    {commandHistoryQuery.data?.map((command) => (
                      <CommandHistoryItem key={command.id} command={command} />
                    ))}
                  </div>
                ) : (
                  <EmptyState message="제어 명령 이력이 없습니다." />
                )}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}

function SummaryCard({
  icon,
  title,
  value,
  helper,
  tone,
}: {
  icon: React.ReactNode
  title: string
  value: string
  helper: string
  tone: 'normal' | 'warning' | 'danger'
}) {
  const toneClasses = {
    normal: 'border-success bg-success/5',
    warning: 'border-warning bg-warning/5',
    danger: 'border-error bg-error/5',
  }

  return (
    <div className={`rounded-xl border-2 bg-white p-6 ${toneClasses[tone]}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-text-secondary">{title}</span>
        <span className="text-2xl text-text-primary">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="mt-1 text-xs text-text-light">{helper}</p>
    </div>
  )
}

function TopAlertBanner({ alert }: { alert: SensorAlert }) {
  return (
    <div className="rounded-xl border border-error/20 bg-error/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
        <div className="flex-1">
          <h3 className="font-semibold text-error">최근 최고 우선순위 알림</h3>
          <p className="mt-1 text-sm text-text-secondary">{alert.message}</p>
          <p className="mt-1 text-xs text-text-light">
            {alert.sensorName ?? `센서 #${alert.sensorId ?? '-'}`} • {formatDateTime(alert.createdAt)}
          </p>
        </div>
        <SeverityBadge severity={alert.severity} />
      </div>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  if (severity === 'CRITICAL') {
    return <Badge className="bg-error/10 text-error">위험</Badge>
  }
  if (severity === 'WARNING') {
    return <Badge className="bg-warning/10 text-warning">주의</Badge>
  }
  return <Badge className="bg-success/10 text-success">정상</Badge>
}

function ControllerStatusBadge({ status }: { status: ControllerStatus }) {
  if (status === 'ERROR') {
    return <Badge className="bg-error/10 text-error">ERROR</Badge>
  }
  if (status === 'RUNNING') {
    return <Badge className="bg-success/10 text-success">RUNNING</Badge>
  }
  if (status === 'READY') {
    return <Badge className="bg-warning/10 text-warning">READY</Badge>
  }
  return <Badge className="bg-neutral-200 text-text-secondary">INACTIVE</Badge>
}

function CommandHistoryItem({ command }: { command: ControllerCommand }) {
  const icon =
    command.resultStatus === 'APPLIED' ? (
      <CheckCircle className="h-4 w-4 text-success" />
    ) : command.resultStatus === 'FAILED_RETRYABLE' ? (
      <XCircle className="h-4 w-4 text-error" />
    ) : (
      <Clock3 className="h-4 w-4 text-warning" />
    )

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-text-primary">{command.requestedStatus.toUpperCase()}</span>
          <Badge className="bg-neutral-200 text-text-secondary">{command.resultStatus}</Badge>
        </div>
        <span className="text-xs text-text-light">{formatDateTime(command.createdAt)}</span>
      </div>
      <p className="mt-2 text-sm text-text-secondary">
        출력 {command.requestedOutputLevel ?? '-'}% · 응답 코드 {command.sensimulResponseCode ?? '-'}
      </p>
      {command.resultMessage ? <p className="mt-1 text-sm text-text-primary">{command.resultMessage}</p> : null}
    </div>
  )
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`rounded px-2 py-1 text-xs font-medium ${className}`}>{children}</span>
}

function ErrorPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border border-error/20 bg-error/5 p-4">
      <p className="font-semibold text-error">{title}</p>
      <p className="mt-1 text-sm text-text-secondary">{message}</p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-lg bg-neutral-50 p-4 text-sm text-text-light">{message}</div>
}

function SectionLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-neutral-50 p-4 text-sm text-text-secondary">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-text-secondary">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="rounded-lg border border-neutral-200 px-3 py-2 text-text-primary outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  )
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatReadingValue(value: number | null | undefined, unit: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '-'
  }

  const symbol = getUnitSymbol(unit)
  const fixed = Number(value.toFixed(2))
  return `${fixed}${symbol}`
}

function getUnitSymbol(unit: string | null | undefined): string {
  if (!unit) return ''

  const u = unit.toLowerCase()

  if (u === 'celsius' || u === '°c' || u === '℃') return '°C'
  if (u === 'percent' || u === '%') return '%'
  if (u === 'hpa') return ' hPa'
  if (u === 'ug/m3' || u === 'μg/m³' || u === 'μg/m3') return ' μg/m³'
  if (u === 'ppm') return ' ppm'
  if (u === 'mg/m3' || u === 'mg/m³') return ' mg/m³'

  return ` ${unit}`
}

function inferUnitFromSensorType(sensorType: SensorType | null | undefined): string | null {
  if (!sensorType) return null
  switch (sensorType) {
    case 'TEMPERATURE':
      return 'celsius'
    case 'HUMIDITY':
      return 'percent'
    case 'PRESSURE':
      return 'hPa'
    case 'AIR_QUALITY':
      return 'μg/m³'
    case 'CO2':
      return 'ppm'
    case 'TVOC':
      return 'mg/m³'
    default:
      return null
  }
}

function ConnectionStatusDot({ status }: { status: ConnectionStatus }) {
  const colors: Record<ConnectionStatus, string> = {
    connected: 'bg-success',
    connecting: 'bg-warning animate-pulse',
    disconnected: 'bg-error',
    fallback: 'bg-warning',
  }
  const labels: Record<ConnectionStatus, string> = {
    connected: '실시간 연결 중',
    connecting: '연결 시도 중',
    disconnected: '연결 끊김',
    fallback: '폴백 모드',
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${colors[status]}`} />
      <span className="text-xs text-text-light">{labels[status]}</span>
    </div>
  )
}
