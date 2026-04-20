type FigureRodPreviewProps = {
  testId: string;
  figureMarkup: string;
  figureBounds: {
    width: number;
    height: number;
  };
  figureAnchor: {
    x: number;
    y: number;
  };
  figureColor: string;
  ballColor: string;
  figureWidthCm: number;
  ballSizeCm: number;
  fieldWidthCm: number;
};

export function FigureRodPreview({
  testId,
  figureMarkup,
  figureBounds,
  figureAnchor,
  figureColor,
  ballColor,
  figureWidthCm,
  ballSizeCm,
  fieldWidthCm,
}: FigureRodPreviewProps) {
  const viewWidth = 28;
  const viewHeight = 44;
  const rodX = viewWidth / 2;
  const rodTop = 2;
  const rodBottom = 42;
  const gripTop = 2;
  const gripHeight = 6;
  const targetFigureWidth = Math.max((figureWidthCm / Math.max(fieldWidthCm, 1)) * 44, 10);
  const scale = targetFigureWidth / Math.max(figureBounds.width, 1);
  const figureWidth = targetFigureWidth;
  const figureHeight = Math.max(figureBounds.height * scale, 12);
  const anchor = figureAnchor || { x: 0.5, y: 0.5 };
  const figureCenterY = 20;
  const ballRadius = Math.max((ballSizeCm / Math.max(fieldWidthCm, 1)) * 22, 1.5);
  const ballX = rodX + Math.min(Math.max(figureWidth * 0.45, ballRadius * 1.8), viewWidth - ballRadius - 1);

  return (
    <div className="foosboard-table-overlay-preview foosboard-table-overlay-preview--fill-card" data-testid={testId} style={{ aspectRatio: `${viewWidth} / ${viewHeight}` }}>
      <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="foosboard-table-preview" aria-label="Puppe mit Stange" preserveAspectRatio="xMidYMid meet">
        <rect x="0" y="0" width={viewWidth} height={viewHeight} rx="2" fill="#37c837" />
        <line x1={rodX} y1={rodTop} x2={rodX} y2={rodBottom} stroke="#444" strokeWidth="1.2" />
        <rect x={rodX - 2} y={gripTop} width={4} height={gripHeight} rx="1" fill="#111" />
        <rect x={rodX - 2} y={rodBottom - gripHeight} width={4} height={gripHeight} rx="1" fill="#111" />
        {figureMarkup ? (
          <foreignObject
            x={rodX - figureWidth * anchor.x}
            y={figureCenterY - figureHeight * anchor.y}
            width={figureWidth}
            height={figureHeight}
          >
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              className="foosboard-figure-svg-colorized"
              style={{ color: figureColor }}
              dangerouslySetInnerHTML={{ __html: figureMarkup }}
            />
          </foreignObject>
        ) : null}
        <circle cx={ballX} cy={31} r={ballRadius} fill={ballColor} stroke="#333" strokeWidth="0.5" />
      </svg>
    </div>
  );
}
