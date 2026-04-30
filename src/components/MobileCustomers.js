/**
 * MobileCustomers.js — Frame 3 of locked Part 2 mockup.
 *
 * Customer list with search + status chips for viewport ≤ 500px.
 * Tapping a row opens MobileCustomerDetail (Frame 4) inline as a
 * fullscreen overlay. Uses getCustomers() and getCustomerHistory()
 * — same data surface as the desktop Customers page.
 *
 * Customer record shape (from /retail/customers/):
 *   id, name, phone, email, total_purchases, total_spent,
 *   is_active, created_at, loyalty_tier (optional)
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCustomers, getCustomerHistory } from '../api/retailApi';
import { fmt } from '../utils/format';

const T = {
  surface: '#f9fafb',
  ink:     '#111827',
  inkSoft: '#374151',
  muted:   '#6b7280',
  line:    '#e5e7eb',
  green:   '#1a6b3a',
  green2:  '#2d9e58',
  greenT:  '#e8f5ee',
  amber:   '#c77700',
  amberT:  '#fdeedd',
};

const initials = (name = '') => (
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?'
);

const tierStyle = (loyalty) => {
  const tier = String(loyalty || '').toLowerCase();
  if (tier.includes('gold') || tier.includes('vip')) return { bg: T.amberT, fg: T.amber, label: 'VIP' };
  if (tier.includes('silver') || tier.includes('regular')) return { bg: T.greenT, fg: T.green, label: 'Regular' };
  return null;
};

export default function MobileCustomers() {
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => getCustomers(search),
    staleTime: 30000,
  });

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(search) ||
      (c.email || '').toLowerCase().includes(q)
    );
  }, [customers, search]);

  const totalSpend = filtered.reduce((s, c) => s + (parseFloat(c.total_spent) || 0), 0);

  return (
    <div style={page}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        marginBottom: 12,
      }}>
        <div>
          <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Customers</div>
          <div style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 24, fontWeight: 700, color: T.ink, marginTop: 2,
          }}>{filtered.length} {filtered.length === 1 ? 'customer' : 'customers'}</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
            Lifetime spend {fmt(totalSpend, 'zwd')}
          </div>
        </div>
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="Search name, phone or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '12px 14px',
          border: `1px solid ${T.line}`, borderRadius: 12,
          fontSize: 13, color: T.ink, background: '#fff',
          boxSizing: 'border-box', marginBottom: 12,
          fontFamily: 'inherit',
        }}
      />

      {/* List */}
      <div style={{
        background: '#fff',
        border: `1px solid ${T.line}`,
        borderRadius: 16, overflow: 'hidden',
      }}>
        {isLoading ? (
          <div style={{ padding: 24, textAlign: 'center', color: T.muted, fontSize: 13 }}>
            Loading customers…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: T.muted, fontSize: 13 }}>
            {search ? 'No matches.' : 'No customers yet. They\'ll appear here after the first sale.'}
          </div>
        ) : filtered.map((c, idx) => {
          const tier = tierStyle(c.loyalty_tier);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setOpenId(c.id)}
              style={{
                width: '100%', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px',
                background: 'transparent', border: 'none',
                borderBottom: idx < filtered.length - 1 ? `1px solid ${T.surface}` : 'none',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: `linear-gradient(135deg, ${T.green}, ${T.green2})`,
                color: '#fff', fontWeight: 700, fontSize: 14,
                display: 'grid', placeItems: 'center',
                flexShrink: 0,
              }}>{initials(c.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 700, fontSize: 14, color: T.ink,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name || 'Unnamed'}
                  </span>
                  {tier && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, padding: '2px 6px',
                      borderRadius: 999, background: tier.bg, color: tier.fg,
                      flexShrink: 0,
                    }}>{tier.label}</span>
                  )}
                </div>
                <div style={{
                  fontSize: 11, color: T.muted, marginTop: 2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {c.phone || '—'}{c.email ? ` · ${c.email}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 700, fontSize: 14, color: T.ink, lineHeight: 1.1,
                }}>
                  {fmt(parseFloat(c.total_spent) || 0, 'zwd')}
                </div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                  {c.total_purchases || 0} visits
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ height: 24 }} />

      {openId && (
        <MobileCustomerDetail
          customerId={openId}
          customer={filtered.find(c => c.id === openId)}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* MobileCustomerDetail — Frame 4                                  */
/* ────────────────────────────────────────────────────────────── */

function MobileCustomerDetail({ customerId, customer, onClose }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['customer-history', customerId],
    queryFn: () => getCustomerHistory(customerId),
    enabled: !!customerId,
    staleTime: 30000,
  });

  if (!customer) return null;

  const totalSpent = parseFloat(customer.total_spent) || 0;
  const visits = customer.total_purchases || (Array.isArray(history) ? history.length : 0);
  const avgTicket = visits > 0 ? totalSpent / visits : 0;
  const tier = tierStyle(customer.loyalty_tier);
  const lastVisit = Array.isArray(history) && history.length > 0
    ? history[0].created_at || history[0].sale_date
    : customer.last_purchase_at;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: '#fff',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: T.ink,
      WebkitFontSmoothing: 'antialiased',
      overflowY: 'auto',
    }}>
      {/* Profile hero */}
      <div style={{
        background: `linear-gradient(135deg, ${T.green} 0%, ${T.green2} 100%)`,
        color: '#fff',
        padding: '40px 22px 26px',
        position: 'relative',
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, left: 14,
            background: 'rgba(255,255,255,0.18)', color: '#fff',
            border: 'none', borderRadius: 999,
            padding: '6px 12px', fontWeight: 700, fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >← Back</button>
        <div style={{
          marginTop: 22,
          width: 76, height: 76, borderRadius: '50%',
          background: 'rgba(255,255,255,0.18)',
          color: '#fff', fontWeight: 800, fontSize: 24,
          display: 'grid', placeItems: 'center',
        }}>{initials(customer.name)}</div>
        <div style={{
          marginTop: 14,
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 26, fontWeight: 700, lineHeight: 1.1,
        }}>{customer.name || 'Unnamed'}</div>
        <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
          {customer.phone || '—'}{customer.email ? ` · ${customer.email}` : ''}
        </div>
        {tier && (
          <div style={{
            display: 'inline-block', marginTop: 10,
            fontSize: 11, fontWeight: 800, padding: '4px 10px',
            borderRadius: 999, background: 'rgba(255,255,255,0.22)',
          }}>{tier.label} member</div>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <Stat label="LTV" value={fmt(totalSpent, 'zwd')} fg={T.green} />
          <Stat label="Visits" value={String(visits)} fg={T.ink} />
          <Stat label="Avg ticket" value={fmt(avgTicket, 'zwd')} fg={T.amber} />
        </div>
        {lastVisit && (
          <div style={{
            marginTop: 10, fontSize: 11, color: T.muted, textAlign: 'center',
          }}>
            Last visit {new Date(lastVisit).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Recent receipts */}
      <div style={{ padding: '14px 16px 24px' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: T.inkSoft,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          marginBottom: 8,
        }}>Recent receipts</div>
        <div style={{
          background: '#fff',
          border: `1px solid ${T.line}`,
          borderRadius: 16, overflow: 'hidden',
        }}>
          {isLoading ? (
            <div style={{ padding: 24, textAlign: 'center', color: T.muted, fontSize: 13 }}>
              Loading purchase history…
            </div>
          ) : !Array.isArray(history) || history.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: T.muted, fontSize: 13 }}>
              No purchases yet for this customer.
            </div>
          ) : history.slice(0, 12).map((sale, idx) => (
            <div key={sale.id || idx} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px',
              borderBottom: idx < Math.min(history.length, 12) - 1
                ? `1px solid ${T.surface}` : 'none',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                background: T.surface,
                display: 'grid', placeItems: 'center', fontSize: 16,
              }}>🧾</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: T.ink }}>
                  Receipt #{sale.receipt_number || sale.receipt || sale.id}
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                  {sale.created_at ? new Date(sale.created_at).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  }) : ''}
                  {sale.payment_method ? ` · ${sale.payment_method === 'mobile_money' ? 'EcoCash' : sale.payment_method === 'mixed' ? 'Split' : sale.payment_method}` : ''}
                </div>
              </div>
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 700, fontSize: 14, color: T.ink,
              }}>
                {fmt(parseFloat(sale.total) || 0, 'zwd')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, fg }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${T.line}`,
      borderRadius: 14, padding: 12, textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, color: T.muted, fontWeight: 600 }}>{label}</div>
      <div style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: 16, fontWeight: 700, color: fg, marginTop: 4, lineHeight: 1.1,
      }}>{value}</div>
    </div>
  );
}

const page = {
  padding: '12px 16px 0',
  fontFamily: "'Inter', system-ui, sans-serif",
  background: 'transparent',
  minHeight: '100%',
  color: T.ink,
};
