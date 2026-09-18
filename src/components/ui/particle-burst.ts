import { animate } from 'animejs';
import confetti from 'canvas-confetti';

/**
 * Triggers a subtle, executive micro-particle burst using Anime.js
 * Creates tiny floating glowing dots that disperse and fade smoothly.
 */
export function triggerMicroBurst(originX: number, originY: number, color = '#3b82f6') {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  const particleCount = 14;
  const particles: HTMLElement[] = [];

  for (let i = 0; i < particleCount; i++) {
    const p = document.createElement('div');
    p.style.position = 'absolute';
    p.style.left = `${originX}px`;
    p.style.top = `${originY}px`;
    p.style.width = `${Math.random() * 5 + 3}px`;
    p.style.height = p.style.width;
    p.style.borderRadius = '50%';
    p.style.backgroundColor = i % 2 === 0 ? color : '#60a5fa';
    p.style.boxShadow = `0 0 6px ${color}`;
    container.appendChild(p);
    particles.push(p);
  }

  animate(particles, {
    translateX: () => (Math.random() - 0.5) * 80,
    translateY: () => (Math.random() - 0.5) * 80 - 15,
    scale: [1, 0],
    opacity: [1, 0],
    duration: () => Math.random() * 400 + 450,
    ease: 'outExpo',
    onComplete: () => {
      container.remove();
    },
  });
}

/**
 * Celebratory full screen confetti for big milestones (e.g. Exporting Master Document)
 */
export function triggerCelebration() {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.8 },
    colors: ['#2563eb', '#38bdf8', '#818cf8', '#10b981'],
    disableForReducedMotion: true,
  });
}
