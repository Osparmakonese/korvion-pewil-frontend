/**
 * BranchTransfers — cross-branch inventory movement.
 *
 * Lifecycle of a transfer order:
 *   draft       — created but stock untouched. Editable, can be shipped or cancelled.
 *   in_transit  — source branch decremented; destination not yet incremented.
 *                 Receiver must confirm (with received qty per line) or cancel.
 *   received    — destination incremented, transfer closed. Read-only.
 *   cancelled   — never touched stock OR was reversed (depending on backend).
 *
 * Permissions: owner + manager can create / ship / receive / cancel.
 *   - Ship requires manager-PIN approval (handed off to backend as
 *     X-Manager-Approval header). Stock decrements happen the moment
 *     the manager approves, so this gate is tight.
 *   - Receive opens a count modal where each line's received qty can
 *     differ from the sent qty (handles damage / shrinkage in transit).
 */
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listBranches, listBranchTransfers, createBranchTransfer,
  shipBranchTransfer, receiveBranchTransfer, cancelBranchTransfer,
  getProducts,
} from '../api/retailApi';
import { useAuth } from '../context/AuthContext';
import { fmt } from '../utils/format';
import { confirm } from '../utils/confirm';
import { requireManagerApproval } from '../utils/managerApproval';
import { invalidateBranchCaches, invalidateProductCaches } from '../utils/queryCache';
import BackLink from '../components/BackLink';

const T = {
  green:   '#1a6b3a',
  greenT:  '#e8f5ee',
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

const STATUS_PILL = {
  draft:      { bg: T.surface, fg: T.muted,  label: 'Draft' },
  in_transit: { bg: T.amberT,  fg: T.amber,  label: 'In transit' },
  received:   { bg: T.greenT,  fg: T.green,  label: 'Received' },
  cancelled:  { bg: T.surface, fg: T.muted,  label: 'Cancelled' },
};

const formatApiError = (err, fallback = 'Save failed') => {
  const data = err?.response?.data;
  if (typeof data === 'string') return data;
  if (data?.detail) return data.detail;
  if (data && typeof data === 'object') {
    const lines = Object.entries(data).map(([k, v]) =>
      `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
    if (lines.length) return lines.join('\n');
  }
  return err?.message || fallback;
};

export default function BranchTransfers() {
  const { user } = useAuth() || {};
  const qc = useQueryClient();
  const canManage = user?.role === 'owner' || user?.role === 'manager';

  const [showNew, setShowNew] = useState(false);
  const [receiving, setReceiving] = useState(null); // transfer object

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['retail-branch-transfers'],
    queryFn: () => listBranchTransfers(),
    staleTime: 30_000,
  });
  const { data: branches = [] } = useQuery({
    queryKey: ['retail-branches'],
    queryFn: listBranches,
    staleTime: 60_000,
  });
  const { data: products = [] } = useQuery({
    queryKey: ['retail-products-for-transfer'],
    queryFn: getProducts,
    staleTime: 60_000,
  });

  const branchById = useMemo(() => {
    const m = {};
    (branches || []).forEach((b) => { m[b.id] = b; });
    return m;
  }, [branches]);

  // Mutations — every one fans out to invalidateBranchCaches +
  // invalidateProductCaches + chain rollup so the user never has
  // to F5 to see the new stock numbers anywhere in the app.
  const fanout = () => {
    invalidateBranchCaches(qc);
    invalidateProductCaches(qc);
    qc.invalidateQueries({ queryKey: ['chain-rollup'] });
  };

  const createMut = useMutation({
    mutationFn: createBranchTransfer,
    onSuccess: () => { fanout(); setShowNew(false); },
    onError: (err) => alert('Could not create transfer:\n\n' + formatApiError(err)),
  });

  const shipMut = useMutation({
    mutationFn: ({ id, token }) => shipBranchTransfer(id, token),
    onSuccess: fanout,
    onError: (err) => alert('Could not ship transfer:\n\n' + formatApiError(err)),
  });

  const receiveMut = useMutation({
    mutationFn: ({ id, items_received }) => receiveBranchTransfer(id, items_received),
    onSuccess: () => { fanout(); setReceiving(null); },
    onError: (err) => alert('Could not receive transfer:\n\n' + formatApiError(err)),
  });

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }) => cancelBranchTransfer(id, reason),
    onSuccess: fanout,
    onError: (err) => alert('Could not cancel transfer:\n\n' + formatApiError(err)),
  });

  const onShip = async (t) => {
    const totalQty = (t.items || []).reduce((s, i) => s + Number(i.qty || 0), 0);
    const sourceName = branchById[t.source_branch]?.name || t.source_branch_name || 'source';
    const ok = await confirm({
      title: 'Ship transfer',
      message: `Ship transfer ${t.reference || `#${t.id}`}? This deducts ${totalQty} units from ${sourceName} immediately. Manager approval required.`,
      confirmText: 'Continue to approval',
      danger: false,
    });
    if (!ok) return;
    try {
      const token = await requireManagerApproval('void_sale', {
        resourceType: 'branch_transfer',
        resourceId: t.id,
      });
      shipMut.mutate({ id: t.id, token });
    } catch (_) { /* cancelled */ }
  };

  const onCancel = async (t) => {
    const reason = await promptText({
      title: 'Cancel transfer',
      message: `Cancel transfer ${t.reference || `#${t.id}`}? If it's already in transit the source branch's stock will be returned.`,
      label: 'Reason (optional)',
      confirmText: 'Cancel transfer',
    });
    if (reason === null) return; // user backed out
    cancelMut.mutate({ id: t.id, reason });
  };

  return (
    <div style={{
      padding: 32, fontFamily: "'Inter', system-ui, sans-serif",
      background: T.surface, minHeight: '100%', color: T.ink,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 8 }}>
          <BackLink to="/app" label="Back to dashboard" variant="subtle" />
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          flexWrap: 'wrap', gap: 12, marginBottom: 18,
        }}>
          <div style={{ flex: '1 1 420px', minWidth: 0 }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 28, fontWeight: 700, color: T.ink, margin: 0,
            }}>Stock transfers</h1>
            <p style={{ color: T.muted, fontSize: 14, marginTop: 6, lineHeight: 1.55, maxWidth: 640 }}>
              Move stock between branches. Source decrements when shipped;
              destination increments when received.
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setShowNew(true)}
              disabled={branches.length < 2}
              title={branches.length < 2 ? 'Need at least 2 branches to transfer between' : ''}
              style={{
                background: branches.length < 2 ? '#9ca3af' : T.green,
                color: '#fff', border: 'none',
                padding: '10px 18px', borderRadius: 8,
                fontSize: 13, fontWeight: 600,
                cursor: branches.length < 2 ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >+ New transfer</button>
          )}
        </div>

        {isLoading ? (
          <div style={{ color: T.muted, padding: 40, textAlign: 'center' }}>Loading…</div>
        ) : transfers.length === 0 ? (
          <div style={{
            background: '#fff', border: `1px solid ${T.line}`, borderRadius: 12,
            padding: 40, textAlign: 'center', color: T.muted,
          }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>{'\u{1F4E6}'}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>No transfers yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Create a transfer to move products between your branches.
            </div>
          </div>
        ) : (
          <div style={{
            background: '#fff', border: `1px solid ${T.line}`, borderRadius: 12,
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: T.surface }}>
                <tr>
                  <Th>Reference</Th>
                  <Th>From → To</Th>
                  <Th align="right">Items</Th>
                  <Th align="right">Units</Th>
                  <Th>Created</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => {
                  const pill = STATUS_PILL[t.status] || STATUS_PILL.draft;
                  const totalUnits = (t.items || []).reduce((s, i) => s + Number(i.qty || 0), 0);
                  const itemCount = (t.items || []).length;
                  const isCancelled = t.status === 'cancelled';
                  const fromName = branchById[t.source_branch]?.name || t.source_branch_name || '—';
                  const toName = branchById[t.dest_branch]?.name || t.dest_branch_name || '—';
                  return (
                    <tr key={t.id} style={{ borderTop: `1px solid ${T.line}` }}>
                      <Td style={{
                        fontFamily: 'monospace', fontWeight: 600, color: T.green,
                        textDecoration: isCancelled ? 'line-through' : 'none',
                      }}>{t.reference || `TRF-${t.id}`}</Td>
                      <Td>
                        <div style={{ color: T.ink, fontWeight: 600 }}>{fromName}</div>
                        <div style={{ color: T.muted, fontSize: 11 }}>→ {toName}</div>
                      </Td>
                      <Td align="right">{itemCount}</Td>
                      <Td align="right" style={{ fontWeight: 600 }}>{totalUnits}</Td>
                      <Td>
                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                      </Td>
                      <Td>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 12,
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                          background: pill.bg, color: pill.fg, textTransform: 'uppercase',
                        }}>{pill.label}</span>
                      </Td>
                      <Td align="right">
                        {canManage && t.status === 'draft' && (
                          <>
                            <RowBtn onClick={() => onShip(t)} disabled={shipMut.isPending}
                              tone="green">Ship</RowBtn>
                            <RowBtn onClick={() => onCancel(t)} disabled={cancelMut.isPending}
                              tone="muted">Cancel</RowBtn>
                          </>
                        )}
                        {canManage && t.status === 'in_transit' && (
                          <>
                            <RowBtn onClick={() => setReceiving(t)} tone="green">Receive</RowBtn>
                            <RowBtn onClick={() => onCancel(t)} disabled={cancelMut.isPending}
                              tone="muted">Cancel</RowBtn>
                          </>
                        )}
                        {(t.status === 'received' || t.status === 'cancelled') && (
                          <span style={{ color: T.muted, fontSize: 11 }}>—</span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {showNew && (
          <NewTransferModal
            branches={branches}
            products={products}
            saving={createMut.isPending}
            onClose={() => setShowNew(false)}
            onSubmit={(data) => createMut.mutate(data)}
          />
        )}

        {receiving && (
          <ReceiveTransferModal
            transfer={receiving}
            saving={receiveMut.isPending}
            onClose={() => setReceiving(null)}
            onSubmit={(items_received) => receiveMut.mutate({ id: receiving.id, items_received })}
          />
        )}
      </div>
    </div>
  );
}

/* --- Small table cell components --- */
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
      padding: '11px 14px', fontSize: 12, color: T.inkSoft,
      textAlign: align, ...style,
    }}>{children}</td>
  );
}
function RowBtn({ children, onClick, disabled, tone = 'muted' }) {
  const map = {
    green: { bg: T.greenT, fg: T.green, border: T.green },
    muted: { bg: T.surface, fg: T.inkSoft, border: T.line },
    red:   { bg: T.redT, fg: T.red, border: T.red },
  };
  const c = map[tone] || map.muted;
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        marginLeft: 6, padding: '4px 10px', borderRadius: 6,
        border: `1px solid ${c.border}`, background: c.bg,
        color: c.fg, fontSize: 11, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1, fontFamily: 'inherit',
      }}
    >{children}</button>
  );
}

/* --- New transfer modal --- */
function NewTransferModal({ branches, products, saving, onClose, onSubmit }) {
  const [source, setSource] = useState('');
  const [dest, setDest] = useState('');
  const [lines, setLines] = useState([{ product: '', qty: 1, note: '' }]);
  const [err, setErr] = useState('');

  const addLine = () => setLines((ls) => [...ls, { product: '', qty: 1, note: '' }]);
  const removeLine = (i) => setLines((ls) => ls.filter((_, idx) => idx !== i));
  const updateLine = (i, k, v) => setLines((ls) =>
    ls.map((line, idx) => idx === i ? { ...line, [k]: v } : line)
  );

  const submit = (e) => {
    e.preventDefault();
    setErr('');
    if (!source) { setErr('Pick a source branch.'); return; }
    if (!dest) { setErr('Pick a destination branch.'); return; }
    if (String(source) === String(dest)) {
      setErr('Source and destination must be different branches.');
      return;
    }
    const cleaned = lines
      .filter((l) => l.product && Number(l.qty) > 0)
      .map((l) => ({ product: Number(l.product), qty: Number(l.qty), note: l.note || '' }));
    if (cleaned.length === 0) {
      setErr('Add at least one product line with quantity > 0.');
      return;
    }
    onSubmit({
      source_branch: Number(source),
      dest_branch: Number(dest),
      items: cleaned,
    });
  };

  return (
    <ModalShell title="New stock transfer" onClose={onClose} maxWidth={620}>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <Field label="From" required>
            <select required value={source} onChange={(e) => setSource(e.target.value)} style={inputStyle}>
              <option value="">— Select source —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}{b.code ? ` (${b.code})` : ''}{b.is_hq ? ' · HQ' : ''}</option>
              ))}
            </select>
          </Field>
          <Field label="To" required>
            <select required value={dest} onChange={(e) => setDest(e.target.value)} style={inputStyle}>
              <option value="">— Select destination —</option>
              {branches.filter((b) => String(b.id) !== String(source)).map((b) => (
                <option key={b.id} value={b.id}>{b.name}{b.code ? ` (${b.code})` : ''}{b.is_hq ? ' · HQ' : ''}</option>
              ))}
            </select>
          </Field>
        </div>

        <div style={{
          fontSize: 11, fontWeight: 700, color: T.muted,
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
        }}>Items</div>

        <div style={{ marginBottom: 10 }}>
          {lines.map((line, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '2fr 80px 2fr 32px',
              gap: 6, marginBottom: 6, alignItems: 'start',
            }}>
              <select
                value={line.product}
                onChange={(e) => updateLine(i, 'product', e.target.value)}
                style={inputStyle}
              >
                <option value="">— Pick product —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input
                type="number" min="1" step="1" value={line.qty}
                onChange={(e) => updateLine(i, 'qty', e.target.value)}
                placeholder="Qty"
                style={inputStyle}
              />
              <input
                type="text" value={line.note}
                onChange={(e) => updateLine(i, 'note', e.target.value)}
                placeholder="Note (optional)"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => removeLine(i)}
                disabled={lines.length === 1}
                title="Remove line"
                style={{
                  background: 'transparent', border: `1px solid ${T.line}`,
                  borderRadius: 6, color: T.muted, cursor: lines.length === 1 ? 'not-allowed' : 'pointer',
                  fontSize: 14, fontFamily: 'inherit', height: 36,
                }}
              >{'×'}</button>
            </div>
          ))}
          <button type="button" onClick={addLine} style={{
            marginTop: 4, padding: '6px 12px', background: 'transparent',
            border: `1px dashed ${T.line}`, borderRadius: 6,
            color: T.green, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>+ Add another line</button>
        </div>

        {err && (
          <div style={{
            background: T.redT, color: T.red,
            padding: '8px 12px', borderRadius: 7,
            fontSize: 12, marginBottom: 10,
          }}>{err}</div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button type="submit" disabled={saving} style={{
            flex: 1, padding: 11, background: T.green, color: '#fff',
            border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1, fontFamily: 'inherit',
          }}>
            {saving ? 'Creating…' : 'Save as draft'}
          </button>
          <button type="button" onClick={onClose} style={{
            flex: 1, padding: 11, background: T.surface, color: T.inkSoft,
            border: `1px solid ${T.line}`, borderRadius: 7,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>Cancel</button>
        </div>
      </form>
    </ModalShell>
  );
}

/* --- Receive transfer modal: confirm received qty per line --- */
function ReceiveTransferModal({ transfer, saving, onClose, onSubmit }) {
  const [counts, setCounts] = useState(() => {
    const m = {};
    (transfer.items || []).forEach((it) => { m[it.id] = String(it.qty); });
    return m;
  });
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    setErr('');
    const items_received = (transfer.items || []).map((it) => ({
      item_id: it.id,
      qty_received: Number(counts[it.id] || 0),
    }));
    if (items_received.some((r) => r.qty_received < 0 || isNaN(r.qty_received))) {
      setErr('Received quantities must be 0 or more.');
      return;
    }
    onSubmit(items_received);
  };

  return (
    <ModalShell title={`Receive ${transfer.reference || `transfer #${transfer.id}`}`} onClose={onClose} maxWidth={560}>
      <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, marginTop: 0, marginBottom: 14 }}>
        Confirm what arrived. If a line is short, lower its received qty —
        the difference will be logged as in-transit shrinkage.
      </p>

      <form onSubmit={submit}>
        <div style={{
          border: `1px solid ${T.line}`, borderRadius: 8, overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 80px 100px',
            background: T.surface, padding: '8px 12px',
            fontSize: 10, fontWeight: 700, color: T.muted,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <div>Product</div>
            <div style={{ textAlign: 'right' }}>Sent</div>
            <div style={{ textAlign: 'right' }}>Received</div>
          </div>
          {(transfer.items || []).map((it) => (
            <div key={it.id} style={{
              display: 'grid', gridTemplateColumns: '2fr 80px 100px',
              padding: '10px 12px', borderTop: `1px solid ${T.line}`,
              alignItems: 'center', fontSize: 13,
            }}>
              <div>
                <div style={{ color: T.ink, fontWeight: 600 }}>
                  {it.product_name || `Product #${it.product}`}
                </div>
                {it.note && (
                  <div style={{ color: T.muted, fontSize: 11 }}>{it.note}</div>
                )}
              </div>
              <div style={{ textAlign: 'right', color: T.muted }}>{it.qty}</div>
              <div style={{ textAlign: 'right' }}>
                <input
                  type="number" min="0" step="1"
                  value={counts[it.id] ?? ''}
                  onChange={(e) => setCounts((c) => ({ ...c, [it.id]: e.target.value }))}
                  style={{
                    width: 80, padding: '6px 8px', textAlign: 'right',
                    border: `1px solid ${T.line}`, borderRadius: 6,
                    fontSize: 13, outline: 'none', fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {err && (
          <div style={{
            background: T.redT, color: T.red,
            padding: '8px 12px', borderRadius: 7,
            fontSize: 12, marginTop: 10,
          }}>{err}</div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button type="submit" disabled={saving} style={{
            flex: 1, padding: 11, background: T.green, color: '#fff',
            border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1, fontFamily: 'inherit',
          }}>
            {saving ? 'Receiving…' : 'Confirm receipt'}
          </button>
          <button type="button" onClick={onClose} style={{
            flex: 1, padding: 11, background: T.surface, color: T.inkSoft,
            border: `1px solid ${T.line}`, borderRadius: 7,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>Cancel</button>
        </div>
      </form>
    </ModalShell>
  );
}

/* --- Tiny inline-promise text prompt (used for cancel reason) --- */
function promptText({ title, message, label, confirmText }) {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.setAttribute('data-pewil-prompt', '');
    document.body.appendChild(host);
    // We can't dynamically import ReactDOM here without bloating the
    // bundle, so use a simple synchronous prompt as a fallback. The
    // surrounding page already runs on the user's machine, so a native
    // prompt is acceptable for the cancel-reason capture only.
    // If the user cancels the prompt, resolve(null) so the caller can
    // back out.
    document.body.removeChild(host);
    // eslint-disable-next-line no-alert
    const v = window.prompt(`${title}\n\n${message}\n\n${label}:`, '');
    if (v === null) resolve(null);
    else resolve(v.trim());
    // confirmText is unused with native prompt but kept in signature
    // for future React-rendered upgrade.
    void confirmText;
  });
}

/* --- Reusable modal shell --- */
function ModalShell({ title, onClose, maxWidth = 480, children }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 12, padding: 24,
          maxWidth, width: '94%', maxHeight: '92vh', overflowY: 'auto',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 14,
        }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 20, fontWeight: 700, margin: 0, color: T.ink,
          }}>{title}</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22,
            cursor: 'pointer', color: T.muted, lineHeight: 1,
          }}>{'×'}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 600,
        color: T.muted, marginBottom: 4, textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>
        {label}{required && <span style={{ color: T.red }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '8px 10px',
  border: `1px solid ${T.line}`, borderRadius: 6,
  fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  background: '#fff',
};

// `fmt` import is reserved for future revenue/value column display.
void fmt;
