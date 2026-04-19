export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface FigureHit {
  id: string;
  rodId: string;
  center: Point;
  radius: number;
}

export interface ShotSegment {
  start: Point;
  end: Point;
}

export interface ShotTrace {
  segments: ShotSegment[];
  blocker?: FigureHit;
  reflected: boolean;
}

export interface ShadowInterval {
  start: number;
  end: number;
  rodId: string;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function encodeScene(scene: unknown): string {
  const text = JSON.stringify(scene);
  const encoded = btoa(unescape(encodeURIComponent(text)));
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

export function decodeScene<T>(token: string): T | null {
  try {
    const normalized = token.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const text = decodeURIComponent(escape(atob(padded)));
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
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

function firstFigureHit(start: Point, end: Point, figures: FigureHit[]): { figure: FigureHit; point: Point; t: number } | null {
  let bestHit: { figure: FigureHit; point: Point; t: number } | null = null;

  for (const figure of figures) {
    const hit = lineCircleIntersection(start, end, figure.center, figure.radius);
    if (!hit) {
      continue;
    }

    if (!bestHit || hit.t < bestHit.t) {
      bestHit = {
        figure,
        point: hit.point,
        t: hit.t,
      };
    }
  }

  return bestHit;
}

export function projectGoalShadows(ball: Point, figures: FigureHit[], goalX: number, goalTop: number, goalBottom: number): ShadowInterval[] {
  return figures
    .filter((figure) => Math.sign(goalX - ball.x) === Math.sign(figure.center.x - ball.x))
    .map((figure) => {
      const denominator = figure.center.x - ball.x;
      if (denominator === 0) {
        return null;
      }

      const projectionFactor = (goalX - ball.x) / denominator;
      if (!Number.isFinite(projectionFactor) || projectionFactor <= 0) {
        return null;
      }

      const start = ball.y + (figure.center.y - figure.radius - ball.y) * projectionFactor;
      const end = ball.y + (figure.center.y + figure.radius - ball.y) * projectionFactor;

      return {
        start: clamp(Math.min(start, end), goalTop, goalBottom),
        end: clamp(Math.max(start, end), goalTop, goalBottom),
        rodId: figure.rodId,
      } satisfies ShadowInterval;
    })
    .filter((interval): interval is ShadowInterval => Boolean(interval && interval.end > interval.start));
}

export function traceShot(start: Point, target: Point, bounds: Bounds, figures: FigureHit[]): ShotTrace {
  const segments: ShotSegment[] = [];
  const reflected = target.y < bounds.top || target.y > bounds.bottom;
  const bouncePoint: Point | null = reflected
    ? {
        x: clamp(target.x, bounds.left, bounds.right),
        y: target.y < bounds.top ? bounds.top : bounds.bottom,
      }
    : null;

  if (!reflected) {
    const hit = firstFigureHit(start, target, figures);
    if (hit) {
      return {
        segments: [{ start, end: hit.point }],
        blocker: hit.figure,
        reflected: false,
      };
    }

    return {
      segments: [{ start, end: target }],
      reflected: false,
    };
  }

  if (!bouncePoint) {
    return {
      segments: [{ start, end: target }],
      reflected: false,
    };
  }

  const firstHit = firstFigureHit(start, bouncePoint, figures);
  if (firstHit) {
    return {
      segments: [{ start, end: firstHit.point }],
      blocker: firstHit.figure,
      reflected: true,
    };
  }

  const mirroredTarget: Point = {
    x: target.x,
    y: target.y < bounds.top ? bounds.top + (bounds.top - target.y) : bounds.bottom - (target.y - bounds.bottom),
  };

  const secondHit = firstFigureHit(bouncePoint, mirroredTarget, figures);
  if (secondHit) {
    return {
      segments: [
        { start, end: bouncePoint },
        { start: bouncePoint, end: secondHit.point },
      ],
      blocker: secondHit.figure,
      reflected: true,
    };
  }

  return {
    segments: [
      { start, end: bouncePoint },
      { start: bouncePoint, end: mirroredTarget },
    ],
    reflected: true,
  };
}