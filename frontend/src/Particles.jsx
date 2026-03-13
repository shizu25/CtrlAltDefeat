import { useEffect, useRef } from 'react';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomFrom(list, fallback) {
  if (!Array.isArray(list) || list.length === 0) return fallback;
  return list[Math.floor(Math.random() * list.length)] || fallback;
}

function createParticles({
  width,
  height,
  particleCount,
  particleColors,
  particleBaseSize,
  alphaParticles,
  particleSpread
}) {
  const count = clamp(Number(particleCount) || 120, 20, 800);
  const spread = clamp(Number(particleSpread) || 10, 1, 30);
  const sizeUnit = clamp((Number(particleBaseSize) || 100) / 100, 0.3, 5);

  const out = [];
  const centerX = width / 2;
  const centerY = height / 2;

  for (let i = 0; i < count; i += 1) {
    const rangeX = width * (spread / 10);
    const rangeY = height * (spread / 10);

    out.push({
      x: centerX + (Math.random() - 0.5) * rangeX,
      y: centerY + (Math.random() - 0.5) * rangeY,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      size: (0.5 + Math.random() * 1.5) * sizeUnit,
      color: randomFrom(particleColors, '#ffffff'),
      alpha: alphaParticles ? 0.25 + Math.random() * 0.65 : 1
    });
  }

  return out;
}

export default function Particles({
  particleColors = ['#ffffff'],
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleBaseSize = 100,
  moveParticlesOnHover = true,
  alphaParticles = false,
  disableRotation = false,
  pixelRatio = 1
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let animationId = 0;
    let particles = [];
    const pointer = { x: 0, y: 0, active: false };

    const ratio = clamp(
      Number(pixelRatio) || (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1,
      1,
      2
    );

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));

      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      particles = createParticles({
        width,
        height,
        particleCount,
        particleColors,
        particleBaseSize,
        alphaParticles,
        particleSpread
      });
    };

    const animate = () => {
      const speedFactor = clamp(Number(speed) || 0.1, 0.01, 2);
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        if (!disableRotation) {
          const ox = p.x - centerX;
          const oy = p.y - centerY;
          const angle = 0.001 + speedFactor * 0.0015;
          p.x = centerX + ox * Math.cos(angle) - oy * Math.sin(angle);
          p.y = centerY + ox * Math.sin(angle) + oy * Math.cos(angle);
        }

        p.x += p.vx * speedFactor * 1.2;
        p.y += p.vy * speedFactor * 1.2;

        if (moveParticlesOnHover && pointer.active) {
          const dx = pointer.x - p.x;
          const dy = pointer.y - p.y;
          const distSq = dx * dx + dy * dy;
          const influence = 24000;

          if (distSq < influence) {
            const force = (influence - distSq) / influence;
            // Repel nearby particles from pointer for hover interaction.
            p.x -= dx * 0.003 * force;
            p.y -= dy * 0.003 * force;
          }
        }

        if (p.x < -12) p.x = width + 12;
        if (p.x > width + 12) p.x = -12;
        if (p.y < -12) p.y = height + 12;
        if (p.y > height + 12) p.y = -12;

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animationId = window.requestAnimationFrame(animate);
    };

    const onPointerMove = event => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    };

    const onPointerLeave = () => {
      pointer.active = false;
    };

    const onTouchMove = event => {
      const touch = event.touches && event.touches[0];
      if (!touch) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = touch.clientX - rect.left;
      pointer.y = touch.clientY - rect.top;
      pointer.active = true;
    };

    resize();
    animate();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    if (moveParticlesOnHover) {
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerleave', onPointerLeave);
      canvas.addEventListener('touchmove', onTouchMove, { passive: true });
      canvas.addEventListener('touchend', onPointerLeave);
    }

    return () => {
      window.cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      if (moveParticlesOnHover) {
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerleave', onPointerLeave);
        canvas.removeEventListener('touchmove', onTouchMove);
        canvas.removeEventListener('touchend', onPointerLeave);
      }
    };
  }, [
    alphaParticles,
    disableRotation,
    moveParticlesOnHover,
    particleBaseSize,
    particleColors,
    particleCount,
    particleSpread,
    pixelRatio,
    speed
  ]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: moveParticlesOnHover ? 'auto' : 'none'
      }}
    />
  );
}
