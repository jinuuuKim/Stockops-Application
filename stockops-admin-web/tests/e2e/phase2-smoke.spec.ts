import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { createPhase2BrowserFixtureState } from './fixtures/phase2Fixtures'
import { loginAsScopedManager } from './helpers/auth'
import { installPhase2ApiMocks, requestUnauthorizedWarehouse, type Phase2ApiEvidence } from './helpers/phase2Api'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const evidenceDir = path.resolve(testDir, '../../../.sisyphus/evidence')

async function ensureEvidenceDir(): Promise<void> {
  await fs.mkdir(evidenceDir, { recursive: true })
}

test('covers scoped reports, AI approval, purchase-order draft creation, and offline read-only behavior', async ({ page }) => {
  const state = createPhase2BrowserFixtureState()
  const evidence: Phase2ApiEvidence = { unauthorizedStatuses: [], exportDownloads: [] }
  await installPhase2ApiMocks(page, state, evidence)

  await loginAsScopedManager(page, state)

  await page.goto('/reports')
  await expect(page.getByTestId('reports-page')).toBeVisible()
  await expect(page.getByTestId('report-center-filter')).toHaveValue('1')
  await expect(page.getByTestId('report-warehouse-filter')).toHaveValue('10')
  await expect(page.getByTestId('stock-aging-chart')).toContainText('Analytics Product')

  const pdfDownloadPromise = page.waitForEvent('download')
  await page.getByTestId('report-export-pdf').click()
  const pdfDownload = await pdfDownloadPromise
  expect(pdfDownload.suggestedFilename()).toBe('stock-aging-report.pdf')

  await page.goto('/ai-recommendations')
  await expect(page.getByTestId('ai-recommendations-page')).toBeVisible()
  await expect(page.getByTestId('ai-ready-count')).toHaveText('1')
  await page.getByTestId('ai-approve-btn-501').click()
  await expect(page.getByTestId('ai-approved-count')).toHaveText('1')
  await expect(page.getByTestId('ai-po-link-501')).toContainText('PO-AI-501')

  await page.goto('/purchase-orders')
  await expect(page.getByText('PO-AI-501')).toBeVisible()
  await expect(page.getByText('초안')).toBeVisible()

  const unauthorizedStatus = await requestUnauthorizedWarehouse(page)
  expect(unauthorizedStatus).toBe(403)

  await page.context().setOffline(true)
  await page.reload()
  await expect(page.getByTestId('offline-readonly-banner')).toBeVisible()
  await expect(page.getByTestId('report-export-pdf')).toBeDisabled()

  await ensureEvidenceDir()
  await page.screenshot({ path: path.join(evidenceDir, 'task-11-phase2-smoke.png'), fullPage: true })
  await fs.writeFile(
    path.join(evidenceDir, 'task-11-phase2-smoke.json'),
    JSON.stringify({ approvedPoNumber: evidence.approvedPoNumber, unauthorizedStatus, exportDownloads: evidence.exportDownloads }, null, 2),
    'utf8',
  )
})
