import React from 'react';

export function Star3D({ size = 24, className = '', variant = 'primary' }) {
  const gradients = {
    primary: { c1: '#4f46e5', c2: '#0ea5e9', c3: '#06b6d4' },
    bright: { c1: '#3b82f6', c2: '#06b6d4', c3: '#22d3ee' },
    deep: { c1: '#1e3a8a', c2: '#2563eb', c3: '#3b82f6' },
    glow: { c1: '#6366f1', c2: '#0ea5e9', c3: '#67e8f9' },
  };
  const g = gradients[variant] || gradients.primary;
  const id = `star3d-${variant}`;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-main`} x1="0%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor={g.c1} />
          <stop offset="50%" stopColor={g.c2} />
          <stop offset="100%" stopColor={g.c3} />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={g.c3} stopOpacity="0.5" />
          <stop offset="100%" stopColor={g.c3} stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor={g.c1} floodOpacity="0.4" />
        </filter>
      </defs>
      {/* Glow halo */}
      <circle cx="50" cy="45" r="48" fill={`url(#${id}-glow)`} />
      {/* Main star body with 3D shadow */}
      <path
        d="M50 8 L61 38 L93 38 L67 57 L77 88 L50 69 L23 88 L33 57 L7 38 L39 38 Z"
        fill={`url(#${id}-main)`}
        filter={`url(#${id}-shadow)`}
        stroke={g.c1}
        strokeWidth="0.5"
      />
      {/* Top shine highlight */}
      <path
        d="M50 8 L61 38 L93 38 L67 57 L77 88 L50 69 L23 88 L33 57 L7 38 L39 38 Z"
        fill={`url(#${id}-shine)`}
      />
      {/* Inner sparkle */}
      <circle cx="42" cy="30" r="3" fill="#ffffff" opacity="0.8" />
    </svg>
  );
}

export default Star3D;