/**
 * Pewil Retail — Loss-Prevention Theft Scan
 *
 * Magic: tap once, Claude reviews today's cashier sessions, voids,
 * discounts, cash variances, after-hours sales and flags incidents with
 * severity + suggested action. The owner gets a prioritized list and a
 * store-risk score without reading a single line of raw data.
 *
 * This is the human-facing face of Pewil Retail's Loss-Prevention layer.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { scanForTheft, getAIBudget } from '../api/aiApi';
import useIsMobile from '../hooks/useIsMobile';

const GREEN = '#1a6b3a';
const GREEN_TINT = '#e8f5ee';
const AMBER = '#c97d1a';
const AMBER_TINT = '#fdeedd';
const RED = '#c0392b';
const RED_TINT = '#fde8e8';
const INK = '#111827';
const INK_3 = '#6b7280';
const BORDER = '#e5e7eb';
const SURFACE = '#f9fafb';

const card = {
  background: '#fff',
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: 20,
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
};
const label = {
  fontSize: 11, fontWeight: 700, color: INK_3,
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
};
const btn = {
  padding: '10px 18px', borderRadius: 8, border: 'none',
  fontWeight: 700, fontSize: 13, cursor: 'pointer',
};

const SEVERITY_STYLE = {
  high:   { bg: RED_TINT,    fg: RED,   label: 'HIGH'   },
  medium: { bg: AMBER_TINT,  fg: AMBER, label: 'MEDIUM' },
  low:    { bg: GREEN_TINT,  fg: GREEN, label: 'LOW'    },
};

const BAND_STYLE = {
  red:    { bg: RED_TINT,    fg: RED,   hero: 'High risk'    },
  yellow: { bg: AMBER_TINT,  fg: AMBER, hero: 'Watch closely'},
  green:  { bg: GREEN_TINT,  fg: GREEN, hero: 'All clear'    },
};

const today = () => new Date().toISOString().slice(0, 10);

export default function TheftScan({ onTabChange }) {
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const [date, setDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const { data: budget } = useQuery({
    queryKey: ['aiBudget'],
    queryFn: getAIBudget,
    staleTime: 60_000,
  });

  const runScan = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await scanForTheft(date);
      if (!r.parsed) {
        setError('AI did not return a parsable report. Try again.');
      } else {
        setResult(r);
      }
      qc.invalidateQueries({ queryKey: ['aiBudget'] });
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Scan failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const parsed = result?.parsed || null;
  const score = parsed?.store_risk ?? null;
  const band = (parsed?.risk_band || 'green').toLowerCase();
  const bandStyle = BAND_STYLE[band] || BAND_STYLE.green;

  return (
    <div style={{ padding: 24, background: SURFACE, minHeight: '100%' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: INK }}>
            Loss-Prevention Scan
          </div>
          <div style={{ color: INK_3, fontSize: 14, marginTop: 4 }}>
            AI reviews today's sessions for cash variance, void spikes, heavy discounts, and after-hours sales.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 300px', gap: 16 }}>
          {/* LEFT — scan */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Control bar */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div>
                    <div style={label}>Scan date</div>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      max={today()}
                      style={{
                        padding: '8px 10px', border: `1px solid ${BORDER}`,
                        borderRadius: 8, fontSize: 14, color: INK,
                      }}
                    />
                  </div>
                </div>
                <button
                  style={{ ...btn, background: GREEN, color: '#fff', opacity: loading ? 0.6 : 1 }}
                  onClick={runScan}
                  disabled={loading}
                >
                  {loading ? 'Scanning\u2026' : '\u{1F50D} Run scan'}
                </button>
              </div>
              {error && (
                <div style={{ marginTop: 12, padding: 10, background: RED_TINT, color: RED, borderRadius: 8, fontSize: 13 }}>
                  {error}
                </div>
              )}
            </div>

            {/* Risk hero */}
            {parsed && (
              <div style={{ ...card, background: bandStyle.bg, borderColor: bandStyle.fg }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <RiskDial score={score} color={bandStyle.fg} />
                  <div style={{ flex: 1 }}>
                    <div style={{ ...label, color: bandStyle.fg }}>{bandStyle.hero}</div>
                    <div style={{
                      fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: INK, lineHeight: 1.3,
                    }}>
                      {parsed.headline || 'Scan complete.'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Incidents */}
            {parsed?.incidents?.length > 0 && (
              <div style={card}>
                <div style={label}>
                  Flagged incidents ({parsed.incidents.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {parsed.incidents.map((inc, idx) => {
                    const sev = SEVERITY_STYLE[inc.severity] || SEVERITY_STYLE.low;
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: 14, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${sev.fg}`,
                          borderRadius: 8, background: '#fff',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                              background: sev.bg, color: sev.fg,
                            }}>{sev.label}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>{inc.type || 'Incident'}</span>
                          </div>
                          <div style={{ fontSize: 12, color: INK_3 }}>
                            {inc.cashier ? `@${inc.cashier}` : null}
                            {inc.receipt ? ` • ${inc.receipt}` : null}
                          </div>
                        </div>
                        <div style={{ fontSize: 14, color: INK, marginBottom: 6 }}>{inc.detail}</div>
                        {inc.suggested_action && (
                          <div style={{
                            fontSize: 12, color: INK_3, paddingTop: 6, borderTop: `1px dashed ${BORDER}`,
                          }}>
                            <strong style={{ color: sev.fg }}>Suggested:</strong> {inc.suggested_action}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Positives */}
            {parsed?.positives?.length > 0 && (
              <div style={{ ...card, background: GREEN_TINT, borderColor: GREEN }}>
                <div style={{ ...label, color: GREEN }}>What's going right</div>
                <ul style={{ paddingLeft: 18, margin: 0, color: INK, fontSize: 13, lineHeight: 1.7 }}>
                  {parsed.positives.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}

            {/* Next checks */}
            {parsed?.next_checks?.length > 0 && (
              <div style={card}>
                <div style={label}>Recommended next checks</div>
                <ul style={{ paddingLeft: 18, margin: 0, color: INK, fontSize: 13, lineHeight: 1.7 }}>
                  {parsed.next_checks.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}

            {parsed && parsed.incidents?.length === 0 && (
              <div style={{ ...card, textAlign: 'center', background: GREEN_TINT, borderColor: GREEN, padding: 30 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: GREEN }}>No incidents flagged for {date}.</div>
                <div style={{ fontSize: 13, color: INK_3, marginTop: 6 }}>
                  Your team ran a clean shift.
                </div>
              </div>
            )}

            {!parsed && !loading && (
              <div style={{ ...card, textAlign: 'center', color: INK_3, padding: 40 }}>
                Tap <strong style={{ color: GREEN }}>Run scan</strong> to review today's loss-prevention signals.
              </div>
            )}
          </div>

          {/* RIGHT sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={card}>
              <div style={label}>AI credits</div>
              <div style={{ fontSize: 28, fontFamily: "'Playfair Display', serif", fontWeight: 700, color: GREEN }}>
                {budget?.credits_remaining ?? '—'}
              </div>
              <div style={{ fontSize: 12, color: INK_3 }}>
                remaining of {budget?.credits_total ?? '—'} this month
              </div>
              <div style={{ fontSize: 12, color: INK_3, marginTop: 8 }}>Each scan costs 2 credits.</div>
            </div>

            <div style={card}>
              <div style={label}>What this checks</div>
              <ul style={{ paddingLeft: 16, margin: 0, color: INK_3, fontSize: 13, lineHeight: 1.7 }}>
                <li>Cash variance over $2 per session</li>
                <li>Return rates above 5%</li>
                <li>Discounts over 25% of subtotal</li>
                <li>Sales outside 06:00-22:00</li>
                <li>Cashiers with zero returns but heavy discounts</li>
                <li>Short shifts with high refund counts</li>
              </ul>
            </div>

            <div style={{ ...card, background: GREEN_TINT, borderColor: GREEN }}>
              <div style={{ ...label, color: GREEN }}>Why this matters</div>
              <div style={{ fontSize: 13, color: INK, lineHeight: 1.55 }}>
                Small shops lose 2-8% of revenue to internal shrinkage.
                Pewil's scan is the fastest way to see what's off — without
                accusing anyone.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskDial({ score, color }) {
  const pct = Math.max(0, Math.min(100, Number(score) || 0));
  const r = 38;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <div style={{ position: 'relative', width: 92, height: 92 }}>
      <svg viewBox="0 0 92 92" width="92" height="92">
        <circle cx="46" cy="46" r={r} stroke="#e5e7eb" strokeWidth="8" fill="none" />
        <circle
          cx="46" cy="46" r={r} stroke={color} strokeWidth="8" fill="none"
          strokeDasharray={c} strokeDashoffset={offset}
          transform="rotate(-90 46 46)" strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", color }}>
          {Math.round(pct)}
        </div>
        <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, letterSpacing: '0.08em' }}>RISK</div>
      </div>
    </div>
  );
}
