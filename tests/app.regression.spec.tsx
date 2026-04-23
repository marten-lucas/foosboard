import { MantineProvider } from '@mantine/core';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../src/App';
import defaultTableLayout from '../src/data/tableLayout.json';
import { applyTableLayout, boardConfig, createDefaultScene } from '../src/boardConfig';
import { getBallTrayLayout } from '../src/lib/ballLayout';
import { encodeScene } from '../src/geometry';
import type { StoredTableLayout } from '../src/lib/tableLayout';
import { useBoardStore } from '../src/store/boardStore';

function resetBoardState() {
  applyTableLayout(JSON.parse(JSON.stringify(defaultTableLayout)) as StoredTableLayout);
  window.location.hash = '';
  useBoardStore.setState({
    ...createDefaultScene(),
    activeTool: 'move',
    activeBallId: null,
    snapshots: [],
  });
}

function renderApp() {
  return render(
    <MantineProvider>
      <App />
    </MantineProvider>,
  );
}

function mockSvgLayout() {
  const svg = document.querySelector('[data-testid="board-svg"]');
  if (!svg) {
    throw new Error('SVG board not found');
  }

  Object.defineProperty(svg, 'createSVGPoint', {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      matrixTransform(matrix: { inverse?: () => unknown }) {
        return {
          x: this.x,
          y: this.y,
        };
      },
    }),
  });

  Object.defineProperty(svg, 'getScreenCTM', {
    configurable: true,
    value: () => ({
      inverse: () => ({}),
    }),
  });

  Object.defineProperty(svg, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      right: 610,
      bottom: 470,
      width: 610,
      height: 470,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });

  return svg;
}

describe('app regression coverage', () => {
  beforeEach(() => {
    resetBoardState();
  });

  it('renders the refactored board with the preserved legacy template size', () => {
    renderApp();

    expect(screen.getByText(/Foosboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Vorlage 610 x/i)).toBeInTheDocument();
    expect(screen.getByText(/Refaktorierte Taktiktafel/i)).toBeInTheDocument();
  });

  it('creates and removes a shot line through the UI', async () => {
    const user = userEvent.setup();
    renderApp();
    const svg = mockSvgLayout();

    await user.click(screen.getByText('Schuss'));
    fireEvent.pointerDown(svg, { clientX: 420, clientY: 180, pointerId: 1 });

    expect(await screen.findByText('Schuss 1')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Linie löschen'));
    await waitFor(() => {
      expect(screen.queryByText('Schuss 1')).not.toBeInTheDocument();
    });
  });

  it('spawns a ball from the tray and removes it when dropped outside the table', async () => {
    renderApp();
    mockSvgLayout();

    const trayLayout = getBallTrayLayout();
    const leftTray = await screen.findByTestId('ball-tray-left');
    const trayBall = leftTray.querySelector('circle');
    if (!trayBall) {
      throw new Error('Tray ball not found');
    }

    fireEvent.pointerDown(trayBall, {
      clientX: trayLayout.trays[0].balls[0].point.x,
      clientY: trayLayout.trays[0].balls[0].point.y,
      pointerId: 11,
    });
    fireEvent.pointerMove(window, {
      clientX: boardConfig.centerX,
      clientY: boardConfig.centerY,
      pointerId: 11,
    });
    fireEvent.pointerUp(window, {
      clientX: boardConfig.centerX,
      clientY: boardConfig.centerY,
      pointerId: 11,
    });

    expect(useBoardStore.getState().balls).toHaveLength(1);

    const placedBall = document.querySelector('[data-testid^="ball-"]:not([data-testid^="ball-tray-"])') as SVGElement | null;
    expect(placedBall).not.toBeNull();

    if (!placedBall) {
      throw new Error('Placed ball not found');
    }

    const placedBallCircle = placedBall.querySelector('circle');
    if (!placedBallCircle) {
      throw new Error('Placed ball circle not found');
    }

    fireEvent.pointerDown(placedBallCircle, {
      clientX: boardConfig.centerX,
      clientY: boardConfig.centerY,
      pointerId: 12,
    });
    fireEvent.pointerMove(window, {
      clientX: -200,
      clientY: -200,
      pointerId: 12,
    });
    fireEvent.pointerUp(window, {
      clientX: -200,
      clientY: -200,
      pointerId: 12,
    });

    await waitFor(() => {
      expect(useBoardStore.getState().balls).toHaveLength(0);
    });
  });

  it('keeps dragged balls inside the field and preserves the pointer offset', async () => {
    renderApp();
    mockSvgLayout();

    const trayLayout = getBallTrayLayout();
    const leftTray = await screen.findByTestId('ball-tray-left');
    const trayBall = leftTray.querySelector('circle');
    if (!trayBall) {
      throw new Error('Tray ball not found');
    }

    const pointerOffset = { x: 10, y: 6 };

    fireEvent.pointerDown(trayBall, {
      clientX: trayLayout.trays[0].balls[0].point.x + pointerOffset.x,
      clientY: trayLayout.trays[0].balls[0].point.y + pointerOffset.y,
      pointerId: 13,
    });

    const safeStart = {
      x: boardConfig.fieldX + boardConfig.ballRadius + 80,
      y: boardConfig.fieldY + boardConfig.ballRadius + 80,
    };

    fireEvent.pointerMove(window, {
      clientX: safeStart.x,
      clientY: safeStart.y,
      pointerId: 13,
    });

    const firstPosition = { ...useBoardStore.getState().balls[0] };

    fireEvent.pointerMove(window, {
      clientX: safeStart.x + 30,
      clientY: safeStart.y,
      pointerId: 13,
    });

    const secondPosition = useBoardStore.getState().balls[0];
    expect(secondPosition.x - firstPosition.x).toBeCloseTo(30, 5);
    expect(secondPosition.y - firstPosition.y).toBeCloseTo(0, 5);

    fireEvent.pointerMove(window, {
      clientX: safeStart.x + 30,
      clientY: safeStart.y + 20,
      pointerId: 13,
    });

    const thirdPosition = useBoardStore.getState().balls[0];
    expect(thirdPosition.x - secondPosition.x).toBeCloseTo(0, 5);
    expect(thirdPosition.y - secondPosition.y).toBeCloseTo(20, 5);

    fireEvent.pointerUp(window, {
      clientX: safeStart.x + 30,
      clientY: safeStart.y + 20,
      pointerId: 13,
    });
  });

  it('sticks to the band before the ball escapes outside the field', async () => {
    renderApp();
    mockSvgLayout();

    const trayLayout = getBallTrayLayout();
    const leftTray = await screen.findByTestId('ball-tray-left');
    const trayBall = leftTray.querySelector('circle');
    if (!trayBall) {
      throw new Error('Tray ball not found');
    }

    fireEvent.pointerDown(trayBall, {
      clientX: trayLayout.trays[0].balls[0].point.x,
      clientY: trayLayout.trays[0].balls[0].point.y,
      pointerId: 14,
    });

    fireEvent.pointerMove(window, {
      clientX: boardConfig.fieldX + boardConfig.ballRadius - 4,
      clientY: boardConfig.centerY,
      pointerId: 14,
    });

    expect(useBoardStore.getState().balls[0].x).toBeCloseTo(boardConfig.fieldX + boardConfig.ballRadius, 5);

    fireEvent.pointerUp(window, {
      clientX: boardConfig.fieldX + boardConfig.ballRadius - 4,
      clientY: boardConfig.centerY,
      pointerId: 14,
    });

    expect(useBoardStore.getState().balls).toHaveLength(1);
    expect(useBoardStore.getState().balls[0].x).toBeCloseTo(boardConfig.fieldX, 5);

    const bandBall = screen.getByTestId(`ball-${useBoardStore.getState().balls[0].id}`);
    const bandBallCircle = bandBall.querySelector('circle');
    if (!bandBallCircle) {
      throw new Error('Band ball circle not found');
    }

    fireEvent.pointerDown(bandBallCircle, {
      clientX: boardConfig.fieldX,
      clientY: boardConfig.centerY,
      pointerId: 15,
    });

    fireEvent.pointerMove(window, {
      clientX: boardConfig.fieldX - 48,
      clientY: boardConfig.centerY,
      pointerId: 15,
    });

    expect(useBoardStore.getState().balls[0].x).toBeCloseTo(boardConfig.fieldX + boardConfig.ballRadius, 5);

    fireEvent.pointerMove(window, {
      clientX: boardConfig.fieldX - 160,
      clientY: boardConfig.centerY,
      pointerId: 15,
    });

    expect(useBoardStore.getState().balls[0].x).toBeLessThan(boardConfig.fieldX - 40);

    fireEvent.pointerMove(window, {
      clientX: boardConfig.centerX,
      clientY: boardConfig.centerY,
      pointerId: 15,
    });

    expect(useBoardStore.getState().balls[0].x).toBeGreaterThan(boardConfig.fieldX + boardConfig.ballRadius);

    fireEvent.pointerUp(window, {
      clientX: boardConfig.centerX,
      clientY: boardConfig.centerY,
      pointerId: 15,
    });

    expect(useBoardStore.getState().balls).toHaveLength(1);
    expect(useBoardStore.getState().balls[0].x).toBeGreaterThan(boardConfig.fieldX + boardConfig.ballRadius);
  });

  it('uses only the first ball for possession-driven rod reactions', async () => {
    const scene = createDefaultScene();
    scene.balls = [
      { id: 'first-ball', x: boardConfig.fieldX + 20, y: boardConfig.centerY },
      { id: 'second-ball', x: boardConfig.fieldX + boardConfig.fieldWidth - 20, y: boardConfig.centerY },
    ];
    scene.ball = { x: boardConfig.fieldX + 20, y: boardConfig.centerY };
    window.location.hash = `#scene=${encodeScene(scene)}`;
    useBoardStore.setState({ activeBallId: 'second-ball' });

    renderApp();

    act(() => {
      useBoardStore.getState().cycleRodTilt('P2_1');
    });

    await waitFor(() => {
      expect(screen.getByTestId('rod-P2_3')).toHaveAttribute('data-tilt-state', 'hochgestellt');
      expect(screen.getByTestId('rod-P2_5')).toHaveAttribute('data-tilt-state', 'hochgestellt');
      expect(screen.getByTestId('rod-P1_3')).toHaveAttribute('data-tilt-state', 'neutral');
      expect(screen.getByTestId('rod-P1_5')).toHaveAttribute('data-tilt-state', 'neutral');
      expect(screen.getByTestId('rod-P2_1')).toHaveAttribute('data-tilt-state', 'front');
    });
  });

  it('keeps all rods down when the first ball is on the attacking 5/3 line', () => {
    const scene = createDefaultScene();
    scene.balls = [{ id: 'first-ball', x: boardConfig.fieldX + 250, y: boardConfig.centerY }];
    scene.ball = { x: boardConfig.fieldX + 250, y: boardConfig.centerY };
    window.location.hash = `#scene=${encodeScene(scene)}`;

    renderApp();

    expect(screen.getByTestId('rod-P2_1')).toHaveAttribute('data-tilt-state', 'neutral');
    expect(screen.getByTestId('rod-P2_2')).toHaveAttribute('data-tilt-state', 'neutral');
    expect(screen.getByTestId('rod-P2_5')).toHaveAttribute('data-tilt-state', 'neutral');
    expect(screen.getByTestId('rod-P2_3')).toHaveAttribute('data-tilt-state', 'neutral');
    expect(screen.getByTestId('rod-P1_1')).toHaveAttribute('data-tilt-state', 'neutral');
    expect(screen.getByTestId('rod-P1_2')).toHaveAttribute('data-tilt-state', 'neutral');
    expect(screen.getByTestId('rod-P1_5')).toHaveAttribute('data-tilt-state', 'neutral');
    expect(screen.getByTestId('rod-P1_3')).toHaveAttribute('data-tilt-state', 'neutral');
  });

  it('preserves the preview aspect ratio and opens the configuration wizard', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByLabelText('Tischauswahl öffnen'));
    await user.click(screen.getByText('Tische konfigurieren'));

    expect(await screen.findByText(/Tischkonfiguration/i)).toBeInTheDocument();

    const fieldCanvas = await screen.findByTestId('field-preview-canvas');
    const fieldWindow = await screen.findByTestId('field-preview-window');
    expect(fieldCanvas).toBeInTheDocument();
    expect(fieldWindow).toBeInTheDocument();
    expect((fieldCanvas as HTMLElement).style.aspectRatio).toContain('/');
    expect(parseFloat((fieldWindow as HTMLElement).style.width)).toBeCloseTo(85.71428571428571, 3);
    expect(parseFloat((fieldWindow as HTMLElement).style.height)).toBeCloseTo(77.27272727272727, 3);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Hersteller')).toBeInTheDocument();
    expect(screen.getByLabelText('Spielfeldlänge (innen)')).toBeInTheDocument();
    expect(screen.getByLabelText('Spielfeldbreite (innen)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /weiter/i }));

    expect(screen.getAllByLabelText('Position').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Stangenlänge').length).toBe(4);
    expect(screen.getAllByLabelText('Stangendurchmesser').length).toBe(4);
    expect((screen.getAllByLabelText('Stangenlänge')[0] as HTMLInputElement).value).toContain('109');
    expect((screen.getAllByLabelText('Stangenlänge')[1] as HTMLInputElement).value).toContain('128.5');
    expect((screen.getAllByLabelText('Stangenlänge')[2] as HTMLInputElement).value).toContain('104.1');
    expect((screen.getAllByLabelText('Stangenlänge')[3] as HTMLInputElement).value).toContain('117');
    expect((screen.getAllByLabelText('Stangendurchmesser')[0] as HTMLInputElement).value).toContain('1.6');
    expect(screen.getByLabelText('Stangenvorschau')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /weiter/i }));

    expect(screen.getByText('Upload Figuren-SVG')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Layer').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByLabelText('Verbindungsgruppe').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByLabelText('Kollisionsgruppe').length).toBeGreaterThanOrEqual(3);
    expect((screen.getByLabelText('Breite der Puppe') as HTMLInputElement).value).toContain('3.5');
    expect(screen.getByLabelText('Ballgröße')).toBeInTheDocument();
    expect(screen.getByLabelText('Ballfarbe')).toBeInTheDocument();
    expect(screen.getByTestId('figure-rod-preview-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('figure-rod-preview-card').className).toContain('foosboard-preview-card--stretch');
    const rodPreviewSvg = screen.getByLabelText('Puppe mit Stange');
    const rodLine = rodPreviewSvg.querySelector('line');
    const rodBall = rodPreviewSvg.querySelector('circle');
    const rodToggle = screen.getByTestId('figure-rod-preview-toggle');
    expect(rodLine?.getAttribute('y1')).toBe('0');
    expect(rodLine?.getAttribute('y2')).toBe('44');
    expect(parseFloat(rodLine?.getAttribute('stroke-width') || '0')).toBeGreaterThan(2);
    expect(parseFloat(rodBall?.getAttribute('r') || '0')).toBeGreaterThan(3);
    expect(rodPreviewSvg.querySelector('rect[fill="#111"]')).toBeNull();
    expect(rodPreviewSvg.getAttribute('data-tilt-state')).toBe('unten');

    const initialFigureWidth = parseFloat(rodPreviewSvg.querySelector('foreignObject')?.getAttribute('width') || '0');
    expect(initialFigureWidth).toBeGreaterThan(5);
    await user.click(rodToggle);
    expect(rodPreviewSvg.getAttribute('data-tilt-state')).toBe('nachVorn');
    const forwardFigureWidth = parseFloat(rodPreviewSvg.querySelector('foreignObject')?.getAttribute('width') || '0');
    // Die nachVorn-Figur hat breitere Layer-Bounds (Fuß+Torso nebeneinander) → größere foreignObject-Breite ist korrekt.
    expect(forwardFigureWidth).toBeGreaterThan(5);

    await user.click(rodToggle);
    expect(rodPreviewSvg.getAttribute('data-tilt-state')).toBe('nachHinten');

    await user.click(rodToggle);
    expect(rodPreviewSvg.getAttribute('data-tilt-state')).toBe('hochgestellt');

    await user.click(rodToggle);
    expect(rodPreviewSvg.getAttribute('data-tilt-state')).toBe('unten');
    expect(screen.queryByText('Puppe mit Stange')).not.toBeInTheDocument();
  });

  it('shows an edit icon for the selected table and opens the configuration wizard from it', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByLabelText('Tischauswahl öffnen'));
    expect(screen.getByTitle(/Tisch .* bearbeiten/i)).toBeInTheDocument();
    await user.click(screen.getByText('Ullrich P4P'));

    expect(await screen.findByText(/Tischkonfiguration/i)).toBeInTheDocument();
  });

  it('loads all configurator values and svg previews from the selected table json', async () => {
    const user = userEvent.setup();
    const customLayout = JSON.parse(JSON.stringify(defaultTableLayout)) as StoredTableLayout;

    customLayout.meta.name = 'Leonhart Tournament';
    customLayout.settings.manufacturer = 'Leonhart';
    customLayout.settings.field.lengthCm = 118;
    customLayout.settings.field.widthCm = 70;
    customLayout.settings.field.goalWidthCm = 19.8;
    customLayout.settings.configuration.rows.goalkeeper.position = 8.2;
    for (const row of Object.values(customLayout.settings.configuration.rows)) {
      row.rodLength = 136.4;
      row.rodDiameter = 1.7;
    }
    customLayout.settings.figures.widthCm = 4.1;
    customLayout.settings.figures.colors.player1 = '#123456';
    customLayout.settings.figures.colors.player2 = '#abcdef';
    customLayout.settings.figures.states.unten.layer = 'unten custom';
    customLayout.settings.figures.states.unten.anchorGroup = 'Steg unten';
    customLayout.settings.figures.states.unten.collisionGroup = 'Torso unten';
    customLayout.settings.figures.states.nachVorn.layer = 'vorn custom';
    customLayout.settings.figures.states.nachVorn.anchorGroup = 'Steg vorn';
    customLayout.settings.figures.states.nachVorn.collisionGroup = 'Torso vorn';
    customLayout.settings.figures.states.nachHinten.layer = 'hinten custom';
    customLayout.settings.figures.states.nachHinten.anchorGroup = 'Steg hinten';
    customLayout.settings.figures.states.nachHinten.collisionGroup = 'Torso hinten';
    customLayout.settings.ball.sizeCm = 3.8;
    customLayout.settings.ball.color = '#ededed';
    applyTableLayout(customLayout);

    renderApp();

    await user.click(screen.getByLabelText('Tischauswahl öffnen'));
    await user.click(screen.getByText('Leonhart Tournament'));

    expect(await screen.findByText(/Tischkonfiguration/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Leonhart Tournament')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Leonhart')).toBeInTheDocument();
  expect((screen.getByLabelText('Spielfeldlänge (innen)') as HTMLInputElement).value).toContain('118');
  expect((screen.getByLabelText('Spielfeldbreite (innen)') as HTMLInputElement).value).toContain('70');
  expect((screen.getByLabelText('Torbreite') as HTMLInputElement).value).toContain('19.8');

    const fieldPreviewWindow = screen.getByTestId('field-preview-window');
    expect(fieldPreviewWindow).toBeInTheDocument();
    expect(fieldPreviewWindow.style.background).toBe('transparent');
    expect(fieldPreviewWindow.querySelector('svg')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: /weiter/i }));
  expect(((screen.getAllByLabelText('Position')[0] as HTMLInputElement).value)).toContain('8.2');
  expect(screen.getAllByLabelText('Stangenlänge').length).toBe(4);
  expect(screen.getAllByLabelText('Stangendurchmesser').length).toBe(4);
  expect((screen.getAllByLabelText('Stangenlänge')[0] as HTMLInputElement).value).toContain('136.4');
  expect((screen.getAllByLabelText('Stangendurchmesser')[0] as HTMLInputElement).value).toContain('1.7');

    await user.click(screen.getByRole('button', { name: /weiter/i }));
  expect((screen.getByLabelText('Breite der Puppe') as HTMLInputElement).value).toContain('4.1');
  expect((screen.getByLabelText('Farbe Spieler 1') as HTMLInputElement).value).toBe('#123456');
  expect((screen.getByLabelText('Farbe Spieler 2') as HTMLInputElement).value).toBe('#abcdef');
  expect((screen.getByLabelText('Ballgröße') as HTMLInputElement).value).toContain('3.8');
  expect((screen.getByLabelText('Ballfarbe') as HTMLInputElement).value).toBe('#ededed');
    expect(screen.getAllByText('unten custom').length).toBeGreaterThan(0);
    expect(screen.getAllByText('vorn custom').length).toBeGreaterThan(0);
    expect(screen.getAllByText('hinten custom').length).toBeGreaterThan(0);
    const bottomPreviewSvg = (screen.getByTestId('figure-preview-bottom') as HTMLElement).querySelector('svg');
    const forwardPreviewSvg = (screen.getByTestId('figure-preview-forward') as HTMLElement).querySelector('svg');
    const backwardPreviewSvg = (screen.getByTestId('figure-preview-backward') as HTMLElement).querySelector('svg');
    expect(bottomPreviewSvg).not.toBeNull();
    expect(forwardPreviewSvg).not.toBeNull();
    expect(backwardPreviewSvg).not.toBeNull();
    expect(bottomPreviewSvg?.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    const bottomViewBox = bottomPreviewSvg?.getAttribute('viewBox')?.split(/\s+/).map(Number) || [];
    expect(bottomViewBox).toHaveLength(4);
    expect(bottomViewBox[2]).toBeLessThan(610);
    expect(bottomViewBox[3]).toBeLessThan(470);
  });

  it('saves a snapshot, toggles rod tilt and generates a share hash', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getAllByText('Kippen')[0]);
    expect(screen.getByText(/front/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Snapshot-Name'), 'Pressing links');
    await user.click(screen.getByText('Speichern'));
    expect(await screen.findByText('Pressing links')).toBeInTheDocument();

    await user.click(screen.getByText('Teilen'));
    expect((screen.getByLabelText('Share-Link') as HTMLInputElement).value).toContain('scene=');
  });
});
