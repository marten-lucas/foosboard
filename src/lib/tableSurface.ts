export const TABLE_FRAME_THICKNESS_CM = 3;

type TableSurfaceGeometryInput = {
  fieldX: number;
  fieldY: number;
  fieldWidth: number;
  fieldHeight: number;
  fieldWidthCm: number;
  frameThicknessCm?: number;
  goalWidthCm?: number;
  goalWidth?: number;
  goalDepth?: number;
};

function toFieldUnits(valueCm: number, fieldWidthCm: number, fieldHeight: number) {
  return (valueCm / Math.max(fieldWidthCm, 1)) * fieldHeight;
}

export function buildTableSurfaceGeometry({
  fieldX,
  fieldY,
  fieldWidth,
  fieldHeight,
  fieldWidthCm,
  frameThicknessCm = TABLE_FRAME_THICKNESS_CM,
  goalWidthCm,
  goalWidth,
  goalDepth,
}: TableSurfaceGeometryInput) {
  const frameThickness = toFieldUnits(frameThicknessCm, fieldWidthCm, fieldHeight);
  const resolvedGoalWidth = goalWidth ?? toFieldUnits(goalWidthCm ?? 0, fieldWidthCm, fieldHeight);
  const minimumVisibleGoalDepth = Math.max(frameThickness * 0.6, 1);
  const resolvedGoalDepth = Math.max(goalDepth ?? minimumVisibleGoalDepth, minimumVisibleGoalDepth);
  const goalY = fieldY + (fieldHeight - resolvedGoalWidth) / 2;
  const goalStrokeWidth = Math.max(frameThickness * 0.12, 0.75);

  return {
    frame: {
      x: fieldX - frameThickness / 2,
      y: fieldY - frameThickness / 2,
      width: fieldWidth + frameThickness,
      height: fieldHeight + frameThickness,
      strokeWidth: frameThickness,
    },
    goals: {
      strokeWidth: goalStrokeWidth,
      left: {
        x: fieldX - resolvedGoalDepth,
        y: goalY,
        width: resolvedGoalDepth,
        height: resolvedGoalWidth,
      },
      right: {
        x: fieldX + fieldWidth,
        y: goalY,
        width: resolvedGoalDepth,
        height: resolvedGoalWidth,
      },
    },
  };
}