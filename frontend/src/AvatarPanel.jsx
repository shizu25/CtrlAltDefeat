import ClickSpark from './ClickSpark';
import Particles from './Particles';
import SpotlightCard from './SpotlightCard';

export default function AvatarPanel({ isSpeaking }) {
  return (
    <section className="avatar-panel">
      <Particles
        particleColors={['#4f8ef7', '#a78bfa', '#34d399']}
        particleCount={120}
        particleSpread={12}
        speed={0.07}
        particleBaseSize={90}
        alphaParticles
      />

      <div className="anim-hint show">Tap Lexi to spark</div>

      <div className="avatar-spark-area">
        <ClickSpark sparkColor="#8bb4ff" sparkSize={8} sparkRadius={18} sparkCount={10} duration={500}>
          <SpotlightCard className="avatar-card" spotlightColor="rgba(79, 142, 247, 0.3)">
            <div className="avatar-face-wrap">
              <div className="avatar-face">
                <div className="avatar-eyes">
                  <span />
                  <span />
                </div>
                <div className="avatar-mouth" />
              </div>
            </div>
          </SpotlightCard>
        </ClickSpark>
      </div>

      <div className={`speaking-waves ${isSpeaking ? 'active' : ''}`}>
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="avatar-label">LEXI v1.0 - STUDY COMPANION</div>
    </section>
  );
}
