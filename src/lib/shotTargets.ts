import { boardConfig } from '../boardConfig';
import type { Point } from '../geometry';

export type ShotGoalSide = 'left' | 'right';
export type ShotTargetMode = 3 | 5;
export type ShotTargetSlot = 'left' | 'middle-left' | 'middle' | 'middle-right' | 'right';
export type ShotStyle = 'straight' | 'bank-top' | 'bank-bottom';

export type GoalRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export interface ShotSelection {
  target: Point;
  targetGoalSide: ShotGoalSide;
  targetMode: ShotTargetMode;
  targetSlot: ShotTargetSlot;
  shotStyle: ShotStyle;
  collisionEnabled: boolean;
}

export function resolveShotGoalSide(ballX: number): ShotGoalSide {
  return ballX < boardConfig.centerX ? 'right' : 'left';
}

export const SHOT_STYLE_OPTIONS: Array<{ value: ShotStyle; label: string }> = [
  { value: 'straight', label: 'Gerader Schuss' },
  { value: 'bank-top', label: 'Bande oben' },
  { value: 'bank-bottom', label: 'Bande unten' },
];

const SHOT_TARGET_OPTIONS: Record<ShotTargetMode, Array<{ value: ShotTargetSlot; label: string }>> = {
  3: [
    { value: 'left', label: 'Links' },
    { value: 'middle', label: 'Mitte' },
    { value: 'right', label: 'Rechts' },
  ],
  5: [
    { value: 'left', label: 'Links' },
    { value: 'middle-left', label: 'Mitte links' },
    { value: 'middle', label: 'Mitte' },
    { value: 'middle-right', label: 'Mitte rechts' },
    { value: 'right', label: 'Rechts' },
  ],
};

export function getShotTargetOptions(mode: ShotTargetMode) {
  return SHOT_TARGET_OPTIONS[mode];
}

export function getShotTargetModeLabel(mode: ShotTargetMode): string {
  return mode === 5 ? '5 Torpositionen' : '3 Torpositionen';
}

export function normalizeShotTargetSlot(mode: ShotTargetMode, slot: ShotTargetSlot): ShotTargetSlot {
  if (mode === 5) {
    return slot;
  }

  switch (slot) {
    case 'middle-left':
    case 'middle-right':
      return 'middle';
    default:
      return slot;
  }
}

export function resolveShotTargetPoint(goal: GoalRect, side: ShotGoalSide, mode: ShotTargetMode, slot: ShotTargetSlot): Point {
  const options = getShotTargetOptions(mode);
  const slotIndex = Math.max(
    options.findIndex((option) => option.value === slot),
    0,
  );
  const segmentHeight = goal.height / (options.length + 1);
  const targetX = side === 'left' ? goal.x + goal.width : goal.x;

  return {
    x: targetX,
    y: goal.y + segmentHeight * (slotIndex + 1),
  };
}