import { expect, test, type Page } from '@playwright/test'

type AISuggestion = {
  id: number
  title: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  allowedActions: string[]
}

function buildSuggestion(overrides: Partial<AISuggestion> = {}): AISuggestion {
  return {
    id: 1,
    title: 'Reorder milk',
    status: 'PENDING',
    allowedActions: ['APPROVE', 'REJECT'],
    ...overrides,
  }
}

async function mockAuthenticatedAdminSession(page: Page, suggestions: AISuggestion[]) {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'phase-2-ai-smoke-token',
        user: {
          id: 1,
          email: 'admin@stockops.local',
          name: 'Admin User',
          role: 'ADMIN',
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

  await page.route('**/api/v1/ai/suggestions**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const { pathname } = url

    if (request.method() === 'GET' && pathname === '/api/v1/ai/suggestions') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(suggestions),
      })
      return
    }

    const detailMatch = pathname.match(/\/api\/v1\/ai\/suggestions\/(\d+)$/)
    if (request.method() === 'GET' && detailMatch) {
      const id = Number(detailMatch[1])
      const suggestion = suggestions.find((item) => item.id === id) ?? suggestions[0]

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(suggestion),
      })
      return
    }

    if (request.method() === 'POST' && pathname.endsWith('/approve')) {
      const id = Number(pathname.split('/').at(-2))
      const suggestion = suggestions.find((item) => item.id === id)
      if (suggestion) {
        suggestion.status = 'APPROVED'
        suggestion.allowedActions = ['EXECUTE']
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(suggestion),
      })
      return
    }

    if (request.method() === 'POST' && pathname.endsWith('/reject')) {
      const id = Number(pathname.split('/').at(-2))
      const body = request.postDataJSON() as { rejectionReason?: string }
      expect(body.rejectionReason).toBeTruthy()
      const suggestion = suggestions.find((item) => item.id === id)
      if (suggestion) {
        suggestion.status = 'REJECTED'
        suggestion.allowedActions = []
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(suggestion),
      })
      return
    }

    if (request.method() === 'POST' && pathname.endsWith('/execute')) {
      const id = Number(pathname.split('/').at(-2))
      const suggestion = suggestions.find((item) => item.id === id)
      if (suggestion) {
        suggestion.status = 'EXECUTED'
        suggestion.allowedActions = []
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(suggestion),
      })
      return
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Not found' }),
    })
  })
}

async function loginAndOpenSuggestionsPage(page: Page) {
  await page.goto('/login')
  await page.getByTestId('login-email').fill('admin@stockops.local')
  await page.getByTestId('login-password').fill('Password123!')
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('app-shell')).toBeVisible()

  await page.goto('/admin/ai-suggestions')
}

test('AI Suggestions approve', async ({ page }) => {
  const suggestions = [buildSuggestion()]
  await mockAuthenticatedAdminSession(page, suggestions)
  await loginAndOpenSuggestionsPage(page)

  await expect(page.getByTestId('suggestion-row-1')).toBeVisible()
  await page.getByRole('button', { name: 'Reorder milk' }).click()
  await expect(page.getByTestId('suggestion-detail-panel')).toBeVisible()
  await expect(page.getByTestId('detail-approve-btn')).toBeVisible()

  await page.getByTestId('detail-approve-btn').click()
  const approveDialog = page.locator('[role="alertdialog"]')
  await expect(approveDialog).toBeVisible()
  await approveDialog.getByRole('button', { name: '승인' }).click()

  await expect(page.getByTestId('suggestion-status-1')).toContainText('승인')
  await expect(page.getByTestId('detail-execute-btn')).toBeVisible()
  await expect(page.getByTestId('detail-approve-btn')).not.toBeVisible()
})

test('AI Suggestions reject validation', async ({ page }) => {
  const suggestions = [buildSuggestion({ id: 2 })]
  await mockAuthenticatedAdminSession(page, suggestions)
  await loginAndOpenSuggestionsPage(page)

  await expect(page.getByTestId('suggestion-row-2')).toBeVisible()
  await page.getByTestId('suggestion-reject-btn-2').click()
  await expect(page.getByTestId('reject-dialog')).toBeVisible()
  await expect(page.getByTestId('reject-confirm-btn')).toBeDisabled()

  await page.getByTestId('reject-reason-input').fill('재고가 충분합니다')
  await expect(page.getByTestId('reject-confirm-btn')).toBeEnabled()
  await page.getByTestId('reject-confirm-btn').click()

  await expect(page.getByTestId('suggestion-status-2')).toContainText('거부')
  await expect(page.getByTestId('suggestion-no-actions-2')).toHaveText('거부됨')
})
