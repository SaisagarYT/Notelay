import React, { useEffect, useRef } from 'react';
import { animate } from 'animejs';

interface AmbientAuraProps {
  active?: boolean;
  intensity?: 'subtle' | 'vibrant';
  className?: string;
}

export const AmbientAura: React.FC<AmbientAuraProps> = ({
  active = false,
  intensity = 'subtle',
  className = '',
}) => {
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !orb1Ref.current || !orb2Ref.current) return;

    const anim1 = animate(orb1Ref.current, {
      translateX: [-15, 15, -15],
      translateY: [-10, 10, -10],
      scale: [1, 1.15, 1],
      duration: 5000,
      ease: 'inOutSine',
      loop: true,
    });

    const anim2 = animate(orb2Ref.current, {
      translateX: [15, -15, 15],
      translateY: [10, -10, 10],
      scale: [1.1, 0.9, 1.1],
      duration: 5600,
      ease: 'inOutSine',
      loop: true,
    });

    return () => {
      anim1.pause();
      anim2.pause();
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      className={`absolute inset-0 -z-10 overflow-hidden pointer-events-none rounded-2xl transition-opacity duration-700 ${
        intensity === 'vibrant' ? 'opacity-85' : 'opacity-50'
      } ${className}`}
    >
      <div
        ref={orb1Ref}
        className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-gradient-to-r from-blue-400/25 to-indigo-500/25 blur-2xl"
      />
      <div
        ref={orb2Ref}
        className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full bg-gradient-to-r from-cyan-400/25 to-blue-500/25 blur-2xl"
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-20 rounded-full bg-blue-300/10 blur-xl"
      />
    </div>
  );
};
