import { expect, test } from 'playwright/test';

const userPath = (path) => `${path}${path.includes('?') ? '&' : '?'}visualRole=user`;
const adminPath = (path) => `${path}${path.includes('?') ? '&' : '?'}visualRole=admin`;

async function closeFeedback(page, name = /^(OK|Close)$/) {
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name }).click();
}

async function confirmModal(page, buttonName) {
  const modal = page.locator('.confirm-modal-card').last();
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: buttonName, exact: true }).click();
}

test.describe('fetching and refetching coverage', () => {
  test('user pages render fetched pantry, cookbook, account, and preference data', async ({ page }) => {
    await page.goto(userPath('/pantry'));
    await expect(page.getByRole('heading', { name: 'Pantry', exact: true })).toBeVisible();
    await expect(page.getByText('Spinach')).toBeVisible();
    await expect(page.getByText('Cooked Rice')).toBeVisible();
    await expect(page.getByText(/Avoid: Eggs/)).toBeVisible();
    await expect(page.getByText(/Loading pantry/i)).toHaveCount(0);

    await page.goto(userPath('/cookbook'));
    await expect(page.getByRole('heading', { name: 'Cookbook' })).toBeVisible();
    await expect(page.getByText('Spinach Tomato Fried Rice')).toBeVisible();
    await expect(page.getByText('Chicken Pantry Bowl')).toBeVisible();
    await expect(page.getByText(/Loading cookbook/i)).toHaveCount(0);

    await page.goto(userPath('/account'));
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();
    await expect(page.getByText('cook@example.com').first()).toBeVisible();
    await expect(page.getByText('Kitchen Saver').first()).toBeVisible();

    await page.goto(userPath('/onboarding'));
    await expect(page.getByRole('heading', { name: 'Diet, Allergies & Cooking Style' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Low Carb' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.preference-tag').filter({ hasText: 'Low-sodium' })).toBeVisible();
    await expect(page.getByText('Sesame').first()).toBeVisible();
    await expect(page.getByText(/Loading preferences/i)).toHaveCount(0);
  });

  test('pantry search, filters, and sort use fetched rows', async ({ page }) => {
    await page.goto(userPath('/pantry'));
    await expect(page.getByRole('heading', { name: 'Pantry', exact: true })).toBeVisible();

    await page.getByRole('searchbox', { name: 'Search' }).fill('spinach');
    await expect(page.getByRole('row', { name: /Spinach/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /Cooked Rice/ })).toHaveCount(0);

    await page.getByRole('searchbox', { name: 'Search' }).fill('');
    const pantryControls = page.locator('.pantry-controls');
    const categoryFilter = pantryControls.locator('select').nth(0);
    const statusFilter = pantryControls.locator('select').nth(1);
    const sortControl = pantryControls.locator('select').nth(2);

    await categoryFilter.selectOption('Protein');
    await expect(page.getByRole('row', { name: /Chicken Breast/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /Eggs/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /Spinach/ })).toHaveCount(0);

    await statusFilter.selectOption('allergy-conflict');
    await expect(page.getByRole('row', { name: /Eggs/ })).toBeVisible();
    await expect(page.getByRole('row', { name: /Chicken Breast/ })).toHaveCount(0);

    await categoryFilter.selectOption('all');
    await statusFilter.selectOption('all');
    await sortControl.selectOption('name-asc');
    await expect(page.getByRole('row', { name: /Chicken Breast/ })).toBeVisible();
  });

  test('admin dashboard and tabs fetch, refetch, and render resource data', async ({ page }) => {
    await page.goto(adminPath('/admin'));
    await expect(page.getByRole('button', { name: 'Open Dashboard' })).toBeVisible();
    await expect(page.getByText('Demo Cook')).toBeVisible();
    await expect(page.getByText('Spinach Tomato Fried Rice')).toBeVisible();

    await page.getByRole('button', { name: 'Refresh' }).click();
    await expect(page.getByText('Demo Cook')).toBeVisible();

    await page.getByRole('button', { name: 'Open Users' }).click();
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
    await expect(page.getByText('trial@example.com')).toBeVisible();

    await page.getByRole('button', { name: 'Open Plans' }).click();
    await expect(page.getByRole('heading', { name: 'Subscription Plans' })).toBeVisible();
    await expect(page.getByText('Kitchen Saver')).toBeVisible();

    await page.getByRole('button', { name: 'Open Pantry' }).click();
    await expect(page.getByRole('heading', { name: 'Pantry Items' })).toBeVisible();
    await expect(page.getByText('Spinach')).toBeVisible();

    await page.getByRole('button', { name: 'Open Recipes' }).click();
    await expect(page.getByRole('heading', { name: 'Recipes' })).toBeVisible();
    await expect(page.getByText('Chicken Pantry Bowl')).toBeVisible();
  });

  test('saving fetched preferences updates without recipe preference schema errors', async ({ page }) => {
    await page.goto(userPath('/onboarding'));
    await expect(page.getByRole('heading', { name: 'Diet, Allergies & Cooking Style' })).toBeVisible();

    await page.getByRole('button', { name: 'Halal' }).click();
    await expect(page.getByText('Review and save your changes.')).toBeVisible();
    await page.getByRole('button', { name: 'Complete Onboarding' }).click();
    await confirmModal(page, 'Complete');

    await expect(page.getByRole('alertdialog')).toContainText('Onboarding complete');
    await expect(page.getByRole('alertdialog')).not.toContainText('recipe_preferences');
    await closeFeedback(page, 'Open Pantry');
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.getByText('Save failed')).toHaveCount(0);
  });
});
