// Pewil critical-path smoke test.
//
// This is the "does the till still work after this deploy?" guard. It is written
// to be RELIABLE (green when the app is healthy) rather than exhaustive: it logs
// in with a real account and confirms the authenticated app renders and the POS
// route loads without crashing — which catches the top failure modes: a broken
// build, broken auth, a white-screen, or a crashing POS page.
//
// The fuller login -> open session -> sell -> close flow lives in
// sell-flow.spec.js as a scaffold to enable once its selectors are confirmed.
//
// Requires PEWIL_BASE_URL / PEWIL_TEST_EMAIL / PEWIL_TEST_PASSWORD (see
// playwright.config.js). The test account must not have 2FA enabled.

const { test, expect } = require('@playwright/test');

const EMAIL = process.env.PEWIL_TEST_EMAIL;
const PASSWORD = process.env.PEWIL_TEST_PASSWORD;

test.beforeAll(() => {
  if (!EMAIL || !PASSWORD) {
    throw new Error('Set PEWIL_TEST_EMAIL and PEWIL_TEST_PASSWORD to run the smoke test.');
  }
});

async function login(page) {
  await page.goto('/login');
  // Login.js: email placeholder "you@shop.co.zw", password placeholder "••••••••"
  await page.getByPlaceholder('you@shop.co.zw').fill(EMAIL);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in to pewil/i }).click();
}

test('app loads and login succeeds', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await login(page);

  // Land somewhere authenticated: the URL should leave /login.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });

  // The app shell should be present (no white-screen) — the root has content.
  await expect(page.locator('#root')).not.toBeEmpty();

  // No uncaught JS errors during load.
  expect(errors, `Uncaught page errors: ${errors.join(' | ')}`).toHaveLength(0);
});

test('POS route renders without crashing', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await login(page);
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });

  await page.goto('/pos');
  // POS should render its shell — the app root stays populated and doesn't throw.
  await expect(page.locator('#root')).not.toBeEmpty();
  await page.waitForTimeout(1500); // let lazy chunks + first data settle
  expect(errors, `POS uncaught errors: ${errors.join(' | ')}`).toHaveLength(0);
});
