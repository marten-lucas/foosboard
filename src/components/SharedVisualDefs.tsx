type SharedVisualDefsProps = {
  includeShadow?: boolean;
};

export function SharedVisualDefs({ includeShadow = false }: SharedVisualDefsProps) {
  return (
    <>
      {includeShadow ? (
        <filter id="shadow">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="rgba(12, 28, 24, 0.30)" />
        </filter>
      ) : null}
      <radialGradient id="ballGradient" cx="37%" cy="28%" r="72%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="38%" stopColor="#e2e2e2" />
        <stop offset="100%" stopColor="#8a8a8a" />
      </radialGradient>
      <linearGradient id="rodGradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#787878" />
        <stop offset="18%" stopColor="#c0c0c0" />
        <stop offset="38%" stopColor="#efefef" />
        <stop offset="58%" stopColor="#c6c6c6" />
        <stop offset="100%" stopColor="#686868" />
      </linearGradient>
      <linearGradient id="gripGradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#0c0c0c" />
        <stop offset="35%" stopColor="#2e2e2e" />
        <stop offset="60%" stopColor="#1a1a1a" />
        <stop offset="100%" stopColor="#080808" />
      </linearGradient>
    </>
  );
}