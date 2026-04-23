type GoalRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TableGoalVisualsProps = {
  goals: {
    left: GoalRect;
    right: GoalRect;
    strokeWidth: number;
  };
};

function GoalOutline({ goal, side, strokeWidth }: { goal: GoalRect; side: 'left' | 'right'; strokeWidth: number }) {
  const pocketFill = 'rgba(30,30,30,0.14)';
  const netStroke = 'rgba(255,255,255,0.22)';
  const frameStroke = 'rgba(255,255,255,0.98)';
  const outlineStroke = Math.max(strokeWidth * 2.4, 1.4);
  const netInset = Math.max(goal.width * 0.22, 0.8);
  const netStep = Math.max(goal.height / 4, 3.2);
  const mouthX = side === 'left' ? goal.x + goal.width : goal.x;
  const backX = side === 'left' ? goal.x : goal.x + goal.width;
  const horizontalStart = side === 'left' ? mouthX : goal.x;
  const horizontalEnd = side === 'left' ? goal.x : backX;
  const netStartX = side === 'left' ? backX + netInset : backX - netInset;
  const netEndX = side === 'left' ? mouthX - netInset * 0.45 : mouthX + netInset * 0.45;

  return (
    <g data-goal-side={side}>
      <rect data-goal-pocket="true" x={goal.x} y={goal.y} width={goal.width} height={goal.height} fill={pocketFill} rx={strokeWidth * 0.45} />
      {[1, 2, 3].map((index) => {
        const y = goal.y + index * netStep;
        return <line key={`${side}-net-${index}`} x1={netStartX} y1={y - netStep * 0.45} x2={netEndX} y2={y} stroke={netStroke} strokeWidth={Math.max(strokeWidth * 0.6, 0.7)} strokeLinecap="round" />;
      })}
      <path
        d={`M ${horizontalStart} ${goal.y} H ${horizontalEnd} V ${goal.y + goal.height} H ${horizontalStart}`}
        fill="none"
        stroke={frameStroke}
        strokeWidth={outlineStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

export function TableGoalVisuals({ goals }: TableGoalVisualsProps) {
  return (
    <g>
      <GoalOutline goal={goals.left} side="left" strokeWidth={goals.strokeWidth} />
      <GoalOutline goal={goals.right} side="right" strokeWidth={goals.strokeWidth} />
    </g>
  );
}
