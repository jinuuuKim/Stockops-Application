/**
 * Reusable Excel upload modal for template download and XLSX batch imports.
 * Shows drag-drop upload, import summaries, and row-level validation errors.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useEffect, useMemo, useState } from 'react'
import type { DragEvent } from 'react'
import { AlertCircle, Download, FileSpreadsheet, Upload, X } from 'lucide-react'
import { downloadExcelTemplate, uploadExcelWorkbook } from '@/api/excel'
import { getServerErrorMessage } from '@/lib/httpError'
import type { ExcelEntityType, ExcelImportResult } from '@/types/excel'

interface ExcelUploadModalProps {
  isOpen: boolean
  entityType: ExcelEntityType
  entityLabel: string
  onClose: () => void
  onImported?: () => Promise<void> | void
}

const ACCEPTED_FILE_TYPE = '.xlsx'

/**
 * XLSX import modal component.
 *
 * @param isOpen - Whether the modal is visible
 * @param entityType - Backend entity type for template/import endpoints
 * @param entityLabel - User-facing label shown in the modal
 * @param onClose - Close handler
 * @param onImported - Optional callback after a successful upload request
 * @returns Modal JSX element or null
 */
export function ExcelUploadModal({
  isOpen,
  entityType,
  entityLabel,
  onClose,
  onImported,
}: ExcelUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [report, setReport] = useState<ExcelImportResult | null>(null)

  useEffect(() => {
    if (!isOpen) {
      /* eslint-disable react-hooks/set-state-in-effect -- closing the modal resets transient upload form state. */
      setSelectedFile(null)
      setIsDragging(false)
      setIsDownloading(false)
      setIsUploading(false)
      setUploadError(null)
      setReport(null)
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [isOpen, entityType])

  const hasFailures = useMemo(() => (report?.failureCount ?? 0) > 0, [report])

  if (!isOpen) {
    return null
  }

  const handleFileSelection = (file: File | null) => {
    if (!file) {
      return
    }

    if (!file.name.toLowerCase().endsWith(ACCEPTED_FILE_TYPE)) {
      setUploadError('XLSX 파일만 업로드할 수 있습니다.')
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
    setUploadError(null)
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    handleFileSelection(event.dataTransfer.files[0] ?? null)
  }

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloading(true)
      await downloadExcelTemplate(entityType)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('업로드할 XLSX 파일을 선택해주세요.')
      return
    }

    try {
      setIsUploading(true)
      setUploadError(null)
      const result = await uploadExcelWorkbook(entityType, selectedFile)
      setReport(result)
      if (result.successCount > 0) {
        await onImported?.()
      }
    } catch (error) {
      setUploadError(getServerErrorMessage(error, '엑셀 업로드에 실패했습니다. 다시 시도해주세요.'))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">{entityLabel} Excel 업로드</h2>
            <p className="mt-1 text-sm text-neutral-500">
              템플릿을 내려받아 작성한 뒤 XLSX 파일을 업로드하면 행별 검증 결과를 바로 확인할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-neutral-100"
            disabled={isUploading}
          >
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleDownloadTemplate()}
            disabled={isDownloading}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isDownloading ? '템플릿 준비 중...' : '템플릿 다운로드'}
          </button>
          <div className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
            지원 형식: <span className="font-medium">XLSX</span>
          </div>
        </div>

        <label
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mb-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            isDragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-neutral-300 bg-neutral-50 hover:border-primary-400 hover:bg-primary-50/50'
          }`}
        >
          <input
            type="file"
            accept={ACCEPTED_FILE_TYPE}
            className="hidden"
            onChange={(event) => handleFileSelection(event.target.files?.[0] ?? null)}
          />
          <FileSpreadsheet className="mb-3 h-10 w-10 text-primary-600" />
          <p className="text-base font-semibold text-neutral-900">XLSX 파일을 드래그하거나 클릭해서 선택하세요.</p>
          <p className="mt-1 text-sm text-neutral-500">상품, 입고, 발주 템플릿만 지원됩니다.</p>
          {selectedFile && (
            <div className="mt-4 rounded-lg bg-white px-4 py-3 text-sm text-neutral-700 shadow-sm">
              선택된 파일: <span className="font-medium">{selectedFile.name}</span>
            </div>
          )}
        </label>

        {uploadError && (
          <div className="mb-5 flex items-start gap-3 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {report && (
          <div className="mb-5 space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <SummaryCard label="전체 행" value={report.totalRows} tone="neutral" />
              <SummaryCard label="성공" value={report.successCount} tone="success" />
              <SummaryCard label="실패" value={report.failureCount} tone={hasFailures ? 'error' : 'neutral'} />
            </div>

            <div className={`rounded-xl border px-4 py-3 text-sm ${hasFailures ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
              {hasFailures
                ? '일부 행이 검증에 실패했습니다. 아래 오류 보고서를 확인한 뒤 다시 업로드해주세요.'
                : '모든 행이 정상적으로 처리되었습니다.'}
            </div>

            {report.errors.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-neutral-200">
                <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                  <h3 className="font-semibold text-neutral-900">오류 보고서</h3>
                  <p className="mt-1 text-sm text-neutral-500">행 번호별로 실패 원인을 확인할 수 있습니다.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-200 text-sm">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-neutral-500">행</th>
                        <th className="px-4 py-3 text-left font-medium text-neutral-500">키</th>
                        <th className="px-4 py-3 text-left font-medium text-neutral-500">오류 내용</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 bg-white">
                      {report.errors.map((errorItem) => (
                        <tr key={`${errorItem.rowNumber}-${errorItem.entityKey ?? 'empty'}-${errorItem.message}`}>
                          <td className="px-4 py-3 font-medium text-neutral-900">{errorItem.rowNumber}</td>
                          <td className="px-4 py-3 text-neutral-600">{errorItem.entityKey || '-'}</td>
                          <td className="px-4 py-3 text-neutral-700">{errorItem.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 transition-colors hover:bg-neutral-50"
            disabled={isUploading}
          >
            닫기
          </button>
          <button
            type="button"
            onClick={() => void handleUpload()}
            className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isUploading || !selectedFile}
          >
            <span className="inline-flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {isUploading ? '업로드 중...' : '업로드 시작'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

interface SummaryCardProps {
  label: string
  value: number
  tone: 'neutral' | 'success' | 'error'
}

function SummaryCard({ label, value, tone }: SummaryCardProps) {
  const className =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : tone === 'error'
        ? 'border-red-200 bg-red-50 text-red-800'
        : 'border-neutral-200 bg-neutral-50 text-neutral-800'

  return (
    <div className={`rounded-xl border px-4 py-3 ${className}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}
