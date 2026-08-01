import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSeasonBudgets, createSeasonBudget, deleteSeasonBudget, getAnalytics } from '../api/farmApi';
import { fmt, today } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';

const CATEGORIES = [
  ['fertilizer', 'Fertiliser'],
  ['chemical', 'Chemical'],
  ['seed', 'Seed'],
  ['fuel', 'Fuel'],
  ['labour', 'Labour'],
  ['equipment', 'Equipment'],
  ['livestock_feed', 'Livestock Feed'],
  ['livestock_health', 'Livestock Health'],
  ['irrigation', 'Irrigation'],
  ['marketing', 'Marketing'],
  ['other', 'Other'],
];

const emptyForm = {
  season: '',
  category: 'fertilizer',
  planned_amount: '',
  notes: '',
};

const S = {
  hero: {
    position: 'relative',
    height: 110,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
  },
  heroBg: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to right, rgba(20,30,60,0.85), rgba(0,0,0,0.25))',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    padding: '12px 16px',
    color: '#fff',
    zIndex: 1,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    fontFamily: "'Playfair Display', serif",
  },
  bannerSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
  },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 18,
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 10,
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: 3,
    marginTop: 8,
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #e5e7eb',
    borderRadius: 7,
    fontSize: 12,
    outline: 'none',
    color: '#111827',
    boxSizing: 'border-box',
  },
  row2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  btn: {
    width: '100%',
    padding: '10px',
    background: '#1a6b3a',
    color: '#fff',
    border: 'none',
    borderRadius: 7,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 14,
  },
  error: {
    fontSize: 10,
    color: '#c0392b',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 10,
  },
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: '14px 16px',
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: 700,
    color: '#111827',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 11,
  },
  th: {
    textAlign: 'left',
    padding: '8px 10px',
    fontSize: 9,
    fontWeight: 700,
    color: '#9ca3af',
    textTransform: 'uppercase',
    borderBottom: '1px solid #e5e7eb',
    background: '#f9fafb',
  },
  td: {
    padding: '8px 10px',
    borderBottom: '1px solid #f3f4f6',
    color: '#374151',
  },
  progressBar: {
    height: 6,
    background: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: (pct, color) => ({
    height: '100%',
    width: `${Math.min(pct, 100)}%`,
    background: color,
    borderRadius: 3,
  }),
};

export default function Budget({ onTabChange }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);

  // Get current year for default season
  const currentYear = new Date().getFullYear();
  const defaultSeason = `${currentYear}/${currentYear + 1}`;

  const { data: budgets = [] } = useQuery({
    queryKey: ['seasonBudgets', form.season || defaultSeason],
    queryFn: () => getSeasonBudgets(form.season || defaultSeason),
  });

  const { data: analytics = {} } = useQuery({
    queryKey: ['analytics'],
    queryFn: getAnalytics,
  });

  const mut = useMutation({
    mutationFn: createSeasonBudget,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seasonBudgets'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
      setForm(emptyForm);
    },
  });

  const delMut = useMutation({
    mutationFn: (id) => deleteSeasonBudget(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seasonBudgets'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
      setDelConfirm(null);
    },
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.season || !form.category || !form.planned_amount) return;
    const payload = {
      season: form.season,
      category: form.category,
      planned_amount: parseFloat(form.planned_amount),
      notes: form.notes,
    };
    setPending(payload);
    setConfirmOpen(true);
  };

  // Get budget vs actual data from analytics
  const budgetData = analytics.budget_vs_actual || [];
  const currentSeasonData = budgetData.filter(
    (b) => b.season === (form.season || defaultSeason)
  );

  // Calculate totals
  const totalPlanned = currentSeasonData.reduce(
    (sum, b) => sum + parseFloat(b.planned || 0),
    0
  );
  const totalActual = currentSeasonData.reduce(
    (sum, b) => sum + parseFloat(b.actual || 0),
    0
  );
  const totalVariance = totalPlanned - totalActual;
  const overallPctUsed = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;

  const getProgressBarColor = (pctUsed) => {
    if (pctUsed > 100) return '#c0392b'; // red
    if (pctUsed >= 80) return '#c97d1a'; // amber
    return '#1a6b3a'; // green
  };

  return (
    <>
      <div style={S.hero}>
        <img
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 300'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23065f46'/%3E%3Cstop offset='100%25' style='stop-color:%231a6b3a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1200' height='300' fill='url(%23grad)'/%3E%3C/svg%3E"
          alt=""
          style={S.heroBg}
        />
        <div style={S.heroOverlay} />
        <div style={S.heroContent}>
          <div style={S.bannerTitle}>Season Budget</div>
          <div style={S.bannerSub}>Plan your spending vs actual</div>
        </div>
      </div>

      <div className="two-col-layout" style={S.twoCol}>
        <div>
          <div style={S.card}>
            <form onSubmit={submit}>
              <div>
                <label style={S.label}>Season (e.g., 2025/26)</label>
                <input
                  style={S.input}
                  type="text"
                  value={form.season}
                  onChange={(e) => set('season', e.target.value)}
                  placeholder={defaultSeason}
                />
                {!form.season && (
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
                    Using default: {defaultSeason}
                  </div>
                )}
              </div>
              <div>
                <label style={S.label}>Category</label>
                <select
                  style={S.input}
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                >
                  {CATEGORIES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={S.label}>Planned Amount</label>
                <input
                  style={S.input}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.planned_amount}
                  onChange={(e) => set('planned_amount', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label style={S.label}>Notes (optional)</label>
                <input
                  style={S.input}
                  type="text"
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="e.g., Type of fertilizer"
                />
              </div>
              <button style={S.btn} type="submit" disabled={mut.isPending}>
                {mut.isPending ? 'Saving...' : '+ Add Budget Line'}
              </button>
              {mut.isError && (
                <p style={S.error}>
                  {mut.error?.response?.data?.detail || 'Failed to save'}
                </p>
              )}
            </form>
          </div>
        </div>

        <div>
          <div style={S.sectionTitle}>Summary</div>
          <div style={S.summaryCards}>
            <div style={S.summaryCard}>
              <div style={S.summaryLabel}>Total Planned</div>
              <div style={S.summaryValue}>{fmt(totalPlanned)}</div>
            </div>
            <div style={S.summaryCard}>
              <div style={S.summaryLabel}>Total Actual</div>
              <div style={{ ...S.summaryValue, color: '#c0392b' }}>
                {fmt(totalActual)}
              </div>
            </div>
            <div style={S.summaryCard}>
              <div style={S.summaryLabel}>Total Variance</div>
              <div
                style={{
                  ...S.summaryValue,
                  color: totalVariance >= 0 ? '#1a6b3a' : '#c0392b',
                }}
              >
                {fmt(totalVariance)}
              </div>
            </div>
            <div style={S.summaryCard}>
              <div style={S.summaryLabel}>Overall % Used</div>
              <div style={S.summaryValue}>
                {overallPctUsed.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.sectionTitle}>Budget Breakdown by Category</div>
        {currentSeasonData.length === 0 ? (
          <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: 40 }}>
            No budgets set for {form.season || defaultSeason}. Add a budget line above to get started.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ overflowX: 'auto' }}><table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Category</th>
                  <th style={S.th}>Planned</th>
                  <th style={S.th}>Actual</th>
                  <th style={S.th}>Variance</th>
                  <th style={S.th}>Progress</th>
                  <th style={S.th}></th>
                </tr>
              </thead>
              <tbody>
                {currentSeasonData.map((row, i) => {
                  const planned = parseFloat(row.planned || 0);
                  const actual = parseFloat(row.actual || 0);
                  const variance = planned - actual;
                  const pctUsed = planned > 0 ? (actual / planned) * 100 : 0;
                  const barColor = getProgressBarColor(pctUsed);
                  const catLabel = CATEGORIES.find(
                    ([v]) => v === row.category
                  )?.[1] || row.category;

                  return (
                    <tr key={i}>
                      <td style={S.td}>{catLabel}</td>
                      <td style={{ ...S.td, color: '#1a6b3a', fontWeight: 600 }}>
                        {fmt(planned)}
                      </td>
                      <td style={{ ...S.td, color: '#c0392b', fontWeight: 600 }}>
                        {fmt(actual)}
                      </td>
                      <td
                        style={{
                          ...S.td,
                          fontWeight: 600,
                          color:
                            variance >= 0 ? '#1a6b3a' : '#c0392b',
                        }}
                      >
                        {fmt(variance)}
                      </td>
                      <td style={S.td}>
                        <div style={S.progressBar}>
                          <div
                            style={S.progressFill(pctUsed, barColor)}
                          />
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: '#6b7280',
                            marginTop: 2,
                          }}
                        >
                          {pctUsed.toFixed(0)}%
                        </div>
                      </td>
                      <td style={S.td}>
                        {delConfirm === i ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              onClick={() =>
                                delMut.mutate(row.id)
                              }
                              style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                background: '#c0392b',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 3,
                                cursor: 'pointer',
                              }}
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDelConfirm(null)}
                              style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                background: '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: 3,
                                cursor: 'pointer',
                              }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDelConfirm(i)}
                            style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              background: '#fff',
                              color: '#c0392b',
                              border: '1px solid #fca5a5',
                              borderRadius: 3,
                              cursor: 'pointer',
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr
                  style={{
                    background: '#f9fafb',
                    fontWeight: 700,
                  }}
                >
                  <td style={S.td}>TOTAL</td>
                  <td style={{ ...S.td, color: '#1a6b3a' }}>
                    {fmt(totalPlanned)}
                  </td>
                  <td style={{ ...S.td, color: '#c0392b' }}>
                    {fmt(totalActual)}
                  </td>
                  <td style={{ ...S.td, color: totalVariance >= 0 ? '#1a6b3a' : '#c0392b' }}>
                    {fmt(totalVariance)}
                  </td>
                  <td style={S.td}>
                    <div style={S.progressBar}>
                      <div
                        style={S.progressFill(
                          overallPctUsed,
                          getProgressBarColor(overallPctUsed)
                        )}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: '#6b7280',
                        marginTop: 2,
                      }}
                    >
                      {overallPctUsed.toFixed(0)}%
                    </div>
                  </td>
                  <td style={S.td}></td>
                </tr>
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
        fields={
          pending
            ? [
                {
                  label: 'Season',
                  value: pending.season,
                },
                {
                  label: 'Category',
                  value:
                    CATEGORIES.find(([v]) => v === pending.category)?.[1] ||
                    pending.category,
                },
                {
                  label: 'Planned Amount',
                  value: fmt(pending.planned_amount),
                },
                {
                  label: 'Notes',
                  value: pending.notes,
                },
              ]
            : []
        }
      />
    </>
  );
}
