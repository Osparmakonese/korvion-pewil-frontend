import { useEffect, useRef, useState } from 'react';
import { M } from '../../styles/mobileTokens';
import haptics from '../../utils/haptics';

// Native-feel bottom sheet: backdrop, rounded top, grabber, drag-down to
// dismiss with velocity, safe-area aware. Dependency-free.
//
// Props:
//   open      — boolean
//   onClose   — () => void
//   title     — optional header text
//   children  — body
//   peak      — optional max height (default 88vh)
export default function BottomSheet({ open, onClose, title, children, peak = '88vh' }) {
  const [mounted, setMounted] = useState(open);
  const [dragY, setDragY] = useState(0);
  const startY = useRef(0);
  const dragging = useRef(false);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const vel = useRef(0);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setDragY(0);
      haptics.select();
    } else if (mounted) {
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll while open.
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mounted]);

  if (!mounted) return null;

  const onTouchStart = (e) => {
    dragging.current = true;
    startY.current = e.touches[0].clientY;
    lastY.current = startY.current;
    lastT.current = Date.now();
    vel.current = 0;
  };
  const onTouchMove = (e) => {
    if (!dragging.current) return;
    const y = e.touches[0].clientY;
    const dy = Math.max(0, y - startY.current);
    const now = Date.now();
    if (now > lastT.current) vel.current = (y - lastY.current) / (now - lastT.current);
    lastY.current = y; lastT.current = now;
    setDragY(dy);
  };
  const onTouchEnd = () => {
    dragging.current = false;
    if (dragY > 120 || vel.current > 0.6) {
      onClose && onClose();
    } else {
      setDragY(0);
    }
  };

  const visible = open && dragY === 0;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: M.z.sheet,
        background: `rgba(17,24,39,${open ? 0.45 : 0})`,
        transition: `background ${M.motion.base}`,
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        style={{
          width: '100%', maxHeight: peak,
          background: M.card,
          borderTopLeftRadius: M.radius.xl, borderTopRightRadius: M.radius.xl,
          boxShadow: M.shadow.sheet,
          transform: `translateY(${open ? dragY : 800}px)`,
          transition: dragging.current ? 'none' : `transform ${M.motion.sheet}`,
          paddingBottom: M.safeBottom,
          display: 'flex', flexDirection: 'column',
          willChange: 'transform',
        }}
      >
        {/* Grabber + header (drag area) */}
        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
             style={{ padding: '10px 16px 6px', touchAction: 'none' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#d1d5db', margin: '0 auto 8px' }} />
          {title && <div style={{ fontSize: M.font.h2, fontWeight: 700, color: M.ink, textAlign: 'center' }}>{title}</div>}
        </div>
        <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 16px 16px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
