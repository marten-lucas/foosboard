import { boardConfig, type ShotLine } from '../boardConfig';
import type { Point } from '../geometry';

function reflectAcrossHorizontal(point: Point, axisY: number): Point {
  return {
    x: point.x,
    y: axisY * 2 - point.y,
  };
}

function lineIntersectionAtY(start: Point, end: Point, targetY: number): Point | null {
  const deltaY = end.y - start.y;
  if (deltaY === 0) {
    return null;
  }

  const t = (targetY - start.y) / deltaY;
  if (t <= 0 || t >= 1) {
    return null;
  }

  return {
    x: start.x + (end.x - start.x) * t,
    y: targetY,
  };
}

export function buildShotPathData(shot: ShotLine): string {
  const start = shot.start;
  const target = shot.target;

  if (shot.shotStyle === 'bank-top' || shot.shotStyle === 'bank-bottom') {
    const axisY = shot.shotStyle === 'bank-top' ? boardConfig.fieldY : boardConfig.fieldY + boardConfig.fieldHeight;
    const reflectedTarget = reflectAcrossHorizontal(target, axisY);
    const bounce = lineIntersectionAtY(start, reflectedTarget, axisY);

    if (bounce) {
      return `M ${start.x} ${start.y} L ${bounce.x} ${bounce.y} L ${target.x} ${target.y}`;
    }
  }

  return `M ${start.x} ${start.y} L ${target.x} ${target.y}`;
}

export function getShotStrokeWidth(): number {
  return boardConfig.ballRadius * 2;
}