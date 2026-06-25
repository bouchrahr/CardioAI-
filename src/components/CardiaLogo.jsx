const SIZES = {
  sm: { icon: 36, name: '1.15rem', tag: '7.5px', gap: 10 },
  md: { icon: 44, name: '1.4rem',  tag: '8.5px', gap: 12 },
  lg: { icon: 56, name: '1.75rem', tag: '9.5px', gap: 15 },
};

export default function CardiaLogo({ size = 'md', showTag = false }) {
  const s = SIZES[size] ?? SIZES.md;
  const ic = s.icon;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: s.gap }}>
      <svg width={ic} height={ic} viewBox="0 0 46 46" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="23" cy="23" r="22" fill="#080F1C" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
        <circle cx="23" cy="23" r="20" fill="none" stroke="url(#gc)" strokeWidth="2"
          strokeDasharray="82 44" strokeLinecap="round" strokeDashoffset="-10"/>
        <defs>
          <linearGradient id="gc" x1="3" y1="3" x2="43" y2="43" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4FC3F7"/>
            <stop offset="100%" stopColor="#1E88E5" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d="M11 23 L16 23 L18.5 18.5 L21 27.5 L23.5 20 L25.5 23 L35 23"
          stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <circle cx="35" cy="23" r="2.5" fill="#4FC3F7"/>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{
          fontSize: s.name, fontWeight: 700, letterSpacing: '-0.04em',
          color: '#fff', lineHeight: 1, fontFamily: '"Space Grotesk", sans-serif',
        }}>
          Cardia<span style={{ color: '#4FC3F7' }}>.</span>
        </span>
        {showTag && (
          <span style={{
            fontSize: s.tag, letterSpacing: '0.26em',
            color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase',
            fontFamily: '"JetBrains Mono", monospace', marginTop: 3,
          }}>
            cardiac intelligence
          </span>
        )}
      </div>
    </div>
  );
}