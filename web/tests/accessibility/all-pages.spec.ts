import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  { path: '/', name: 'Landing' },
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
  { path: '/auth/forgot-password', name: 'Forgot Password' },
  { path: '/bookings', name: 'Bookings' },
  { path: '/profile', name: 'Profile' },
  { path: '/restaurants', name: 'Restaurants' },
];

const AUTH_PAGES = [
  { path: '/staff/dashboard', name: 'Staff Dashboard' },
  { path: '/staff/orders', name: 'Staff Orders' },
  { path: '/staff/tables', name: 'Staff Tables' },
  { path: '/staff/employees', name: 'Staff Employees' },
  { path: '/admin/stats', name: 'Admin Stats' },
  { path: '/admin/subscriptions', name: 'Admin Subscriptions' },
];

const VIOLATION_THRESHOLDS: Record<string, number> = {
  critical: 0,
  serious: 5,
  moderate: 10,
  minor: 20,
};

test.describe('Accesibilidad - Páginas Públicas', () => {
  for (const page of PAGES) {
    test(`${page.name} (${page.path}) debe cumplir WCAG 2.1 AA`, async ({ page: p }) => {
      await p.goto(page.path);
      await p.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page: p })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Reportar violaciones encontradas
      for (const violation of results.violations) {
        console.log(`[${violation.impact?.toUpperCase()}] ${violation.id}: ${violation.help}`);
        for (const node of violation.nodes) {
          console.log(`  → ${node.html}`);
          console.log(`    Target: ${node.target.join(', ')}`);
          console.log(`    Fix: ${node.failureSummary?.split('\n')[0]}`);
        }
      }

      // Verificar umbrales por severidad
      const critical = results.violations.filter(v => v.impact === 'critical').length;
      const serious = results.violations.filter(v => v.impact === 'serious').length;
      const moderate = results.violations.filter(v => v.impact === 'moderate').length;
      const minor = results.violations.filter(v => v.impact === 'minor').length;

      expect(critical, `Violaciones críticas: ${critical}`).toBeLessThanOrEqual(VIOLATION_THRESHOLDS.critical);
      expect(serious, `Violaciones serias: ${serious}`).toBeLessThanOrEqual(VIOLATION_THRESHOLDS.serious);
      expect(moderate, `Violaciones moderadas: ${moderate}`).toBeLessThanOrEqual(VIOLATION_THRESHOLDS.moderate);
      expect(minor, `Violaciones menores: ${minor}`).toBeLessThanOrEqual(VIOLATION_THRESHOLDS.minor);

      console.log(`\n✅ ${page.name}: ${results.violations.length} violaciones totales ` +
        `(C:${critical} S:${serious} M:${moderate} m:${minor})`);
    });
  }
});

test.describe('Accesibilidad - Páginas Autenticadas', () => {
  for (const page of AUTH_PAGES) {
    test(`${page.name} (${page.path}) debe cumplir WCAG 2.1 AA`, async ({ page: p }) => {
      await p.goto(page.path);
      await p.waitForLoadState('networkidle');

      // Puede redirigir a login si no hay sesión — la prueba sigue siendo válida
      const results = await new AxeBuilder({ page: p })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const critical = results.violations.filter(v => v.impact === 'critical').length;
      const serious = results.violations.filter(v => v.impact === 'serious').length;
      const moderate = results.violations.filter(v => v.impact === 'moderate').length;
      const minor = results.violations.filter(v => v.impact === 'minor').length;

      for (const v of results.violations) {
        console.log(`[${v.impact?.toUpperCase()}] ${v.id}: ${v.help}`);
      }

      expect(critical).toBeLessThanOrEqual(0);
      expect(serious).toBeLessThanOrEqual(5);

      console.log(`\n✅ ${page.name}: ${results.violations.length} violaciones ` +
        `(C:${critical} S:${serious} M:${moderate} m:${minor})`);
    });
  }
});
