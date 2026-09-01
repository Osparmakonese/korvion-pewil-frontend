// TicketBoard — the till's view of work coming from stations (2026-09-01).
//
// Mounted by POS.js ONLY when the tenant's features include 'tickets'
// (pharmacy, butchery, clothing, restaurant, hardware, wholesale,
// manufacturing). A grocery lane never renders this component, so it can
// never affect a grocery till. Self-contained: own polling, own errors.
import { useEffect, useState, useCallback } from 'react';
import { getTicketBoard, refreshTicketPayment } from '../api/retailApi';

const STATION_LABEL = {
  dispensary: 'Dispensary', counter: 'Counter', kitchen: 'Kitchen',
  fitting_room: 'Fitting room', quote_desk: 'Quote desk', other: 'Station',
};

function ago(seconds) {
  if (seconds < 60) return 'just now';
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export default function TicketBoard({ branchId, onClaim, onClose, claiming }) {
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getTicketBoard(branchId ? { branch: branchId } : {});
      setTickets(Array.isArray(data) ? data : (data?.results || []));
      setError('');
    } catch (e) {
      setError('Could not reach the ticket board. It will retry.');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [load]);

  const checkPaid = async (tk) => {
    try { await refreshTicketPayment(tk.id); load(); } catch (_) {}
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 100vw)', zIndex: 60,
      background: '#fff', borderLeft: '1px solid #e5e7eb', boxShadow: '-12px 0 32px rgba(0,0,0,0.12)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderBottom: '1px solid #e5e7eb' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>🎫 Tickets waiting</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>From the dispensary / counter. Tap one to load it at this till.</div>
        </div>
        <button onClick={onClose} style={{ border: '1px solid #d1d5db', background: '#fff', borderRadius: 8,
                                           padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>Close</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {loading && <div style={{ fontSize: 12, color: '#6b7280' }}>Loading…</div>}
        {error && <div style={{ fontSize: 12, color: '#991b1b', marginBottom: 8 }}>{error}</div>}
        {!loading && tickets.length === 0 && (
          <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', padding: 24 }}>
            Nothing waiting. Tickets appear here the moment a station sends one.
          </div>
        )}
        {tickets.map((tk) => {
          const paid = tk.paid_ahead || tk.status === 'paid';
          const stale = tk.age_seconds > 20 * 60;
          return (
            <div key={tk.id} style={{
              border: `1px solid ${paid ? '#bde3cc' : stale ? '#fcd34d' : '#e5e7eb'}`,
              background: paid ? '#f2faf5' : '#fff', borderRadius: 12, padding: 12, marginBottom: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 0.5 }}>{tk.number}</div>
                <div style={{ fontSize: 11, color: stale ? '#92400e' : '#6b7280', fontWeight: stale ? 700 : 400 }}>
                  {ago(tk.age_seconds || 0)}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>
                {STATION_LABEL[tk.station] || tk.station}
                {tk.customer_name ? ` · ${tk.customer_name}` : ''}
                {tk.patient_detail?.name && !tk.customer_name ? ` · ${tk.patient_detail.name}` : ''}
              </div>
              {tk.patient_detail?.allergies && (
                <div style={{ fontSize: 11, color: '#991b1b', fontWeight: 700, marginTop: 4 }}>
                  ⚠ Allergies: {tk.patient_detail.allergies}
                </div>
              )}
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                {(tk.lines || []).slice(0, 4).map((l, i) => (
                  <div key={i}>• {l.name} × {l.qty}</div>
                ))}
                {(tk.lines || []).length > 4 && <div>… and {(tk.lines || []).length - 4} more</div>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>
                  {tk.total}
                  {paid && <span style={{ marginLeft: 8, fontSize: 10, background: '#1a6b3a', color: '#fff',
                                          padding: '2px 8px', borderRadius: 10, fontWeight: 800 }}>PAID</span>}
                  {!paid && tk.payment_txn && (
                    <button onClick={() => checkPaid(tk)} style={{ marginLeft: 8, fontSize: 10, border: '1px dashed #d1d5db',
                                                                  background: '#fff', borderRadius: 8, padding: '2px 8px', cursor: 'pointer' }}>
                      check payment
                    </button>
                  )}
                </div>
                <button
                  onClick={() => onClaim(tk)}
                  disabled={claiming === tk.id}
                  style={{ background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 10,
                           padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  {claiming === tk.id ? 'Loading…' : (paid ? 'Hand over' : 'Load at till')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
