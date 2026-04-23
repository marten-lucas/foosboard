import { expect, test } from '@playwright/test';

function getNodeOrder(page: import('@playwright/test').Page, selectorA: string, selectorB: string) {
  return page.evaluate(({ firstSelector, secondSelector }) => {
    const first = document.querySelector(firstSelector);
    const second = document.querySelector(secondSelector);

    if (!first || !second) {
      throw new Error(`Missing nodes for ${firstSelector} or ${secondSelector}`);
    }

    return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
  }, { firstSelector: selectorA, secondSelector: selectorB });
}

test('goal visuals render above the frame in board and previews', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
  await page.goto('/');

  const boardGoalAfterFrame = await getNodeOrder(page, '[data-testid="board-frame"]', '[data-goal-pocket="true"]');
  expect(boardGoalAfterFrame).toBeTruthy();

  await page.getByLabel('Tischauswahl öffnen').click();
  await page.getByText('Tische konfigurieren').click();

  const fieldGoalAfterFrame = await getNodeOrder(page, '[data-testid="field-preview-frame"]', '[data-testid="field-preview-canvas"] [data-goal-pocket="true"]');
  expect(fieldGoalAfterFrame).toBeTruthy();

  await page.getByRole('button', { name: /weiter/i }).click();

  const rodGoalAfterFrame = await getNodeOrder(page, '[data-testid="rod-preview-canvas-frame"]', '[data-testid="rod-preview-canvas"] [data-goal-pocket="true"]');
  expect(rodGoalAfterFrame).toBeTruthy();
});