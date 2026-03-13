// Paste the React Bits SpotlightCard component code here.
// Get it from: https://reactbits.dev/components/spotlight-card
//
// Expected export shape:
//   export default function SpotlightCard({ children, className, spotlightColor, ...props }) { ... }
//
// Until you paste the real implementation, this stub renders a plain card so the page still builds.

import { useRef } from 'react';

export default function SpotlightCard({ children, className = '', spotlightColor = 'rgba(255,255,255,0.15)', style, ...props }) {
  const cardRef = useRef(null);

  function handleMouseMove(e) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--sx', `${x}px`);
    card.style.setProperty('--sy', `${y}px`);
    card.style.setProperty('--spotlight', spotlightColor);
  }

  function handleMouseLeave() {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty('--spotlight', 'transparent');
  }

  return (
    <div
      ref={cardRef}
      className={`spotlight-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.03)',
        overflow: 'hidden',
        '--spotlight': 'transparent',
        '--sx': '50%',
        '--sy': '50%',
        ...style
      }}
      {...props}
    >
      {/* spotlight layer */}
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at var(--sx) var(--sy), var(--spotlight), transparent 60%)',
          transition: 'background 0.1s ease'
        }}
      />
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>{children}</div>
    </div>
  );
}
