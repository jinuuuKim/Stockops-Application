import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const evidenceDir = path.resolve(testDir, '../../../.sisyphus/evidence')

async function ensureEvidenceDir(): Promise<void> {
  await fs.mkdir(evidenceDir, { recursive: true })
}

/**
 * Installs common API mocks for authenticated session.
 */
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
          permissions: ['DASHBOARD_READ', 'INBOUND_READ', 'INBOUND_WRITE', 'INVENTORY_READ'],
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

/**
 * Installs inbound-specific API mocks.
 */
async function installInboundMocks(page: Page): Promise<void> {
  let inboundIdCounter = 100

  await page.route('**/api/v1/inbounds**', async (route) => {
    const request = route.request()
    if (request.method() === 'POST') {
      inboundIdCounter += 1
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: inboundIdCounter,
          inboundDate: new Date().toISOString().split('T')[0],
          supplier: 'Test Supplier',
          status: 'DRAFT',
          totalQuantity: 0,
          createdBy: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      })
      return
    }

    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 100,
            inboundDate: '2026-04-28',
            supplier: 'Test Supplier',
            status: 'DRAFT',
            totalQuantity: 0,
            createdBy: 1,
            createdAt: '2026-04-28T09:00:00Z',
            updatedAt: '2026-04-28T09:00:00Z',
          },
        ]),
      })
      return
    }

    await route.continue()
  })

  await page.route('**/api/v1/inbounds/*/items', async (route) => {
    const request = route.request()
    if (request.method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          inboundId: 100,
          productId: 1,
          productName: 'Test Product',
          lotNumber: 'LOT-001',
          expiryDate: '2026-12-31',
          quantity: 50,
          locationId: 1,
          locationCode: 'LOC-01',
          createdAt: new Date().toISOString(),
        }),
      })
      return
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })

  await page.route('**/api/v1/inbounds/*/confirm', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 100,
        inboundDate: '2026-04-28',
        supplier: 'Test Supplier',
        status: 'CONFIRMED',
        totalQuantity: 50,
        createdBy: 1,
        createdAt: '2026-04-28T09:00:00Z',
        updatedAt: new Date().toISOString(),
      }),
    })
  })

  await page.route('**/api/v1/products**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [
          { id: 1, name: 'Test Product', barcode: '8801234567890', categoryId: 1, safetyStock: 10 },
          { id: 2, name: 'Second Product', barcode: '8801234567891', categoryId: 2, safetyStock: 5 },
        ],
      }),
    })
  })

  await page.route('**/api/v1/locations**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, code: 'LOC-01', name: 'Storage A-01', warehouseId: 1 },
        { id: 2, code: 'LOC-02', name: 'Storage A-02', warehouseId: 1 },
      ]),
    })
  })

  await page.route('**/api/v1/centers', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 1, code: 'CENTER-A', name: 'Center A' }]) })
  })

  await page.route('**/api/v1/warehouses**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 1, code: 'WH-01', name: 'Warehouse 1', centerId: 1 }]) })
  })
}

test.describe('Inbound Flow', () => {
  test('should create inbound, add item, and confirm', async ({ page }, testInfo) => {
    await installCommonMocks(page)
    await installInboundMocks(page)

    await page.goto('/login')
    await page.getByTestId('login-email').fill('admin@stockops.com')
    await page.getByTestId('login-password').fill('admin123')
    await page.getByTestId('login-submit').click()
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })

    await page.goto('/inbound')
    await expect(page.getByText('입고 관리')).toBeVisible()

    await page.getByRole('button', { name: /입고 등록/i }).click()
    await expect(page.getByText('Create New Inbound')).toBeVisible()

    await page.locator('input[placeholder*="supplier" i]').fill('Test Supplier')
    await page.getByRole('button', { name: /create/i }).click()

    await page.waitForTimeout(500)

    await page.getByRole('button', { name: /add item/i }).first().click()
    await expect(page.getByText('Add Item to Inbound')).toBeVisible()

    await page.locator('select').filter({ hasText: /select a product/i }).selectOption('1')
    await page.locator('input[placeholder*="LOT" i]').fill('LOT-001')
    await page.locator('input[type="date"]').fill('2026-12-31')
    await page.locator('input[placeholder*="quantity" i]').fill('50')
    await page.locator('select').filter({ hasText: /select location/i }).selectOption('1')

    await page.getByRole('button', { name: /add item/i }).filter({ hasText: /^Add Item$/i }).click()
    await page.waitForTimeout(500)

    await page.getByRole('button', { name: /상세/i }).first().click()
    await expect(page.getByText('Inbound #100')).toBeVisible()

    await page.getByRole('button', { name: /confirm inbound/i }).click()
    await page.waitForTimeout(500)

    await expect(page.getByText('CONFIRMED')).toBeVisible()

    await ensureEvidenceDir()
    const screenshotPath = path.join(evidenceDir, `inbound-flow-${testInfo.project.name}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })
    await testInfo.attach('inbound-flow-screenshot', { path: screenshotPath, contentType: 'image/png' })
  })
})
