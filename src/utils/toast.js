/**
 * Lightweight, self-contained toast.
 *
 * Mirrors the DOM-injection approach already proven by utils/confirm.js —
 * it mounts its own node on document.body rather than living in the React
 * tree. That deliberately keeps it free of context, providers and re-render
 * side effects, so it can be called from anywhere (including a global
 * react-query handler) without touching component structure.
 *
 * Usage:
 *   toast('Saved');
 *   toast({ message: 'Could not save', kind: 'error' });
 */

const STACK_ID = 'pewil-toast-stack';
const MAX_VISIBLE = 3;

function stack() {
  let el = document.getElementById(STACK_ID);
  if (el) return el;
  el = document.createElement('div');
  el.id = STACK_ID;
  Object.assign(el.style, {
    position: 'fixed',
    zIndex: '2147483000',       // above the manager-PIN modal (10001)
    left: '50%',
    bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))', // clears mobile bottom nav
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'center',
    width: 'min(520px, calc(100vw - 32px))',
    pointerEvents: 'none',
  });
  document.body.appendChild(el);
  return el;
}

const PALETTE = {
  error:   { bg: '#7f1d1d', fg: '#fff', icon: '!' },
  success: { bg: '#1a6b3a', fg: '#fff', icon: '✓' },
  info:    { bg: '#1f2937', fg: '#fff', icon: 'i' },
};

export function toast(optsOrMessage) {
  const opts = typeof optsOrMessage === 'string'
    ? { message: optsOrMessage }
    : (optsOrMessage || {});
  const {
    message = '',
    kind = 'info',
    duration = kind === 'error' ? 7000 : 3500,
  } = opts;

  if (!message) return () => {};

  const host = stack();
  // Cap the stack so a burst of failures can't cover the screen.
  while (host.children.length >= MAX_VISIBLE) host.removeChild(host.firstChild);

  const pal = PALETTE[kind] || PALETTE.info;
  const el = document.createElement('div');
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  Object.assign(el.style, {
    background: pal.bg,
    color: pal.fg,
    borderRadius: '10px',
    padding: '11px 14px',
    fontSize: '13px',
    lineHeight: '1.45',
    fontFamily: "'Inter', system-ui, sans-serif",
    boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    width: '100%',
    boxSizing: 'border-box',
    pointerEvents: 'auto',
    cursor: 'pointer',
    opacity: '0',
    transform: 'translateY(8px)',
    transition: 'opacity .18s ease, transform .18s ease',
  });

  const badge = document.createElement('span');
  badge.textContent = pal.icon;
  Object.assign(badge.style, {
    flex: '0 0 18px', height: '18px', borderRadius: '50%',
    background: 'rgba(255,255,255,0.22)', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center',
    fontSize: '11px', fontWeight: '700', marginTop: '1px',
  });

  const text = document.createElement('span');
  text.textContent = String(message);
  text.style.flex = '1';

  el.appendChild(badge);
  el.appendChild(text);
  host.appendChild(el);

  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });

  let timer = null;
  const dismiss = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
  };
  el.addEventListener('click', dismiss);
  timer = setTimeout(dismiss, duration);
  return dismiss;
}

/**
 * Turn an axios/DRF error into something a shopkeeper can act on.
 * DRF returns {detail: "..."} , a field map {field: ["msg"]}, or a bare string.
 */
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const res = err?.response;
  const data = res?.data;

  if (res?.status === 402) return 'Your subscription needs attention — open Billing to continue.';
  if (res?.status === 403) return 'You do not have permission to do that.';
  if (res?.status === 404) return 'That item no longer exists. Refresh and try again.';
  if (!res && err?.message) {
    return /network|timeout/i.test(err.message)
      ? 'No connection. Your work is queued and will sync when you are back online.'
      : fallback;
  }

  if (typeof data === 'string' && data.trim() && !data.trim().startsWith('<')) return data;
  if (typeof data?.detail === 'string') return data.detail;

  if (data && typeof data === 'object') {
    const parts = [];
    for (const [k, v] of Object.entries(data)) {
      const val = Array.isArray(v) ? v.join(', ') : (typeof v === 'string' ? v : null);
      if (!val) continue;
      parts.push(k === 'non_field_errors' ? val : `${k.replace(/_/g, ' ')}: ${val}`);
    }
    if (parts.length) return parts.join(' · ');
  }
  return fallback;
}

export default toast;
