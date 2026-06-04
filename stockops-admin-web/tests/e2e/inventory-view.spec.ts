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
          permissions: ['DASHBOARD_READ', 'INVENTORY_READ'],
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

async function installInventoryMocks(page: Page): Promise<void> {
  await page.route('**/api/v1/inventory**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          productId: 1,
          productBarcode: '8801234567890',
          productName: 'Test Product A',
          locationId: 1,
          locationCode: 'LOC-01',
          locationName: 'Storage A-01',
          lotId: 1,
          lotNumber: 'LOT-001',
          expiryDate: '2026-12-31',
          quantity: 100,
          reservedQuantity: 10,
          status: 'ACTIVE',
          createdAt: '2026-04-28T09:00:00Z',
          updatedAt: '2026-04-28T10:00:00Z',
        },
        {
          id: 2,
          productId: 2,
          productBarcode: '8801234567891',
          productName: 'Test Product B',
          locationId: 2,
          locationCode: 'LOC-02',
          locationName: 'Storage A-02',
          lotId: 2,
          lotNumber: 'LOT-002',
          expiryDate: '2026-06-15',
          quantity: 50,
          reservedQuantity: 0,
          status: 'ACTIVE',
          createdAt: '2026-04-28T09:00:00Z',
          updatedAt: '2026-04-28T10:00:00Z',
        },
        {
          id: 3,
          productId: 3,
          productBarcode: '8801234567892',
          productName: 'Expiring Soon Product',
          locationId: 1,
          locationCode: 'LOC-01',
          locationName: 'Storage A-01',
          lotId: 3,
          lotNumber: 'LOT-003',
          expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          quantity: 20,
          reservedQuantity: 0,
          status: 'ACTIVE',
          createdAt: '2026-04-28T09:00:00Z',
          updatedAt: '2026-04-28T10:00:00Z',
        },
      ]),
    })
  })

  await page.route('**/api/v1/products**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [
          { id: 1, name: 'Test Product A', barcode: '8801234567890', categoryId: 1, safetyStock: 10 },
          { id: 2, name: 'Test Product B', barcode: '8801234567891', categoryId: 2, safetyStock: 5 },
          { id: 3, name: 'Expiring Soon Product', barcode: '8801234567892', categoryId: 1, safetyStock: 5 },
        ],
      }),
    })
  })

  await page.route('**/api/v1/categories**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Beverages', level: 1, children: [] },
        { id: 2, name: 'Snacks', level: 1, children: [] },
      ]),
    })
  })
}

test.describe('Inventory View', () => {
  test('should navigate to inventory, filter, and verify data', async ({ page }, testInfo) => {
    await installCommonMocks(page)
    await installInventoryMocks(page)

    await page.goto('/login')
    await page.getByTestId('login-email').fill('admin@stockops.com')
    await page.getByTestId('login-password').fill('admin123')
    await page.getByTestId('login-submit').click()
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })

    await page.goto('/inventory')
    await expect(page.getByText('재고 관리')).toBeVisible()

    await expect(page.getByText('Test Product A')).toBeVisible()
    await expect(page.getByText('Test Product B')).toBeVisible()

    const searchInput = page.locator('input[placeholder*="Search by barcode" i]')
    await searchInput.fill('Product A')
    await page.waitForTimeout(300)

    await expect(page.getByText('Test Product A')).toBeVisible()

    const statusSelect = page.locator('select').filter({ hasText: /All Status/i })
    await statusSelect.selectOption('ACTIVE')
    await page.waitForTimeout(300)

    await expect(page.getByText('ACTIVE')).toBeVisible()

    const categorySelect = page.locator('select').filter({ hasText: /All Categories/i })
    await categorySelect.selectOption('1')
    await page.waitForTimeout(300)

    await expect(page.getByText('Beverages')).toBeVisible()

    await ensureEvidenceDir()
    const screenshotPath = path.join(evidenceDir, `inventory-view-${testInfo.project.name}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })
    await testInfo.attach('inventory-view-screenshot', { path: screenshotPath, contentType: 'image/png' })
  })
})
