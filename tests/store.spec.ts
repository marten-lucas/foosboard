import { beforeEach, describe, expect, it } from 'vitest';
import { boardConfig, createDefaultScene } from '../src/boardConfig';
import { buildRodStrokeWidth } from '../src/lib/figureRenderModel';
import { buildRodMotionBounds, getRodGeometry } from '../src/lib/rodLayout';
import { defaultTableDraft } from '../src/lib/tableLayout';
import { getSerializableScene, useBoardStore } from '../src/store/boardStore';

function resetBoardState() {
  useBoardStore.setState({
    ...createDefaultScene(),
    activeTool: 'move',
    snapshots: [],
  });
}

describe('board store', () => {
  beforeEach(() => {
    localStorage.clear();
    resetBoardState();
  });

  it('clamps the ball to the legacy field bounds', () => {
    useBoardStore.getState().setBall({ x: -500, y: 2000 });
    const state = useBoardStore.getState();

    expect(state.ball.x).toBeGreaterThanOrEqual(boardConfig.fieldX + boardConfig.ballRadius);
    expect(state.ball.y).toBeLessThanOrEqual(boardConfig.fieldY + boardConfig.fieldHeight - boardConfig.ballRadius);
  });

  it('cycles rod tilt through neutral, front, back and back to neutral', () => {
    const { cycleRodTilt } = useBoardStore.getState();

    cycleRodTilt('P2_1');
    expect(useBoardStore.getState().rods.P2_1.tilt).toBe('front');

    cycleRodTilt('P2_1');
    expect(useBoardStore.getState().rods.P2_1.tilt).toBe('back');

    cycleRodTilt('P2_1');
    expect(useBoardStore.getState().rods.P2_1.tilt).toBe('neutral');
  });

  it('adds and removes shot lines with stable labels', () => {
    const { addShot, removeShot } = useBoardStore.getState();

    addShot({ kind: 'shot', color: '#ff7a3d', target: { x: 200, y: 200 } });
    addShot({ kind: 'pass', color: '#4fa3f7', target: { x: 240, y: 210 } });

    const current = useBoardStore.getState().shots;
    expect(current).toHaveLength(2);
    expect(current[0].label).toBe('Schuss 1');
    expect(current[1].label).toBe('Pass 2');

    removeShot(current[0].id);
    expect(useBoardStore.getState().shots).toHaveLength(1);
  });

  it('saves, loads and resets snapshots', () => {
    const store = useBoardStore.getState();
    store.setBall({ x: 250, y: 250 });
    store.saveSnapshot('Regression');

    const snapshot = useBoardStore.getState().snapshots[0];
    expect(snapshot.name).toBe('Regression');

    store.resetScene();
    expect(useBoardStore.getState().ball.x).toBeCloseTo(boardConfig.centerX);

    store.loadSnapshot(snapshot.id);
    expect(useBoardStore.getState().ball).toEqual({ x: 250, y: 250 });
  });

  it('serializes only the shareable scene state', () => {
    const scene = getSerializableScene(useBoardStore.getState() as never);

    expect(scene).toHaveProperty('ball');
    expect(scene).toHaveProperty('rods');
    expect(scene).not.toHaveProperty('snapshots');
    expect(scene).not.toHaveProperty('activeTool');
  });

  it('matches the legacy rod distribution from the original SVG', () => {
    expect(boardConfig.rods.map((rod) => rod.playerCount)).toEqual([1, 2, 3, 5, 5, 3, 2, 1]);
    expect(boardConfig.rods.map((rod) => rod.figureOffsets ?? [])).toEqual([
      [0],
      [-55, 55],
      [-85, 0, 85],
      [-120, -60, 0, 60, 120],
      [-120, -60, 0, 60, 120],
      [-85, 0, 85],
      [-55, 55],
      [0],
    ]);
  });

  it('clamps rods per row outer stop instead of a global board-wide limit', () => {
    const store = useBoardStore.getState();

    const goalkeeperBounds = buildRodMotionBounds('P2_1');
    const midfieldBounds = buildRodMotionBounds('P2_5');

    store.moveRod('P2_1', -9999);
    expect(useBoardStore.getState().rods.P2_1.y).toBeCloseTo(goalkeeperBounds.minY, 3);

    store.moveRod('P2_5', 9999);
    expect(useBoardStore.getState().rods.P2_5.y).toBeCloseTo(midfieldBounds.maxY, 3);

    expect(goalkeeperBounds.minY).not.toBeCloseTo(midfieldBounds.minY, 3);
  });

  it('derives rod stroke width from the shared preview formula', () => {
    const row = boardConfig.settings?.configuration.rows.goalkeeper ?? defaultTableDraft.rows.goalkeeper;
    const rodGeometry = getRodGeometry(row, boardConfig.settings?.field.widthCm ?? 68, boardConfig.fieldHeight);
    const sharedStrokeWidth = buildRodStrokeWidth({
      rodDiameterCm: row.rodDiameter,
      fieldWidthCm: boardConfig.settings?.field.widthCm ?? 68,
      viewFieldHeight: boardConfig.fieldHeight,
      min: 0.6,
    });

    expect(rodGeometry.rodStrokeWidth).toBeCloseTo(sharedStrokeWidth, 6);
  });
});
