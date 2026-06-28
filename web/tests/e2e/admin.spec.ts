import { test, expect } from '@playwright/test';

test.describe('Admin - Panel de Administración', () => {

  test('Admin stats redirige si no hay sesión', async ({ page }) => {
    await page.goto('/admin/stats');
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    expect(currentUrl.includes('login') || currentUrl.includes('register')).toBeTruthy();
  });

  test('Admin subscriptions redirige si no hay sesión', async ({ page }) => {
    await page.goto('/admin/subscriptions');
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    expect(currentUrl.includes('login') || currentUrl.includes('register')).toBeTruthy();
  });

  test('Profile redirige si no hay sesión', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    expect(currentUrl.includes('login') || currentUrl.includes('register')).toBeTruthy();
  });
});
