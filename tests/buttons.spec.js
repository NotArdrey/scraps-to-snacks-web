import { expect, test } from 'playwright/test';

const userPath = (path) => `${path}${path.includes('?') ? '&' : '?'}visualRole=user`;
const guestPath = (path) => `${path}${path.includes('?') ? '&' : '?'}visualRole=guest`;
const adminPath = (path) => `${path}${path.includes('?') ? '&' : '?'}visualRole=admin`;

async function visibleButtons(page) {
  const buttons = page.locator('button:visible');
  const count = await buttons.count();
  return Promise.all(
    Array.from({ length: count }, async (_, index) => {
      const button = buttons.nth(index);
      const meta = await button.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          text: element.textContent?.replace(/\s+/g, ' ').trim() || '',
          ariaLabel: element.getAttribute('aria-label') || '',
          title: element.getAttribute('title') || '',
          type: element.getAttribute('type') || '',
          disabled: element.disabled || element.getAttribute('aria-disabled') === 'true',
          width: rect.width,
          height: rect.height,
        };
      });
      return { button, meta, name: meta.ariaLabel || meta.title || meta.text || `button-${index + 1}` };
    })
  );
}

async function expectButtonsAreUsable(page, routeName) {
  const buttons = await visibleButtons(page);
  expect(buttons.length, `${routeName} should expose visible buttons`).toBeGreaterThan(0);

  for (const { button, meta, name } of buttons) {
    expect(name.trim(), `${routeName} has an unnamed button`).not.toBe('');
    expect(meta.width, `${routeName} button "${name}" should have width`).toBeGreaterThan(0);
    expect(meta.height, `${routeName} button "${name}" should have height`).toBeGreaterThan(0);

    if (!meta.disabled) {
      await expect(button, `${routeName} button "${name}" should receive pointer events`).toBeEnabled();
    }
  }
}

async function closeFeedback(page, name = /^(OK|Close)$/) {
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name }).click();
}

async function closeConfirm(page, name = 'Cancel') {
  const dialog = page.locator('.confirm-modal-card').last();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name, exact: true }).click();
}

test.describe('button coverage', () => {
  test('visible route buttons have labels and usable hit targets', async ({ page }) => {
    const routes = [
      ['login', guestPath('/login')],
      ['register', guestPath('/register')],
      ['subscription', userPath('/subscription')],
      ['onboarding', userPath('/onboarding')],
      ['pantry', userPath('/pantry')],
      ['magic scan', userPath('/scan')],
      ['cookbook', userPath('/cookbook')],
      ['account', userPath('/account')],
      ['admin', adminPath('/admin')],
    ];

    for (const [routeName, route] of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await expectButtonsAreUsable(page, routeName);
    }
  });

  test('guest auth buttons open, close, toggle, and submit expected states', async ({ page }) => {
    await page.goto(guestPath('/login'));
    await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible();
    await page.getByLabel('Show password').click();
    await expect(page.getByLabel('Hide password')).toBeVisible();
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await expect(page.getByRole('dialog', { name: 'Forgot password' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog', { name: 'Forgot password' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await page.getByPlaceholder('Email').last().fill('cook@example.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText('Password reset instructions have been sent to your email.')).toBeVisible();

    await page.goto(guestPath('/register'));
    await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();
    await page.getByLabel('Show password').click();
    await expect(page.getByLabel('Hide password')).toBeVisible();
    await page.getByLabel('Show confirm password').click();
    await expect(page.getByLabel('Hide confirm password')).toBeVisible();
    await page.getByRole('button', { name: 'Terms & Conditions' }).click();
    await expect(page.getByRole('dialog', { name: 'Terms & Conditions' })).toBeVisible();
    await page.getByRole('button', { name: 'Close terms' }).click();
    await expect(page.getByRole('dialog', { name: 'Terms & Conditions' })).toHaveCount(0);
  });

  test('subscription, account, and admin utility buttons respond', async ({ page }) => {
    await page.goto(userPath('/subscription'));
    await expect(page.getByRole('heading', { name: 'Choose Your Plan' })).toBeVisible();
    await page.getByText('Zero-Waste Pro').click();
    await page.getByRole('button', { name: 'Continue to Payment' }).click();
    await expect(page).toHaveURL(/checkout\.paymongo\.com|paymongo/i);

    await page.goto(userPath('/account'));
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();
    await page.getByRole('button', { name: 'Edit' }).first().click();
    await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Edit' }).nth(1).click();
    await page.getByLabel('Show password').click();
    await expect(page.getByLabel('Hide password')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: /sign out/i }).click();
    await closeConfirm(page);

    await page.goto(adminPath('/admin'));
    await expect(page.getByRole('button', { name: 'Open Dashboard' })).toBeVisible();
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
    await page.getByRole('button', { name: 'Refresh' }).click();
    await page.getByRole('button', { name: 'Open Users' }).click();
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await closeConfirm(page, 'Cancel');
  });

  test('scan and cookbook secondary buttons handle modal and edit flows', async ({ page }) => {
    await page.goto(userPath('/scan'));
    await expect(page.getByRole('heading', { name: 'Magic Scan' })).toBeVisible();
    await expectButtonsAreUsable(page, 'magic scan idle');

    await page.goto(userPath('/cookbook'));
    await expect(page.getByRole('heading', { name: 'Cookbook' })).toBeVisible();
    const card = page.locator('.cookbook-card').filter({ hasText: 'Spinach Tomato Fried Rice' }).first();
    await expect(card).toBeVisible();
    await card.getByRole('checkbox', { name: /select spinach tomato fried rice/i }).check();
    await page.getByRole('button', { name: /Delete selected/ }).click();
    await closeConfirm(page);
    await card.locator('button[title="Edit"]').click();
    await page.locator('.cookbook-add-button').first().click();
    await page.locator('.cookbook-remove-button').last().click();
    await page.locator('.cookbook-add-button').last().click();
    await page.locator('.cookbook-remove-button').last().click();
    await page.getByRole('button', { name: 'Cancel' }).last().click();

    await page.getByRole('button', { name: 'Open cookbook AI chat' }).click();
    await expect(page.getByRole('button', { name: 'Collapse cookbook AI chat' })).toBeVisible();
    await page.getByRole('button', { name: 'Close chat' }).click();
    await expect(page.getByRole('button', { name: 'Open cookbook AI chat' })).toBeVisible();
  });

  test('pantry warning, bulk, and generated-recipe buttons respond', async ({ page }) => {
    await page.goto(userPath('/pantry'));
    await expect(page.getByRole('heading', { name: 'Pantry', exact: true })).toBeVisible();

    const form = page.locator('#pantry-add-form');
    await form.getByLabel('Ingredient Name').fill('phone charger');
    await form.getByLabel('Qty').fill('1');
    await form.getByRole('button', { name: /^Add$/ }).click();
    await expect(page.getByText(/not a valid food ingredient/i)).toBeVisible();

    await form.getByLabel('Ingredient Name').fill('eggs');
    await form.getByRole('button', { name: /^Add$/ }).click();
    await expect(page.getByText(/blocked by allergy/i).first()).toBeVisible();

    await form.getByLabel('Ingredient Name').fill('playwright cucumber');
    await form.getByLabel('Qty').fill('2');
    await form.getByLabel('Expiration (opt)').fill('2026-07-05');
    await form.getByRole('button', { name: /^Add$/ }).click();
    await expect(page.getByLabel('Select Playwright Cucumber')).toBeVisible();
    await page.getByLabel('Select Playwright Cucumber').check();
    await expect(page.getByRole('button', { name: /Generate selected \(1\)/ })).toBeEnabled();
    await page.getByRole('button', { name: /Delete selected \(1\)/i }).click();
    await closeConfirm(page);
    await page.getByRole('button', { name: /Generate selected \(1\)/ }).click();
    await expect(page.getByRole('heading', { name: 'Playwright Cucumber Pantry Recipe' })).toBeVisible();
    await page.getByRole('button', { name: 'Save Recipe' }).click();
    await closeFeedback(page, 'Open Cookbook');
    await expect(page.getByRole('heading', { name: 'Cookbook' })).toBeVisible();
  });
});
