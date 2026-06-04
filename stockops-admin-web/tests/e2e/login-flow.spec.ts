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
 * Installs common API mocks required for authenticated pages.
 * Mocks login, dashboard summary, recent transactions, environment, and notifications.
 *
 * @param page - Active Playwright page
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
          permissions: ['DASHBOARD_READ', 'INVENTORY_READ', 'INBOUND_READ', 'OUTBOUND_READ', 'REPORT_READ'],
          scopeMetadata: { global: true, assignments: [{ scope: 'GLOBAL', centerId: null, warehouseId: null }], centerIds: [], warehouseIds: [] },
        },
      }),
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
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })

  await page.route('**/api/v1/environment/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ totalSensors: 0, activeSensors: 0, normalCount: 0, warningCount: 0, dangerCount: 0, latestReadings: [] }),
    })
  })

  await page.route('**/api/v1/notifications**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  })
}

test.describe('Login Flow', () => {
  test('should display login page and login successfully', async ({ page }, testInfo) => {
    await installCommonMocks(page)

    await page.goto('/login')

    await expect(page.getByTestId('login-email')).toBeVisible()
    await expect(page.getByTestId('login-password')).toBeVisible()
    await expect(page.getByTestId('login-submit')).toBeVisible()

    await page.getByTestId('login-email').fill('admin@stockops.com')
    await page.getByTestId('login-password').fill('admin123')
    await page.getByTestId('login-submit').click()

    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
    await expect(page.getByTestId('app-shell')).toBeVisible()

    await ensureEvidenceDir()
    const screenshotPath = path.join(evidenceDir, `login-flow-success-${testInfo.project.name}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })
    await testInfo.attach('login-success-screenshot', { path: screenshotPath, contentType: 'image/png' })
  })

  test('should show error for invalid credentials', async ({ page }, testInfo) => {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthorized' }) })
    })

    await page.goto('/login')

    await page.getByTestId('login-email').fill('invalid@test.com')
    await page.getByTestId('login-password').fill('wrongpassword')
    await page.getByTestId('login-submit').click()

    await expect(page.getByText('이메일 또는 비밀번호가 올바르지 않습니다.')).toBeVisible({ timeout: 5000 })

    await ensureEvidenceDir()
    const screenshotPath = path.join(evidenceDir, `login-flow-error-${testInfo.project.name}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })
    await testInfo.attach('login-error-screenshot', { path: screenshotPath, contentType: 'image/png' })
  })

  test('should navigate from login to dashboard via quick action', async ({ page }, testInfo) => {
    await installCommonMocks(page)

    await page.goto('/login')
    await page.getByTestId('login-email').fill('admin@stockops.com')
    await page.getByTestId('login-password').fill('admin123')
    await page.getByTestId('login-submit').click()

    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
    await expect(page.getByText('대시보드')).toBeVisible()

    await ensureEvidenceDir()
    const screenshotPath = path.join(evidenceDir, `login-dashboard-nav-${testInfo.project.name}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })
    await testInfo.attach('dashboard-navigation-screenshot', { path: screenshotPath, contentType: 'image/png' })
  })
})
