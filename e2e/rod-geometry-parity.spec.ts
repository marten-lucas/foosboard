import { expect, test } from '@playwright/test';

type RowKey = 'goalkeeper' | 'defense' | 'midfield' | 'offense';

type RodRenderInfo = {
  rowKey: RowKey;
  rodLengthCm: number;
  extension: number;
  renderedHeight: number;
};

async function readRodsFromCanvas(
  page: import('@playwright/test').Page,
  canvasTestId: 'result-preview-canvas' | 'board-svg',
): Promise<Record<RowKey, RodRenderInfo>> {
  const selector = canvasTestId === 'board-svg'
    ? '[data-testid="board-svg"] [data-row-key][data-rod-length-cm]'
    : '[data-testid="result-preview-canvas"] [data-row-key][data-rod-length-cm]';

  const rows = await page.evaluate((sel) => {
    const rowOrder = ['goalkeeper', 'defense', 'midfield', 'offense'] as const;
    const buckets: Record<string, Array<{ rodLengthCm: number; extension: number; renderedHeight: number }>> = {};

    const groups = Array.from(document.querySelectorAll(sel));
    for (const group of groups) {
      const rowKey = group.getAttribute('data-row-key');
      const rodLengthCm = Number(group.getAttribute('data-rod-length-cm') || '0');
      const extension = Number(group.getAttribute('data-rod-extension') || '0');
      const body = group.querySelector('rect[data-rod-body="true"]') as SVGRectElement | null;
      const renderedHeight = Number(body?.getAttribute('height') || '0');

      if (!rowKey || !Number.isFinite(rodLengthCm) || !Number.isFinite(extension) || !Number.isFinite(renderedHeight)) {
        continue;
      }

      if (!buckets[rowKey]) {
        buckets[rowKey] = [];
      }

      buckets[rowKey].push({ rodLengthCm, extension, renderedHeight });
    }

    const collapsed: Record<string, { rodLengthCm: number; extension: number; renderedHeight: number }> = {};
    for (const rowKey of rowOrder) {
      const values = buckets[rowKey] || [];
      if (values.length === 0) {
        continue;
      }

      const first = values[0];
      const avgHeight = values.reduce((sum, value) => sum + value.renderedHeight, 0) / values.length;
      const avgExtension = values.reduce((sum, value) => sum + value.extension, 0) / values.length;

      collapsed[rowKey] = {
        rodLengthCm: first.rodLengthCm,
        extension: avgExtension,
        renderedHeight: avgHeight,
      };
    }

    return collapsed;
  }, selector);

  return rows as Record<RowKey, RodRenderInfo>;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
});

test('Result-Preview und Live-Board zeigen dieselben, klar unterschiedlichen Stangenlängen', async ({ page }) => {
  await page.getByLabel('Tischauswahl öffnen').click();
  await page.getByText('Ullrich P4P').click();
  await expect(page.getByText(/Tischkonfiguration/i)).toBeVisible();

  await page.getByRole('button', { name: /weiter/i }).click();
  await page.getByRole('button', { name: /weiter/i }).click();
  await page.getByRole('button', { name: /weiter/i }).click();
  await expect(page.getByTestId('result-preview-canvas')).toBeVisible();

  const previewRows = await readRodsFromCanvas(page, 'result-preview-canvas');
  const boardRows = await readRodsFromCanvas(page, 'board-svg');

  const rowKeys: RowKey[] = ['goalkeeper', 'defense', 'midfield', 'offense'];
  for (const rowKey of rowKeys) {
    expect(previewRows[rowKey], `Preview: fehlende Reihe ${rowKey}`).toBeTruthy();
    expect(boardRows[rowKey], `Board: fehlende Reihe ${rowKey}`).toBeTruthy();
    expect(previewRows[rowKey].renderedHeight, `Preview-Höhe für ${rowKey} muss > 0 sein`).toBeGreaterThan(0);
    expect(boardRows[rowKey].renderedHeight, `Board-Höhe für ${rowKey} muss > 0 sein`).toBeGreaterThan(0);
  }

  const expectedLengthByRow: Record<RowKey, number> = {
    goalkeeper: 109,
    defense: 128.5,
    midfield: 104.1,
    offense: 117,
  };

  for (const rowKey of rowKeys) {
    expect(previewRows[rowKey].rodLengthCm).toBeCloseTo(expectedLengthByRow[rowKey], 3);
    expect(boardRows[rowKey].rodLengthCm).toBeCloseTo(expectedLengthByRow[rowKey], 3);
  }

  const longestRow: RowKey = 'defense';
  const shortestRow: RowKey = 'midfield';
  const previewHeightDelta = previewRows[longestRow].renderedHeight - previewRows[shortestRow].renderedHeight;
  const boardHeightDelta = boardRows[longestRow].renderedHeight - boardRows[shortestRow].renderedHeight;
  expect(previewHeightDelta, 'Preview zeigt Längenunterschiede nicht klar genug').toBeGreaterThan(20);
  expect(boardHeightDelta, 'Board zeigt Längenunterschiede nicht klar genug').toBeGreaterThan(40);

  const previewReferenceHeight = previewRows[longestRow].renderedHeight;
  const boardReferenceHeight = boardRows[longestRow].renderedHeight;

  for (const rowKey of rowKeys) {
    const previewRatio = previewRows[rowKey].renderedHeight / Math.max(previewReferenceHeight, 1e-6);
    const boardRatio = boardRows[rowKey].renderedHeight / Math.max(boardReferenceHeight, 1e-6);
    const parityDelta = Math.abs(previewRatio - boardRatio);

    expect(
      parityDelta,
      `${rowKey}: Längenverhältnis weicht zwischen Preview (${previewRatio.toFixed(4)}) und Board (${boardRatio.toFixed(4)}) zu stark ab`,
    ).toBeLessThanOrEqual(0.002);
  }
});
