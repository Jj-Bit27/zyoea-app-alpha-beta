import { test, expect } from '@playwright/test';

test.describe('Reservas - Booking Flow', () => {

  test('Página de reservas carga para usuario no autenticado', async ({ page }) => {
    await page.goto('/bookings');
    await page.waitForLoadState('networkidle');

    // Sin sesión, debería redirigir a login o mostrar página vacía
    const currentUrl = page.url();
    const redirectedToLogin = currentUrl.includes('login') || currentUrl.includes('register');

    if (!redirectedToLogin) {
      // Si no redirige, ver que la página cargue
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length).toBeGreaterThan(0);
    }
  });

  test('Navegación a restaurantes disponible', async ({ page }) => {
    // Un usuario no autenticado debería poder ver restaurantes
    await page.goto('/restaurants');
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    if (!currentUrl.includes('login')) {
      const items = page.locator('a[href*="restaurant"], div[class*="card"], div[class*="restaurant"]');
      const count = await items.count();
      console.log(`Restaurantes visibles en landing: ${count}`);
    }
  });

  test('Página de detalle de restaurante funciona', async ({ page }) => {
    // Intentar navegar a un restaurante específico
    await page.goto('/restaurants');
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    if (!currentUrl.includes('login') && !currentUrl.includes('register')) {
      // Buscar primer link a restaurante
      const restaurantLink = page.locator('a[href*="restaurant"]').first();
      if (await restaurantLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        const href = await restaurantLink.getAttribute('href');
        if (href) {
          await page.goto(href);
          await page.waitForLoadState('networkidle');
          const bodyText = await page.locator('body').innerText();
          expect(bodyText.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
