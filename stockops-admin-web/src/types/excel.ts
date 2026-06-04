/**
 * Excel batch import/export type definitions.
 * Supports template downloads plus row-level validation reports for XLSX uploads.
 *
 * @author StockOps Team
 * @since 1.0
 */

/**
 * Supported Excel entity types.
 */
export type ExcelEntityType = 'products' | 'inbounds' | 'purchase-orders'

/**
 * Row-level validation error returned by the backend import workflow.
 */
export interface ExcelImportRowError {
  rowNumber: number
  entityKey: string | null
  message: string
}

/**
 * Batch import summary returned after an XLSX upload.
 */
export interface ExcelImportResult {
  entityType: string
  totalRows: number
  successCount: number
  failureCount: number
  errors: ExcelImportRowError[]
}
