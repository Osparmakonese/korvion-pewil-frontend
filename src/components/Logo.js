import React, { useId } from 'react';

/**
 * Pewil Logo — The Sprout
 *
 * A point-of-sale "P" set in a rounded tile, with a leaf rising from the bowl:
 * commerce + growth, retail + the land, in one glyph.
 *
 * Props:
 *   size       number  - height of the icon tile in px (width = height)
 *   showText   boolean - render the "Pewil" wordmark beside the mark
 *   variant    'light' | 'dark' - wordmark colour for light/dark backgrounds
 *   tagline    boolean - show the tagline under the wordmark
 *   solid      boolean - flat green tile instead of the gradient (print / mono)
 */
export default function Logo({
  size = 36,
  showText = true,
  variant = 'light',
  tagline = false,
  solid = false,
}) {
  const uid = useId().replace(/[:]/g, '');
  const gid = `pewilGrad-${uid}`;

  const inkPrimary = variant === 'dark' ? '#ffffff' : '#0f172a';
  const inkSubtle = variant === 'dark' ? 'rgba(255,255,255,.66)' : '#6b7280';
  const wordSize = Math.round(size * 0.82);
  const tagSize = Math.max(9, Math.round(size * 0.24));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(size * 0.34) }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Pewil"
        style={{ flexShrink: 0, display: 'block' }}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1a6b3a" />
            <stop offset="1" stopColor="#2e9e57" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="108" height="108" rx="30" fill={solid ? '#1a6b3a' : `url(#${gid})`} />
        {/* sprout leaf rising from the bowl */}
        <path d="M66 53 C66 41 74 33 86 32 C85 44 78 53 66 53 Z" fill="#7cf0ae" />
        {/* point-of-sale P */}
        <path
          d="M46 92 V34 H66 a19 19 0 0 1 0 38 H46"
          fill="none"
          stroke="#ffffff"
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <div
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: wordSize,
              fontWeight: 800,
              color: inkPrimary,
              letterSpacing: '-0.01em',
              lineHeight: 1,
            }}
          >
            Pewil
          </div>
          {tagline && (
            <div
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: tagSize,
                fontWeight: 600,
                color: inkSubtle,
                marginTop: Math.round(size * 0.12),
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              Run your business
            </div>
          )}
        </div>
      )}
    </div>
  );
}
