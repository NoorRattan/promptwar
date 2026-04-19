import { test, expect, type Page } from '@playwright/test'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator, doc, setDoc, deleteDoc } from 'firebase/firestore'

const VENUE_ID = 'demo'

// Helper: write emergency state to emulator
async function setEmergencyState(isActive: boolean, type = 'FIRE'): Promise<void> {
  const apps = getApps()
  const app = apps.length ? apps[0] : initializeApp({ projectId: 'crowdiq-test' })
  const db = getFirestore(app)
  // Connect to emulator only once
  try { connectFirestoreEmulator(db, 'localhost', 8080) } catch { /* already connected */ }

  if (isActive) {
    await setDoc(doc(db, 'emergency', VENUE_ID), {
      is_active: true,
      type,
      message: `Test ${type} emergency — E2E`,
      affected_zones: [],
      nearest_exit: 'Gate A North',
      nearest_exit_distance: '~80m',
      evacuation_routes: {},
      activated_at: new Date().toISOString()
    })
  } else {
    await setDoc(doc(db, 'emergency', VENUE_ID), {
      is_active: false,
      deactivated_at: new Date().toISOString()
    }, { merge: true })
  }
}

test.describe('Emergency Evacuation Flow', () => {

  test.beforeEach(async () => {
    await setEmergencyState(false) // reset before each test
  })

  test('emergency banner appears within 3 seconds after Firestore activation', async ({ page }) => {
    await page.goto(`/?demo=true&venue=${VENUE_ID}`)
    await page.waitForSelector('[data-testid="home-page"]', { timeout: 5000 })
    await setEmergencyState(true, 'FIRE')
    await expect(page.locator('[role="alertdialog"]')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('[role="alertdialog"]')).toContainText('Fire')
  })

  test('emergency banner has no dismiss button', async ({ page }) => {
    await page.goto(`/?demo=true&venue=${VENUE_ID}`)
    await setEmergencyState(true, 'FIRE')
    await expect(page.locator('[role="alertdialog"]')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('[role="alertdialog"] button[aria-label*="close"]')).not.toBeVisible()
    await expect(page.locator('[role="alertdialog"] button[aria-label*="dismiss"]')).not.toBeVisible()
  })

  test('show evacuation route button navigates to /emergency', async ({ page }) => {
    await page.goto(`/?demo=true&venue=${VENUE_ID}`)
    await setEmergencyState(true)
    await expect(page.locator('[role="alertdialog"]')).toBeVisible({ timeout: 3000 })
    await page.locator('[aria-label*="evacuation route"], [aria-label*="Show Route"]').click()
    await expect(page).toHaveURL(/\/emergency/)
  })

  test('evacuation map and steps are present on /emergency during active emergency', async ({ page }) => {
    await setEmergencyState(true)
    await page.goto(`/emergency?demo=true&venue=${VENUE_ID}`)
    await expect(page.locator('[data-testid="evacuation-map"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="evacuation-steps"]')).toBeVisible()
  })

  test('"I Am Safe" button is present and enabled during active emergency', async ({ page }) => {
    await setEmergencyState(true)
    await page.goto(`/emergency?demo=true&venue=${VENUE_ID}`)
    const safeBtn = page.locator('[aria-label*="safe location"], [aria-label*="I Am Safe"]')
    await expect(safeBtn).toBeVisible({ timeout: 5000 })
    await expect(safeBtn).toBeEnabled()
  })

  test('all-clear state renders after emergency deactivation', async ({ page }) => {
    await setEmergencyState(true)
    await page.goto(`/emergency?demo=true&venue=${VENUE_ID}`)
    await expect(page.locator('[role="alertdialog"]')).toBeVisible({ timeout: 3000 })
    await setEmergencyState(false)
    await expect(page.locator('[role="status"]')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('[role="status"]')).toContainText(/clear/i)
  })

})
