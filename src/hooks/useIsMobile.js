import { useState, useEffect } from 'react';

// Single source of truth for "are we on a phone/mobile shell?".
// 768px is the boundary at which the mobile header + bottom nav take over,
// so content should be mobile-styled at the same point (previously some pages
// used 500px and left the 500–768 range showing desktop layout in a mobile
// shell — this unifies it).
export const MOBILE_BREAKPOINT = 768;
// Narrow phones (single-column, tightest spacing).
export const PHONE_BREAKPOINT = 430;

// A TABLET IS A MOBILE SHELL, IN BOTH ORIENTATIONS (2026-09-16)
//
// This was `window.innerWidth <= bp` and nothing else, which made the answer
// depend on which way the device was being held. A 10" tablet is under 768
// in portrait and over it in landscape, so turning it swapped the whole app
// between the mobile shell and the desktop one mid-shift — sidebar appearing,
// bottom nav vanishing, the page relaying out under the cashier's thumb.
//
// A coarse pointer means a finger, and the SHORTER side of a screen does not
// change when the device rotates — so together they answer "is this a hand-held
// device" in a way that survives a turn. 1024 is the shorter side of the
// largest tablet sold (12.9" iPad Pro); a touchscreen laptop at 1920x1080 has
// a shorter side of 1080 and stays on the desktop shell, which is right — it
// has a keyboard.
//
// Only applied to the default breakpoint. `useIsPhone()` asks a genuinely
// narrow question (430px) and must stay width-based, or every tablet would
// claim to be a phone.
function isHandheld() {
  if (typeof window === 'undefined') return false;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  let coarse = false;
  try { coarse = !!window.matchMedia?.('(pointer: coarse)')?.matches; } catch (_) {}
  return coarse && shortSide <= 1024;
}

function read(bp) {
  if (typeof window === 'undefined') return false;
  if (window.innerWidth <= bp) return true;
  return bp === MOBILE_BREAKPOINT ? isHandheld() : false;
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
