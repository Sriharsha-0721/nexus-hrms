import React from 'react';

const Logo = ({ size = 36, className = '', style = {} }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    >
      <defs>
        {/* N Gradient (deep blue/cyan) */}
        <linearGradient id="nGrad" x1="15" y1="15" x2="65" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0052d4" />
          <stop offset="50%" stopColor="#4364f7" />
          <stop offset="100%" stopColor="#00d2ff" />
        </linearGradient>
        {/* X Stroke A (silver/grey) */}
        <linearGradient id="silverA" x1="47" y1="15" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        {/* X Stroke B (silver/grey) */}
        <linearGradient id="silverB" x1="47" y1="85" x2="80" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      
      {/* 1. Stroke A of X (backmost) */}
      <path 
        d="M 47 15 L 80 85" 
        stroke="url(#silverA)" 
        strokeWidth="14" 
        strokeLinecap="square" 
      />
      
      {/* 2. Right vertical stem of N */}
      <path 
        d="M 58 15 L 58 85" 
        stroke="url(#nGrad)" 
        strokeWidth="14" 
        strokeLinecap="square" 
      />
      
      {/* 3. Stroke B of X (crosses over Right vertical stem of N, behind Diagonal of N) */}
      <path 
        d="M 47 85 L 80 15" 
        stroke="url(#silverB)" 
        strokeWidth="14" 
        strokeLinecap="square" 
      />
      
      {/* 4. Left vertical stem and Diagonal of N (frontmost) */}
      <path 
        d="M 22 85 L 22 15 L 58 85" 
        stroke="url(#nGrad)" 
        strokeWidth="14" 
        fill="none" 
        strokeLinejoin="miter" 
        strokeLinecap="square" 
      />
    </svg>
  );
};

export default Logo;
