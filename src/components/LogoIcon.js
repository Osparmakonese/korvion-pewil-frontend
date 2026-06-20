import React, { useId } from 'react';

/**
 * Pewil mark only — the Sprout tile. A point-of-sale "P" with a leaf rising
 * from the bowl. Use where just the glyph is needed (avatars, compact headers).
 */
export default function LogoIcon({ size = 32, solid = false }) {
  const uid = useId().replace(/[:]/g, '');
  const gid = `pewilIcon-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Pewil"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a6b3a" />
          <stop offset="1" stopColor="#2e9e57" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="108" height="108" rx="30" fill={solid ? '#1a6b3a' : `url(#${gid})`} />
      <path d="M66 53 C66 41 74 33 86 32 C85 44 78 53 66 53 Z" fill="#7cf0ae" />
      <path
        d="M46 92 V34 H66 a19 19 0 0 1 0 38 H46"
        fill="none"
        stroke="#ffffff"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
