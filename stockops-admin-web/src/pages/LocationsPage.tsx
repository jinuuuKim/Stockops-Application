/**
 * Location management page component.
 * Displays location list with search, filters, pagination, and CRUD actions.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useMemo, useState } from 'react'
import { Edit, Filter, MapPin, Search, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  useCreateLocation,
  useDeleteLocation,
  useLocations,
  useUpdateLocation,
} from '@/hooks/useLocation'
import { useWarehouses } from '@/hooks/useWarehouse'
import type { Location, LocationRequest, LocationType } from '@/types/location'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'

const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  STORAGE: '적치',
  RECEIVING: '입고대',
  SHIPPING: '출고대',
  QUARANTINE: '격리',
}

const LOCATION_TYPES = Object.keys(LOCATION_TYPE_LABELS) as LocationType[]

interface LocationFormState {
  warehouseId: string
  code: string
  name: string
  type: LocationType
  zone: string
  shelf: string
  level: string
}

/**
 * Locations page with table, search, filters, and pagination.
 *
 * @returns Locations page JSX element
 */
export function LocationsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null)
  const pageSize = 10

  const { data: locations = [], isLoading, error, refetch } = useLocations()

  const filteredLocations = useMemo(() => {
    return locations.filter((item: Location) => {
      const keyword = searchTerm.toLowerCase()
      const matchesSearch =
        searchTerm === '' ||
        item.code.toLowerCase().includes(keyword) ||
        item.name.toLowerCase().includes(keyword)

      const matchesType = typeFilter === 'all' || item.type === typeFilter

      return matchesSearch && matchesType
    })
  }, [locations, searchTerm, typeFilter])

  const paginatedLocations = useMemo(() => {
    const start = currentPage * pageSize
    return filteredLocations.slice(start, start + pageSize)
  }, [filteredLocations, currentPage, pageSize])

  const totalPages = Math.ceil(filteredLocations.length / pageSize)

  function openCreateModal(): void {
    setEditingLocation(null)
    setShowModal(true)
  }

  function openEditModal(location: Location): void {
    setEditingLocation(location)
    setShowModal(true)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">위치 관리</h1>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <MapPin className="w-4 h-4" />
          위치 추가
        </button>
      </div>

      <div className="bg-white rounded-lg shadow mb-4">
        <div className="p-4 border-b border-neutral-200">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="위치 코드 또는 이름으로 검색..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(0)
                }}
                className="w-full pl-10 pr-4 py-2 min-h-[44px] border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-500" />
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value)
                  setCurrentPage(0)
                }}
                className="w-full md:w-auto px-3 py-2 min-h-[44px] border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">전체 유형</option>
                {LOCATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {LOCATION_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <EmptyState
            title="위치 로딩 중"
            description="창고 내 적치, 입고대, 출고대 위치를 불러오는 중입니다."
            variant="empty"
          />
        ) : error ? (
          <EmptyState
            title="위치를 불러오지 못했습니다"
            description="서버 연결 상태를 확인한 뒤 다시 시도해주세요."
            variant="error"
            actionLabel="다시 시도"
            onAction={() => void refetch()}
          />
        ) : paginatedLocations.length === 0 ? (
          <EmptyState
            title={searchTerm || typeFilter !== 'all' ? '조건에 맞는 위치가 없습니다' : '등록된 위치가 없습니다'}
            description="입고대, 적치장, 출고대, 격리 위치를 등록하면 입출고와 실사 흐름을 시작할 수 있습니다."
            actionLabel="위치 추가"
            onAction={openCreateModal}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">코드</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">이름</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">유형</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">구역</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">선반</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">단</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-neutral-700">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {paginatedLocations.map((item: Location) => (
                    <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-900">{item.code}</span>
                      </td>
                      <td className="px-4 py-3 text-neutral-900">{item.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${getTypeColor(item.type)}`}>
                          {getLocationTypeLabel(item.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-900">
                        {item.zone || <span className="text-neutral-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-neutral-900">
                        {item.shelf || <span className="text-neutral-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-neutral-900">
                        {item.level || <span className="text-neutral-400">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100"
                            aria-label={`${item.name} 수정`}
                            title="수정"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg text-error hover:bg-error/10"
                            aria-label={`${item.name} 삭제`}
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200">
                <div className="text-sm text-neutral-500">
                  총 {filteredLocations.length}개 중 {currentPage * pageSize + 1}-
                  {Math.min((currentPage + 1) * pageSize, filteredLocations.length)}개 표시
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="px-3 py-1 border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="이전 페이지"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = currentPage < 3 ? i : currentPage - 2 + i
                      if (pageNum >= totalPages) return null
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 rounded-lg transition-colors ${
                            currentPage === pageNum ? 'bg-primary-600 text-white' : 'hover:bg-neutral-100'
                          }`}
                        >
                          {pageNum + 1}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage === totalPages - 1}
                    className="px-3 py-1 border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="다음 페이지"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <LocationModal
          location={editingLocation}
          onClose={() => {
            setShowModal(false)
            setEditingLocation(null)
          }}
        />
      )}

      {deleteTarget && (
        <DeleteLocationDialog
          location={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

function LocationModal({
  location,
  onClose,
}: {
  location: Location | null
  onClose: () => void
}) {
  const [formData, setFormData] = useState<LocationFormState>(() => ({
    warehouseId: location?.warehouseId?.toString() ?? '',
    code: location?.code ?? '',
    name: location?.name ?? '',
    type: normalizeLocationType(location?.type) ?? 'STORAGE',
    zone: location?.zone ?? '',
    shelf: location?.shelf ?? '',
    level: location?.level ?? '',
  }))
  const [formError, setFormError] = useState('')

  const { data: warehouses = [] } = useWarehouses()
  const createMutation = useCreateLocation()
  const updateMutation = useUpdateLocation()
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  function updateField<K extends keyof LocationFormState>(field: K, value: LocationFormState[K]): void {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function buildPayload(): LocationRequest | null {
    const warehouseId = Number(formData.warehouseId)

    if (!warehouseId) {
      setFormError('창고를 선택해주세요.')
      return null
    }

    if (!formData.code.trim() || !formData.name.trim()) {
      setFormError('위치 코드와 이름을 입력해주세요.')
      return null
    }

    return {
      warehouseId,
      code: formData.code.trim(),
      name: formData.name.trim(),
      type: formData.type,
      zone: formData.zone.trim() || null,
      shelf: formData.shelf.trim() || null,
      level: formData.level.trim() || null,
    }
  }

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault()
    setFormError('')

    const payload = buildPayload()
    if (!payload) return

    const options = {
      onSuccess: onClose,
      onError: () => setFormError('위치 저장에 실패했습니다. 입력값과 서버 상태를 확인해주세요.'),
    }

    if (location) {
      updateMutation.mutate({ id: location.id, data: payload }, options)
      return
    }

    createMutation.mutate(payload, options)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">
                {location ? '위치 수정' : '위치 추가'}
              </h2>
              <p className="text-sm text-neutral-500 mt-1">
                입고대, 적치장, 출고대, 격리 위치를 창고에 연결합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-700"
              aria-label="닫기"
            >
              &times;
            </button>
          </div>

          {formError && (
            <div role="alert" className="mb-4 rounded-lg bg-error/10 p-3 text-sm text-error">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="warehouseId" className="block text-sm font-medium text-neutral-700 mb-1">
                창고
              </label>
              <select
                id="warehouseId"
                value={formData.warehouseId}
                onChange={(event) => updateField('warehouseId', event.target.value)}
                className="w-full px-3 py-2 min-h-[44px] border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">창고 선택</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} - {warehouse.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-neutral-700 mb-1">
                  위치 코드
                </label>
                <input
                  id="code"
                  value={formData.code}
                  onChange={(event) => updateField('code', event.target.value)}
                  placeholder="STORAGE-A-01"
                  className="w-full px-3 py-2 min-h-[44px] border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
                  위치 이름
                </label>
                <input
                  id="name"
                  value={formData.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="적치장 A-01"
                  className="w-full px-3 py-2 min-h-[44px] border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-neutral-700 mb-1">
                위치 유형
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(event) => updateField('type', event.target.value as LocationType)}
                className="w-full px-3 py-2 min-h-[44px] border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {LOCATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {LOCATION_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="zone" className="block text-sm font-medium text-neutral-700 mb-1">
                  구역
                </label>
                <input
                  id="zone"
                  value={formData.zone}
                  onChange={(event) => updateField('zone', event.target.value)}
                  placeholder="A"
                  className="w-full px-3 py-2 min-h-[44px] border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="shelf" className="block text-sm font-medium text-neutral-700 mb-1">
                  선반
                </label>
                <input
                  id="shelf"
                  value={formData.shelf}
                  onChange={(event) => updateField('shelf', event.target.value)}
                  placeholder="01"
                  className="w-full px-3 py-2 min-h-[44px] border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label htmlFor="level" className="block text-sm font-medium text-neutral-700 mb-1">
                  단
                </label>
                <input
                  id="level"
                  value={formData.level}
                  onChange={(event) => updateField('level', event.target.value)}
                  placeholder="01"
                  className="w-full px-3 py-2 min-h-[44px] border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 min-h-[44px] text-neutral-600 hover:text-neutral-700"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 min-h-[44px] bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteLocationDialog({
  location,
  onClose,
}: {
  location: Location
  onClose: () => void
}) {
  const [error, setError] = useState('')
  const deleteMutation = useDeleteLocation()

  return (
    <>
      {error && (
        <div className="fixed top-4 right-4 z-[60] rounded-lg bg-error px-4 py-3 text-sm text-white shadow-lg">
          {error}
        </div>
      )}
      <ConfirmDialog
        open
        title="위치 삭제"
        description={`${location.name} 위치를 삭제하시겠습니까? 입출고나 재고가 연결된 위치는 서버에서 삭제가 거부될 수 있습니다.`}
        confirmLabel={deleteMutation.isPending ? '삭제 중...' : '삭제'}
        cancelLabel="취소"
        variant="destructive"
        onConfirm={() => {
          setError('')
          deleteMutation.mutate(location.id, {
            onSuccess: onClose,
            onError: () => setError('위치 삭제에 실패했습니다. 연결된 재고 또는 이력을 확인해주세요.'),
          })
        }}
        onClose={onClose}
      />
    </>
  )
}

/**
 * Returns type badge color classes.
 *
 * @param type - Location type
 * @returns Tailwind CSS classes for type badge
 */
function getTypeColor(type: string): string {
  switch (type) {
    case 'STORAGE':
      return 'bg-primary/10 text-primary'
    case 'RECEIVING':
      return 'bg-success/10 text-success'
    case 'SHIPPING':
      return 'bg-info/10 text-info'
    case 'QUARANTINE':
      return 'bg-warning/10 text-warning'
    default:
      return 'bg-neutral-100 text-neutral-600'
  }
}

function getLocationTypeLabel(type: string): string {
  const normalizedType = normalizeLocationType(type)
  return normalizedType ? LOCATION_TYPE_LABELS[normalizedType] : type
}

function normalizeLocationType(type?: string): LocationType | null {
  if (type && LOCATION_TYPES.includes(type as LocationType)) {
    return type as LocationType
  }

  return null
}
