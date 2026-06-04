import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const testDir = path.dirname(fileURLToPath(import.meta.url))
const evidencePath = path.resolve(testDir, '../../../.sisyphus/evidence/task-1-foundation-gates.png')

test('logs in and renders the authenticated app shell', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ accessToken: 'phase-2-smoke-token' }),
    })
  })

  await page.route('**/api/v1/dashboard/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalProducts: 12,
        totalInventoryQuantity: 120,
        todayInboundCount: 3,
        todayOutboundCount: 1,
        lowStockCount: 0,
        pendingCycleCounts: 0,
        criticalExpiryCount: 0,
        warningExpiryCount: 0,
        recentTransactionCount: 1,
      }),
    })
  })

  await page.route('**/api/v1/inventory/transactions/recent', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.route('**/api/v1/environment/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalSensors: 0,
        activeSensors: 0,
        normalCount: 0,
        warningCount: 0,
        dangerCount: 0,
        latestReadings: [],
      }),
    })
  })

  await page.route('**/api/v1/notifications**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.goto('/login')

  await page.getByTestId('login-email').fill('admin@stockops.local')
  await page.getByTestId('login-password').fill('Password123!')
  await page.getByTestId('login-submit').click()

  await expect(page.getByTestId('app-shell')).toBeVisible()

  await fs.mkdir(path.dirname(evidencePath), { recursive: true })
  await page.screenshot({ path: evidencePath, fullPage: true })
})
