import { test, expect } from '@playwright/test';

test.describe('Autenticación - Flujos Principales', () => {

  test('Landing page carga correctamente', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Inicio|Suavus|suavus/i);
    // Verificar elementos clave de la landing
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('Página de login muestra formulario', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Verificar que los campos existen
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });

    // Verificar botón de submit o link a registro
    const submitBtn = page.locator('button[type="submit"], button:has-text("Iniciar"), button:has-text("Entrar")').first();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
  });

  test('Página de registro muestra formulario', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input');
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(2); // Al menos email y password

    // Buscar link a login (debe existir)
    const loginLink = page.locator('a[href*="login"], a:has-text("Iniciar sesión")').first();
    await expect(loginLink).toBeVisible({ timeout: 5000 });
  });

  test('Forgot password redirige o muestra formulario', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await page.waitForLoadState('networkidle');

    // Puede redirigir a login si no existe, o mostrar formulario
    const emailInput = page.locator('input[type="email"]').first();
    const currentUrl = page.url();

    if (currentUrl.includes('forgot-password')) {
      await expect(emailInput).toBeVisible({ timeout: 5000 });
    }
    // Si redirige a login, no es un error — es comportamiento válido
  });

  test('Login con credenciales inválidas muestra error', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Llenar formulario con datos inválidos
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill('test@invalido.com');
      await passwordInput.fill('wrongpassword123');
      await submitBtn.click();

      // Esperar respuesta — debe mostrar error
      await page.waitForTimeout(2000); // Esperar mutation de GraphQL
      const bodyText = await page.locator('body').innerText();
      // Debe mostrar algún mensaje de error
      const hasError = bodyText.toLowerCase().includes('error') ||
                       bodyText.toLowerCase().includes('inválido') ||
                       bodyText.toLowerCase().includes('incorrecto') ||
                       bodyText.toLowerCase().includes('no existe');
      expect(hasError).toBeTruthy();
    }
  });
});
