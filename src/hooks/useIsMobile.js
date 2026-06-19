import { useState, useEffect } from 'react';

// Single source of truth for "are we on a phone/mobile shell?".
// 768px is the boundary at which the mobile header + bottom nav take over,
// so content should be mobile-styled at the same point (previously some pages
// used 500px and left the 500–768 range showing desktop layout in a mobile
// shell — this unifies it).
export const MOBILE_BREAKPOINT = 768;
// Narrow phones (single-column, tightest spacing).
export const PHONE_BREAKPOINT = 430;

function read(bp) {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= bp;
}

export default function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState(() => read(breakpoint));

  useEffect(() => {
    const onResize = () => setIsMobile(read(breakpoint));
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [breakpoint]);

  return isMobile;
}

// Convenience: true only on narrow phones.
export function useIsPhone() {
  return useIsMobile(PHONE_BREAKPOINT);
}
