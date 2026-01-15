
import { test, expect } from '@playwright/test';

test.describe('Mobile Schedule Layout', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the session to be logged in
    await page.addInitScript(() => {
        window.localStorage.setItem('supabase.auth.token', JSON.stringify({
            currentSession: {
                access_token: 'mock-token',
                user: { id: 'mock-user-id', email: 'test@example.com' }
            }
        }));
    });

    // Set viewport to mobile
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X/11/12/13 Mini size
    await page.goto('http://localhost:5173/'); // Adjust port if needed

    // Wait for the app to load and navigate to Schedule if it's not the default
    // Assuming there is a bottom navigation, we click the Schedule tab.
    // I need to find the Schedule tab selector. Based on previous turns, it might be the 4th tab.
    // I'll wait for a bit to ensure hydration
    await page.waitForTimeout(2000);
  });

  test('should verify schedule layout elements', async ({ page }) => {
    // Navigate to Schedule (assuming it's a tab - I'll try to find text "Schedule" or icon)
    // If layout is standard, there should be a tab bar.
    // Let's try to click the Schedule tab by text if possible, or assume it's one of the buttons.
    // Looking at Layout.tsx (not visible here but from previous context), tabs are usually there.
    // I will try to find a button with "Diary" or "Schedule" in aria-label or text.

    const scheduleTab = page.locator('button:has-text("Diary")').first();
    if (await scheduleTab.isVisible()) {
        await scheduleTab.click();
    } else {
        // Fallback or maybe we are already there?
        console.log("Could not find Diary tab, checking if we are on the page");
    }

    await page.waitForTimeout(1000);

    // Check Sticky Header
    const header = page.locator('.sticky.top-0');
    await expect(header).toBeVisible();
    await expect(header).toHaveClass(/bg-white/);
    await expect(header).toContainText('Site Diary');

    // Check View Switcher (Month/Week)
    const viewSwitcher = page.locator('button:has-text("Month")');
    await expect(viewSwitcher).toBeVisible();

    // Check Compact Grid (Month view is default)
    const grid = page.locator('.grid.grid-cols-7').first();
    await expect(grid).toBeVisible();

    // Take screenshot of Month View
    await page.screenshot({ path: 'verification/mobile_schedule_month.png' });

    // Switch to Week View
    await page.click('button:has-text("Week")');
    await page.waitForTimeout(500);

    // Check Week Strip
    const weekStrip = page.locator('.overflow-x-auto');
    await expect(weekStrip).toBeVisible();
    await page.screenshot({ path: 'verification/mobile_schedule_week.png' });

    // Open Add Event Modal
    await page.click('button:has-text("+")'); // Assuming the FAB or + button
    await page.waitForTimeout(500);

    // Check Modal Styling (iOS form groups)
    const modal = page.locator('.fixed.inset-0.bg-slate-50');
    await expect(modal).toBeVisible();

    const formGroup = page.locator('.ios-form-group').first();
    await expect(formGroup).toBeVisible();

    await page.screenshot({ path: 'verification/mobile_schedule_add.png' });
  });
});
