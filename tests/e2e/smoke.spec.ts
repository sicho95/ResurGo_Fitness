import { expect, test } from '@playwright/test';

test('creates profile and opens session', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Créer le profil/ }).click();
  await expect(page.getByRole('heading', { name: 'Aujourd’hui' })).toBeVisible();
  await page.getByRole('link', { name: /Séance/ }).click();
  await expect(page.getByText(/Lance une séance|Bird-dog|Dead bug|Course facile/)).toBeVisible();
});
