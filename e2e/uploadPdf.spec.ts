import { test, expect } from '@playwright/test';
import path from 'path';

test('should generate flujograma', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  // Upload a sample PDF
  const filePath = path.resolve(__dirname, 'fixtures/sample1.pdf');
  const uploadInput = page.locator('input[type="file"]');
  await uploadInput.setInputFiles(filePath);

  // Click "Generar flujograma"
  const generateBtn = page.locator('button', { hasText: 'Generar flujograma' });
  await generateBtn.click();

  const statusMessageOk = page.getByRole('listitem').getByText('Flujograma generado. Revisa tu descarga.');
  await expect(statusMessageOk).toBeVisible();

  const statusMessageMissing = page.getByRole('listitem').getByText('selecciona al menos un archivo');
  await expect(statusMessageMissing).not.toBeVisible();
});

test('should handle submit with no files uploaded', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  // Click "Generar flujograma" without uploading a file
  const generateBtn = page.locator('button', { hasText: 'Generar flujograma' });
  await generateBtn.click();

  const statusMessageMissing = page.getByRole('listitem').getByText('selecciona al menos un archivo');
  await expect(statusMessageMissing).toBeVisible();

  const statusMessageOk = page.getByRole('listitem').getByText('Flujograma generado. Revisa tu descarga.');
  await expect(statusMessageOk).not.toBeVisible();
});