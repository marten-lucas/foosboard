import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../src/App';
import { createDefaultScene } from '../src/boardConfig';
import { useBoardStore } from '../src/store/boardStore';

function resetBoardState() {
  useBoardStore.setState({
    ...createDefaultScene(),
    activeTool: 'move',
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
    expect(screen.getByText(/Vorlage 610 x 470/i)).toBeInTheDocument();
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
    expect(screen.getByLabelText('Stangenlänge')).toBeInTheDocument();
    expect(screen.getByLabelText('Stangendurchmesser')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /weiter/i }));

    expect(screen.getAllByLabelText('Position').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Stangenvorschau')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /weiter/i }));

    expect(screen.getByText('Upload Figuren-SVG')).toBeInTheDocument();
    expect(screen.getAllByText('unten').length).toBeGreaterThan(0);
    expect(screen.getAllByText('nach vorn').length).toBeGreaterThan(0);
    expect(screen.getAllByText('nach hinten').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Verbindungsgruppe').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByLabelText('Kollisionsgruppe').length).toBeGreaterThanOrEqual(3);
    expect((screen.getByLabelText('Breite der Puppe') as HTMLInputElement).value).toContain('3.5');
    expect(screen.getByLabelText('Ballgröße')).toBeInTheDocument();
    expect(screen.getByLabelText('Ballfarbe')).toBeInTheDocument();
    expect(screen.getByTestId('figure-rod-preview-canvas')).toBeInTheDocument();
    expect(screen.queryByText('Puppe mit Stange')).not.toBeInTheDocument();
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
