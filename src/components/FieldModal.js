import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFieldReport, getFieldHistory, getFieldPnL } from '../api/farmApi';
import { analyzeAI } from '../api/aiApi';
import { fmt, cropEmoji, cropGradient, cropImage } from '../utils/format';

const S = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 20,
  },
  card: {
    background: '#fff', borderRadius: 14, width: 560, maxHeight: '90vh',
    overflow: 'auto', position: 'relative',
  },
  hero: (crop) => ({
    height: 160, background: cropGradient(crop), position: 'relative',
    borderRadius: '14px 14px 0 0', display: 'flex', alignItems: 'flex-end',
    padding: '0 24px 16px',
  }),
  heroOverlay: {
    position: 'absolute', inset: 0, borderRadius: '14px 14px 0 0',
    background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)',
  },
  closeBtn: {
    position: 'absolute', top: 12, left: 12, width: 32, height: 32,
    borderRadius: '50%', background: 'rgba(0,0,0,0.3)', border: 'none',
    color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  statusBadge: {
    position: 'absolute', top: 12, right: 12, zIndex: 2,
  },
  heroTitle: {
    fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700,
    color: '#fff', position: 'relative', zIndex: 2,
  },
  body: { padding: '20px 24px' },
  statsRow: {
    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
    marginBottom: 20,
  },
  statBox: (color) => ({
    background: color === 'green' ? '#e8f5ee' : color === 'red' ? '#fdecea' : '#fef3e2',
    borderRadius: 8, padding: '12px 14px', textAlign: 'center',
  }),
  statVal: (color) => ({
    fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700,
    color: color === 'green' ? '#1a6b3a' : color === 'red' ? '#c0392b' : '#c97d1a',
  }),
  statLabel: { fontSize: 10, color: '#6b7280', fontWeight: 600, marginTop: 2, textTransform: 'uppercase' },
  infoRow: {
    display: 'flex', justifyContent: 'space-between', padding: '8px 0',
    borderBottom: '1px solid #e5e7eb', fontSize: 12,
  },
  infoLabel: { color: '#6b7280', fontWeight: 500 },
  infoVal: { color: '#111827', fontWeight: 600 },
  sectionTitle: {
    fontSize: 13, fontWeight: 700, color: '#111827', margin: '20px 0 10px',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  expenseRow: {
    display: 'flex', justifyContent: 'space-between', padding: '6px 0',
    borderBottom: '1px solid #f3f4f6', fontSize: 11,
  },
  closedMsg: {
    background: '#f3f4f6', borderRadius: 8, padding: '12px 16px',
    fontSize: 11, color: '#6b7280', marginTop: 16,
  },
  aiBtn: {
    width: '100%', padding: '14px 20px', borderRadius: 8, border: 'none',
    background: 'linear-gradient(135deg, #111827, #374151)', color: '#fff',
    fontSize: 12, fontWeight: 700, cursor: 'pointer', marginTop: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  aiResult: {
    background: '#f9fafb', borderRadius: 8, padding: 16, marginTop: 12,
    fontSize: 12, lineHeight: 1.6, color: '#374151', whiteSpace: 'pre-wrap',
  },
};

export default function FieldModal({ field, isOpen, onClose }) {
  const [analysis, setAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [historyResult, setHistoryResult] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);

  const { data: report } = useQuery({
    queryKey: ['fieldReport', field?.id],
    queryFn: () => getFieldReport(field.id, field.opening_id),
    enabled: !!field?.id && isOpen,
  });

  const { data: pnl } = useQuery({
    queryKey: ['fieldPnl', field?.id],
    queryFn: () => getFieldPnL(field.id),
    enabled: !!field?.id && isOpen,
  });

  useEffect(() => {
    setAnalysis('');
    setHistoryResult('');
  }, [field?.id]);

  if (!isOpen || !field) return null;

  const rev = field.total_revenue || report?.field?.total_revenue || 0;
  const costs = (field.total_costs || 0) + (field.total_labour || 0);
  const totalCosts = report?.field?.total_costs || costs;
  const net = rev - totalCosts;
  const expenses = Array.isArray(report?.expenses) ? report.expenses : [];
  const grouped = expenses.reduce((acc, e) => {
    const cat = e.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(e);
    return acc;
  }, {});

  const runAnalysis = async () => {
    setAiLoading(true);
    try {
      const data = await analyzeAI('farm_field_insights', { field_id: field.id });
      setAnalysis(data.analysis || 'No response received.');
    } catch (err) {
      if (err.response?.status === 402) {
        setAnalysis('You\u2019ve used all your AI credits this month. Credits reset on the 1st.');
      } else {
        setAnalysis('Analysis failed: ' + (err.response?.data?.error || err.message));
      }
    }
    setAiLoading(false);
  };

  const runHistoryAnalysis = async () => {
    setHistoryLoading(true);
    try {
      const question = `Analyse the complete history of field "${field.name}" (${field.crop}, ${field.size_hectares || field.hectares} ha). Identify: 1) Best performing season and why, 2) Key patterns in inputs and timing, 3) Cost efficiency by category, 4) Market patterns, 5) Specific recommendations for next season.`;
      const data = await analyzeAI('natural_language_query', { question });
      setHistoryResult(data.analysis || 'No response received.');
    } catch (err) {
      if (err.response?.status === 402) {
        setHistoryResult('You\u2019ve used all your AI credits this month. Credits reset on the 1st.');
      } else {
        setHistoryResult('History analysis failed: ' + (err.response?.data?.error || err.message));
      }
    }
    setHistoryLoading(false);
  };

  const statusPill = field.status === 'active' ? 'pill-green' : field.status === 'closed' ? 'pill-red' : 'pill-amber';
  const age = field.plant_date ? Math.floor((Date.now() - new Date(field.plant_date).getTime()) / 86400000) : null;

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.card} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        {/* Hero */}
        <div style={{ ...S.hero(field.crop), position: 'relative', overflow: 'hidden' }}>
          <img src={cropImage(field?.crop)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={S.heroOverlay} />
          <button style={S.closeBtn} onClick={onClose}>✕</button>
          <div className={statusPill} style={{ ...S.statusBadge }}>{field.status}</div>
          <span style={{ ...S.heroTitle, position: 'relative', zIndex: 1 }}>{cropEmoji(field.crop)} {field.name}</span>
        </div>

        {/* Body */}
        <div style={S.body}>
          {/* Stats — prefer live P&L if available */}
          {(() => {
            const pRev = pnl ? pnl.revenue : rev;
            const pCost = pnl ? pnl.expenses : totalCosts;
            const pNet = pnl ? pnl.profit : net;
            return (
              <div style={S.statsRow}>
                <div style={S.statBox('green')}>
                  <div style={S.statVal('green')}>{fmt(pRev)}</div>
                  <div style={S.statLabel}>Revenue</div>
                </div>
                <div style={S.statBox('red')}>
                  <div style={S.statVal('red')}>{fmt(pCost)}</div>
                  <div style={S.statLabel}>Total Costs</div>
                </div>
                <div style={S.statBox(pNet >= 0 ? 'green' : 'red')}>
                  <div style={S.statVal(pNet >= 0 ? 'green' : 'red')}>{fmt(pNet)}</div>
                  <div style={S.statLabel}>Net Position</div>
                </div>
              </div>
            );
          })()}

          {/* P&L Breakdown */}
          {pnl && (
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>P&L Breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                <div style={{ color: '#6b7280' }}>Crate Revenue</div>
                <div style={{ textAlign: 'right', color: '#1a6b3a', fontWeight: 600 }}>{fmt(pnl.crate_revenue)}</div>
                <div style={{ color: '#6b7280' }}>Direct Income</div>
                <div style={{ textAlign: 'right', color: '#1a6b3a', fontWeight: 600 }}>{fmt(pnl.direct_income)}</div>
                <div style={{ color: '#6b7280', borderTop: '1px solid #e5e7eb', paddingTop: 6 }}>Tagged Expenses</div>
                <div style={{ textAlign: 'right', color: '#c0392b', fontWeight: 600, borderTop: '1px solid #e5e7eb', paddingTop: 6 }}>{fmt(pnl.tagged_expenses)}</div>
                <div style={{ color: '#6b7280' }}>Wages</div>
                <div style={{ textAlign: 'right', color: '#c0392b', fontWeight: 600 }}>{fmt(pnl.wages)}</div>
                <div style={{ color: '#6b7280' }}>Stock Used</div>
                <div style={{ textAlign: 'right', color: '#c0392b', fontWeight: 600 }}>{fmt(pnl.stock_cost)}</div>
                <div style={{ color: '#111827', fontWeight: 700, borderTop: '2px solid #1a6b3a', paddingTop: 6 }}>Profit Margin</div>
                <div style={{ textAlign: 'right', fontWeight: 700, borderTop: '2px solid #1a6b3a', paddingTop: 6, color: pnl.margin >= 0 ? '#1a6b3a' : '#c0392b' }}>{pnl.margin.toFixed(1)}%</div>
              </div>
            </div>
          )}

          {/* Info rows */}
          <div style={S.infoRow}><span style={S.infoLabel}>Crop</span><span style={S.infoVal}>{cropEmoji(field.crop)} {field.crop}</span></div>
          <div style={S.infoRow}><span style={S.infoLabel}>Size</span><span style={S.infoVal}>{field.size_hectares || field.hectares} ha</span></div>
          <div style={S.infoRow}><span style={S.infoLabel}>Planted</span><span style={S.infoVal}>{field.plant_date || '—'}</span></div>
          <div style={S.infoRow}><span style={S.infoLabel}>Status</span><span style={S.infoVal}>{field.status}</span></div>
          {age !== null && field.status === 'active' && (
            <div style={S.infoRow}><span style={S.infoLabel}>Age</span><span style={S.infoVal}>{age} days</span></div>
          )}
          <div style={S.infoRow}><span style={S.infoLabel}>Input costs</span><span style={S.infoVal}>{fmt(field.total_costs || report?.input_costs || 0)}</span></div>
          <div style={S.infoRow}><span style={S.infoLabel}>Labour costs</span><span style={S.infoVal}>{fmt(field.total_labour || report?.labour_costs || 0)}</span></div>
          <div style={S.infoRow}><span style={S.infoLabel}>Revenue earned</span><span style={S.infoVal}>{fmt(rev)}</span></div>

          {/* Expense history */}
          {Object.keys(grouped).length > 0 && (
            <>
              <div style={S.sectionTitle}>📋 Field Expense History</div>
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>{cat}</div>
                  {items.map((ex, i) => (
                    <div key={i} style={S.expenseRow}>
                      <span style={{ color: '#6b7280' }}>{ex.date} — {ex.description || cat}</span>
                      <span style={{ color: '#c0392b', fontWeight: 600 }}>{fmt(ex.amount)}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div style={{ ...S.infoRow, borderBottom: 'none', fontWeight: 700 }}>
                <span>Total Expenses</span>
                <span style={{ color: '#c0392b' }}>{fmt(expenses.reduce((s, e) => s + (e.amount || 0), 0))}</span>
              </div>
            </>
          )}

          {/* Closed message */}
          {field.status === 'closed' && field.closed_date && (
            <div style={S.closedMsg}>
              Field closed on {field.closed_date}. Costs from this season are locked.
            </div>
          )}

          {/* Smart Analysis */}
          <button style={S.aiBtn} onClick={runAnalysis} disabled={aiLoading}>
            {aiLoading ? '⏳ Analyzing…' : '🤖 Smart Analysis — What should I know about this field?'}
          </button>
          {analysis && <div style={S.aiResult}>{analysis}</div>}

          {/* History Analysis */}
          <button
            style={{width:'100%', padding:'12px', background:'linear-gradient(135deg, #0D4A22, #1a6b3a)', color:'#fff', border:'none', borderRadius:'10px', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginTop:'8px'}}
            onClick={runHistoryAnalysis}
            disabled={historyLoading}
          >
            📊 {historyLoading ? 'Analysing history...' : 'Field History Analysis — What patterns should I know?'}
          </button>
          {historyResult && (
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4, #e8f5ee)',
              border: '2px solid #0D4A22',
              borderRadius: 8, padding: 16, marginTop: 12,
              fontSize: 12, lineHeight: 1.6, color: '#1a3a2a', whiteSpace: 'pre-wrap',
            }}>
              {historyResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
