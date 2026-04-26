import path from 'node:path';
import { expect, test } from '@playwright/test';

const fieldSvgPath = path.resolve(process.cwd(), 'testdata/foosball_table_p4p_field.svg');
const playerSvgPath = path.resolve(process.cwd(), 'testdata/foosball_table_player.svg');

async function expectPreviewContained(locator: ReturnType<typeof test.extend> extends never ? never : any) {
  const metrics = await locator.evaluate((element: HTMLElement) => {
    const previewBox = element.getBoundingClientRect();
    const shapes = Array.from(element.querySelectorAll('svg rect, svg circle, svg path, svg ellipse, svg polygon, svg polyline, svg line'));
    const visibleCount = shapes.filter((shape) => {
      const rect = (shape as SVGGraphicsElement).getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.right > previewBox.left && rect.left < previewBox.right && rect.bottom > previewBox.top && rect.top < previewBox.bottom;
    }).length;

    return {
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      visibleCount,
    };
  });

  expect(metrics.visibleCount).toBeGreaterThan(0);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
}

async function expectPreviewFitsAboveFooter(page: import('@playwright/test').Page, previewTestId: string) {
  const layout = await page.evaluate((testId) => {
    const preview = document.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
    const footer = document.querySelector('.foosboard-config-footer') as HTMLElement | null;

    return {
      previewBottom: preview?.getBoundingClientRect().bottom ?? 0,
      footerTop: footer?.getBoundingClientRect().top ?? 0,
    };
  }, previewTestId);

  expect(layout.previewBottom).toBeLessThanOrEqual(layout.footerTop);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
});

test('renders the modern tactics board with legacy dimensions', async ({ page }) => {
  await expect(page.getByText('Foosboard')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Foosboard Steuerung' })).toContainText(/Vorlage 610 x 634/);
  await expect(page.getByTestId('board-svg')).toHaveAttribute('viewBox', /0 0 610 634\.706/);
});

test('supports tactical interactions for lines and toggles', async ({ page }) => {
  const trayBall = page.getByTestId('ball-tray-left').locator('circle').first();
  const trayBox = await trayBall.boundingBox();
  const boardBox = await page.getByTestId('board-svg').boundingBox();

  if (!trayBox || !boardBox) {
    throw new Error('Could not determine tray or board geometry');
  }

  const trayCenter = {
    x: trayBox.x + trayBox.width / 2,
    y: trayBox.y + trayBox.height / 2,
  };
  const boardCenter = {
    x: boardBox.x + boardBox.width / 2,
    y: boardBox.y + boardBox.height / 2,
  };

  await page.mouse.move(trayCenter.x, trayCenter.y);
  await page.mouse.down();
  await page.mouse.move(boardCenter.x, boardCenter.y);
  await page.mouse.up();

  const placedBall = page.locator('[data-testid^="ball-hitbox-"]').first();
  await expect(placedBall).toBeVisible();

  const placedBallBox = await placedBall.boundingBox();
  if (!placedBallBox) {
    throw new Error('Placed ball not found');
  }

  await page.mouse.move(placedBallBox.x + placedBallBox.width / 2, placedBallBox.y + placedBallBox.height / 2);
  await page.mouse.down();
  await page.mouse.up();

  const drawer = page.getByTestId('shot-drawer');
  await expect(drawer).toBeVisible();

  await page.getByText('Schuss', { exact: true }).dispatchEvent('click');
  await drawer.getByRole('tab', { name: '5 Torpositionen' }).click();
  await drawer.getByRole('button', { name: 'Mitte rechts' }).click();
  await expect(drawer.getByRole('button', { name: /Schuss 1/ })).toBeVisible();

  await drawer.getByRole('button', { name: 'Neuer Schuss' }).click();
  await page.getByText('Pass', { exact: true }).dispatchEvent('click');
  await drawer.getByRole('button', { name: 'Mitte', exact: true }).click();
  await expect(drawer.getByRole('button', { name: /Pass 2/ })).toBeVisible();

  await page.getByText('Kippen').first().dispatchEvent('click');
  await expect(page.getByText(/front|back/i).first()).toBeVisible();
});

test('headed: shows the shot context menu after clicking a board ball', async ({ page }) => {
  const trayBall = page.getByTestId('ball-tray-left').locator('circle').first();
  const trayBox = await trayBall.boundingBox();
  const boardBox = await page.getByTestId('board-svg').boundingBox();

  if (!trayBox || !boardBox) {
    throw new Error('Could not determine tray or board geometry');
  }

  const trayCenter = {
    x: trayBox.x + trayBox.width / 2,
    y: trayBox.y + trayBox.height / 2,
  };
  const boardCenter = {
    x: boardBox.x + boardBox.width / 2,
    y: boardBox.y + boardBox.height / 2,
  };

  await page.mouse.move(trayCenter.x, trayCenter.y);
  await page.mouse.down();
  await page.mouse.move(boardCenter.x, boardCenter.y);
  await page.mouse.up();

  const placedBall = page.locator('[data-testid^="ball-hitbox-"]').first();
  await expect(placedBall).toBeVisible();

  const placedBallBox = await placedBall.boundingBox();
  if (!placedBallBox) {
    throw new Error('Placed ball not found');
  }

  await page.mouse.move(placedBallBox.x + placedBallBox.width / 2, placedBallBox.y + placedBallBox.height / 2);
  await page.mouse.down();
  await page.mouse.up();

  const drawer = page.getByTestId('shot-drawer');
  await expect(drawer).toBeVisible();

  await drawer.getByRole('tab', { name: '5 Torpositionen' }).click();
  await drawer.getByRole('button', { name: 'Bande unten' }).click();
  await drawer.getByRole('button', { name: 'Aus', exact: true }).click();
  await drawer.getByRole('button', { name: 'Mitte rechts' }).click();

  await expect(drawer.getByRole('button', { name: /Schuss 1/ })).toBeVisible();
  await expect(page.locator('[data-shot-style="bank-bottom"] path')).toHaveCount(1);
});

test('saves and shares snapshots', async ({ page }) => {
  await page.getByLabel('Snapshot-Name').fill('Regression Szene', { force: true });
  await page.getByText('Speichern').dispatchEvent('click');
  await expect(page.getByText('Regression Szene')).toHaveCount(1);

  await page.getByText('Teilen').dispatchEvent('click');
  await expect(page).toHaveURL(/scene=/);
  await expect(page.getByLabel('Share-Link')).toHaveValue(/scene=/);
});

test('shows the field preview perfectly inside the frame', async ({ page }) => {
  await page.getByLabel('Tischauswahl öffnen').click();
  await page.getByText('Tische konfigurieren').click();

  const canvas = page.getByTestId('field-preview-canvas');
  const window = page.getByTestId('field-preview-window');

  await expect(canvas).toBeVisible();
  await expect(window).toBeVisible();

  const canvasAspectRatio = await canvas.evaluate((element) => (element as HTMLElement).style.aspectRatio);
  const windowLayout = await window.evaluate((element) => ({
    left: parseFloat((element as HTMLElement).style.left),
    top: parseFloat((element as HTMLElement).style.top),
    width: parseFloat((element as HTMLElement).style.width),
    height: parseFloat((element as HTMLElement).style.height),
  }));

  expect(canvasAspectRatio).toContain('/');
  expect(windowLayout.left).toBeCloseTo(7.142857142857142, 2);
  expect(windowLayout.top).toBeCloseTo(11.363636363636363, 2);
  expect(windowLayout.width).toBeCloseTo(85.71428571428571, 2);
  expect(windowLayout.height).toBeCloseTo(77.27272727272727, 2);
});

test('creates a table configuration from SVG test data and keeps previews contained in steps 1 to 3', async ({ page }) => {
  await page.getByLabel('Tischauswahl öffnen').click();
  await page.getByText('Tische konfigurieren').click();

  const fieldCanvas = page.getByTestId('field-preview-canvas');
  const fieldWindow = page.getByTestId('field-preview-window');

  await expect(fieldCanvas).toBeVisible();
  await expectPreviewFitsAboveFooter(page, 'field-preview-canvas');

  await page.locator('[data-testid="field-upload"] input[type="file"]').setInputFiles(fieldSvgPath);

  await expect(fieldWindow.locator('svg')).toBeVisible();
  await expectPreviewContained(fieldCanvas);
  await expectPreviewFitsAboveFooter(page, 'field-preview-canvas');

  const fieldScaling = await page.evaluate(() => {
    const windowElement = document.querySelector('[data-testid="field-preview-window"]') as HTMLElement | null;
    const fieldSvg = windowElement?.querySelector('svg') as SVGSVGElement | null;
    const frame = document.querySelector('[data-testid="field-preview-frame"]') as SVGGraphicsElement | null;
    const windowRect = windowElement?.getBoundingClientRect();
    const svgRect = fieldSvg?.getBoundingClientRect();
    const frameRect = frame?.getBoundingClientRect();

    return {
      preserveAspectRatio: fieldSvg?.getAttribute('preserveAspectRatio') || '',
      fillsWidth: svgRect ? Math.abs(svgRect.width - Math.max(windowRect?.width || 0, 0)) <= 2 : false,
      fillsHeight: svgRect ? Math.abs(svgRect.height - Math.max(windowRect?.height || 0, 0)) <= 2 : false,
      frameRatio: frameRect ? frameRect.width / Math.max(frameRect.height, 1) : 0,
    };
  });

  expect(fieldScaling.preserveAspectRatio).toMatch(/meet/i);
  expect(fieldScaling.fillsWidth || fieldScaling.fillsHeight).toBeTruthy();
  expect(fieldScaling.frameRatio).toBeCloseTo(120 / 68, 1);

  await page.getByRole('button', { name: /weiter/i }).click();

  const rodCanvas = page.getByTestId('rod-preview-canvas');
  await expect(rodCanvas).toBeVisible();
  await expect(page.getByLabel('Stangenvorschau')).toBeVisible();
  await expectPreviewContained(rodCanvas);
  await expectPreviewFitsAboveFooter(page, 'rod-preview-canvas');

  const rodPreviewMetrics = await page.getByLabel('Stangenvorschau').evaluate((svg) => {
    const rodGroups = Array.from(svg.querySelectorAll('g[data-row-key]')).map((group) => {
      const gripRect = group.querySelector('rect[fill="url(#gripGradient)"]') as SVGRectElement | null;
      const rodBody = group.querySelector('rect[data-rod-body="true"]') as SVGRectElement | null;

      return {
        team: group.getAttribute('data-team') || '',
        gripHeight: Number(gripRect?.getAttribute('height') || 0),
        gripY: Number(gripRect?.getAttribute('y') || 0),
        rodTop: Number(rodBody?.getAttribute('y') || 0),
        rodBottom: Number(rodBody ? Number(rodBody.getAttribute('y') || 0) + Number(rodBody.getAttribute('height') || 0) : 0),
      };
    });

    return {
      previewHeight: svg.getBoundingClientRect().height,
      gripHeights: rodGroups.map((group) => group.gripHeight),
      topGripMaxDelta: Math.max(...rodGroups.filter((group) => group.team === 'player2').map((group) => Math.abs(group.gripY - group.rodTop)), 0),
      bottomGripMaxDelta: Math.max(...rodGroups.filter((group) => group.team === 'player1').map((group) => Math.abs(group.gripY + group.gripHeight - group.rodBottom)), 0),
    };
  });

  expect(rodPreviewMetrics.previewHeight).toBeGreaterThan(220);
  expect(rodPreviewMetrics.gripHeights.length).toBeGreaterThan(0);
  expect(rodPreviewMetrics.gripHeights.every((height) => Math.abs(height - 13) < 0.2)).toBeTruthy();
  expect(rodPreviewMetrics.topGripMaxDelta).toBeLessThanOrEqual(0.5);
  expect(rodPreviewMetrics.bottomGripMaxDelta).toBeLessThanOrEqual(0.5);

  await page.getByRole('button', { name: /weiter/i }).click();

  await page.locator('[data-testid="figure-upload"] input[type="file"]').setInputFiles(playerSvgPath);

  await expect(page.getByText('Puppe unten')).toBeVisible();
  await expect(page.getByText('Puppe nach vorn')).toBeVisible();
  await expect(page.getByText('Puppe nach hinten')).toBeVisible();

  const bottomColumn = page.getByTestId('figure-column-bottom');
  const forwardColumn = page.getByTestId('figure-column-forward');
  const backwardColumn = page.getByTestId('figure-column-backward');

  await expect(bottomColumn.getByLabel('Layer')).toHaveValue(/down|unten/i);
  await expect(forwardColumn.getByLabel('Layer')).toHaveValue(/front|vorn|forward/i);
  await expect(backwardColumn.getByLabel('Layer')).toHaveValue(/back|hinten|backward/i);

  await expect(bottomColumn.getByLabel('Verbindungsgruppe')).toHaveValue(/mount/i);
  await expect(forwardColumn.getByLabel('Verbindungsgruppe')).toHaveValue(/mount/i);
  await expect(backwardColumn.getByLabel('Verbindungsgruppe')).toHaveValue(/mount/i);

  await expect(bottomColumn.getByLabel('Kollisionsgruppe')).toHaveValue(/hit/i);
  await expect(forwardColumn.getByLabel('Kollisionsgruppe')).toHaveValue(/hit/i);
  await expect(backwardColumn.getByLabel('Kollisionsgruppe')).toHaveValue(/hit/i);

  for (const previewId of ['figure-preview-bottom', 'figure-preview-forward', 'figure-preview-backward']) {
    const preview = page.getByTestId(previewId);
    await expect(preview).toBeVisible();
    await expect(preview.locator('svg')).toBeVisible();
    await expectPreviewContained(preview);
  }

  const previewHeights = await page.evaluate(() =>
    ['bottom', 'forward', 'backward'].map((id) => {
      const element = document.querySelector(`[data-testid="figure-preview-${id}"]`) as HTMLElement | null;
      return element?.getBoundingClientRect().height ?? 0;
    }),
  );

  expect(Math.max(...previewHeights) - Math.min(...previewHeights)).toBeLessThanOrEqual(1);

  const topRowAlignment = await page.evaluate(() => {
    const labels = ['Breite der Puppe', 'Ballgröße', 'Ballfarbe'];
    const tops = labels
      .map((label) => document.querySelector(`input[aria-label="${label}"]`) as HTMLElement | null)
      .filter((input): input is HTMLElement => Boolean(input))
      .map((input) => input.getBoundingClientRect().top);
    return tops;
  });

  expect(Math.max(...topRowAlignment) - Math.min(...topRowAlignment)).toBeLessThanOrEqual(20);

  const playerOneColorInput = page.getByLabel('Farbe Spieler 1');
  await playerOneColorInput.click();

  const colorUi = await playerOneColorInput.evaluate((input) => {
    const wrapper = input.closest('.mantine-InputWrapper-root');
    const preview = wrapper?.querySelector('.mantine-ColorInput-colorPreview, .mantine-ColorSwatch-root') as HTMLElement | null;
    const label = wrapper?.querySelector('.mantine-InputWrapper-label') as HTMLElement | null;
    const swatches = document.querySelectorAll('.mantine-ColorSwatch-root').length;

    if (!preview || !label) {
      return { overlaps: true, swatches };
    }

    const previewRect = preview.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const overlaps = !(previewRect.top >= labelRect.bottom || previewRect.bottom <= labelRect.top || previewRect.left >= labelRect.right || previewRect.right <= labelRect.left);

    return { overlaps, swatches };
  });

  expect(colorUi.overlaps).toBeFalsy();
  expect(colorUi.swatches).toBeGreaterThan(0);

  await page.getByRole('button', { name: /weiter/i }).click();

  const resultCanvas = page.getByTestId('result-preview-canvas');
  await expect(resultCanvas).toBeVisible();
  await expectPreviewContained(resultCanvas);
  await expect(page.getByTestId('save-table-config')).toBeVisible();
  await expect(page.getByTestId('download-json')).toBeVisible();
  await expect(page.getByText(/embedded-svg/i)).toHaveCount(0);

  const resultFigureCount = await page.locator('[data-testid="result-preview-canvas"] .foosboard-figure-svg-colorized').count();
  expect(resultFigureCount).toBeGreaterThan(0);

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('download-json').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/i);

  await page.getByTestId('save-table-config').click();
  const savedLayout = await page.evaluate(() => localStorage.getItem('foosboard.tableLayout'));
  expect(savedLayout).toContain('"manufacturer"');
});
