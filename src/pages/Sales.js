import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFields, getTrips, createIncome, getIncome, createDeparture, updateTripEntry, createGiveaway, createSpecialSale, settleTrip } from '../api/farmApi';
import { fmt, today, IMAGES } from '../utils/format';

/* ── helpers ── */
const emptyDepEntry = { field: '', large_sent: '', medium_sent: '', small_sent: '' };
const emptyDeparture = { location: '', departure_date: today(), driver: '', entries: [{ ...emptyDepEntry }], food_expense: '', fuel_expense: '' };
const emptyDirect = { field: '', amount: '', description: '', date: today() };

const emptyGiveaway = () => ({ qty: '', recipient: '', reason: '', location: 'at_market', date: today() });
const emptySpecial = () => ({ size: 'Large', qty: '', price: '', reason: '' });

/* ── styles ── */
const S = {
  page: { maxWidth: 1100, margin: '0 auto' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' },
  banner: { height: 90, borderRadius: 10, padding: '20px 24px', marginBottom: 14, background: 'linear-gradient(135deg, rgba(180,40,0,0.9), rgba(200,60,20,0.8))', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif", textShadow: '0 1px 3px rgba(0,0,0,0.3)' },
  bannerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, textShadow: '0 1px 2px rgba(0,0,0,0.2)' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18, marginBottom: 16 },
  label: { display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 3, marginTop: 8 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, outline: 'none', color: '#111827', boxSizing: 'border-box' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 },
  entryBox: { background: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 10, border: '1px solid #e5e7eb' },
  addBtn: { width: '100%', padding: '8px', background: 'none', border: '1px dashed #1a6b3a', borderRadius: 7, color: '#1a6b3a', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 10 },
  btn: { width: '100%', padding: '10px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10, marginTop: 16 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
  th: { textAlign: 'left', padding: '8px 10px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '8px 10px', borderBottom: '1px solid #f3f4f6', color: '#374151' },
  rightCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 14 },
  tabs: { display: 'flex', gap: 0, marginBottom: 16 },
  tab: (active) => ({ flex: 1, padding: '10px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb', background: active ? '#1a6b3a' : '#fff', color: active ? '#fff' : '#374151', transition: 'all .15s' }),
  pill: (active) => ({ padding: '6px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb', borderRadius: 20, background: active ? '#111827' : '#fff', color: active ? '#fff' : '#374151', transition: 'all .15s' }),
  pendingBanner: { background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 10, padding: '14px 18px', marginBottom: 14 },
  pendingTitle: { fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 6 },
  pendingItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(245,158,11,0.2)' },
  badge: (color) => ({ display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase', background: color === 'amber' ? '#fef3c7' : '#dcfce7', color: color === 'amber' ? '#92400e' : '#166534' }),
  settleBtn: { padding: '5px 12px', fontSize: 10, fontWeight: 700, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
  info: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#1e40af', marginBottom: 12 },
  grayInfo: { background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#374151', marginBottom: 12 },
  collapseHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', marginBottom: 8 },
  summaryBox: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', fontSize: 10, color: '#166534', marginTop: 8, fontWeight: 500 },
  warningText: { color: '#dc2626', fontWeight: 700 },
  smallAddBtn: { padding: '4px 10px', fontSize: 10, fontWeight: 600, background: 'none', border: '1px dashed #6b7280', borderRadius: 6, color: '#6b7280', cursor: 'pointer', marginTop: 6 },
  removeLink: { background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 10, fontWeight: 700 },
};

export default function Sales() {
  const qc = useQueryClient();
  const [mainTab, setMainTab] = useState('trip'); // 'trip' | 'income'
  const [subMode, setSubMode] = useState('departure'); // 'departure' | 'settle'
  const [settlingTrip, setSettlingTrip] = useState(null); // trip object being settled
  const [departure, setDeparture] = useState(emptyDeparture);
  const [direct, setDirect] = useState(emptyDirect);
  const [settlementData, setSettlementData] = useState({}); // keyed by entry id
  const [returnDate, setReturnDate] = useState(today());
  const [settling, setSettling] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState({});
  const [expandedTrips, setExpandedTrips] = useState({});

  const { data: fields = [] } = useQuery({ queryKey: ['fields'], queryFn: getFields });
  const { data: trips = [] } = useQuery({ queryKey: ['trips'], queryFn: getTrips });
  const { data: incomes = [] } = useQuery({ queryKey: ['income'], queryFn: getIncome });

  const pendingTrips = trips.filter(t => t.status === 'pending');
  const sortedTrips = [...trips].sort((a, b) => new Date(b.departure_date || b.date) - new Date(a.departure_date || a.date));

  /* ── Departure mutation ── */
  const depMut = useMutation({
    mutationFn: createDeparture,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trips'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setDeparture(emptyDeparture); },
  });

  /* ── Direct income mutation ── */
  const incMut = useMutation({
    mutationFn: createIncome,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['income'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setDirect(emptyDirect); },
  });

  /* ── Departure helpers ── */
  const setD = (k, v) => setDeparture(p => ({ ...p, [k]: v }));
  const setDepEntry = (i, k, v) => { const e = [...departure.entries]; e[i] = { ...e[i], [k]: v }; setDeparture(p => ({ ...p, entries: e })); };
  const addDepEntry = () => setDeparture(p => ({ ...p, entries: [...p.entries, { ...emptyDepEntry }] }));
  const removeDepEntry = (i) => setDeparture(p => ({ ...p, entries: p.entries.filter((_, j) => j !== i) }));

  const submitDeparture = (e) => {
    e.preventDefault();
    depMut.mutate({
      location: departure.location,
      trip_date: departure.departure_date,
      driver: departure.driver,
      status: 'pending',
      entries: departure.entries.map(en => ({
        field: parseInt(en.field),
        large_sent: parseInt(en.large_sent) || 0,
        medium_sent: parseInt(en.medium_sent) || 0,
        small_sent: parseInt(en.small_sent) || 0,
      })),
      food_expense: parseFloat(departure.food_expense) || 0,
      fuel_expense: parseFloat(departure.fuel_expense) || 0,
    });
  };

  /* ── Settlement helpers ── */
  const startSettle = (trip) => {
    setSettlingTrip(trip);
    setSubMode('settle');
    setMainTab('trip');
    setReturnDate(today());
    const init = {};
    (trip.entries || []).forEach(ent => {
      init[ent.id] = {
        large_sold: '', medium_sold: '', small_sold: '',
        price_large: '', price_medium: '', price_small: '',
        returned: '', damaged: '',
        specials: [], giveaways: [],
      };
    });
    setSettlementData(init);
    const exp = {};
    (trip.entries || []).forEach(ent => { exp[ent.id] = true; });
    setExpandedEntries(exp);
  };

  const setSE = (entryId, k, v) => setSettlementData(p => ({ ...p, [entryId]: { ...p[entryId], [k]: v } }));

  const addSpecial = (entryId) => setSettlementData(p => ({
    ...p, [entryId]: { ...p[entryId], specials: [...(p[entryId].specials || []), emptySpecial()] }
  }));
  const removeSpecial = (entryId, idx) => setSettlementData(p => ({
    ...p, [entryId]: { ...p[entryId], specials: p[entryId].specials.filter((_, i) => i !== idx) }
  }));
  const setSpecial = (entryId, idx, k, v) => setSettlementData(p => {
    const specials = [...p[entryId].specials];
    specials[idx] = { ...specials[idx], [k]: v };
    return { ...p, [entryId]: { ...p[entryId], specials } };
  });

  const addGiveaway = (entryId) => setSettlementData(p => ({
    ...p, [entryId]: { ...p[entryId], giveaways: [...(p[entryId].giveaways || []), emptyGiveaway()] }
  }));
  const removeGiveaway = (entryId, idx) => setSettlementData(p => ({
    ...p, [entryId]: { ...p[entryId], giveaways: p[entryId].giveaways.filter((_, i) => i !== idx) }
  }));
  const setGiveaway = (entryId, idx, k, v) => setSettlementData(p => {
    const giveaways = [...p[entryId].giveaways];
    giveaways[idx] = { ...giveaways[idx], [k]: v };
    return { ...p, [entryId]: { ...p[entryId], giveaways } };
  });

  const calcTotals = (entry, sd) => {
    if (!sd) return { sent: 0, sold: 0, special: 0, gifted: 0, damaged: 0, returned: 0, unaccounted: 0 };
    const sent = (entry.large_sent || 0) + (entry.medium_sent || 0) + (entry.small_sent || 0);
    const sold = (parseInt(sd.large_sold) || 0) + (parseInt(sd.medium_sold) || 0) + (parseInt(sd.small_sold) || 0);
    const special = (sd.specials || []).reduce((s, sp) => s + (parseInt(sp.qty) || 0), 0);
    const gifted = (sd.giveaways || []).reduce((s, g) => s + (parseInt(g.qty) || 0), 0);
    const damaged = parseInt(sd.damaged) || 0;
    const returned = parseInt(sd.returned) || 0;
    const unaccounted = sent - sold - special - gifted - damaged - returned;
    return { sent, sold, special, gifted, damaged, returned, unaccounted };
  };

  const submitSettlement = async () => {
    if (!settlingTrip) return;
    setSettling(true);
    try {
      // 1. PATCH each entry via updateTripEntry so sold/price fields are saved
      for (const ent of (settlingTrip.entries || [])) {
        const sd = settlementData[ent.id] || {};
        await updateTripEntry(ent.id, {
          large_sold: parseInt(sd.large_sold) || 0,
          medium_sold: parseInt(sd.medium_sold) || 0,
          small_sold: parseInt(sd.small_sold) || 0,
          price_large: parseFloat(sd.price_large) || 0,
          price_medium: parseFloat(sd.price_medium) || 0,
          price_small: parseFloat(sd.price_small) || 0,
          crates_returned: parseInt(sd.returned) || 0,
          crates_damaged: parseInt(sd.damaged) || 0,
        });
      }

      // 2. POST giveaways and special sales
      for (const ent of (settlingTrip.entries || [])) {
        const sd = settlementData[ent.id];
        if (!sd) continue;

        for (const g of (sd.giveaways || [])) {
          if (parseInt(g.qty) > 0) {
            await createGiveaway({
              trip: settlingTrip.id,
              trip_entry: ent.id,
              quantity: parseInt(g.qty),
              recipient: g.recipient || '',
              reason: g.reason,
              location: g.location || 'at_market',
              date: g.date || today(),
            });
          }
        }

        for (const sp of (sd.specials || [])) {
          if (parseInt(sp.qty) > 0) {
            await createSpecialSale({
              trip: settlingTrip.id,
              trip_entry: ent.id,
              size: sp.size,
              quantity: parseInt(sp.qty),
              price_per_crate: parseFloat(sp.price) || 0,
              reason: sp.reason || '',
            });
          }
        }
      }

      // 3. Settle trip (entries already patched, backend calculates revenue)
      await settleTrip(settlingTrip.id, { return_date: returnDate });

      // 4. Refetch
      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setSettlingTrip(null);
      setSubMode('departure');
      setSettlementData({});
    } catch (err) {
      alert('Settlement failed: ' + (err?.response?.data?.detail || err.message || 'Unknown error'));
    }
    setSettling(false);
  };

  const submitDirect = (e) => {
    e.preventDefault();
    incMut.mutate({ field: parseInt(direct.field), amount: parseFloat(direct.amount), description: direct.description, income_date: direct.date });
  };

  const toggleExpand = (id) => setExpandedEntries(p => ({ ...p, [id]: !p[id] }));
  const toggleTripExpand = (id) => setExpandedTrips(p => ({ ...p, [id]: !p[id] }));

  const totalSentForTrip = (trip) => (trip.entries || []).reduce((s, e) => s + (e.large_sent || 0) + (e.medium_sent || 0) + (e.small_sent || 0), 0);

  /* ════════════════════════════ RENDER ════════════════════════════ */
  return (
    <div style={S.page}>
      {/* Hero banner */}
      <div style={{ position: 'relative', height: 110, borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
        <img src={IMAGES.truck} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(180,40,0,0.78), rgba(0,0,0,0.2))' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, padding: '12px 16px', color: '#fff', zIndex: 1 }}>
          <div style={S.bannerTitle}>Sales & Market Trips</div>
          <div style={S.bannerSub}>Record departures, settle trips, track direct income</div>
        </div>
      </div>

      {/* Pending trips banner */}
      {pendingTrips.length > 0 && (
        <div style={S.pendingBanner}>
          <div style={S.pendingTitle}>⏳ {pendingTrips.length} Pending Trip{pendingTrips.length > 1 ? 's' : ''} — Driver out, awaiting settlement</div>
          {pendingTrips.map(pt => (
            <div key={pt.id} style={S.pendingItem}>
              <span style={{ fontSize: 11 }}>
                <strong>{pt.location}</strong> · {pt.driver || 'Unknown driver'} · {pt.departure_date || pt.date} · {totalSentForTrip(pt)} crates
              </span>
              <button style={S.settleBtn} onClick={() => startSettle(pt)}>Settle Trip →</button>
            </div>
          ))}
        </div>
      )}

      {/* Main tabs */}
      <div style={S.tabs}>
        <div style={{ ...S.tab(mainTab === 'trip'), borderRadius: '8px 0 0 8px' }} onClick={() => setMainTab('trip')}>🚚 Record Trip</div>
        <div style={{ ...S.tab(mainTab === 'income'), borderRadius: '0 8px 8px 0' }} onClick={() => setMainTab('income')}>💰 Direct Income</div>
      </div>

      {/* ═══ TAB 1: TRIPS ═══ */}
      {mainTab === 'trip' && (
        <div className="two-col-layout" style={S.twoCol}>
          {/* LEFT */}
          <div>
            {/* Sub-mode pills */}
            {!settlingTrip && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                <span style={S.pill(subMode === 'departure')} onClick={() => { setSubMode('departure'); setSettlingTrip(null); }}>📤 New Departure</span>
                <span style={S.pill(subMode === 'settle')} onClick={() => setSubMode('settle')}>📥 Settle Trip</span>
              </div>
            )}

            {/* ── DEPARTURE FORM ── */}
            {subMode === 'departure' && !settlingTrip && (
              <form style={S.card} onSubmit={submitDeparture}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Record Departure — Driver leaving farm</div>
                <div style={S.info}>📋 Record this BEFORE the driver leaves. You can settle when they return.</div>

                <div className="form-grid-2" style={S.row2}>
                  <div><label style={S.label}>Market / Buyer</label><input style={S.input} value={departure.location} onChange={e => setD('location', e.target.value)} placeholder="e.g. Mbare Musika" required /></div>
                  <div><label style={S.label}>Departure Date</label><input style={S.input} type="date" value={departure.departure_date} onChange={e => setD('departure_date', e.target.value)} /></div>
                </div>
                <label style={S.label}>Driver / Seller</label>
                <input style={S.input} value={departure.driver} onChange={e => setD('driver', e.target.value)} placeholder="Driver name" />

                {departure.entries.map((en, i) => (
                  <div key={i} style={S.entryBox}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 600 }}>Field Entry {i + 1}</span>
                      {departure.entries.length > 1 && <button type="button" onClick={() => removeDepEntry(i)} style={S.removeLink}>Remove</button>}
                    </div>
                    <select style={S.input} value={en.field} onChange={e => setDepEntry(i, 'field', e.target.value)} required>
                      <option value="">Select field…</option>
                      {fields.filter(f => f.status === 'active').map(f => <option key={f.id} value={f.id}>{f.name} ({f.crop})</option>)}
                    </select>
                    <div style={{ ...S.row3, marginTop: 6 }}>
                      <div><label style={{ ...S.label, marginTop: 2 }}>Large crates</label><input style={S.input} type="number" min="0" value={en.large_sent} onChange={e => setDepEntry(i, 'large_sent', e.target.value)} placeholder="0" /></div>
                      <div><label style={{ ...S.label, marginTop: 2 }}>Medium crates</label><input style={S.input} type="number" min="0" value={en.medium_sent} onChange={e => setDepEntry(i, 'medium_sent', e.target.value)} placeholder="0" /></div>
                      <div><label style={{ ...S.label, marginTop: 2 }}>Small crates</label><input style={S.input} type="number" min="0" value={en.small_sent} onChange={e => setDepEntry(i, 'small_sent', e.target.value)} placeholder="0" /></div>
                    </div>
                  </div>
                ))}
                <button type="button" style={S.addBtn} onClick={addDepEntry}>＋ Add Another Field</button>

                <div className="form-grid-2" style={S.row2}>
                  <div><label style={S.label}>Food Expense</label><input style={S.input} type="number" min="0" step="0.01" value={departure.food_expense} onChange={e => setD('food_expense', e.target.value)} placeholder="0" /></div>
                  <div><label style={S.label}>Fuel Expense</label><input style={S.input} type="number" min="0" step="0.01" value={departure.fuel_expense} onChange={e => setD('fuel_expense', e.target.value)} placeholder="0" /></div>
                </div>

                <button style={{ ...S.btn, marginTop: 14, background: '#1a6b3a' }} type="submit" disabled={depMut.isPending}>
                  {depMut.isPending ? 'Sending…' : '🚛 Send Driver to Market →'}
                </button>
                {depMut.isError && <p style={{ color: '#c0392b', fontSize: 10, marginTop: 4 }}>{depMut.error?.response?.data?.detail || 'Failed'}</p>}
              </form>
            )}

            {/* ── SETTLE TRIP: choose one ── */}
            {subMode === 'settle' && !settlingTrip && (
              <div style={S.card}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Select a Pending Trip to Settle</div>
                {pendingTrips.length === 0 ? (
                  <p style={{ fontSize: 11, color: '#9ca3af' }}>No pending trips to settle. Record a departure first.</p>
                ) : (
                  pendingTrips.map(pt => (
                    <div key={pt.id} style={{ ...S.entryBox, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{pt.location}</div>
                        <div style={{ fontSize: 10, color: '#6b7280' }}>{pt.driver || 'Unknown'} · {pt.departure_date || pt.date} · {totalSentForTrip(pt)} crates</div>
                      </div>
                      <button style={S.settleBtn} onClick={() => startSettle(pt)}>Settle Trip →</button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── SETTLEMENT FORM ── */}
            {settlingTrip && (
              <div style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                    Settle Trip — {settlingTrip.location} · {settlingTrip.departure_date || settlingTrip.date}
                  </div>
                  <button onClick={() => { setSettlingTrip(null); setSubMode('departure'); }} style={{ ...S.removeLink, fontSize: 11 }}>✕ Cancel</button>
                </div>
                <div style={S.grayInfo}>
                  Driver: <strong>{settlingTrip.driver || 'Unknown'}</strong> · Sent: <strong>{totalSentForTrip(settlingTrip)} crates</strong>
                </div>

                {(settlingTrip.entries || []).map(ent => {
                  const sd = settlementData[ent.id] || {};
                  const totals = calcTotals(ent, sd);
                  const isExpanded = expandedEntries[ent.id] !== false;
                  const fieldObj = fields.find(f => f.id === ent.field);
                  const fieldLabel = fieldObj ? `${fieldObj.name} (${fieldObj.crop})` : `Field #${ent.field}`;
                  const entSent = (ent.large_sent || 0) + (ent.medium_sent || 0) + (ent.small_sent || 0);

                  return (
                    <div key={ent.id} style={{ marginBottom: 12 }}>
                      <div style={S.collapseHeader} onClick={() => toggleExpand(ent.id)}>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>🌾 {fieldLabel}</span>
                          <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 8 }}>sent: {entSent} crates</span>
                        </div>
                        <span style={{ fontSize: 14, color: '#6b7280' }}>{isExpanded ? '▾' : '▸'}</span>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: '0 8px' }}>
                          {/* Normal sales */}
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', marginBottom: 6, marginTop: 8 }}>Normal Sales</div>
                          <div className="form-grid-3" style={S.row3}>
                            <div><label style={S.label}>Large sold</label><input style={S.input} type="number" min="0" value={sd.large_sold || ''} onChange={e => setSE(ent.id, 'large_sold', e.target.value)} placeholder="0" /></div>
                            <div><label style={S.label}>Medium sold</label><input style={S.input} type="number" min="0" value={sd.medium_sold || ''} onChange={e => setSE(ent.id, 'medium_sold', e.target.value)} placeholder="0" /></div>
                            <div><label style={S.label}>Small sold</label><input style={S.input} type="number" min="0" value={sd.small_sold || ''} onChange={e => setSE(ent.id, 'small_sold', e.target.value)} placeholder="0" /></div>
                          </div>
                          <div className="form-grid-3" style={S.row3}>
                            <div><label style={S.label}>$/large crate</label><input style={S.input} type="number" min="0" step="0.01" value={sd.price_large || ''} onChange={e => setSE(ent.id, 'price_large', e.target.value)} placeholder="0.00" /></div>
                            <div><label style={S.label}>$/medium crate</label><input style={S.input} type="number" min="0" step="0.01" value={sd.price_medium || ''} onChange={e => setSE(ent.id, 'price_medium', e.target.value)} placeholder="0.00" /></div>
                            <div><label style={S.label}>$/small crate</label><input style={S.input} type="number" min="0" step="0.01" value={sd.price_small || ''} onChange={e => setSE(ent.id, 'price_small', e.target.value)} placeholder="0.00" /></div>
                          </div>

                          {/* Returned + Damaged */}
                          <div style={{ ...S.row2, marginTop: 8 }}>
                            <div><label style={S.label}>Crates returned unsold</label><input style={S.input} type="number" min="0" value={sd.returned || ''} onChange={e => setSE(ent.id, 'returned', e.target.value)} placeholder="0" /></div>
                            <div><label style={S.label}>Damaged crates</label><input style={S.input} type="number" min="0" value={sd.damaged || ''} onChange={e => setSE(ent.id, 'damaged', e.target.value)} placeholder="0" /></div>
                          </div>

                          {/* Special price sales */}
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', marginTop: 12, marginBottom: 4 }}>Special Price Sales</div>
                          {(sd.specials || []).map((sp, si) => (
                            <div key={si} style={{ ...S.entryBox, padding: 8, marginBottom: 6 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontSize: 10, fontWeight: 600, color: '#6b7280' }}>Special #{si + 1}</span>
                                <button type="button" onClick={() => removeSpecial(ent.id, si)} style={S.removeLink}>Remove</button>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', gap: 4 }}>
                                <select style={{ ...S.input, fontSize: 10 }} value={sp.size} onChange={e => setSpecial(ent.id, si, 'size', e.target.value)}>
                                  <option>Large</option><option>Medium</option><option>Small</option>
                                </select>
                                <input style={S.input} type="number" min="0" value={sp.qty} onChange={e => setSpecial(ent.id, si, 'qty', e.target.value)} placeholder="Qty" />
                                <input style={S.input} type="number" min="0" step="0.01" value={sp.price} onChange={e => setSpecial(ent.id, si, 'price', e.target.value)} placeholder="$/crate" />
                                <input style={S.input} value={sp.reason} onChange={e => setSpecial(ent.id, si, 'reason', e.target.value)} placeholder="Reason" />
                              </div>
                            </div>
                          ))}
                          <button type="button" style={S.smallAddBtn} onClick={() => addSpecial(ent.id)}>+ Add special price sale</button>

                          {/* Giveaways */}
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', marginTop: 12, marginBottom: 4 }}>Giveaways — Free Crates</div>
                          {(sd.giveaways || []).map((g, gi) => (
                            <div key={gi} style={{ ...S.entryBox, padding: 8, marginBottom: 6 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontSize: 10, fontWeight: 600, color: '#6b7280' }}>Giveaway #{gi + 1}</span>
                                <button type="button" onClick={() => removeGiveaway(ent.id, gi)} style={S.removeLink}>Remove</button>
                              </div>
                              <div style={{ ...S.row3, marginBottom: 4 }}>
                                <div><label style={{ ...S.label, marginTop: 0 }}>Quantity</label><input style={S.input} type="number" min="0" value={g.qty} onChange={e => setGiveaway(ent.id, gi, 'qty', e.target.value)} placeholder="0" /></div>
                                <div><label style={{ ...S.label, marginTop: 0 }}>Recipient</label><input style={S.input} value={g.recipient} onChange={e => setGiveaway(ent.id, gi, 'recipient', e.target.value)} placeholder="Name (optional)" /></div>
                                <div><label style={{ ...S.label, marginTop: 0 }}>Reason <span style={{ color: '#dc2626' }}>*</span></label><input style={S.input} value={g.reason} onChange={e => setGiveaway(ent.id, gi, 'reason', e.target.value)} placeholder="Required" required /></div>
                              </div>
                              <div className="form-grid-2" style={S.row2}>
                                <div>
                                  <label style={{ ...S.label, marginTop: 0 }}>Location</label>
                                  <div style={{ display: 'flex', gap: 12, fontSize: 11, marginTop: 4 }}>
                                    <label><input type="radio" name={`loc-${ent.id}-${gi}`} checked={g.location === 'at_farm'} onChange={() => setGiveaway(ent.id, gi, 'location', 'at_farm')} /> At farm</label>
                                    <label><input type="radio" name={`loc-${ent.id}-${gi}`} checked={g.location === 'at_market'} onChange={() => setGiveaway(ent.id, gi, 'location', 'at_market')} /> At market</label>
                                  </div>
                                </div>
                                <div><label style={{ ...S.label, marginTop: 0 }}>Date</label><input style={S.input} type="date" value={g.date} onChange={e => setGiveaway(ent.id, gi, 'date', e.target.value)} /></div>
                              </div>
                            </div>
                          ))}
                          <button type="button" style={S.smallAddBtn} onClick={() => addGiveaway(ent.id)}>+ Add giveaway</button>

                          {/* Running totals */}
                          <div style={S.summaryBox}>
                            Sent: {totals.sent} · Sold: {totals.sold} · Special: {totals.special} · Gifted: {totals.gifted} · Damaged: {totals.damaged} · Returned: {totals.returned}
                            {totals.unaccounted !== 0 && (
                              <span style={S.warningText}> · ⚠️ Unaccounted: {totals.unaccounted}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <label style={S.label}>Return Date</label>
                <input style={S.input} type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} />

                <button
                  style={{ ...S.btn, marginTop: 14, background: '#1a6b3a' }}
                  onClick={submitSettlement}
                  disabled={settling}
                >
                  {settling ? '⏳ Settling…' : '✅ Settle Trip ✓'}
                </button>
              </div>
            )}
          </div>

          {/* RIGHT — Trip History */}
          <div>
            <div style={S.rightCard}>
              <div style={S.sectionTitle}>Trip History</div>
              {sortedTrips.length === 0 ? (
                <p style={{ fontSize: 11, color: '#9ca3af' }}>No trips yet.</p>
              ) : (
                sortedTrips.map(t => {
                  const isOpen = expandedTrips[t.id];
                  const totalSent = totalSentForTrip(t);
                  return (
                    <div key={t.id} style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 8, marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{t.location}</div>
                          <div style={{ fontSize: 10, color: '#6b7280' }}>{t.driver || ''} · {t.departure_date || t.date}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {t.status === 'pending' ? (
                            <>
                              <span style={S.badge('amber')}>Pending</span>
                              <button style={{ ...S.settleBtn, fontSize: 9, padding: '3px 8px' }} onClick={() => startSettle(t)}>Settle →</button>
                            </>
                          ) : (
                            <span style={S.badge('green')}>Settled</span>
                          )}
                          <span style={{ cursor: 'pointer', fontSize: 12, color: '#6b7280' }} onClick={() => toggleTripExpand(t.id)}>{isOpen ? '▾' : '▸'}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                        {totalSent} crates sent{t.status !== 'pending' && <> → <strong style={{ color: '#1a6b3a' }}>{fmt(t.revenue || t.total_revenue || 0)}</strong></>}
                      </div>

                      {isOpen && (
                        <div style={{ marginTop: 6, paddingLeft: 8, borderLeft: '2px solid #e5e7eb' }}>
                          {(t.entries || []).map((ent, ei) => {
                            const fieldObj = fields.find(f => f.id === ent.field);
                            const entSent = (ent.large_sent || 0) + (ent.medium_sent || 0) + (ent.small_sent || 0);
                            const entRev = (ent.large_sold || 0) * (ent.price_large || 0) + (ent.medium_sold || 0) * (ent.price_medium || 0) + (ent.small_sold || 0) * (ent.price_small || 0);
                            return (
                              <div key={ei} style={{ fontSize: 10, padding: '3px 0', color: '#374151' }}>
                                <strong>{fieldObj ? fieldObj.name : `Field #${ent.field}`}</strong>: {entSent} sent
                                {t.status !== 'pending' && (
                                  <> · sold {(ent.large_sold || 0) + (ent.medium_sold || 0) + (ent.small_sold || 0)} · returned {ent.crates_returned || 0} · damaged {ent.crates_damaged || 0} → <strong style={{ color: '#1a6b3a' }}>{fmt(entRev)}</strong></>
                                )}
                              </div>
                            );
                          })}
                          {t.food_expense > 0 && <div style={{ fontSize: 10, color: '#6b7280' }}>Food: {fmt(t.food_expense)}</div>}
                          {t.fuel_expense > 0 && <div style={{ fontSize: 10, color: '#6b7280' }}>Fuel: {fmt(t.fuel_expense)}</div>}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB 2: DIRECT INCOME ═══ */}
      {mainTab === 'income' && (
        <div className="two-col-layout" style={S.twoCol}>
          <div>
            <form style={S.card} onSubmit={submitDirect}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10 }}>💵 Record Direct Income</div>
              <div className="form-grid-2" style={S.row2}>
                <div>
                  <label style={S.label}>Field</label>
                  <select style={S.input} value={direct.field} onChange={e => setDirect(p => ({ ...p, field: e.target.value }))} required>
                    <option value="">Select…</option>
                    {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div><label style={S.label}>Amount</label><input style={S.input} type="number" min="0" step="0.01" value={direct.amount} onChange={e => setDirect(p => ({ ...p, amount: e.target.value }))} required placeholder="0.00" /></div>
              </div>
              <label style={S.label}>Description</label>
              <input style={S.input} value={direct.description} onChange={e => setDirect(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Gate sale, GMB delivery" />
              <label style={S.label}>Date</label>
              <input style={S.input} type="date" value={direct.date} onChange={e => setDirect(p => ({ ...p, date: e.target.value }))} />
              <button style={{ ...S.btn, marginTop: 12 }} type="submit" disabled={incMut.isPending}>{incMut.isPending ? 'Saving…' : '💰 Save Income'}</button>
              {incMut.isError && <p style={{ color: '#c0392b', fontSize: 10, marginTop: 4 }}>Failed to save</p>}
            </form>
          </div>

          <div>
            <div style={S.rightCard}>
              <div style={S.sectionTitle}>Income History</div>
              {(Array.isArray(incomes) ? incomes : []).length === 0 ? (
                <p style={{ fontSize: 11, color: '#9ca3af' }}>No income logged.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}><table style={S.table}>
                  <thead><tr><th style={S.th}>Description</th><th style={S.th}>Date</th><th style={S.th}>Amount</th></tr></thead>
                  <tbody>{(Array.isArray(incomes) ? incomes : []).slice(0, 10).map((inc, i) => (
                    <tr key={inc.id || i}>
                      <td style={S.td}>{inc.description || 'Income'}</td>
                      <td style={S.td}>{inc.date}</td>
                      <td style={{ ...S.td, fontWeight: 700, color: '#1a6b3a' }}>{fmt(inc.amount)}</td>
                    </tr>
                  ))}</tbody>
                </table></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
