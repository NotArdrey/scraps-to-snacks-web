import { expect, test } from 'playwright/test';

const userPath = (path) => `${path}${path.includes('?') ? '&' : '?'}visualRole=user`;
const adminPath = (path) => `${path}${path.includes('?') ? '&' : '?'}visualRole=admin`;

function tableRow(page, text) {
  return page.locator('tr').filter({ hasText: text }).first();
}

async function dismissFeedback(page, buttonName = /^(OK|Close)$/) {
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: buttonName }).click();
}

async function confirmModal(page, buttonName) {
  const modal = page.locator('.confirm-modal-card').last();
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: buttonName, exact: true }).click();
}

async function addPantryItem(page, { name, quantity = '2', unit = 'pcs', category = 'Vegetables', expires = '2026-06-30' }) {
  const form = page.locator('#pantry-add-form');
  await form.getByLabel('Ingredient Name').fill(name);
  await form.getByLabel('Qty').fill(quantity);
  await form.getByLabel('Unit').selectOption(unit);
  await form.getByLabel('Category (opt)').selectOption(category);
  await form.getByLabel('Expiration (opt)').fill(expires);
  await form.getByRole('button', { name: /^Add$/ }).click();
}

async function openAdminTab(page, name) {
  await page.goto(adminPath('/admin'));
  await expect(page.getByRole('button', { name: 'Open Dashboard' })).toBeVisible();
  await page.getByRole('button', { name: `Open ${name}` }).click();
}

function adminModal(page) {
  return page.locator('.admin-form-modal-card');
}

test('user pantry supports create, read, update, and delete', async ({ page }) => {
  await page.goto(userPath('/pantry'));
  await expect(page.getByRole('heading', { name: 'Pantry', exact: true })).toBeVisible();

  await addPantryItem(page, {
    name: 'playwright apple',
    quantity: '4',
    unit: 'pcs',
    category: 'Fruits',
  });

  let row = tableRow(page, 'Playwright Apple');
  await expect(row).toBeVisible();
  await expect(row).toContainText('4 pcs');

  await row.getByLabel('Edit item').click();
  await page.getByLabel('Edit item name').fill('playwright pear');
  await page.getByLabel('Edit quantity').fill('5');
  await page.getByLabel('Edit category').selectOption('Fruits');
  await page.getByLabel('Save changes').click();
  await confirmModal(page, 'Save');
  await dismissFeedback(page);

  row = tableRow(page, 'Playwright Pear');
  await expect(row).toBeVisible();
  await expect(row).toContainText('5 pcs');

  await row.getByLabel('Remove item').click();
  await confirmModal(page, 'Remove');
  await dismissFeedback(page);
  await expect(tableRow(page, 'Playwright Pear')).toHaveCount(0);
});

test('user cookbook supports recipe create, read, update, and delete', async ({ page }) => {
  await page.goto(userPath('/pantry'));
  await expect(page.getByRole('heading', { name: 'Pantry', exact: true })).toBeVisible();

  await addPantryItem(page, {
    name: 'playwright carrot',
    quantity: '3',
    unit: 'pcs',
    category: 'Vegetables',
  });

  const pantryRow = tableRow(page, 'Playwright Carrot');
  await expect(pantryRow).toBeVisible();
  await pantryRow.getByLabel('Select Playwright Carrot').check();
  await page.getByRole('button', { name: /Generate selected \(1\)/ }).click();

  const generatedTitle = 'Playwright Carrot Pantry Recipe';
  await expect(page.getByRole('heading', { name: generatedTitle })).toBeVisible();
  await page.getByRole('button', { name: 'Save Recipe' }).click();
  await dismissFeedback(page, 'Open Cookbook');

  await expect(page.getByRole('heading', { name: 'Cookbook' })).toBeVisible();
  let card = page.locator('.cookbook-card').filter({ hasText: generatedTitle }).first();
  await expect(card).toBeVisible();

  const editedTitle = 'Playwright Carrot Supper';
  await card.locator('button[title="Edit"]').click();
  await page.getByLabel('Recipe title').fill(editedTitle);
  await page.locator('button[title="Save"]').click();
  await confirmModal(page, 'Save');
  await dismissFeedback(page);

  card = page.locator('.cookbook-card').filter({ hasText: editedTitle }).first();
  await expect(card).toBeVisible();
  await card.locator('button[title="Delete"]').click();
  await confirmModal(page, 'Delete');
  await dismissFeedback(page);
  await expect(page.locator('.cookbook-card').filter({ hasText: editedTitle })).toHaveCount(0);
});

test('admin subscription plans support create, read, update, and delete', async ({ page }) => {
  await openAdminTab(page, 'Plans');

  await page.locator('main').getByRole('button', { name: 'Add Plan' }).click();
  let modal = adminModal(page);
  await expect(modal.getByRole('heading', { name: 'Create Plan' })).toBeVisible();
  await modal.locator('input').nth(0).fill('Playwright Plan');
  await modal.locator('input').nth(1).fill('playwright_plan');
  await modal.locator('input').nth(2).fill('199.00');
  await modal.locator('input').nth(3).fill('21');
  await modal.getByRole('button', { name: 'Create' }).click();
  await dismissFeedback(page);

  let row = tableRow(page, 'Playwright Plan');
  await expect(row).toBeVisible();
  await expect(row).toContainText('playwright_plan');

  await row.getByLabel('Edit Playwright Plan').click();
  modal = adminModal(page);
  await expect(modal.getByRole('heading', { name: 'Edit Plan' })).toBeVisible();
  await modal.locator('input').nth(0).fill('Playwright Plan Plus');
  await modal.locator('input').nth(2).fill('249.00');
  await modal.getByRole('button', { name: 'Update' }).click();
  await dismissFeedback(page);

  row = tableRow(page, 'Playwright Plan Plus');
  await expect(row).toBeVisible();
  await expect(row).toContainText('249');

  await row.getByLabel('Delete Playwright Plan Plus').click();
  await confirmModal(page, 'Delete');
  await dismissFeedback(page);
  await expect(tableRow(page, 'Playwright Plan Plus')).toHaveCount(0);
});

test('admin pantry items support create, read, update, and delete', async ({ page }) => {
  await openAdminTab(page, 'Pantry');

  await page.locator('main').getByRole('button', { name: 'Add Item' }).click();
  let modal = adminModal(page);
  await expect(modal.getByRole('heading', { name: 'Add Pantry Item' })).toBeVisible();
  await modal.locator('input').nth(0).fill('Playwright Lentils');
  await modal.locator('input').nth(1).fill('8');
  await modal.locator('select').nth(1).selectOption('cups');
  await modal.locator('select').nth(2).selectOption('Grains');
  await modal.locator('input').nth(2).fill('2026-07-05');
  await modal.locator('button[type="submit"]').click();
  await dismissFeedback(page);

  let row = tableRow(page, 'Playwright Lentils');
  await expect(row).toBeVisible();
  await expect(row).toContainText('8 cups');

  await row.getByLabel('Edit Playwright Lentils').click();
  modal = adminModal(page);
  await expect(modal.getByRole('heading', { name: 'Edit Pantry Item' })).toBeVisible();
  await modal.locator('input').nth(0).fill('Playwright Lentil Mix');
  await modal.locator('input').nth(1).fill('9');
  await modal.getByRole('button', { name: 'Update' }).click();
  await dismissFeedback(page);

  row = tableRow(page, 'Playwright Lentil Mix');
  await expect(row).toBeVisible();
  await expect(row).toContainText('9 cups');

  await row.getByLabel('Delete Playwright Lentil Mix').click();
  await confirmModal(page, 'Delete');
  await dismissFeedback(page);
  await expect(tableRow(page, 'Playwright Lentil Mix')).toHaveCount(0);
});

test('admin recipes support create, read, update, and delete', async ({ page }) => {
  await openAdminTab(page, 'Recipes');

  await page.locator('main').getByRole('button', { name: 'Add Recipe' }).click();
  let modal = adminModal(page);
  await expect(modal.getByRole('heading', { name: 'Add Recipe' })).toBeVisible();
  await modal.locator('input').nth(0).fill('Playwright Soup');
  await modal.locator('input').nth(1).fill('2 cups lentils');
  await modal.locator('textarea').nth(0).fill('Simmer everything until tender.');
  await modal.locator('button[type="submit"]').click();
  await dismissFeedback(page);

  let row = tableRow(page, 'Playwright Soup');
  await expect(row).toBeVisible();
  await expect(row).toContainText('1 ingredients / 1 steps');

  await row.getByLabel('Edit Playwright Soup').click();
  modal = adminModal(page);
  await expect(modal.getByRole('heading', { name: 'Edit Recipe' })).toBeVisible();
  await modal.locator('input').nth(0).fill('Playwright Soup Deluxe');
  await modal.locator('textarea').nth(0).fill('Simmer, season, and serve warm.');
  await modal.getByRole('button', { name: 'Update' }).click();
  await dismissFeedback(page);

  row = tableRow(page, 'Playwright Soup Deluxe');
  await expect(row).toBeVisible();
  await row.getByLabel('Delete Playwright Soup Deluxe').click();
  await confirmModal(page, 'Delete');
  await dismissFeedback(page);
  await expect(tableRow(page, 'Playwright Soup Deluxe')).toHaveCount(0);
});

test('admin users support read, update, and delete management actions', async ({ page }) => {
  await openAdminTab(page, 'Users');

  let row = tableRow(page, 'trial@example.com');
  await expect(row).toBeVisible();
  await row.getByLabel('Edit trial@example.com').click();

  const modal = adminModal(page);
  await expect(modal.getByRole('heading', { name: 'Edit User' })).toBeVisible();
  await modal.locator('select').nth(0).selectOption('admin');
  await modal.getByRole('button', { name: 'Update' }).click();
  await dismissFeedback(page);

  row = tableRow(page, 'trial@example.com');
  await expect(row).toContainText('admin');

  await row.getByLabel('Delete trial@example.com').click();
  await confirmModal(page, 'Delete');
  await dismissFeedback(page);
  await expect(tableRow(page, 'trial@example.com')).toHaveCount(0);
});
