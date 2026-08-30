import { expect, test } from '@playwright/test';

test('curated work is visible and keyboard reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ideas are easy. Here is the work.' })).toBeVisible();
  await expect(page.locator('[data-project]')).toHaveCount(9);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to selected work' })).toBeFocused();
  await page.getByRole('link', { name: 'Skip to selected work' }).press('Enter');
  await expect(page.locator('#work')).toBeFocused();
});

test('layout has no horizontal overflow', async ({ page }) => {
  await page.goto('/');
  const dimensions = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
});

test('security-gated cases have no unpublished repository link', async ({ page }) => {
  await page.goto('/');
  for (const id of ['redax-juris', 'voxpage']) {
    const card = page.locator('[data-project="' + id + '"]');
    await expect(card.getByText('Security gate pending')).toBeVisible();
    await expect(card.locator('a[href*="-case-study"]')).toHaveCount(0);
  }
});
