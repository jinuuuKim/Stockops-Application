import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const evidenceDir = path.resolve(testDir, '../../../.sisyphus/evidence')

async function ensureEvidenceDir(): Promise<void> {
  await fs.mkdir(evidenceDir, { recursive: true })
}

async function installCommonMocks(page: Page): Promise<void> {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'e2e-test-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: {
          id: 1,
          email: 'admin@stockops.com',
          name: 'Admin User',
          role: 'ADMIN',
          permissions: ['DASHBOARD_READ', 'REPORT_READ'],
          scopeMetadata: { global: true, assignments: [{ scope: 'GLOBAL', centerId: null, warehouseId: null }], centerIds: [], warehouseIds: [] },
        },
      }),
    })
  })

  await page.route('**/api/v1/dashboard/summary', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ totalProducts: 12, totalInventoryQuantity: 120, todayInboundCount: 3, todayOutboundCount: 1, lowStockCount: 0, pendingCycleCounts: 0, criticalExpiryCount: 0, warningExpiryCount: 0, recentTransactionCount: 1 }) })
  })

  await page.route('**/api/v1/inventory/transactions/recent', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })

  await page.route('**/api/v1/environment/dashboard', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ totalSensors: 0, activeSensors: 0, normalCount: 0, warningCount: 0, dangerCount: 0, latestReadings: [] }) })
  })

  await page.route('**/api/v1/notifications**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
}

async function installReportsMocks(page: Page): Promise<void> {
  await page.route('**/api/v1/centers', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 1, code: 'CENTER-A', name: 'Center A' }]) })
  })

  await page.route('**/api/v1/reports/inventory-turnover**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          { productId: 1, productName: 'Test Product A', productBarcode: '8801234567890', turnoverRate: 4.5, cogs: 100000, avgInventory: 25000 },
          { productId: 2, productName: 'Test Product B', productBarcode: '8801234567891', turnoverRate: 2.3, cogs: 50000, avgInventory: 22000 },
        ],
      }),
    })
  })

  await page.route('**/api/v1/reports/abc-analysis**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          { productId: 1, productName: 'Test Product A', revenue: 150000, revenuePercentage: 0.6, cumulativePercentage: 0.6, class: 'A' },
          { productId: 2, productName: 'Test Product B', revenue: 75000, revenuePercentage: 0.3, cumulativePercentage: 0.9, class: 'B' },
        ],
      }),
    })
  })

  await page.route('**/api/v1/reports/xyz-analysis**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          { productId: 1, productName: 'Test Product A', coefficientOfVariation: 0.15, class: 'X' },
          { productId: 2, productName: 'Test Product B', coefficientOfVariation: 0.45, class: 'Y' },
        ],
      }),
    })
  })

  await page.route('**/api/v1/reports/abc-xyz-matrix**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        cells: [
          { abcClass: 'A', xyzClass: 'X', productCount: 1, products: [{ productId: 1, productName: 'Test Product A' }] },
          { abcClass: 'B', xyzClass: 'Y', productCount: 1, products: [{ productId: 2, productName: 'Test Product B' }] },
        ],
      }),
    })
  })

  await page.route('**/api/v1/analytics/expiry-waste**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        summary: { rowCount: 1, quarantinedQuantity: 5, quarantinedLotCount: 2 },
        rows: [{ productId: 1, productName: 'Test Product A', centerId: 1, centerName: 'Center A', warehouseId: 1, warehouseName: 'WH-01', quarantinedQuantity: 5, quarantinedLotCount: 2 }],
        monthlyData: [{ month: '2026-04', quarantinedQuantity: 5 }],
      }),
    })
  })

  await page.route('**/api/v1/analytics/lead-time**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        summary: { rowCount: 1, purchaseOrderCount: 2, leadTimeSampleCount: 2, totalLeadTimeHours: 96, averageLeadTimeHours: 48 },
        rows: [{ productId: 1, productName: 'Test Product A', centerId: 1, centerName: 'Center A', warehouseId: 1, warehouseName: 'WH-01', purchaseOrderCount: 2, leadTimeSampleCount: 2, totalLeadTimeHours: 96, averageLeadTimeHours: 48 }],
        monthlyData: [{ month: '2026-04', avgLeadTimeHours: 48 }],
        suppliers: [{ supplierName: 'Supplier A', avgLeadTimeHours: 48, orderCount: 2 }],
      }),
    })
  })

  await page.route('**/api/v1/analytics/stock-aging**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        summary: { rowCount: 2, totalAvailableQuantity: 150, zeroToThirtyQuantity: 100, thirtyOneToSixtyQuantity: 30, sixtyOneToNinetyQuantity: 15, overNinetyQuantity: 5, noDemandQuantity: 0 },
        rows: [
          { productId: 1, productName: 'Test Product A', centerId: 1, centerName: 'Center A', warehouseId: 1, warehouseName: 'WH-01', businessDate: '2026-04-28', availableQuantity: 100, averageDailyDemand: 10, estimatedCoverageDays: 10, agingBucket: '0-30' },
          { productId: 2, productName: 'Test Product B', centerId: 1, centerName: 'Center A', warehouseId: 1, warehouseName: 'WH-01', businessDate: '2026-04-28', availableQuantity: 50, averageDailyDemand: 5, estimatedCoverageDays: 10, agingBucket: '31-60' },
        ],
      }),
    })
  })
}

test.describe('Reports View', () => {
  test('should navigate to reports page and verify charts load', async ({ page }, testInfo) => {
    await installCommonMocks(page)
    await installReportsMocks(page)

    await page.goto('/login')
    await page.getByTestId('login-email').fill('admin@stockops.com')
    await page.getByTestId('login-password').fill('admin123')
    await page.getByTestId('login-submit').click()
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })

    await page.goto('/reports')
    await expect(page.getByTestId('reports-page')).toBeVisible()
    await expect(page.getByText('리포트 & 분석')).toBeVisible()

    await expect(page.getByTestId('report-filters')).toBeVisible()
    await expect(page.getByTestId('report-tabs')).toBeVisible()

    await expect(page.getByText('재고 회전율')).toBeVisible()
    await expect(page.getByText('ABC/XYZ 분류')).toBeVisible()
    await expect(page.getByText('유통기한 손실')).toBeVisible()
    await expect(page.getByText('리드타임')).toBeVisible()
    await expect(page.getByText('재고 노후화')).toBeVisible()

    await page.getByRole('button', { name: /재고 회전율/i }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText('Test Product A')).toBeVisible()

    await page.getByRole('button', { name: /재고 노후화/i }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText('재고 노후화 분포')).toBeVisible()
    await expect(page.getByText('0-30일')).toBeVisible()

    await page.getByRole('button', { name: /ABC\/XYZ 분류/i }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText('ABC 분류')).toBeVisible()
    await expect(page.getByText('XYZ 분류')).toBeVisible()

    await ensureEvidenceDir()
    const screenshotPath = path.join(evidenceDir, `reports-view-${testInfo.project.name}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })
    await testInfo.attach('reports-view-screenshot', { path: screenshotPath, contentType: 'image/png' })
  })
})
