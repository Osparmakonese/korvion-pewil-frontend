// Full till path: login -> open session -> ring a sale -> close session.
//
// This is a SCAFFOLD. The selectors below are best-effort guesses based on the
// POS UI; confirm each against your build, then change `test.fixme` to `test` to
// turn it on. Keeping it fixme'd by default means it never produces false CI
// failures before it has been validated once by hand.
//
// Why it's worth finishing: this is the single highest-value test in the repo —
// it protects the money path (sell + cash-up) from every future change. Run it
// before every deploy.

const { test, expect } = require('@playwright/test');

const EMAIL = process.env.PEWIL_TEST_EMAIL;
const PASSWORD = process.env.PEWIL_TEST_PASSWORD;

async function login(page) {
  await page.goto('/login');
  await page.getByPlaceholder('you@shop.co.zw').fill(EMAIL || '');
  await page.getByPlaceholder('••••••••').fill(PASSWORD || '');
  await page.getByRole('button', { name: /sign in to pewil/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}

test.fixme('login -> open session -> sell -> close', async ({ page }) => {
  await login(page);
  await page.goto('/pos');

  // 1) OPEN SESSION — if a session isn't open, POS prompts to open one with a
  //    starting float. Confirm the button label + float field in your build.
  const openBtn = page.getByRole('button', { name: /open (the )?session|start session/i });
  if (await openBtn.isVisible().catch(() => false)) {
    // TODO: confirm the float input locator (placeholder/label) in CashierSessions/POS.
    await page.getByPlaceholder(/float|starting cash|amount/i).first().fill('50');
    await openBtn.click();
  }

  // 2) ADD AN ITEM — quick-add or product search. Confirm how items enter the cart.
  //    The POS has a quick-add price field (placeholder "0.00") + name/barcode.
  await page.getByPlaceholder('0.00').first().fill('10.00');
  // TODO: confirm the "add to cart" trigger (Enter, an Add button, or a product tile).
  await page.keyboard.press('Enter');

  // 3) TENDER + COMPLETE — choose cash, enter amount tendered, complete the sale.
  //    POS default paymentMethod is 'cash'; amountTendered has its own input.
  // TODO: confirm the "complete sale / charge" button label.
  await page.getByRole('button', { name: /complete|charge|pay|finish/i }).first().click();
  await expect(page.getByText(/sale complete/i)).toBeVisible({ timeout: 20_000 });

  // 4) CLOSE SESSION / CASH-UP — from POS actions or CashierSessions.
  // TODO: confirm the close-session/cash-up path and its confirmation.
  // await page.getByRole('button', { name: /close (the )?session|cash.?up/i }).click();
});
