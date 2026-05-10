/**
 * ChainRollup — HQ-level dashboard showing every branch side-by-side.
 *
 * Owner-only chain dashboard. Surfaces today's revenue, transaction count,
 * product totals, low-stock alerts, and open tills across every branch
 * in the tenant's account, plus chain-wide totals at the top.
 *
 * Backend shape (getChainRollup):
 *   {
 *     totals: {
 *       today_revenue: number,
 *       today_transactions: number,
 *       products_count: number,
 *       low_stock_alerts: number,
 *       open_tills: number,
 *     },
 *     branches: [
 *       {
 *         id, name, code, is_hq,
 *         today_revenue, today_transactions,
 *         products_count, low_stock_alerts, open_tills,
 *       },
 *       ...
 *     ],
 *   }
 *
 * Click on a branch row to highlight it (placeholder until per-branch
 * detail pages land).
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getChainRollup } from '../api/retailApi';
import { fmt } from '../utils/format';
import BackLink from '../components/BackLink';

const T = {
  green:   '#1a6b3a',
  greenT:  '#e8f5ee',
  green2:  '#0f4d28',
  amber:   '#c77700',
  amberT:  '#fdeedd',
  red:     '#c0392b',
  redT:    '#fde8e8',
  ink:     '#111827',
  inkSoft: '#374151',
  muted:   '#6b7280',
  line:    '#e5e7eb',
  surface: '#f9fafb',
};

export default function ChainRollup() {
  const [selectedId, setSelectedId] = useState(null);
  const [isMobile, setIsMobile] = React.useState(
    typeof window !== 'undefined' && window.innerWidth <= 720
  );
  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 720);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['chain-rollup'],
    queryFn: getChainRollup,
    staleTime: 30_000,
  });

  const totals = data?.totals || {};
  const branches = data?.branches || [];
  const branchCount = branches.length;

  return (
    <div style={{
      padding: 32, fontFamily: "'Inter', system-ui, sans-serif",
      background: T.surface, minHeight: '100%', color: T.ink,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 8 }}>
          <BackLink to="/app" label="Back to dashboard" variant="subtle" />
        </div>

        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 28, fontWeight: 700, color: T.ink, margin: 0,
        }}>Chain rollup</h1>
        <p style={{ color: T.muted, fontSize: 14, marginTop: 6, lineHeight: 1.55, maxWidth: 640 }}>
          Every branch at a glance — today's revenue, transactions,
          low-stock alerts, open tills.
        </p>

        {isLoading && (
          <div style={{ color: T.muted, padding: 40, textAlign: 'center' }}>
            Loading chain data…
          </div>
        )}

        {isError && (
          <div style={{
            background: T.redT, color: T.red,
            padding: '12px 16px', borderRadius: 8,
            fontSize: 13, marginTop: 18,
          }}>
            Could not load chain rollup: {error?.message || 'unknown error'}
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {/* Hero card */}
            <div style={{
              marginTop: 22,
              borderRadius: 14,
              padding: '26px 28px',
              background: `linear-gradient(135deg, ${T.green2} 0%, ${T.green} 100%)`,
              color: '#fff',
              boxShadow: '0 8px 24px rgba(26,107,58,0.18)',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', opacity: 0.85,
              }}>Today's chain revenue</div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 42, fontWeight: 700, marginTop: 6, lineHeight: 1.1,
              }}>
                {fmt(totals.today_revenue || 0, 'zwd')}
              </div>
              <div style={{
                marginTop: 10, fontSize: 13, opacity: 0.92,
                lineHeight: 1.5,
              }}>
                {totals.today_transactions || 0} sales · {totals.products_count || 0} products
                · {totals.low_stock_alerts || 0} low stock
                {typeof totals.open_tills === 'number' ? ` · ${totals.open_tills} open tills` : ''}
                · across {branchCount} branch{branchCount === 1 ? '' : 'es'}
              </div>
            </div>

            {/* Per-branch list */}
            {branches.length === 0 ? (
              <div style={{
                marginTop: 22, background: '#fff', border: `1px solid ${T.line}`,
                borderRadius: 12, padding: 40, textAlign: 'center', color: T.muted,
              }}>
                <div style={{ fontSize: 38, marginBottom: 8 }}>{'\u{1F30D}'}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>
                  No branches to display
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Add branches under "Branches" to see chain-wide rollups here.
                </div>
              </div>
            ) : isMobile ? (
              <BranchCardList
                branches={branches}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            ) : (
              <BranchTable
                branches={branches}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BranchTable({ branches, selectedId, onSelect }) {
  return (
    <div style={{
      marginTop: 22, background: '#fff', border: `1px solid ${T.line}`,
      borderRadius: 12, overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead style={{ background: T.surface }}>
          <tr>
            <Th>Branch</Th>
            <Th>Code</Th>
            <Th align="right">Today's revenue</Th>
            <Th align="right">Today's tx</Th>
            <Th align="right">Products</Th>
            <Th align="right">Low stock</Th>
            <Th align="right">Open tills</Th>
          </tr>
        </thead>
        <tbody>
          {branches.map((b) => {
            const selected = selectedId === b.id;
            return (
              <tr
                key={b.id}
                onClick={() => onSelect(selected ? null : b.id)}
                style={{
                  borderTop: `1px solid ${T.line}`,
                  cursor: 'pointer',
                  background: selected ? T.greenT : 'transparent',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.background = T.surface;
                }}
                onMouseLeave={(e) => {
                  if (!selected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Td>
                  <div style={{
                    color: T.ink, fontWeight: 600, display: 'flex',
                    alignItems: 'center', gap: 8,
                  }}>
                    {b.name}
                    {b.is_hq && (
                      <span style={{
                        display: 'inline-block', padding: '1px 7px', borderRadius: 5,
                        background: T.greenT, color: T.green,
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
                      }}>HQ</span>
                    )}
                  </div>
                </Td>
                <Td style={{
                  fontFamily: 'monospace', fontWeight: 600, color: T.inkSoft,
                  fontSize: 12,
                }}>{b.code || '—'}</Td>
                <Td align="right" style={{ fontWeight: 600, color: T.green }}>
                  {fmt(b.today_revenue || 0, 'zwd')}
                </Td>
                <Td align="right">{b.today_transactions || 0}</Td>
                <Td align="right">{b.products_count || 0}</Td>
                <Td align="right" style={{
                  color: (b.low_stock_alerts || 0) > 0 ? T.amber : T.muted,
                  fontWeight: (b.low_stock_alerts || 0) > 0 ? 600 : 400,
                }}>
                  {b.low_stock_alerts || 0}
                </Td>
                <Td align="right">{b.open_tills || 0}</Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BranchCardList({ branches, selectedId, onSelect }) {
  return (
    <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {branches.map((b) => {
        const selected = selectedId === b.id;
        return (
          <div
            key={b.id}
            onClick={() => onSelect(selected ? null : b.id)}
            style={{
              background: selected ? T.greenT : '#fff',
              border: `1px solid ${selected ? T.green : T.line}`,
              borderRadius: 12, padding: 14, cursor: 'pointer',
              transition: 'all 0.12s',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 10, flexWrap: 'wrap',
            }}>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 16, fontWeight: 700, color: T.ink,
              }}>{b.name}</div>
              {b.code && (
                <span style={{
                  display: 'inline-block', padding: '2px 7px', borderRadius: 5,
                  background: T.surface, border: `1px solid ${T.line}`,
                  fontSize: 10, fontWeight: 700, color: T.inkSoft,
                  fontFamily: 'monospace',
                }}>{b.code}</span>
              )}
              {b.is_hq && (
                <span style={{
                  display: 'inline-block', padding: '2px 7px', borderRadius: 5,
                  background: T.greenT, color: T.green,
                  fontSize: 10, fontWeight: 700,
                }}>HQ</span>
              )}
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8, fontSize: 12,
            }}>
              <Stat label="Revenue today" value={fmt(b.today_revenue || 0, 'zwd')} accent={T.green} />
              <Stat label="Transactions" value={b.today_transactions || 0} />
              <Stat label="Products" value={b.products_count || 0} />
              <Stat label="Low stock"
                value={b.low_stock_alerts || 0}
                accent={(b.low_stock_alerts || 0) > 0 ? T.amber : T.muted} />
              <Stat label="Open tills" value={b.open_tills || 0} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 600, color: T.muted,
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>{label}</div>
      <div style={{
        fontSize: 15, fontWeight: 700,
        color: accent || T.ink, marginTop: 2,
      }}>{value}</div>
    </div>
  );
}

function Th({ children, align = 'left' }) {
  return (
    <th style={{
      textAlign: align, padding: '11px 14px',
      fontSize: 10, fontWeight: 700, color: T.muted,
      textTransform: 'uppercase', letterSpacing: '0.05em',
      borderBottom: `1px solid ${T.line}`,
    }}>{children}</th>
  );
}
function Td({ children, align = 'left', style = {} }) {
  return (
    <td style={{
      padding: '12px 14px', fontSize: 13, color: T.inkSoft,
      textAlign: align, ...style,
    }}>{children}</td>
  );
}
