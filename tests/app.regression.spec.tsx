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
