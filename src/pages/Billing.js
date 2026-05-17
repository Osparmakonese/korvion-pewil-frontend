import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCurrentPlan,
  getInvoices,
  downloadReceipt,
  emailReceipt,
  getUsage,
  initializePayment,
} from '../api/billingApi';
import { useAuth } from '../context/AuthContext';
import PlansTable from '../components/PlansTable';

const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' };
const pill = (bg, color) => ({ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, display: 'inline-block', letterSpacing: '0.02em', textTransform: 'uppercase', background: bg, color });
const sLabel = { fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 };
const btnS = (primary) => ({ padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: primary ? 'none' : '1px solid #1a6b3a', background: primary ? '#1a6b3a' : '#fff', color: primary ? '#fff' : '#1a6b3a', display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' });
const thS = { textAlign: 'left', padding: '7px 8px', fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f9fafb' };

// Fetch all active subscriptions (no module filter → backend returns { subscriptions: [...] })
const fetchActiveSubs = async () => {
  try {
    const resp = await getCurrentPlan();
    // Backend now returns { subscriptions: [...] } when no module query param
    const subs = resp?.subscriptions || (Array.isArray(resp) ? resp : resp ? [resp] : []);
    const byModule = {};
    subs.forEach(s => {
      const mod = s.module || s.plan?.module || 'farm';
      byModule[mod] = s;
    });
    return byModule;
  } catch (err) {
    if (err?.response?.status === 404) return {};
    throw err;
  }
};

export default function Billing({ activeModule }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('overview');

  // SINGLE-MODULE RULE (April 2026) — a tenant runs exactly one module, so
  // Billing should only show THAT module's subscription + plans picker, never
  // both. Falls back to user.modules[0] if the parent didn't pass a prop.
  const currentModule =
    activeModule ||
    (Array.isArray(user?.modules) && user.modules[0]) ||
    'farm';
  const moduleLabel = currentModule === 'retail' ? 'Pewil Retail' : 'Pewil Farm';

  // Payment modal state — selectedPlan is the full Plan object from API
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [payStatus, setPayStatus] = useState(null);
  const [payMessage, setPayMessage] = useState('');

  const { data: activeSubs = {} } = useQuery({
    queryKey: ['currentPlanByModule'],
    queryFn: fetchActiveSubs,
    staleTime: 60000,
  });
  const { data: invoices } = useQuery({ queryKey: ['invoices'], queryFn: getInvoices, staleTime: 60000 });
  const { data: usage } = useQuery({ queryKey: ['usage'], queryFn: getUsage, staleTime: 60000 });

  // Only show the subscription for the current module — the other module's
  // data shouldn't be visible to this tenant even if the API happens to
  // return it (shouldn't, but belt-and-braces).
  const currentSub = activeSubs[currentModule];

  // ─── PAYMENT FLOW ──────────────────────────────────────
  const handleSelectPlan = ({ plan, billingCycle: cycle }) => {
    setSelectedPlan(plan);
    setBillingCycle(cycle || 'monthly');
    setPayStatus(null);
    setPayMessage('');
    setShowPayModal(true);
  };

  const handlePay = async () => {
    if (!selectedPlan) return;
    setPayStatus('loading');
    setPayMessage('');
    try {
      const result = await initializePayment({
        plan_slug: selectedPlan.slug,
        payment_method: 'card', // Pesepay hosted checkout lets the user pick card/EcoCash/OneMoney on their page
        billing_cycle: billingCycle,
      });
      if (result.redirect_url) {
        window.location.href = result.redirect_url;
        return;
      }
      setPayStatus('error');
      setPayMessage('Unexpected response from payment provider.');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Payment failed. Please try again.';
      setPayStatus('error');
      setPayMessage(msg);
    }
  };

  // ─── CHECK URL PARAMS (Pesepay redirect callback) ────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get('payment');
    if (paymentResult === 'success') {
      setPayStatus('success');
      setPayMessage('Payment confirmed! Your plan is now active.');
      window.history.replaceState({}, '', '/billing');
      queryClient.invalidateQueries({ queryKey: ['currentPlanByModule'] });
      queryClient.invalidateQueries({ queryKey: ['usage'] });
    } else if (paymentResult === 'cancelled') {
      setPayStatus('error');
      setPayMessage('Payment was cancelled.');
      window.history.replaceState({}, '', '/billing');
    }
  }, [queryClient]);

  // Display helpers
  const displayPrice = selectedPlan
    ? (billingCycle === 'yearly'
      ? (Number(selectedPlan.price_yearly || selectedPlan.price_monthly * 12) / 12).toFixed(2)
      : Number(selectedPlan.price_monthly || 0).toFixed(2))
    : '0.00';
  const totalBilled = selectedPlan
    ? (billingCycle === 'yearly'
      ? Number(selectedPlan.price_yearly || selectedPlan.price_monthly * 12).toFixed(2)
      : Number(selectedPlan.price_monthly || 0).toFixed(2))
    : '0.00';

  return (
    <div>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', borderRadius: 14, padding: '0 24px', height: 90, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, overflow: 'hidden' }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>Billing & Subscription</h2>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 3 }}>Manage your {moduleLabel} subscription {'\u2014'} monthly or yearly</p>
        </div>
        <div style={{ fontSize: 48, opacity: 0.2 }}>{'\u{1F4B3}'}</div>
      </div>

      {payStatus === 'success' && (
        <div style={{ background: '#e8f5ee', border: '1px solid #1a6b3a', borderRadius: 10, padding: '10px 16px', marginBottom: 14, fontSize: 12, color: '#1a6b3a', fontWeight: 600 }}>
          {'\u2705'} {payMessage}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['overview', 'Overview'], ['plans', 'Plans'], ['invoices', 'Invoices']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: '6px 14px', borderRadius: 20, border: tab === k ? '1px solid #1a6b3a' : '1px solid #e5e7eb', background: tab === k ? '#1a6b3a' : '#fff', color: tab === k ? '#fff' : '#374151', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{l}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            {/* Only the tenant's own module — single-module rule */}
            <ModuleSubCard title={moduleLabel} sub={currentSub} onManage={() => setTab('plans')} />
            {/* Per-receipt usage card. Retail only — farm tenants never
                see this because farms are flat-priced per the model
                decision in billing/usage_pricing.py docstring. */}
            {currentModule === 'retail' && <UsageCard />}
          </div>
          <div>
            <div style={card}>
              <div style={sLabel}>Recent Invoices</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead><tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  {['Date', 'Amount', 'Status'].map(h => <th key={h} style={thS}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {(invoices?.results || []).slice(0, 5).map((inv, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '7px 8px', color: '#374151' }}>{inv.created_at ? new Date(inv.created_at).toLocaleDateString() : ''}</td>
                      <td style={{ padding: '7px 8px', fontWeight: 600 }}>${inv.amount}</td>
                      <td style={{ padding: '7px 8px' }}>
                        <span style={pill(
                          inv.status === 'paid' ? '#e8f5ee' : inv.status === 'pending' ? '#FEF3C7' : '#FEE2E2',
                          inv.status === 'paid' ? '#1a6b3a' : inv.status === 'pending' ? '#92400E' : '#991B1B'
                        )}>{inv.status}</span>
                      </td>
                    </tr>
                  ))}
                  {(!invoices?.results || invoices.results.length === 0) && (
                    <tr><td colSpan={3} style={{ padding: '12px 8px', color: '#9ca3af', fontSize: 11, textAlign: 'center' }}>No invoices yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ ...card, marginTop: 10 }}>
              <div style={sLabel}>Account</div>
              <div style={{ fontSize: 11, color: '#374151' }}>Signed in as <strong>{user?.email || user?.username}</strong></div>
              {currentSub && (
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
                  {moduleLabel}: <strong>{currentSub.plan?.name}</strong>
                  {currentSub.billing_cycle ? ` (${currentSub.billing_cycle})` : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PLANS */}
      {tab === 'plans' && (
        <div>
          <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 12 }}>
            Choose your {moduleLabel} plan. Annual plans save 17%.
          </p>
          <PlansTable
            activeSubscriptions={activeSubs}
            onSelectPlan={handleSelectPlan}
            lockedModule={currentModule}
          />
        </div>
      )}

      {/* INVOICES */}
      {tab === 'invoices' && (
        <div style={card}>
          <div style={sLabel}>Invoice History</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              {['Date', 'Description', 'Amount', 'Method', 'Status', 'Receipt'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {(invoices?.results || []).length > 0 ? invoices.results.map((inv, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13 }}>{inv.created_at ? new Date(inv.created_at).toLocaleDateString() : ''}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13 }}>{inv.description}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600 }}>${inv.amount}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13 }}>
                    <span style={pill(inv.payment_method === 'card' ? '#EFF6FF' : '#FEF3C7', inv.payment_method === 'card' ? '#1d4ed8' : '#92400E')}>
                      {inv.payment_method || inv.payment_provider || 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={pill(
                      inv.status === 'paid' ? '#e8f5ee' : inv.status === 'pending' ? '#FEF3C7' : '#FEE2E2',
                      inv.status === 'paid' ? '#1a6b3a' : inv.status === 'pending' ? '#92400E' : '#991B1B'
                    )}>{inv.status}</span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12 }}>
                    {inv.status === 'paid' ? (
                      <span style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={async () => {
                            try {
                              const blob = await downloadReceipt(inv.id);
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `pewil-receipt-${inv.id}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              URL.revokeObjectURL(url);
                            } catch (e) {
                              alert('Could not download receipt.');
                            }
                          }}
                          style={{ padding: '6px 10px', fontSize: 12, background: '#1b5e20', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                        >Download</button>
                        <button
                          onClick={async () => {
                            try {
                              const r = await emailReceipt(inv.id);
                              alert(r.detail || 'Receipt emailed.');
                            } catch (e) {
                              alert('Could not email receipt.');
                            }
                          }}
                          style={{ padding: '6px 10px', fontSize: 12, background: '#fff', color: '#1b5e20', border: '1px solid #1b5e20', borderRadius: 6, cursor: 'pointer' }}
                        >Email me</button>
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} style={{ padding: '40px 14px', fontSize: 13, textAlign: 'center', color: '#9ca3af' }}>No invoices yet.</td></tr>
              )}
            </tbody>
          </table>
          <div style={{ marginTop: 24, padding: 16, background: '#f9fafb', borderRadius: 10, fontSize: 13, color: '#6b7280' }}>
            Payments are processed securely via <strong style={{ color: '#111827' }}>Pesepay</strong> — Visa, Mastercard, EcoCash, OneMoney and Zimswitch all in one hosted checkout. Card details are never stored on our servers.
          </div>
        </div>
      )}

      {/* ─── PAYMENT MODAL ──────────────────────────────── */}
      {showPayModal && selectedPlan && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => { if (payStatus !== 'loading') setShowPayModal(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 440, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, margin: 0 }}>
                  {selectedPlan.name}
                </h3>
                <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {selectedPlan.module} {'\u2022'} {billingCycle}
                </div>
              </div>
              <button onClick={() => setShowPayModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>{'\u2715'}</button>
            </div>

            {/* Billing cycle toggle inside modal */}
            {payStatus !== 'success' && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {['monthly', 'yearly'].map(c => (
                  <button key={c} onClick={() => setBillingCycle(c)} style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: billingCycle === c ? '2px solid #1a6b3a' : '1px solid #e5e7eb',
                    background: billingCycle === c ? '#f4fbf6' : '#fff',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    color: '#111827',
                    textTransform: 'capitalize',
                  }}>
                    {c} {c === 'yearly' && <span style={{ fontSize: 9, marginLeft: 4, color: '#1a6b3a' }}>(save 17%)</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Price */}
            <div style={{ textAlign: 'center', padding: '12px 0 20px', borderBottom: '1px solid #e5e7eb', marginBottom: 20 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: '#1a6b3a' }}>
                ${displayPrice}<span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280' }}>/month</span>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                {billingCycle === 'yearly' ? `$${totalBilled} billed yearly` : 'Billed monthly'}
              </div>
            </div>

            {/* Payment info — Pesepay hosted checkout handles method selection */}
            {payStatus !== 'success' && (
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#374151', fontWeight: 600, marginBottom: 4 }}>
                  You{'\u2019'}ll be redirected to Pesepay to complete payment.
                </div>
                <div style={{ fontSize: 10, color: '#6b7280' }}>
                  Pay with Visa/Mastercard, EcoCash, OneMoney or Zimswitch {'\u2014'} all handled securely by Pesepay.
                </div>
              </div>
            )}

            {/* Status messages */}
            {payStatus === 'success' && (
              <div style={{ background: '#e8f5ee', border: '1px solid #1a6b3a', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#1a6b3a' }}>{'\u2705'} {payMessage}</div>
              </div>
            )}
            {payStatus === 'error' && (
              <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#991B1B' }}>{payMessage}</div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              {payStatus !== 'success' && (
                <button
                  onClick={handlePay}
                  disabled={payStatus === 'loading'}
                  style={{ ...btnS(true), flex: 1, justifyContent: 'center', padding: '10px 16px', fontSize: 13, opacity: payStatus === 'loading' ? 0.6 : 1 }}
                >
                  {payStatus === 'loading' ? 'Redirecting...' : `Pay $${totalBilled} via Pesepay`}
                </button>
              )}
              <button
                onClick={() => setShowPayModal(false)}
                disabled={payStatus === 'loading'}
                style={{ ...btnS(false), flex: payStatus === 'success' ? 1 : 0, justifyContent: 'center', padding: '10px 16px', fontSize: 13 }}
              >
                {payStatus === 'success' ? 'Done' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Per-receipt usage card ──────────────────────────────
// Shows the in-app preview of the per-receipt bill for this calendar
// month. Same numbers the public /pricing calculator shows — both pull
// from billing.usage_pricing.compute_usage_bill on the backend so we
// can't disagree with ourselves.
function UsageCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['billing-current-usage'],
    queryFn: async () => {
      const api = (await import('../api/axios')).default;
      const res = await api.get('/billing/billing/current_usage/');
      return res.data;
    },
    staleTime: 60000,
    retry: 1,
  });

  if (isLoading) return (
    <div style={{ ...card, marginTop: 12 }}>
      <div style={sLabel}>This month's usage</div>
      <div style={{ fontSize: 12, color: '#9ca3af' }}>Loading…</div>
    </div>
  );

  if (isError || !data) return null;

  const {
    receipts_this_month, free_tier_receipts, chargeable_receipts,
    final_bill, capped_bill, data_share_rebate_pct, free_tier_used_pct,
    pricing_mode, outstanding_invoices, outstanding_total,
  } = data;

  const pct = Math.max(0, Math.min(100, free_tier_used_pct || 0));
  const isFlat = pricing_mode === 'flat';
  const hasOutstanding = Array.isArray(outstanding_invoices) && outstanding_invoices.length > 0;
  const outstandingTotalNum = Number(outstanding_total || 0);

  const handlePayOutstanding = async () => {
    // Start a Pesepay checkout for the oldest outstanding invoice. The
    // existing initialize_payment flow takes a plan_slug; for usage
    // invoices we wire it via a special invoice_id parameter. The
    // backend's webhook flips the Invoice to paid on success, which
    // automatically restores the tenant's standing.
    try {
      const apiClient = (await import('../api/axios')).default;
      const oldest = outstanding_invoices[0];
      const res = await apiClient.post('/billing/billing/initialize_payment/', {
        // Backwards-compat: when no plan_slug is provided but invoice_id
        // is, the endpoint should bill the specific invoice amount.
        invoice_id: oldest.id,
        payment_method: 'card',
      });
      const url = res.data?.redirect_url || res.data?.checkout_url;
      if (url) window.location.href = url;
    } catch (e) {
      alert('Payment could not be started: ' + (e?.response?.data?.detail || e.message));
    }
  };

  return (
    <div style={{ ...card, marginTop: 12 }}>
      {/* Outstanding-invoice banner — only when there's a real bill due.
          Sits at the top so a cashier glancing at the page can't miss it. */}
      {hasOutstanding && (
        <div style={{
          marginBottom: 14, padding: '12px 14px',
          background: '#fff4e1', border: '1px solid rgba(199,119,0,0.3)', borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7a4a00', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              You owe ${outstandingTotalNum.toFixed(2)}
            </div>
            <div style={{ fontSize: 12, color: '#7a4a00', marginTop: 2 }}>
              {outstanding_invoices.length === 1
                ? outstanding_invoices[0].description
                : `${outstanding_invoices.length} unpaid usage invoices`}
            </div>
          </div>
          <button onClick={handlePayOutstanding} style={btnS(true)}>
            Pay now
          </button>
        </div>
      )}

      <div style={sLabel}>
        This month's usage
        {isFlat && (
          <span style={{ ...pill('#FEF3C7', '#92400E'), marginLeft: 8 }}>FLAT PLAN</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: '#111827', fontFamily: "'Playfair Display', serif" }}>
          {Number(receipts_this_month).toLocaleString()}
        </span>
        <span style={{ fontSize: 12, color: '#6b7280' }}>receipts so far</span>
      </div>

      {/* Free-tier progress bar */}
      <div style={{
        height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden',
        marginBottom: 6,
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: pct >= 100 ? '#c97d1a' : '#1a6b3a',
          transition: 'width 0.3s',
        }} />
      </div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>
        {receipts_this_month <= free_tier_receipts
          ? `${free_tier_receipts - receipts_this_month} free receipts left this month`
          : `${chargeable_receipts.toLocaleString()} chargeable receipts above the free tier`}
      </div>

      {/* Projected bill row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 12px', background: '#f4faf6', borderRadius: 8,
        border: '1px solid #d1e8d8', marginBottom: 8,
      }}>
        <div>
          <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isFlat ? 'Would pay on per-receipt' : 'Projected this month'}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0D4A22', fontFamily: "'Playfair Display', serif" }}>
            ${Number(final_bill).toFixed(2)}
          </div>
          {Number(data_share_rebate_pct) > 0 && (
            <div style={{ fontSize: 10, color: '#1a6b3a', fontWeight: 600 }}>
              Includes {data_share_rebate_pct}% data-share rebate
            </div>
          )}
        </div>
        {Number(capped_bill) >= 999 && (
          <span style={pill('#e8f5ee', '#0D4A22')}>$999 CAP</span>
        )}
      </div>

      {isFlat && (
        <div style={{ fontSize: 11.5, color: '#6b7280', lineHeight: 1.5 }}>
          You're on the legacy flat plan. Switch to per-receipt anytime — most shops save money.
          <a
            href="/pricing"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#1a6b3a', fontWeight: 600, marginLeft: 4 }}
          >
            See full pricing →
          </a>
        </div>
      )}
    </div>
  );
}


// ─── Per-module subscription card ────────────────────────
function ModuleSubCard({ title, sub, onManage }) {
  const label = { fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 };
  if (!sub) {
    return (
      <div style={card}>
        <div style={label}>{title}</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>No active subscription.</div>
        <button style={btnS(true)} onClick={onManage}>Choose {title} plan</button>
      </div>
    );
  }
  const cycleLabel = sub.billing_cycle === 'yearly' ? 'yearly' : 'monthly';
  const amount = sub.billing_cycle === 'yearly'
    ? sub.plan?.price_yearly || (sub.plan?.price_monthly || 0) * 12
    : sub.plan?.price_monthly || 0;
  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
        <div>
          <div style={label}>{title}</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{sub.plan?.name || '\u2014'}</div>
        </div>
        <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: sub.status === 'active' ? '#e8f5ee' : '#FEF3C7', color: sub.status === 'active' ? '#1a6b3a' : '#92400E', textTransform: 'uppercase' }}>
          {sub.status}
        </span>
      </div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#1a6b3a', marginBottom: 4 }}>
        ${Number(amount).toFixed(2)}
        <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'Inter', fontWeight: 400 }}>/{cycleLabel}</span>
      </div>
      <button style={{ ...btnS(false), marginTop: 8 }} onClick={onManage}>Manage</button>
    </div>
  );
}
