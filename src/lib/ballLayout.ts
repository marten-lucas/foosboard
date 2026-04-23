import { boardConfig, type BallTokenState, type RodId, type Team } from '../boardConfig';
import { clamp, type Point } from '../geometry';
import { TABLE_FRAME_THICKNESS_CM } from './tableSurface';

export type BallPlacementKind = 'field' | 'rail';

export type BallPlacement = {
  kind: BallPlacementKind;
  point: Point;
};

export type BallTrayBall = {
  id: string;
  point: Point;
};

export type BallTray = {
  id: 'left' | 'right';
  tray: {
    x: number;
    y: number;
    width: number;
    height: number;
    rx: number;
  };
  balls: BallTrayBall[];
  labelPoint: Point;
};

export type BallTrayLayout = {
  trays: BallTray[];
};

export type BallPossessionZone = 'goalkeeper' | 'defense' | 'midfield' | 'offense';

export type BallPossessionContext = {
  rodId: RodId;
  team: Team;
  zone: BallPossessionZone;
};

const trayBallIds = ['ball-1', 'ball-2', 'ball-3', 'ball-4'];

function toFieldUnits(valueCm: number, fieldWidthCm: number, fieldHeight: number) {
  return (valueCm / Math.max(fieldWidthCm, 1)) * fieldHeight;
}

function getBallBounds() {
  const radius = boardConfig.ballRadius;
  const fieldWidthCm = boardConfig.settings?.field.widthCm ?? 68;
  const frameThickness = toFieldUnits(TABLE_FRAME_THICKNESS_CM, fieldWidthCm, boardConfig.fieldHeight);

  return {
    left: boardConfig.fieldX + radius,
    right: boardConfig.fieldX + boardConfig.fieldWidth - radius,
    top: boardConfig.fieldY + radius,
    bottom: boardConfig.fieldY + boardConfig.fieldHeight - radius,
    radius,
    frameLeft: boardConfig.fieldX - frameThickness / 2,
    frameRight: boardConfig.fieldX + boardConfig.fieldWidth + frameThickness / 2,
    frameTop: boardConfig.fieldY - frameThickness / 2,
    frameBottom: boardConfig.fieldY + boardConfig.fieldHeight + frameThickness / 2,
    frameThickness,
  };
}

export function getBallTrayLayout(): BallTrayLayout {
  const radius = boardConfig.ballRadius;
  const trayWidth = Math.max(radius * 4.6, 34);
  const trayHeight = Math.max(radius * 10.2, 88);
  const trayY = boardConfig.centerY - trayHeight / 2;
  const margin = Math.max(radius * 1.25, 6);
  const leftTrayX = boardConfig.fieldX - trayWidth - margin;
  const rightTrayX = boardConfig.fieldX + boardConfig.fieldWidth + margin;
  const slotOffsets = [-1.5, -0.5, 0.5, 1.5].map((slot) => slot * radius * 1.7);

  return {
    trays: [
      {
        id: 'left',
        tray: {
          x: leftTrayX,
          y: trayY,
          width: trayWidth,
          height: trayHeight,
          rx: trayHeight / 2,
        },
        balls: trayBallIds.map((id, index) => ({
          id: `left-ball-${index + 1}`,
          point: {
            x: leftTrayX + trayWidth / 2,
            y: boardConfig.centerY + slotOffsets[index],
          },
        })),
        labelPoint: {
          x: leftTrayX + trayWidth / 2,
          y: trayY - Math.max(radius * 0.35, 3),
        },
      },
      {
        id: 'right',
        tray: {
          x: rightTrayX,
          y: trayY,
          width: trayWidth,
          height: trayHeight,
          rx: trayHeight / 2,
        },
        balls: trayBallIds.map((_, index) => ({
          id: `right-ball-${index + 1}`,
          point: {
            x: rightTrayX + trayWidth / 2,
            y: boardConfig.centerY + slotOffsets[index],
          },
        })),
        labelPoint: {
          x: rightTrayX + trayWidth / 2,
          y: trayY - Math.max(radius * 0.35, 3),
        },
      },
    ],
  };
}

export function resolveBallDrop(point: Point): BallPlacement | null {
  const bounds = getBallBounds();

  if (point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom) {
    return {
      kind: 'field',
      point: {
        x: clamp(point.x, bounds.left, bounds.right),
        y: clamp(point.y, bounds.top, bounds.bottom),
      },
    };
  }

  const candidates: Array<{ edge: 'left' | 'right' | 'top' | 'bottom'; distance: number }> = [];

  if (point.y >= bounds.frameTop - bounds.radius && point.y <= bounds.frameBottom + bounds.radius) {
    if (point.x < bounds.left && point.x >= bounds.frameLeft - bounds.radius) {
      candidates.push({ edge: 'left', distance: bounds.left - point.x });
    }

    if (point.x > bounds.right && point.x <= bounds.frameRight + bounds.radius) {
      candidates.push({ edge: 'right', distance: point.x - bounds.right });
    }
  }

  if (point.x >= bounds.frameLeft - bounds.radius && point.x <= bounds.frameRight + bounds.radius) {
    if (point.y < bounds.top && point.y >= bounds.frameTop - bounds.radius) {
      candidates.push({ edge: 'top', distance: bounds.top - point.y });
    }

    if (point.y > bounds.bottom && point.y <= bounds.frameBottom + bounds.radius) {
      candidates.push({ edge: 'bottom', distance: point.y - bounds.bottom });
    }
  }

  if (!candidates.length) {
    return null;
  }

  const closest = candidates.reduce((best, next) => (next.distance < best.distance ? next : best));

  switch (closest.edge) {
    case 'left':
      return {
        kind: 'rail',
        point: {
          x: bounds.left - bounds.radius,
          y: clamp(point.y, bounds.top, bounds.bottom),
        },
      };
    case 'right':
      return {
        kind: 'rail',
        point: {
          x: bounds.right + bounds.radius,
          y: clamp(point.y, bounds.top, bounds.bottom),
        },
      };
    case 'top':
      return {
        kind: 'rail',
        point: {
          x: clamp(point.x, bounds.left, bounds.right),
          y: bounds.top - bounds.radius,
        },
      };
    case 'bottom':
      return {
        kind: 'rail',
        point: {
          x: clamp(point.x, bounds.left, bounds.right),
          y: bounds.bottom + bounds.radius,
        },
      };
  }
}

export function hasBallCollision(point: Point, balls: BallTokenState[], ignoreBallId?: string) {
  const collisionDistance = boardConfig.ballRadius * 2 - 0.25;
  const collisionDistanceSquared = collisionDistance * collisionDistance;

  return balls.some((ball) => {
    if (ball.id === ignoreBallId) {
      return false;
    }

    const dx = ball.x - point.x;
    const dy = ball.y - point.y;
    return dx * dx + dy * dy < collisionDistanceSquared;
  });
}

const possessionZoneByRodId: Record<RodId, BallPossessionZone> = {
  P2_1: 'goalkeeper',
  P2_2: 'defense',
  P2_5: 'midfield',
  P2_3: 'offense',
  P1_3: 'offense',
  P1_5: 'midfield',
  P1_2: 'defense',
  P1_1: 'goalkeeper',
};

export function getBallPossessionContext(point: Point | null | undefined): BallPossessionContext | null {
  if (!point) {
    return null;
  }

  const bounds = {
    left: boardConfig.fieldX,
    right: boardConfig.fieldX + boardConfig.fieldWidth,
    top: boardConfig.fieldY,
    bottom: boardConfig.fieldY + boardConfig.fieldHeight,
  };

  if (point.x < bounds.left || point.x > bounds.right || point.y < bounds.top || point.y > bounds.bottom) {
    return null;
  }

  const closestRod = boardConfig.rods.reduce<{ rodId: RodId; team: Team; distance: number } | null>((closest, rod) => {
    const distance = Math.abs(point.x - rod.x);

    if (!closest || distance < closest.distance) {
      return { rodId: rod.id, team: rod.team, distance };
    }

    return closest;
  }, null);

  if (!closestRod) {
    return null;
  }

  return {
    rodId: closestRod.rodId,
    team: closestRod.team,
    zone: possessionZoneByRodId[closestRod.rodId],
  };
}

export function getBallPossessionSide(point: Point | null | undefined): 'orange' | 'blue' | null {
  return getBallPossessionContext(point)?.team ?? null;
}