/**
 * Pewil Retail — Supplier Price Drift Detector
 *
 * Magic: one tap shows where your suppliers have quietly raised their
 * costs over the last 30 days, compared to the 30 days before that.
 * Each flagged item comes with a ready-to-send negotiation script.
 *
 * This is the retail-side loss-prevention feature that protects margin
 * *at the source* — before goods even hit the shelf.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { scanPriceDrift, getAIBudget } from '../api/aiApi';
import { fmt } from '../utils/format';
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
  background: '#fff', border: `1px solid ${BORDER}`,
  borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
};
const label = {
  fontSize: 11, fontWeight: 700, color: INK_3,
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
};
const btn = {
  padding: '10px 18px', borderRadius: 8, border: 'none',
  fontWeight: 700, fontSize: 13, cursor: 'pointer',
};

const URGENCY_STYLE = {
  urgent:   { bg: RED_TINT,   fg: RED,   label: 'URGENT'   },
  material: { bg: AMBER_TINT, fg: AMBER, label: 'MATERIAL' },
  watch:    { bg: GREEN_TINT, fg: GREEN, label: 'WATCH'    },
};

const fmtMoney = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? fmt(v) : '—';
};
const fmtPct = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
};

export default function PriceDrift({ onTabChange }) {
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const [windowDays, setWindowDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(-1);

  const { data: budget } = useQuery({
    queryKey: ['aiBudget'],
    queryFn: getAIBudget,
    staleTime: 60_000,
  });

  const runScan = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await scanPriceDrift(windowDays);
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

  const copyScript = async (idx, script) => {
    try { await navigator.clipboard.writeText(script); } catch (_) {}
    setCopied(idx);
    setTimeout(() => setCopied(-1), 1500);
  };

  const parsed = result?.parsed || null;
  const flagged = parsed?.flagged || [];

  return (
    <div style={{ padding: 24, background: SURFACE, minHeight: '100%' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: INK }}>
            Supplier Price Drift
          </div>
          <div style={{ color: INK_3, fontSize: 14, marginTop: 4 }}>
            AI spots which suppliers have quietly raised prices this window — with a negotiation script per item.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 300px', gap: 16 }}>
          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Control */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={label}>Comparison window</div>
                  <select
                    value={windowDays}
                    onChange={(e) => setWindowDays(Number(e.target.value))}
                    style={{
                      padding: '8px 10px', border: `1px solid ${BORDER}`,
                      borderRadius: 8, fontSize: 14, color: INK, background: '#fff',
                    }}
                  >
                    <option value={14}>Last 14 days vs prior 14 days</option>
                    <option value={30}>Last 30 days vs prior 30 days</option>
                    <option value={60}>Last 60 days vs prior 60 days</option>
                    <option value={90}>Last 90 days vs prior 90 days</option>
                  </select>
                </div>
                <button
                  style={{ ...btn, background: GREEN, color: '#fff', opacity: loading ? 0.6 : 1 }}
                  onClick={runScan}
                  disabled={loading}
                >
                  {loading ? 'Scanning\u2026' : '\u{1F4B0} Scan cost drift'}
                </button>
              </div>
              {error && (
                <div style={{ marginTop: 12, padding: 10, background: RED_TINT, color: RED, borderRadius: 8, fontSize: 13 }}>
                  {error}
                </div>
              )}
            </div>

            {/* Summary */}
            {parsed && (
              <div style={card}>
                <div style={label}>Scan result</div>
                <div style={{
                  fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700,
                  color: INK, marginBottom: 12, lineHeight: 1.3,
                }}>
                  {parsed.headline || 'Scan complete.'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <Pill label="Urgent" value={parsed.urgent_count ?? 0} color={RED} />
                  <Pill label="Material" value={parsed.material_count ?? 0} color={AMBER} />
                  <Pill label="Flagged total" value={flagged.length} color={INK} />
                </div>
                {parsed.summary && (
                  <div style={{ marginTop: 14, padding: 12, background: SURFACE, borderRadius: 8, color: INK, fontSize: 14, lineHeight: 1.55 }}>
                    {parsed.summary}
                  </div>
                )}
              </div>
            )}

            {/* Flagged items */}
            {flagged.length > 0 && (
              <div style={card}>
                <div style={label}>Flagged items ({flagged.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {flagged.map((f, idx) => {
                    const urg = URGENCY_STYLE[f.urgency] || URGENCY_STYLE.watch;
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: 14, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${urg.fg}`,
                          borderRadius: 8, background: '#fff',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                                background: urg.bg, color: urg.fg,
                              }}>{urg.label}</span>
                              <span style={{
                                fontSize: 13, fontWeight: 700, color: f.change_pct > 0 ? RED : GREEN,
                              }}>{fmtPct(f.change_pct)}</span>
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: INK }}>{f.product}</div>
                            <div style={{ fontSize: 12, color: INK_3, marginTop: 2 }}>from {f.supplier}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: INK_3, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                              was → is
                            </div>
                            <div style={{ fontSize: 15, color: INK, fontWeight: 700 }}>
                              {fmtMoney(f.previous_avg_cost)} → <span style={{ color: urg.fg }}>{fmtMoney(f.current_avg_cost)}</span>
                            </div>
                          </div>
                        </div>
                        {f.negotiation_script && (
                          <div style={{
                            marginTop: 10, padding: 10, background: SURFACE,
                            borderRadius: 6, fontSize: 13, color: INK, fontStyle: 'italic',
                          }}>
                            {'\u201C'}{f.negotiation_script}{'\u201D'}
                            <button
                              onClick={() => copyScript(idx, f.negotiation_script)}
                              style={{
                                ...btn, marginLeft: 10, padding: '4px 10px', fontSize: 11,
                                background: copied === idx ? GREEN : '#fff',
                                color: copied === idx ? '#fff' : INK,
                                border: `1px solid ${copied === idx ? GREEN : BORDER}`,
                              }}
                            >
                              {copied === idx ? '\u2713 copied' : 'Copy'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {parsed && flagged.length === 0 && (
              <div style={{ ...card, textAlign: 'center', background: GREEN_TINT, borderColor: GREEN, padding: 30 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: GREEN }}>No material drift detected.</div>
                <div style={{ fontSize: 13, color: INK_3, marginTop: 6 }}>
                  Your suppliers are holding prices steady over the last {windowDays} days.
                </div>
              </div>
            )}

            {!parsed && !loading && (
              <div style={{ ...card, textAlign: 'center', color: INK_3, padding: 40 }}>
                Tap <strong style={{ color: GREEN }}>Scan cost drift</strong> to find quiet price hikes.
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
              <div style={label}>How this works</div>
              <ol style={{ paddingLeft: 16, margin: 0, color: INK_3, fontSize: 13, lineHeight: 1.7 }}>
                <li>We group PO line items by supplier + product.</li>
                <li>We compare average unit cost: last window vs prior window.</li>
                <li>Items drifting 5%+ get flagged; 15%+ marked urgent.</li>
                <li>Claude writes a negotiation script you can copy-paste.</li>
              </ol>
            </div>

            <div style={{ ...card, background: GREEN_TINT, borderColor: GREEN }}>
              <div style={{ ...label, color: GREEN }}>Margin saved is margin earned</div>
              <div style={{ fontSize: 13, color: INK, lineHeight: 1.55 }}>
                A 3% cost creep across 20 products is a full week's profit
                gone. Pewil catches it before you pay the next invoice.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pill({ label: lbl, value, color }) {
  return (
    <div style={{ padding: 12, background: SURFACE, borderRadius: 8, textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: INK_3, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{lbl}</div>
      <div style={{ fontSize: 26, fontFamily: "'Playfair Display', serif", fontWeight: 700, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}
