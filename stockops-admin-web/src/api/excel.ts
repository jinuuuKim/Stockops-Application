/**
 * API helpers for Excel template downloads and XLSX batch imports.
 *
 * @author StockOps Team
 * @since 1.0
 */

import api from '@/lib/api'
import type { ExcelEntityType, ExcelImportResult } from '@/types/excel'

/**
 * Downloads the XLSX template for an entity type.
 *
 * @param entityType - Target entity template to download
 * @returns Nothing
 */
export async function downloadExcelTemplate(entityType: ExcelEntityType): Promise<void> {
  const response = await api.get<Blob>(`/v1/excel/templates/${entityType}`, {
    responseType: 'blob',
  })

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const downloadUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = `${entityType}-import-template.xlsx`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(downloadUrl)
}

/**
 * Uploads an XLSX workbook and returns the backend validation report.
 *
 * @param entityType - Target entity type to import
 * @param file - XLSX file selected by the user
 * @returns Import summary with success/failure counts and row errors
 */
export async function uploadExcelWorkbook(
  entityType: ExcelEntityType,
  file: File,
): Promise<ExcelImportResult> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post<ExcelImportResult>(`/v1/excel/import/${entityType}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return response.data
}
