import { expect, type Page } from '@playwright/test'
import type { Phase2BrowserFixtureState } from '../fixtures/phase2Fixtures'

/**
 * Logs in with seeded fixture credentials and waits for the app shell.
 *
 * @param page - Active Playwright page
 * @param state - Mutable Phase 2 fixture state
 */
export async function loginAsScopedManager(page: Page, state: Phase2BrowserFixtureState): Promise<void> {
  await page.goto('/login')
  await page.getByTestId('login-email').fill(state.user.email)
  await page.getByTestId('login-password').fill('Password123!')
  await page.getByTestId('login-submit').click()
  await expect(page.getByTestId('app-shell')).toBeVisible()
}
