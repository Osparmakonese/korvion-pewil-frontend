import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMarketPrices, createMarketPrice, deleteMarketPrice } from '../api/farmApi';
import { fmt, today, IMAGES } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';
import usePrimaryAction, { focusFirstForm } from '../hooks/usePrimaryAction';

const COMMODITIES = [
  'maize', 'tobacco', 'tomatoes', 'soybeans', 'wheat', 'sunflower',
  'cattle', 'goats', 'sheep', 'pigs', 'broilers', 'eggs', 'other'
];

const UNITS = [
  ['per_kg', 'Per kg'],
  ['per_ton', 'Per ton'],
  ['per_head', 'Per head'],
  ['per_crate', 'Per crate'],
  ['per_dozen', 'Per dozen'],
  ['per_unit', 'Per unit'],
];

const COMMODITY_EMOJI = {
  maize: '🌽',
  tobacco: '🌿',
  tomatoes: '🍅',
  soybeans: '🫘',
  wheat: '🌾',
  sunflower: '🌻',
  cattle: '🐄',
  goats: '🐐',
  sheep: '🐑',
  pigs: '🐷',
  broilers: '🐔',
  eggs: '🥚',
  other: '📦',
};

const empty = {
  commodity: 'maize',
  price: '',
  unit: 'per_kg',
  source: '',
  price_date: today(),
  notes: '',
};

const S = {
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  info: { background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 16px', fontSize: 11, color: '#1d4ed8', marginBottom: 14 },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  card: { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 10, padding: 18, marginBottom: 16 },
  label: { display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 3, marginTop: 8 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, outline: 'none', color: '#111827', boxSizing: 'border-box' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  btn: { width: '100%', padding: '10px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 14 },
  error: { fontSize: 10, color: '#c0392b', marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10 },
  commodityCard: { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 10, padding: 14, marginBottom: 10, display: 'grid', gridTemplateColumns: '3fr 2fr 2fr 1fr', gap: 12, alignItems: 'center', fontSize: 12 },
  commodityName: { fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 },
  commodityEmoji: { fontSize: 20 },
  commodityPrice: { fontSize: 13, fontWeight: 700, color: '#1a6b3a' },
  commodityMeta: { fontSize: 10, color: '#6b7280' },
  trend: { fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 },
  trendUp: { color: '#c0392b' },
  trendDown: { color: '#1a6b3a' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
  th: { textAlign: 'left', padding: '8px 10px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', borderBottom: '1px solid #e3e8e4', background: '#f6f8f6' },
  td: { padding: '8px 10px', borderBottom: '1px solid #f3f4f6', color: '#374151' },
  emptyState: { fontSize: 11, color: '#9ca3af', padding: '20px', textAlign: 'center' },
};

export default function MarketPrices({ onTabChange }) {
  // Top-bar primary action. Farm pages use an inline form rather than a
  // modal, so jump to it — see hooks/usePrimaryAction.js.
  usePrimaryAction(focusFirstForm);

  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [delConfirm, setDelConfirm] = useState(null);
  const [pending, setPending] = useState(null);

  const { data: prices = [], isLoading } = useQuery({
    queryKey: ['marketPrices'],
    queryFn: getMarketPrices,
  });

  const mut = useMutation({
    mutationFn: createMarketPrice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketPrices'] });
      setForm(empty);
    },
  });

  const delMut = useMutation({
    mutationFn: (id) => deleteMarketPrice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketPrices'] });
      setDelConfirm(null);
    },
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.commodity || !form.price) return;
    const payload = {
      commodity: form.commodity,
      price: parseFloat(form.price),
      unit: form.unit,
      source: form.source || null,
      price_date: form.price_date,
      notes: form.notes || null,
    };
    setPending(payload);
    setConfirmOpen(true);
  };

  // Group prices by commodity, show latest for each
  const commodityLatest = {};
  const commodityHistory = {};
  (Array.isArray(prices) ? prices : []).forEach(p => {
    if (!commodityHistory[p.commodity]) {
      commodityHistory[p.commodity] = [];
    }
    commodityHistory[p.commodity].push(p);
    if (!commodityLatest[p.commodity] || new Date(p.price_date) > new Date(commodityLatest[p.commodity].price_date)) {
      commodityLatest[p.commodity] = p;
    }
  });

  // Sort by date desc for history
  Object.keys(commodityHistory).forEach(c => {
    commodityHistory[c].sort((a, b) => new Date(b.price_date) - new Date(a.price_date));
  });

  // Flatten for table (all prices, most recent first)
  const allPrices = (Array.isArray(prices) ? prices : []).sort((a, b) => new Date(b.price_date) - new Date(a.price_date));

  // Calculate trend for each commodity
  const getTrend = (commodity) => {
    const history = commodityHistory[commodity] || [];
    if (history.length < 2) return null;
    const latest = parseFloat(history[0].price);
    const prev = parseFloat(history[1].price);
    const change = latest - prev;
    const pct = ((change / prev) * 100).toFixed(1);
    if (change > 0) return { arrow: '↑', pct, color: S.trendUp };
    if (change < 0) return { arrow: '↓', pct: Math.abs(pct), color: S.trendDown };
    return null;
  };

  return (
    <>
      <div className="two-col-layout" style={S.twoCol}>
        <div>
          <div style={{ position: 'relative', height: 110, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
            <img src={IMAGES.cost} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right,rgba(20,30,60,0.85),rgba(0,0,0,0.25))' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, padding: '12px 16px', color: '#fff', zIndex: 1 }}>
              <div style={S.bannerTitle}>Market Prices</div>
              <div style={S.bannerSub}>Track commodity prices and trends</div>
            </div>
          </div>
          <form style={S.card} onSubmit={submit}>
            <label style={S.label}>Commodity</label>
            <select style={S.input} value={form.commodity} onChange={e => set('commodity', e.target.value)} required>
              {COMMODITIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>

            <div className="form-grid-2" style={S.row2}>
              <div>
                <label style={S.label}>Price ($)</label>
                <input style={S.input} type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" required />
              </div>
              <div>
                <label style={S.label}>Unit</label>
                <select style={S.input} value={form.unit} onChange={e => set('unit', e.target.value)} required>
                  {UNITS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>

            <label style={S.label}>Source (optional)</label>
            <input style={S.input} type="text" value={form.source} onChange={e => set('source', e.target.value)} placeholder="e.g. GMB, Mbare Musika, Auction Floor" />

            <div className="form-grid-2" style={S.row2}>
              <div>
                <label style={S.label}>Price Date</label>
                <input style={S.input} type="date" value={form.price_date} onChange={e => set('price_date', e.target.value)} />
              </div>
            </div>

            <label style={S.label}>Notes (optional)</label>
            <input style={S.input} type="text" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional observations" />

            <button style={S.btn} type="submit" disabled={mut.isPending}>
              {mut.isPending ? 'Saving...' : '+ Log Price'}
            </button>
            {mut.isError && <p style={S.error}>{mut.error?.response?.data?.detail || 'Failed to save'}</p>}
          </form>
        </div>

        <div>
          <div style={S.sectionTitle}>Latest Prices Overview</div>
          {isLoading ? (
            <p style={S.emptyState}>Loading...</p>
          ) : Object.keys(commodityLatest).length === 0 ? (
            <p style={S.emptyState}>No prices logged yet.</p>
          ) : (
            <div>
              {COMMODITIES.map(commodity => {
                const latest = commodityLatest[commodity];
                if (!latest) return null;
                const trend = getTrend(commodity);
                const emoji = COMMODITY_EMOJI[commodity] || '📦';
                return (
                  <div key={commodity} style={S.commodityCard}>
                    <div style={S.commodityName}>
                      <span style={S.commodityEmoji}>{emoji}</span>
                      <span>{commodity.charAt(0).toUpperCase() + commodity.slice(1)}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={S.commodityPrice}>{fmt(latest.price)}</div>
                      <div style={S.commodityMeta}>{latest.unit.replace('per_', '/')}</div>
                    </div>
                    <div style={S.commodityMeta}>
                      <div>{latest.source || '—'}</div>
                      <div>{latest.price_date}</div>
                    </div>
                    {trend && (
                      <div style={{ ...S.trend, ...trend.color }}>
                        {trend.arrow} {trend.pct}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={S.sectionTitle}>Price History</div>
        {isLoading ? (
          <p style={S.emptyState}>Loading...</p>
        ) : (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e3e8e4', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}><table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Date</th>
                  <th style={S.th}>Commodity</th>
                  <th style={S.th}>Price</th>
                  <th style={S.th}>Unit</th>
                  <th style={S.th}>Source</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {allPrices.length === 0 ? (
                  <tr>
                    <td style={S.td} colSpan={6}>No prices logged yet.</td>
                  </tr>
                ) : (
                  allPrices.map((p, i) => (
                    <tr key={p.id || i}>
                      <td style={S.td}>{p.price_date}</td>
                      <td style={S.td}>
                        <span style={{ marginRight: 6 }}>{COMMODITY_EMOJI[p.commodity] || '📦'}</span>
                        {p.commodity.charAt(0).toUpperCase() + p.commodity.slice(1)}
                      </td>
                      <td style={{ ...S.td, fontWeight: 700, color: '#1a6b3a' }}>{fmt(p.price)}</td>
                      <td style={S.td}>{p.unit.replace('per_', '/')}</td>
                      <td style={S.td}>{p.source || '—'}</td>
                      <td style={S.td}>
                        {delConfirm === (p.id || i) ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => delMut.mutate(p.id)} style={{ fontSize: 10, padding: '2px 6px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}>Yes</button>
                            <button onClick={() => setDelConfirm(null)} style={{ fontSize: 10, padding: '2px 6px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 3, cursor: 'pointer' }}>No</button>
                          </div>
                        ) : (
                          <button onClick={() => setDelConfirm(p.id || i)} style={{ fontSize: 10, padding: '2px 6px', background: '#fff', color: '#c0392b', border: '1px solid #fca5a5', borderRadius: 3, cursor: 'pointer' }}>Delete</button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table></div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          mut.mutate(pending);
        }}
        fields={pending ? [
          { label: 'Commodity', value: pending.commodity.charAt(0).toUpperCase() + pending.commodity.slice(1) },
          { label: 'Price', value: fmt(pending.price) },
          { label: 'Unit', value: pending.unit.replace('per_', '/') },
          { label: 'Source', value: pending.source || '—' },
          { label: 'Date', value: pending.price_date },
          { label: 'Notes', value: pending.notes || '—' },
        ] : []}
      />
    </>
  );
}
