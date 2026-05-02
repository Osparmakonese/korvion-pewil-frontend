import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * DemoBanner — thin sticky bar rendered at the top of the app shell
 * whenever the signed-in user is on the live-demo tenant (`user.is_demo`).
 *
 * Writes for demo tenants are blocked server-side by core.middleware
 * DemoWriteGuard, so every action the visitor clicks is either a harmless
 * read or a 403 with a friendly "start a trial" pointer. This banner
 * explains that up front + gives a single-click path to register.
 */
export default function DemoBanner() {
  const { user, logout } = useAuth();
  if (!user || !user.is_demo) return null;

  // "← Home" exits the demo cleanly: clears the demo session token and lands
  // the visitor on the public landing page. Without this, demo visitors hit
  // a dead end with no obvious way out (only the "Start free trial" CTA
  // pointed forward, never backward). Reported 2026-04-24.
  const exitDemo = () => { try { logout(); } catch (_) {} };

  return (
    <div
      role="status"
      style={{
        // 2026-04-30 — switched from `sticky` to `relative` so the banner
        // takes its own line in document flow and never sits on top of
        // page content. The previous sticky+z-index:1100 setup was
        // overlapping the first row of every page (dashboard hero,
        // products grid, POS tiles) on mobile because the layout's
        // mobile-header is also sticky at top:0 with a lower z-index —
        // the two stack into a 100px+ overlay that hides data.
        position: 'relative',
        width: '100%',
        background: 'linear-gradient(135deg, #f4a743, #d9562c)',
        color: '#fff',
        padding: '8px 14px',
        marginBottom: 12,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        flexWrap: 'wrap',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 13,
        fontWeight: 500,
        boxShadow: '0 2px 8px rgba(0,0,0,.10)',
      }}
    >
      <Link
        to="/"
        onClick={exitDemo}
        aria-label="Exit demo and return to home"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 999,
          background: 'rgba(255,255,255,0.18)', color: '#fff',
          fontWeight: 600, textDecoration: 'none',
          border: '1px solid rgba(255,255,255,0.4)',
        }}
      >
        ← Home
      </Link>
      <span
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          flex: '1 1 auto', justifyContent: 'center', minWidth: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
            background: '#fff', boxShadow: '0 0 0 4px rgba(255,255,255,.2)',
            flex: '0 0 auto',
          }}
        />
        You're viewing the live demo — changes aren't saved.
      </span>
      <Link
        to="/register"
        onClick={exitDemo}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 999,
          background: '#fff', color: '#b13b17',
          fontWeight: 700, textDecoration: 'none',
          boxShadow: '0 2px 6px rgba(0,0,0,.12)',
        }}
      >
        Start 14-day free trial →
      </Link>
    </div>
  );
}
