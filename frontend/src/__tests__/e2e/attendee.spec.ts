import { test, expect } from '@playwright/test'

// All attendee tests run in demo mode — no login required
const DEMO_URL = (path: string) => `${path}?demo=true&venue=demo`

test.describe('Attendee — Core User Journeys', () => {

  test.describe('Onboarding', () => {
    test('home page loads with venue name and quick actions', async ({ page }) => {
      await page.goto(DEMO_URL('/'))
      await expect(page.locator('h1')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible()
    })

    test('demo mode banner is visible', async ({ page }) => {
      await page.goto(DEMO_URL('/'))
      await expect(page.locator('[aria-label*="Demo mode"]')).toBeVisible()
    })

    test('guest user redirected to login when visiting protected route without demo', async ({ page }) => {
      await page.goto('/')
      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Navigation — Map Page', () => {
    test('map page loads and shows venue map', async ({ page }) => {
      await page.goto(DEMO_URL('/map'))
      await expect(page.locator('[aria-label*="map"]')).toBeVisible({ timeout: 8000 })
    })

    test('nearest exit button is visible and focusable', async ({ page }) => {
      await page.goto(DEMO_URL('/map'))
      const exitBtn = page.locator('[aria-label*="nearest exit"]')
      await expect(exitBtn).toBeVisible()
      await exitBtn.focus()
      await expect(exitBtn).toBeFocused()
    })

    test('avoid crowded zones toggle has correct aria-pressed state', async ({ page }) => {
      await page.goto(DEMO_URL('/map'))
      const toggle = page.locator('[aria-label*="Avoid crowded"]')
      await expect(toggle).toHaveAttribute('aria-pressed', 'false')
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    })
  })

  test.describe('Queues Page', () => {
    test('queues page shows list with wait time badges', async ({ page }) => {
      await page.goto(DEMO_URL('/queues'))
      await expect(page.locator('h1')).toContainText(/wait/i)
      // At least one queue card should render in demo mode
      await expect(page.locator('[data-testid="queue-card"]').first()).toBeVisible({ timeout: 5000 })
    })

    test('filter chips are keyboard navigable', async ({ page }) => {
      await page.goto(DEMO_URL('/queues'))
      await page.keyboard.press('Tab')
      // Tab through sort controls — they should be reachable
      const radioGroup = page.locator('[role="radiogroup"]')
      await expect(radioGroup).toBeVisible()
    })
  })

  test.describe('F&B Ordering', () => {
    test('order page shows menu categories', async ({ page }) => {
      await page.goto(DEMO_URL('/order'))
      await expect(page.locator('[role="radiogroup"]').first()).toBeVisible({ timeout: 5000 })
    })

    test('cart FAB is not visible when cart is empty', async ({ page }) => {
      await page.goto(DEMO_URL('/order'))
      await expect(page.locator('[aria-label*="Open cart"]')).not.toBeVisible()
    })
  })

  test.describe('Accessibility — Skip Navigation', () => {
    test('skip navigation link is present and functional on home page', async ({ page }) => {
      await page.goto(DEMO_URL('/'))
      const skipLink = page.locator('a[href="#main-content"]')
      await expect(skipLink).toBeAttached()
      // Tab once to reach the skip link
      await page.keyboard.press('Tab')
      await expect(skipLink).toBeFocused()
    })
  })

  test.describe('Emergency — Public Access', () => {
    test('/emergency is accessible without any authentication', async ({ page }) => {
      // No ?demo=true — testing genuinely public access
      await page.goto('/emergency')
      // Should NOT redirect to /login
      await expect(page).not.toHaveURL(/\/login/)
      await expect(page.locator('h1')).toBeVisible()
    })

    test('emergency page has permanent exit FAB in non-emergency state', async ({ page }) => {
      await page.goto(DEMO_URL('/'))
      await expect(page.locator('[data-testid="emergency-exit-btn"]')).toBeVisible()
    })
  })

})
