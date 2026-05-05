import { describe, expect, it } from 'vitest';
import type { ShotLine } from '../src/boardConfig';
import { boardConfig } from '../src/boardConfig';
import { buildShotPathData, getShotStrokeWidth, type ShotCollider } from '../src/lib/shotGeometry';
import { resolveShotTargetPoint, type GoalRect } from '../src/lib/shotTargets';

function extractPathPoints(pathData: string) {
  return pathData
    .match(/-?\d+(?:\.\d+)?/g)
    ?.map(Number) ?? [];
}

describe('shot target geometry', () => {
  it('keeps the outer five-goal slots aligned with the posts via the stroke edge', () => {
    const goal: GoalRect = {
      x: 20,
      y: 100,
      width: 12,
      height: 80,
    };

    const leftTarget = resolveShotTargetPoint(goal, 'left', 5, 'left');
    const rightTarget = resolveShotTargetPoint(goal, 'left', 5, 'right');
    const middleTarget = resolveShotTargetPoint(goal, 'left', 5, 'middle');

    expect(leftTarget.y - boardConfig.ballRadius).toBeCloseTo(goal.y, 5);
    expect(rightTarget.y + boardConfig.ballRadius).toBeCloseTo(goal.y + goal.height, 5);
    expect(middleTarget.y).toBeCloseTo(goal.y + goal.height / 2, 5);
  });

  it('reflects bank shots around the stroke edge contact line at the wall', () => {
    const shot: ShotLine = {
      id: 'bank-top-shot',
      kind: 'shot',
      color: '#fff',
      label: 'Shot 1',
      start: { x: boardConfig.centerX, y: boardConfig.centerY },
      target: { x: boardConfig.fieldX + boardConfig.goalDepth, y: boardConfig.centerY - 24 },
      shotStyle: 'bank-top',
      collisionEnabled: false,
    };

    const pathData = buildShotPathData(shot);
    const [, , , bounceY] = extractPathPoints(pathData);

    expect(bounceY).toBeCloseTo(boardConfig.fieldY + getShotStrokeWidth() / 2, 5);
  });

  it('cuts the shot at first collision only when collision checking is enabled', () => {
    const start = { x: 180, y: 220 };
    const target = { x: 420, y: 220 };
    const colliders: ShotCollider[] = [{ center: { x: 300, y: 220 }, radius: 14 }];

    const collisionOnShot: ShotLine = {
      id: 'collision-on',
      kind: 'shot',
      color: '#fff',
      label: 'Shot 1',
      start,
      target,
      shotStyle: 'straight',
      collisionEnabled: true,
    };

    const collisionOffShot: ShotLine = {
      ...collisionOnShot,
      id: 'collision-off',
      collisionEnabled: false,
    };

    const withCollision = buildShotPathData(collisionOnShot, colliders);
    const withoutCollision = buildShotPathData(collisionOffShot, colliders);
    const withCollisionPoints = extractPathPoints(withCollision);
    const withoutCollisionPoints = extractPathPoints(withoutCollision);

    expect(withCollisionPoints[2]).toBeLessThan(target.x);
    expect(withoutCollisionPoints[2]).toBeCloseTo(target.x, 5);
  });
});