import SpotlightCard from './SpotlightCard';

export default function LandingPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '56px 24px 72px',
        background: '#070b12',
        color: '#eef3fb',
        fontFamily: 'Outfit, sans-serif'
      }}
    >
      {/* React Bits: replace this section with your hero background component */}
      <section
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 24,
          padding: '56px 36px',
          background: 'linear-gradient(160deg, rgba(22,30,45,0.85), rgba(9,14,24,0.9))'
        }}
      >
        <p style={{ margin: 0, color: '#94a3b8', letterSpacing: '0.08em', fontSize: 12 }}>
          STUDY COMPANION
        </p>
        <h1 style={{ margin: '14px 0 14px', fontSize: 'clamp(34px, 6vw, 62px)', lineHeight: 1.05 }}>
          Learn faster with Lexi
        </h1>
        <p style={{ maxWidth: 680, margin: 0, color: '#c7d2e4', fontSize: 18, lineHeight: 1.6 }}>
          Ask questions, upload notes, get quizzes, and revise with a friendly assistant running locally with Ollama.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 26 }}>
          {/* React Bits: replace buttons with your preferred animated button components */}
          <button
            type="button"
            style={{
              border: 'none',
              borderRadius: 12,
              padding: '12px 18px',
              fontWeight: 600,
              cursor: 'pointer',
              background: '#5b8cff',
              color: '#fff'
            }}
          >
            Open Lexi
          </button>
          <button
            type="button"
            style={{
              border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: 12,
              padding: '12px 18px',
              fontWeight: 600,
              cursor: 'pointer',
              background: 'transparent',
              color: '#eef3fb'
            }}
          >
            See Features
          </button>
        </div>
      </section>

      <section
        style={{
          maxWidth: 1080,
          margin: '26px auto 0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12
        }}
      >
        {[
          ['Explain Concepts', 'Get clear explanations with practical examples.'],
          ['Upload Notes', 'Turn class notes into concise summaries.'],
          ['Generate Quizzes', 'Practice with instant question sets.'],
          ['Local & Private', 'Run with Ollama on your machine.']
        ].map(([title, desc]) => (
          <SpotlightCard
            key={title}
            className="custom-spotlight-card"
            spotlightColor="rgba(0, 229, 255, 0.2)"
            style={{ padding: '18px 16px' }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>{title}</h3>
            <p style={{ margin: 0, color: '#afbdd2', lineHeight: 1.5 }}>{desc}</p>
          </SpotlightCard>
        ))}
      </section>
    </main>
  );
}
