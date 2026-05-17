/**
 * FleetCards — fleet-card providers, accounts, and unsettled transactions.
 *
 * Three tabs:
 *   - Providers (Engen, Total, Puma, Mobil…)
 *   - Accounts (per-card customer accounts with credit limits + balance)
 *   - Transactions (the unsettled-receivable ledger)
 *
 * To settle: open a transaction row, mark settled, enter the provider's
 * remittance reference. Account.current_balance auto-decrements.
 *
 * PCI: we only store last-4 of the card PAN. Full PAN is never captured
 * — the cashier types just the last 4 at sale time.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listFleetCardProviders, createFleetCardProvider, updateFleetCardProvider, deleteFleetCardProvider,
  listFleetCardAccounts, createFleetCardAccount, updateFleetCardAccount, deleteFleetCardAccount,
  listFleetCardTransactions, settleFleetCardTransaction,
} from '../api/retailApi';
function BackToForecourt({ onTabChange }) {
  return (
    <button onClick={() => onTabChange && onTabChange('Forecourt')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14 }}>
      ← Back to Forecourt
    </button>
  );
}
import { fmt } from '../utils/format';
import { confirm } from '../utils/confirm';

const T = {
  ink: '#111827', inkSoft: '#374151', muted: '#6b7280',
  line: '#e5e7eb', surface: '#f9fafb',
  green: '#1a6b3a', greenT: '#e8f5ee',
  amber: '#c77700', amberT: '#fdeedd',
  red: '#c0392b',
};

export default function FleetCards({ onTabChange }) {
  const [tab, setTab] = useState('providers');
  return (
    <div style={{ padding: '20px 28px', background: T.surface, minHeight: '100vh' }}>
      <BackToForecourt onTabChange={onTabChange} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h1 style={{ color: T.ink, fontSize: 26, margin: 0 }}>Fleet cards</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setTab('providers')} style={tab === 'providers' ? btnTabActive : btnTab}>Providers</button>
          <button onClick={() => setTab('accounts')} style={tab === 'accounts' ? btnTabActive : btnTab}>Accounts</button>
          <button onClick={() => setTab('transactions')} style={tab === 'transactions' ? btnTabActive : btnTab}>Transactions</button>
        </div>
      </div>
      {tab === 'providers' && <ProvidersTab />}
      {tab === 'accounts' && <AccountsTab />}
      {tab === 'transactions' && <TransactionsTab />}
    </div>
  );
}

// ── Providers ──
function ProvidersTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['fleet-card-providers'], queryFn: listFleetCardProviders,
  });
  const inv = () => qc.invalidateQueries({ queryKey: ['fleet-card-providers'] });
  const saveMut = useMutation({
    mutationFn: (data) => data.id ? updateFleetCardProvider(data.id, data) : createFleetCardProvider(data),
    onSuccess: () => { inv(); setEditing(null); },
  });
  const delMut = useMutation({ mutationFn: deleteFleetCardProvider, onSuccess: inv });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button onClick={() => setEditing({ name: '', code: '', settlement_terms_days: 30, discount_pct: 0 })} style={btnPrimary}>
          + Add provider
        </button>
      </div>
      <div style={card}>
        <table style={tbl}>
          <thead style={{ background: T.surface }}>
            <tr><th style={th}>Name</th><th style={th}>Code</th><th style={th}>Settlement (days)</th><th style={th}>Discount %</th><th style={th}>Email</th><th style={th}></th></tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} style={{ padding: 16 }}>Loading…</td></tr>
              : providers.length === 0 ? <tr><td colSpan={6} style={{ padding: 16, color: T.muted }}>No providers yet.</td></tr>
              : providers.map(p => (
                <tr key={p.id} style={{ borderTop: `1px solid ${T.line}` }}>
                  <td style={td}>{p.name}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontWeight: 600 }}>{p.code}</td>
                  <td style={td}>{p.settlement_terms_days}</td>
                  <td style={td}>{p.discount_pct}%</td>
                  <td style={td}>{p.contact_email || '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button onClick={() => setEditing({ ...p })} style={btnGhost}>Edit</button>
                    <button
                      onClick={async () => { if (await confirm(`Delete provider "${p.name}"?`)) delMut.mutate(p.id); }}
                      style={{ ...btnGhost, color: T.red, marginLeft: 6 }}
                    >Delete</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <ModalEditor title={editing.id ? `Edit ${editing.name}` : 'Add provider'}
                     fields={[
                       { k: 'name', l: 'Name' },
                       { k: 'code', l: 'Code', uppercase: true },
                       { k: 'contact_email', l: 'Contact email', type: 'email' },
                       { k: 'settlement_terms_days', l: 'Settlement (days)', type: 'number' },
                       { k: 'discount_pct', l: 'Discount %', type: 'number' },
                     ]}
                     value={editing} onCancel={() => setEditing(null)}
                     onSave={v => saveMut.mutate(v)} saving={saveMut.isPending} />
      )}
    </div>
  );
}

// ── Accounts ──
function AccountsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['fleet-card-accounts'], queryFn: () => listFleetCardAccounts(),
  });
  const { data: providers = [] } = useQuery({
    queryKey: ['fleet-card-providers'], queryFn: listFleetCardProviders,
  });
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['fleet-card-accounts'] });
    qc.invalidateQueries({ queryKey: ['fleet-card-transactions'] });
  };
  const saveMut = useMutation({
    mutationFn: (data) => data.id ? updateFleetCardAccount(data.id, data) : createFleetCardAccount(data),
    onSuccess: () => { inv(); setEditing(null); },
  });
  const delMut = useMutation({ mutationFn: deleteFleetCardAccount, onSuccess: inv });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button onClick={() => setEditing({
          provider: providers[0]?.id || '', card_last4: '', company_name: '',
          vehicle_reg: '', driver_name: '', credit_limit: 0,
        })} disabled={providers.length === 0}
          style={providers.length ? btnPrimary : { ...btnPrimary, opacity: 0.5, cursor: 'not-allowed' }}>
          + Add account
        </button>
      </div>
      {providers.length === 0 && (
        <div style={{ padding: 12, color: T.muted, fontSize: 13.5 }}>
          Add a fleet-card provider first.
        </div>
      )}
      <div style={card}>
        <table style={tbl}>
          <thead style={{ background: T.surface }}>
            <tr><th style={th}>Provider</th><th style={th}>Company</th><th style={th}>Card</th><th style={th}>Vehicle</th><th style={th}>Limit</th><th style={th}>Balance</th><th style={th}></th></tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} style={{ padding: 16 }}>Loading…</td></tr>
              : accounts.length === 0 ? <tr><td colSpan={7} style={{ padding: 16, color: T.muted }}>No accounts yet.</td></tr>
              : accounts.map(a => (
                <tr key={a.id} style={{ borderTop: `1px solid ${T.line}` }}>
                  <td style={td}>{a.provider_name}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{a.company_name || '—'}</td>
                  <td style={{ ...td, fontFamily: 'monospace' }}>****{a.card_last4}</td>
                  <td style={td}>{a.vehicle_reg || '—'}</td>
                  <td style={td}>{fmt(Number(a.credit_limit || 0))}</td>
                  <td style={{ ...td, fontWeight: 700, color: Number(a.current_balance) > Number(a.credit_limit) ? T.red : T.inkSoft }}>
                    {fmt(Number(a.current_balance || 0))}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button onClick={() => setEditing({ ...a })} style={btnGhost}>Edit</button>
                    <button
                      onClick={async () => { if (await confirm(`Delete account "${a.company_name}"?`)) delMut.mutate(a.id); }}
                      style={{ ...btnGhost, color: T.red, marginLeft: 6 }}
                    >Delete</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <ModalEditor title={editing.id ? `Edit account` : 'Add fleet account'}
                     fields={[
                       { k: 'provider', l: 'Provider', type: 'select', options: providers.map(p => ({ value: p.id, label: `${p.name} (${p.code})` })) },
                       { k: 'card_last4', l: 'Card last 4 digits' },
                       { k: 'company_name', l: 'Company name' },
                       { k: 'vehicle_reg', l: 'Vehicle reg' },
                       { k: 'driver_name', l: 'Driver name' },
                       { k: 'credit_limit', l: 'Credit limit', type: 'number' },
                     ]}
                     value={editing} onCancel={() => setEditing(null)}
                     onSave={v => saveMut.mutate(v)} saving={saveMut.isPending} />
      )}
    </div>
  );
}

// ── Transactions ──
function TransactionsTab() {
  const qc = useQueryClient();
  const [settling, setSettling] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const { data: txns = [], isLoading } = useQuery({
    queryKey: ['fleet-card-transactions', statusFilter],
    queryFn: () => listFleetCardTransactions({ status: statusFilter }),
  });
  const settleMut = useMutation({
    mutationFn: ({ id, reference }) => settleFleetCardTransaction(id, reference),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet-card-transactions'] });
      qc.invalidateQueries({ queryKey: ['fleet-card-accounts'] });
      setSettling(null);
    },
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {['pending', 'settled', 'disputed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
                  style={statusFilter === s ? btnTabActive : btnTab}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      <div style={card}>
        <table style={tbl}>
          <thead style={{ background: T.surface }}>
            <tr><th style={th}>When</th><th style={th}>Company</th><th style={th}>Card</th><th style={th}>Grade</th><th style={th}>Litres</th><th style={th}>Amount</th><th style={th}>Receipt</th><th style={th}></th></tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} style={{ padding: 16 }}>Loading…</td></tr>
              : txns.length === 0 ? <tr><td colSpan={8} style={{ padding: 16, color: T.muted }}>No {statusFilter} transactions.</td></tr>
              : txns.map(t => (
                <tr key={t.id} style={{ borderTop: `1px solid ${T.line}` }}>
                  <td style={td}>{new Date(t.created_at).toLocaleString()}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{t.account_company || '—'}</td>
                  <td style={{ ...td, fontFamily: 'monospace' }}>****{t.account_last4}</td>
                  <td style={td}>{t.fuel_grade_code || '—'}</td>
                  <td style={td}>{Number(t.litres || 0).toLocaleString()}</td>
                  <td style={{ ...td, fontWeight: 700, color: T.amber }}>{fmt(Number(t.amount || 0))}</td>
                  <td style={td}>{t.sale_receipt_number || '—'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    {t.status === 'pending' && (
                      <button onClick={() => setSettling({ ...t, reference: '' })} style={btnGhost}>Settle</button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {settling && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <h3 style={{ margin: 0, color: T.ink }}>Settle transaction</h3>
            <p style={{ color: T.muted, marginTop: 8 }}>
              Mark this transaction as settled. <strong>{fmt(Number(settling.amount))}</strong> will be removed from {settling.account_company || 'the account'}'s balance.
            </p>
            <div>
              <label style={lbl}>Provider remittance reference</label>
              <input value={settling.reference} onChange={e => setSettling(s => ({ ...s, reference: e.target.value }))} style={inp} placeholder="e.g. ENGEN-2026-05-REM-1042" />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
              <button onClick={() => setSettling(null)} style={btnGhost}>Cancel</button>
              <button onClick={() => settleMut.mutate({ id: settling.id, reference: settling.reference })}
                      disabled={settleMut.isPending} style={btnPrimary}>
                {settleMut.isPending ? 'Settling…' : 'Mark settled'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Generic editor modal ──
function ModalEditor({ title, fields, value, onCancel, onSave, saving }) {
  const [v, setV] = useState(value);
  const set = (k, val) => setV(p => ({ ...p, [k]: val }));
  return (
    <div style={modalOverlay}>
      <div style={modalCard}>
        <h2 style={{ margin: 0, color: T.ink, fontSize: 20 }}>{title}</h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr', marginTop: 14 }}>
          {fields.map(f => (
            <div key={f.k} style={{ gridColumn: f.full ? '1 / -1' : 'auto' }}>
              <label style={lbl}>{f.l}</label>
              {f.type === 'select' ? (
                <select value={v[f.k] || ''} onChange={e => set(f.k, Number(e.target.value) || e.target.value)} style={inp}>
                  <option value="">— Select —</option>
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input
                  type={f.type || 'text'}
                  value={v[f.k] ?? ''}
                  onChange={e => set(f.k, f.uppercase ? e.target.value.toUpperCase() : e.target.value)}
                  style={inp}
                />
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onCancel} style={btnGhost}>Cancel</button>
          <button onClick={() => onSave(v)} disabled={saving} style={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

const card = { background: '#fff', border: `1px solid ${T.line}`, borderRadius: 14, overflow: 'hidden' };
const tbl = { width: '100%', borderCollapse: 'collapse' };
const th = { padding: 12, textAlign: 'left', fontSize: 12.5, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' };
const td = { padding: 12, fontSize: 14, color: T.inkSoft };
const lbl = { display: 'block', fontSize: 12.5, color: T.muted, marginBottom: 4, fontWeight: 600 };
const inp = { width: '100%', padding: '8px 10px', border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 14, color: T.ink, background: '#fff' };
const btnPrimary = { padding: '9px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 700, color: '#fff', background: T.green, border: 'none', cursor: 'pointer' };
const btnGhost = { padding: '7px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: T.inkSoft, background: 'transparent', border: `1px solid ${T.line}`, cursor: 'pointer' };
const btnTab = { padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: T.inkSoft, background: '#fff', border: `1px solid ${T.line}`, cursor: 'pointer' };
const btnTabActive = { ...btnTab, background: T.green, color: '#fff', borderColor: T.green };
const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(17, 24, 39, .5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 };
const modalCard = { background: '#fff', borderRadius: 14, padding: 22, width: 620, maxWidth: '90%', boxShadow: '0 24px 64px -12px rgba(0,0,0,.3)' };
