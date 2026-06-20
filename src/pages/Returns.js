import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReturns, getReturnsSummary, createReturn, completeReturn, getSales } from '../api/retailApi';
import { useAuth } from '../context/AuthContext';
import { fmt } from '../utils/format';
import { confirm } from '../utils/confirm';
import { invalidateProductCaches, invalidateSaleCaches } from '../utils/queryCache';
import { isOffline, submitWithQueue } from '../utils/offlinePOS';
import api from '../api/axios';

export default function Returns({ onTabChange }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  // Fixed (June 2026): the old form sent the receipt number where a sale ID was
  // expected, omitted refund_method (a required field) and items_data (needed to
  // restock), so creating a return always 400-ed and never restocked. The new
  // form picks a real sale, lists its lines with a return quantity, and sends a
  // valid sale ID, reason, refund method, amount and items_data.
  const REASONS = [
    ['defective', 'Defective'], ['wrong_item', 'Wrong item'], ['damaged', 'Damaged'],
    ['changed_mind', 'Changed mind'], ['expired', 'Expired'], ['other', 'Other'],
  ];
  const REFUND_METHODS = [
    ['cash', 'Cash'], ['ecocash', 'Mobile money / EcoCash'], ['store_credit', 'Store credit'], ['card', 'Card'],
  ];
  const blankForm = { saleId: '', lines: [], reason: '', refund_method: '', refund_amount: '', notes: '' };
  const [sel, setSel] = useState(blankForm);

  const isOwnerOrManager = user?.role === 'owner' || user?.role === 'manager';

  // Recent sales to choose from (only fetched while the form is open).
  const { data: salesList = [] } = useQuery({
    queryKey: ['retail-sales-for-returns'],
    queryFn: getSales,
    staleTime: 30000,
    enabled: showAddForm,
  });

  // Sale line items can arrive with slightly different key names depending on
  // which POS version wrote them; read them defensively.
  const itQty = (it) => Number(it.qty ?? it.quantity ?? 0) || 0;
  const itPrice = (it) => Number(it.unit_price ?? it.price ?? it.selling_price ?? 0) || 0;
  const itPid = (it) => it.product_id ?? it.product ?? null;
  const itName = (it) => it.product_name ?? it.name ?? 'Item';

  const pickSale = (id) => {
    const s = (salesList || []).find((x) => String(x.id) === String(id));
    const lines = s
      ? (s.items_data || []).map((it) => ({
          product_id: itPid(it), product_name: itName(it),
          unit_price: itPrice(it), sold: itQty(it), returnQty: itQty(it),
        }))
      : [];
    const amt = lines.reduce((a, l) => a + l.returnQty * l.unit_price, 0);
    setSel({ ...blankForm, saleId: id, lines, refund_amount: amt.toFixed(2) });
  };

  const setLineQty = (i, v) => {
    const lines = sel.lines.slice();
    const q = Math.max(0, Math.min(lines[i].sold, Number(v) || 0));
    lines[i] = { ...lines[i], returnQty: q };
    const amt = lines.reduce((a, l) => a + l.returnQty * l.unit_price, 0);
    setSel({ ...sel, lines, refund_amount: amt.toFixed(2) });
  };

  // Fetch returns
  const { data: returns = [], isLoading: returnsLoading, error: returnsError } = useQuery({
    queryKey: ['retail-returns'],
    queryFn: getReturns,
    staleTime: 30000,
  });

  // Fetch returns summary
  const { data: summary = {} } = useQuery({
    queryKey: ['retail-returns-summary'],
    queryFn: getReturnsSummary,
    staleTime: 30000,
  });

  // Create return — touches the returns list, then on completion the
  // sale fan-out (stock comes back, sales totals shift, customer LTV
  // adjusts, EOD numbers recompute, dashboard refreshes).
  //
  // Phase 2B.2: routed through `submitWithQueue` so offline POSTs
  // queue locally with a client_key and replay on reconnect. The
  // backend ReturnViewSet dedupes by client_key, so a partial-success
  // retry won't create two refunds.
  const createMutation = useMutation({
    mutationFn: (data) => submitWithQueue(api, 'returns', data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['retail-returns'] });
      queryClient.invalidateQueries({ queryKey: ['retail-returns-summary'] });
      setShowAddForm(false);
      setSel(blankForm);
      if (data && data._offline_pending) {
        // Let the cashier know it queued (vs synced).
        confirm({
          title: 'Return queued for sync',
          message:
            "You're offline — we saved this refund locally. It'll sync " +
            "automatically when the network comes back. You can carry on.",
          confirmText: 'OK',
          cancelText: null,
          danger: false,
        });
      }
    },
  });

  // Completing a return restocks the items and adjusts totals — fan-out
  // through invalidateSaleCaches so POS, low-stock, sales-history, EOD,
  // dashboard, and customer LTV all refresh.
  const completeMutation = useMutation({
    mutationFn: completeReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-returns'] });
      queryClient.invalidateQueries({ queryKey: ['retail-returns-summary'] });
      invalidateSaleCaches(queryClient);
      invalidateProductCaches(queryClient);
    },
  });

  const handleAddReturn = async (e) => {
    e.preventDefault();
    const items = sel.lines
      .filter((l) => l.returnQty > 0 && l.product_id != null)
      .map((l) => ({
        product_id: l.product_id,
        product_name: l.product_name,
        qty: l.returnQty,
        unit_price: l.unit_price,
        total: +(l.returnQty * l.unit_price).toFixed(2),
      }));
    if (!sel.saleId || !sel.reason || !sel.refund_method || items.length === 0) {
      await confirm({
        title: 'Missing details',
        message: 'Pick the original sale, choose at least one item to return, and select a reason and a refund method.',
        confirmText: 'OK', cancelText: null, danger: false,
      });
      return;
    }
    // submitWithQueue handles online + offline transparently. We now send a
    // real sale ID, refund_method and items_data so the return saves and (on
    // completion) restocks correctly.
    createMutation.mutate({
      original_sale: Number(sel.saleId),
      reason: sel.reason,
      refund_method: sel.refund_method,
      refund_amount: Number(sel.refund_amount) || 0,
      items_data: items,
      notes: sel.notes || '',
    });
  };

  const handleCompleteReturn = async (id) => {
    // `complete` is a side-effect on an existing return row — needs
    // a live network because it dispatches a stock restock + sale
    // fan-out the offline queue isn't built for. Block + tell the
    // cashier, then let them complete it after reconnect.
    if (isOffline()) {
      await confirm({
        title: 'Completing a return is online-only',
        message:
          "Completing a return triggers a stock restock and updates the original sale " +
          "— it needs a live connection. Wait for the network to come back, then complete it.",
        confirmText: 'OK',
        cancelText: null,
        danger: false,
      });
      return;
    }
    if (await confirm({ title: 'Complete return', message: 'Mark this return as completed?', confirmText: 'Complete', danger: false })) {
      completeMutation.mutate(id);
    }
  };

  const getReasonColor = (reason) => {
    switch (reason) {
      case 'Defective':
        return { bg: '#fdecea', color: '#c0392b' };
      case 'Wrong item':
        return { bg: '#EFF6FF', color: '#1d4ed8' };
      case 'Changed mind':
        return { bg: '#f3f4f6', color: '#6b7280' };
      case 'Damaged':
        return { bg: '#fef3e2', color: '#c97d1a' };
      default:
        return { bg: '#fff', color: '#111827' };
    }
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'Cash':
        return '#1a6b3a';
      case 'EcoCash':
        return '#2563eb';
      case 'Store Credit':
        return '#7c3aed';
      case 'Card':
        return '#6b7280';
      default:
        return '#374151';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
      case 'completed':
        return { bg: '#e8f5ee', color: '#1a6b3a' };
      case 'Pending':
      case 'pending':
        return { bg: '#fef3e2', color: '#c97d1a' };
      case 'Approved':
      case 'approved':
        return { bg: '#EFF6FF', color: '#1d4ed8' };
      default:
        return { bg: '#f3f4f6', color: '#6b7280' };
    }
  };

  if (returnsLoading) {
    return (
      <div style={{ padding: 24, fontFamily: "'Inter', sans-serif", backgroundColor: '#f9fafb', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>Loading...</div>
      </div>
    );
  }

  if (returnsError) {
    return (
      <div style={{ padding: 24, fontFamily: "'Inter', sans-serif", backgroundColor: '#f9fafb', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#c0392b' }}>Failed to load returns. Please try again later.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: "'Inter', sans-serif", backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", margin: 0, color: '#111827' }}>
          Returns & Refunds
        </h1>
        {isOwnerOrManager && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              background: '#1a6b3a',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            + Process Return
          </button>
        )}
      </div>

      {/* Add Return Form */}
      {showAddForm && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 24 }}>
          <form onSubmit={handleAddReturn}>
            {/* Step 1 — choose the original sale */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Original sale *</label>
              <select
                value={sel.saleId}
                onChange={(e) => pickSale(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, fontFamily: "'Inter', sans-serif", background: '#fff' }}
                required
              >
                <option value="">Select the sale being returned…</option>
                {(salesList || []).slice(0, 200).map((s) => (
                  <option key={s.id} value={s.id}>
                    {(s.receipt_number || `Sale #${s.id}`)} — {fmt(s.total || 0, 'zwd')} — {s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2 — choose which items + quantities */}
            {sel.lines.length > 0 && (
              <div style={{ border: '1px solid #f3f4f6', borderRadius: 8, marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 90px', gap: 8, padding: '8px 10px', background: '#f9fafb', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>
                  <div>Item</div><div style={{ textAlign: 'right' }}>Sold</div><div style={{ textAlign: 'right' }}>Return qty</div><div style={{ textAlign: 'right' }}>Refund</div>
                </div>
                {sel.lines.map((l, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 90px', gap: 8, padding: '8px 10px', borderTop: '1px solid #f3f4f6', alignItems: 'center', fontSize: 11 }}>
                    <div style={{ color: '#111827' }}>{l.product_name}</div>
                    <div style={{ textAlign: 'right', color: '#6b7280' }}>{l.sold}</div>
                    <div style={{ textAlign: 'right' }}>
                      <input type="number" min={0} max={l.sold} value={l.returnQty}
                        onChange={(e) => setLineQty(i, e.target.value)}
                        style={{ width: 64, padding: '4px 6px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, textAlign: 'right' }} />
                    </div>
                    <div style={{ textAlign: 'right', color: '#111827', fontWeight: 600 }}>{fmt(l.returnQty * l.unit_price, 'zwd')}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 3 — reason, method, amount */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Reason *</label>
                <select value={sel.reason} onChange={(e) => setSel({ ...sel, reason: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, background: '#fff' }} required>
                  <option value="">Select…</option>
                  {REASONS.map(([v, lab]) => <option key={v} value={v}>{lab}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Refund method *</label>
                <select value={sel.refund_method} onChange={(e) => setSel({ ...sel, refund_method: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12, background: '#fff' }} required>
                  <option value="">Select…</option>
                  {REFUND_METHODS.map(([v, lab]) => <option key={v} value={v}>{lab}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Refund amount *</label>
                <input type="number" step="0.01" value={sel.refund_amount}
                  onChange={(e) => setSel({ ...sel, refund_amount: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 12 }} required />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                disabled={createMutation.isPending}
                style={{
                  background: '#1a6b3a',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: createMutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: createMutation.isPending ? 0.6 : 1,
                }}
              >
                {createMutation.isPending ? 'Processing...' : 'Process Return'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
        {/* Returns This Month */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#fdecea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20
              }}
            >
              ↩
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
                TOTAL RETURNS
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#c0392b', marginBottom: 2 }}>
                {summary?.total_returns || 0}
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>All time</div>
            </div>
          </div>
        </div>

        {/* Total Refunded */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#fdecea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20
              }}
            >
              💰
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
                TOTAL REFUNDED
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#c0392b', marginBottom: 2 }}>
                {fmt(summary?.total_refunded || 0, 'zwd')}
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>Total amount</div>
            </div>
          </div>
        </div>

        {/* Return Rate */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#fef3e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20
              }}
            >
              %
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
                RETURN RATE
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#c97d1a', marginBottom: 2 }}>
                {(summary?.return_rate || 0).toFixed(1)}%
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>Of all sales</div>
            </div>
          </div>
        </div>
      </div>

      {/* Returns Table Card */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Return #</th>
              <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Date</th>
              <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Original Sale</th>
              <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Customer</th>
              <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Items</th>
              <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Refund Amount</th>
              <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Method</th>
              <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Reason</th>
              <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Status</th>
              {isOwnerOrManager && <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {returns.map((ret) => {
              const reasonColors = getReasonColor(ret.reason);
              const methodColor = getMethodColor(ret.refund_method);
              const statusColors = getStatusColor(ret.status);
              return (
                <tr key={ret.id}>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#1a6b3a', fontFamily: 'monospace', fontWeight: 600 }}>{ret.id}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>
                    {ret.created_at ? new Date(ret.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#1a6b3a', fontFamily: 'monospace', fontWeight: 600 }}>{ret.original_sale_receipt || ret.original_sale || '-'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>{ret.customer_name || ret.customer || '-'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151', textAlign: 'right' }}>
                    {(ret.items_data || []).length || '-'}
                  </td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 600, textAlign: 'right' }}>
                    {fmt(ret.refund_amount || 0, 'zwd')}
                  </td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: methodColor, fontWeight: 500 }}>{ret.refund_method || '-'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', background: reasonColors.bg, color: reasonColors.color }}>
                      {ret.reason || 'Unknown'}
                    </span>
                  </td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', background: statusColors.bg, color: statusColors.color }}>
                      {ret.status || 'Pending'}
                    </span>
                  </td>
                  {isOwnerOrManager && (
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                      {ret.status !== 'completed' && (
                        <button
                          onClick={() => handleCompleteReturn(ret.id)}
                          disabled={completeMutation.isPending}
                          style={{
                            background: '#EFF6FF',
                            color: '#1d4ed8',
                            border: 'none',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 8,
                            fontWeight: 600,
                            cursor: completeMutation.isPending ? 'not-allowed' : 'pointer',
                            opacity: completeMutation.isPending ? 0.6 : 1,
                          }}
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Return Policy Info Card */}
      <div
        style={{
          background: '#EFF6FF',
          border: '1px solid #d0e5ff',
          borderRadius: 10,
          padding: 16,
          fontSize: 11,
          color: '#1e3a5f',
          lineHeight: '1.6'
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Return Policy</div>
        <div>
          Returns accepted within 7 days of purchase. Items must be in original condition. Refunds processed to original payment method.
        </div>
      </div>
    </div>
  );
}
