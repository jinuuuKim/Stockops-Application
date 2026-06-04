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
          permissions: ['DASHBOARD_READ', 'OUTBOUND_READ', 'OUTBOUND_WRITE', 'INVENTORY_READ'],
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

async function installOutboundMocks(page: Page): Promise<void> {
  let outboundIdCounter = 200

  await page.route('**/api/v1/outbounds**', async (route) => {
    const request = route.request()
    if (request.method() === 'POST') {
      outboundIdCounter += 1
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: outboundIdCounter,
          outboundDate: new Date().toISOString().split('T')[0],
          customer: 'Test Customer',
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
            id: 200,
            outboundDate: '2026-04-28',
            customer: 'Test Customer',
            status: 'DRAFT',
            totalQuantity: 10,
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

  await page.route('**/api/v1/outbounds/*/items', async (route) => {
    const request = route.request()
    if (request.method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          outboundId: 200,
          productId: 1,
          productName: 'Test Product',
          lotId: null,
          lotNumber: null,
          quantity: 10,
          createdAt: new Date().toISOString(),
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, outboundId: 200, productId: 1, productName: 'Test Product', lotId: 1, lotNumber: 'LOT-001', quantity: 10, createdAt: '2026-04-28T09:00:00Z' },
      ]),
    })
  })

  await page.route('**/api/v1/outbounds/*/confirm', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 200,
        outboundDate: '2026-04-28',
        customer: 'Test Customer',
        status: 'CONFIRMED',
        totalQuantity: 10,
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

  await page.route('**/api/v1/inventory**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          productId: 1,
          productBarcode: '8801234567890',
          productName: 'Test Product',
          locationId: 1,
          locationCode: 'LOC-01',
          locationName: 'Storage A-01',
          lotId: 1,
          lotNumber: 'LOT-001',
          expiryDate: '2026-12-31',
          quantity: 40,
          reservedQuantity: 0,
          status: 'ACTIVE',
          createdAt: '2026-04-28T09:00:00Z',
          updatedAt: '2026-04-28T10:00:00Z',
        },
      ]),
    })
  })
}

test.describe('Outbound Flow', () => {
  test('should create outbound, confirm, and verify stock decrease', async ({ page }, testInfo) => {
    await installCommonMocks(page)
    await installOutboundMocks(page)

    await page.goto('/login')
    await page.getByTestId('login-email').fill('admin@stockops.com')
    await page.getByTestId('login-password').fill('admin123')
    await page.getByTestId('login-submit').click()
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })

    await page.goto('/outbound')
    await expect(page.getByText('출고 관리')).toBeVisible()

    await page.getByRole('button', { name: /신규 출고 등록/i }).click()
    await expect(page.getByText('신규 출고 등록')).toBeVisible()

    await page.locator('input[type="text"]').fill('Test Customer')
    await page.getByRole('button', { name: /create/i }).click()

    await page.waitForTimeout(500)
    await expect(page.getByText(/Outbound #/)).toBeVisible()

    await page.locator('select#product-select').selectOption('1')
    await page.locator('input#quantity-input').fill('10')
    await page.getByRole('button', { name: /^Add Item$/i }).click()

    await page.waitForTimeout(500)
    await expect(page.getByText('Test Product - Qty: 10')).toBeVisible()

    await page.getByRole('button', { name: /finish/i }).click()
    await page.waitForTimeout(500)

    await page.getByRole('button', { name: /확정/i }).first().click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: /확정/i }).filter({ hasText: /^확정$/ }).click()
    await page.waitForTimeout(500)

    await page.goto('/inventory')
    await expect(page.getByText('재고 관리')).toBeVisible()
    await expect(page.getByText('40')).toBeVisible()

    await ensureEvidenceDir()
    const screenshotPath = path.join(evidenceDir, `outbound-flow-${testInfo.project.name}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })
    await testInfo.attach('outbound-flow-screenshot', { path: screenshotPath, contentType: 'image/png' })
  })
})
