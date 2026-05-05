import { boardConfig, type ShotLine } from '../boardConfig';
import type { Point } from '../geometry';

export type ShotCollider = {
  center: Point;
  radius: number;
};

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

function lineCircleIntersection(start: Point, end: Point, center: Point, radius: number): { t: number; point: Point } | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const fx = start.x - center.x;
  const fy = start.y - center.y;
  const a = dx * dx + dy * dy;

  if (a === 0) {
    return null;
  }

  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return null;
  }

  const sqrt = Math.sqrt(discriminant);
  const tValues = [(-b - sqrt) / (2 * a), (-b + sqrt) / (2 * a)].filter((candidate) => candidate >= 0 && candidate <= 1);
  if (!tValues.length) {
    return null;
  }

  const t = Math.min(...tValues);
  return {
    t,
    point: {
      x: start.x + dx * t,
      y: start.y + dy * t,
    },
  };
}

function firstColliderHit(start: Point, end: Point, colliders: ShotCollider[], lineRadius: number): Point | null {
  let best: { t: number; point: Point } | null = null;

  for (const collider of colliders) {
    const hit = lineCircleIntersection(start, end, collider.center, collider.radius + lineRadius);
    if (!hit) {
      continue;
    }

    if (!best || hit.t < best.t) {
      best = hit;
    }
  }

  return best?.point ?? null;
}

export function buildShotPathData(shot: ShotLine, colliders: ShotCollider[] = []): string {
  const start = shot.start;
  const target = shot.target;
  const collisionEnabled = shot.collisionEnabled === true;
  const lineRadius = boardConfig.ballRadius;

  if (shot.shotStyle === 'bank-top' || shot.shotStyle === 'bank-bottom') {
    const wallY = shot.shotStyle === 'bank-top' ? boardConfig.fieldY : boardConfig.fieldY + boardConfig.fieldHeight;
    const reflectionAxisY = shot.shotStyle === 'bank-top' ? wallY + boardConfig.ballRadius : wallY - boardConfig.ballRadius;
    const reflectedTarget = reflectAcrossHorizontal(target, reflectionAxisY);
    const bounce = lineIntersectionAtY(start, reflectedTarget, reflectionAxisY);

    if (bounce) {
      if (collisionEnabled && colliders.length > 0) {
        const firstHit = firstColliderHit(start, bounce, colliders, lineRadius);
        if (firstHit) {
          return `M ${start.x} ${start.y} L ${firstHit.x} ${firstHit.y}`;
        }

        const secondHit = firstColliderHit(bounce, target, colliders, lineRadius);
        if (secondHit) {
          return `M ${start.x} ${start.y} L ${bounce.x} ${bounce.y} L ${secondHit.x} ${secondHit.y}`;
        }
      }

      return `M ${start.x} ${start.y} L ${bounce.x} ${bounce.y} L ${target.x} ${target.y}`;
    }
  }

  if (collisionEnabled && colliders.length > 0) {
    const hit = firstColliderHit(start, target, colliders, lineRadius);
    if (hit) {
      return `M ${start.x} ${start.y} L ${hit.x} ${hit.y}`;
    }
  }

  return `M ${start.x} ${start.y} L ${target.x} ${target.y}`;
}

export function getShotStrokeWidth(): number {
  return boardConfig.ballRadius * 2;
}