import { useRef, useState } from 'react';
import { M } from '../../styles/mobileTokens';
import haptics from '../../utils/haptics';

// Pull-to-refresh wrapper. Wrap a scrollable screen body; when the user pulls
// down from the very top past the threshold and releases, onRefresh() runs.
// Shows a branded spinner. Native-feeling resistance + haptic at the trigger.
//
// Props: onRefresh (async fn), children.
export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const active = useRef(false);
  const armed = useRef(false);
  const THRESHOLD = 70;

  const onTouchStart = (e) => {
    if (refreshing) return;
    // Only arm when scrolled to the very top.
    const sc = e.currentTarget;
    if (sc.scrollTop <= 0) {
      active.current = true;
      startY.current = e.touches[0].clientY;
      armed.current = false;
    }
  };
  const onTouchMove = (e) => {
    if (!active.current || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) { setPull(0); return; }
    // Resistance curve.
    const dist = Math.min(110, dy * 0.5);
    setPull(dist);
    if (dist >= THRESHOLD && !armed.current) { armed.current = true; haptics.tap(); }
    if (dist < THRESHOLD) armed.current = false;
  };
  const onTouchEnd = async () => {
    if (!active.current) return;
    active.current = false;
    if (pull >= THRESHOLD && onRefresh) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try { await onRefresh(); } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  const spin = refreshing;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative' }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: pull,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', pointerEvents: 'none',
        transition: active.current ? 'none' : `height ${M.motion.base}`,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          border: `2.5px solid ${M.green3}`, borderTopColor: M.green,
          opacity: Math.min(1, pull / THRESHOLD),
          transform: spin ? 'none' : `rotate(${pull * 3}deg)`,
          animation: spin ? 'pewil-spin 0.7s linear infinite' : 'none',
        }} />
      </div>
      <div style={{
        transform: `translateY(${pull}px)`,
        transition: active.current ? 'none' : `transform ${M.motion.base}`,
      }}>
        {children}
      </div>
      <style>{'@keyframes pewil-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}
