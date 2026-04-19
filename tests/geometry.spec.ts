import { describe, expect, it } from 'vitest';
import { boardConfig, createDefaultScene } from '../src/boardConfig';
import { clamp, decodeScene, encodeScene, projectGoalShadows, traceShot, type FigureHit } from '../src/geometry';

describe('geometry utilities', () => {
  it('clamps values into the requested range', () => {
    expect(clamp(-4, 0, 10)).toBe(0);
    expect(clamp(7, 0, 10)).toBe(7);
    expect(clamp(42, 0, 10)).toBe(10);
  });

  it('round-trips serialized scene data', () => {
    const scene = createDefaultScene();
    const encoded = encodeScene(scene);
    const decoded = decodeScene<typeof scene>(encoded);

    expect(decoded).toEqual(scene);
  });

  it('stops a shot at the first blocking figure', () => {
    const blocker: FigureHit = {
      id: 'defender-1',
      rodId: 'P1_2',
      center: { x: 220, y: 230 },
      radius: 14,
    };

    const trace = traceShot(
      { x: 120, y: 230 },
      { x: 320, y: 230 },
      { left: 20, top: 70, right: 580, bottom: 390 },
      [blocker],
    );

    expect(trace.blocker?.id).toBe('defender-1');
    expect(trace.segments).toHaveLength(1);
    expect(trace.segments[0].end.x).toBeLessThan(blocker.center.x);
  });

  it('creates a reflected trace when the target leaves the field vertically', () => {
    const trace = traceShot(
      { x: boardConfig.centerX, y: boardConfig.centerY },
      { x: boardConfig.centerX + 70, y: boardConfig.fieldY - 40 },
      {
        left: boardConfig.fieldX,
        top: boardConfig.fieldY,
        right: boardConfig.fieldX + boardConfig.fieldWidth,
        bottom: boardConfig.fieldY + boardConfig.fieldHeight,
      },
      [],
    );

    expect(trace.reflected).toBe(true);
    expect(trace.segments).toHaveLength(2);
  });

  it('projects goal shadows into the goal mouth only', () => {
    const shadows = projectGoalShadows(
      { x: boardConfig.centerX, y: boardConfig.centerY },
      [
        {
          id: 'goal-block',
          rodId: 'P1_1',
          center: { x: boardConfig.centerX + 80, y: boardConfig.centerY },
          radius: 18,
        },
      ],
      boardConfig.fieldX + boardConfig.fieldWidth,
      boardConfig.centerY - boardConfig.goalWidth / 2,
      boardConfig.centerY + boardConfig.goalWidth / 2,
    );

    expect(shadows).toHaveLength(1);
    expect(shadows[0].start).toBeGreaterThanOrEqual(boardConfig.centerY - boardConfig.goalWidth / 2);
    expect(shadows[0].end).toBeLessThanOrEqual(boardConfig.centerY + boardConfig.goalWidth / 2);
  });
});
