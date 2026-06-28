import { test, expect } from '@playwright/test';

test.describe('Staff - Panel de Trabajo', () => {

  test('Staff dashboard redirige si no hay sesión', async ({ page }) => {
    await page.goto('/staff/dashboard');
    await page.waitForLoadState('networkidle');

    // Sin autenticación, debe redirigir a login
    const currentUrl = page.url();
    const redirected = currentUrl.includes('login') || currentUrl.includes('register');
    expect(redirected).toBeTruthy();
  });

  test('Staff orders redirige si no hay sesión', async ({ page }) => {
    await page.goto('/staff/orders');
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    expect(currentUrl.includes('login') || currentUrl.includes('register')).toBeTruthy();
  });

  test('Staff tables redirige si no hay sesión', async ({ page }) => {
    await page.goto('/staff/tables');
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    expect(currentUrl.includes('login') || currentUrl.includes('register')).toBeTruthy();
  });

  test('Staff employees redirige si no hay sesión', async ({ page }) => {
    await page.goto('/staff/employees');
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    expect(currentUrl.includes('login') || currentUrl.includes('register')).toBeTruthy();
  });
});
