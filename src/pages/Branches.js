/**
 * Branches — list every retail branch the tenant operates.
 *
 * A branch is a physical store. Stock counts, sales, and reports are
 * tracked per branch. Every tenant has at least one branch (HQ, created
 * automatically at signup). Enterprise plans can add more; Growth caps
 * at 3, Starter at 1.
 *
 * Owners can:
 *   - Add a new branch (subject to plan caps)
 *   - Edit branch details (name, code, address, manager)
 *   - Promote a branch to HQ (only one HQ at a time — backend swaps)
 *   - Archive (soft-delete) a non-HQ branch
 *
 * Manager / worker roles see the list read-only.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listBranches, createBranch, updateBranch, deleteBranch, setBranchAsHQ,
} from '../api/retailApi';
import { useAuth } from '../context/AuthContext';
import { confirm } from '../utils/confirm';
import { invalidateBranchCaches } from '../utils/queryCache';
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

// Per-receipt retail (2026-05-17): every retail tenant gets unlimited
// branches. The cap is the $999/mo billing cap, not a branch ceiling.
// Legacy 'starter' / 'growth' / 'enterprise' tier names still appear on
// Subscription.plan rows from before the pricing revolution — those map
// to Infinity now because they're billed via pricing_mode='usage'.
const PLAN_CAPS = {
  starter:    Infinity,
  growth:     Infinity,
  enterprise: Infinity,
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

export default function Branches() {
  const { user } = useAuth() || {};
  const qc = useQueryClient();
  const isOwner = user?.role === 'owner';

  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...} = edit

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['retail-branches'],
    queryFn: listBranches,
    staleTime: 30_000,
  });

  // Determine plan cap. Cap is "soft" client-side — backend enforces hard.
  const plan = (user?.plan || 'starter').toLowerCase();
  const cap = PLAN_CAPS[plan] ?? 1;
  const atCap = branches.length >= cap;
  const capTooltip = atCap
    ? 'Branch cap reached — contact support.'
    : '';

  const createMut = useMutation({
    mutationFn: createBranch,
    onSuccess: () => { invalidateBranchCaches(qc); setEditing(null); },
    onError: (err) => alert('Could not save branch:\n\n' + formatApiError(err)),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateBranch(id, data),
    onSuccess: () => { invalidateBranchCaches(qc); setEditing(null); },
    onError: (err) => alert('Could not update branch:\n\n' + formatApiError(err)),
  });
  const deleteMut = useMutation({
    mutationFn: deleteBranch,
    onSuccess: () => invalidateBranchCaches(qc),
    onError: (err) => alert('Could not archive branch:\n\n' + formatApiError(err)),
  });
  const promoteMut = useMutation({
    mutationFn: setBranchAsHQ,
    onSuccess: () => invalidateBranchCaches(qc),
    onError: (err) => alert('Could not promote branch:\n\n' + formatApiError(err)),
  });

  const onArchive = async (b) => {
    if (b.is_hq) return;
    const ok = await confirm({
      title: 'Archive branch',
      message: `Archive "${b.name}"? Past sales and stock movements stay on the books, but the branch will stop appearing in pickers and reports. An owner can restore it later from the archive.`,
      confirmText: 'Archive',
      danger: false,
    });
    if (ok) deleteMut.mutate(b.id);
  };

  const onPromote = async (b) => {
    if (b.is_hq) return;
    const ok = await confirm({
      title: 'Promote to HQ',
      message: `Make "${b.name}" the new HQ? The current HQ will become a regular branch. Chain-wide reports, owner dashboards, and the default journal source will swap to this location.`,
      confirmText: 'Promote',
      danger: false,
    });
    if (ok) promoteMut.mutate(b.id);
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
            }}>Branches</h1>
            <p style={{ color: T.muted, fontSize: 14, marginTop: 6, lineHeight: 1.55, maxWidth: 640 }}>
              Each branch is a physical retail location. Stock, sales,
              and reports are tracked per branch.
            </p>
          </div>
          {isOwner && (
            <div title={capTooltip}>
              <button
                onClick={() => !atCap && setEditing({})}
                disabled={atCap}
                style={{
                  background: atCap ? '#9ca3af' : T.green,
                  color: '#fff', border: 'none',
                  padding: '10px 18px', borderRadius: 8,
                  fontSize: 13, fontWeight: 600,
                  cursor: atCap ? 'not-allowed' : 'pointer',
                  opacity: atCap ? 0.7 : 1,
                  fontFamily: 'inherit',
                }}
              >
                + Add branch
              </button>
            </div>
          )}
        </div>

        {/* Plan cap notice */}
        {isOwner && atCap && cap !== Infinity && (
          <div style={{
            background: T.amberT, border: `1px solid ${T.amber}`,
            color: '#7c2d12', padding: '10px 14px', borderRadius: 8,
            fontSize: 12, marginBottom: 16,
          }}>
            You're using {branches.length} of {cap} branches on the {plan.charAt(0).toUpperCase() + plan.slice(1)} plan.
            Upgrade to Enterprise to run an unlimited chain.
          </div>
        )}

        {isLoading ? (
          <div style={{ color: T.muted, padding: 40, textAlign: 'center' }}>Loading…</div>
        ) : branches.length === 0 ? (
          <div style={{
            background: '#fff', border: `1px solid ${T.line}`, borderRadius: 12,
            padding: 40, textAlign: 'center', color: T.muted,
          }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>{'\u{1F3EA}'}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>No branches yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Add your first branch to start tracking stock and sales by location.
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 14,
          }}>
            {branches.map((b) => (
              <BranchCard
                key={b.id}
                branch={b}
                isOwner={isOwner}
                onEdit={() => setEditing(b)}
                onPromote={() => onPromote(b)}
                onArchive={() => onArchive(b)}
                busy={
                  (deleteMut.isPending && deleteMut.variables === b.id) ||
                  (promoteMut.isPending && promoteMut.variables === b.id)
                }
              />
            ))}
          </div>
        )}

        {editing !== null && (
          <BranchModal
            branch={editing}
            onClose={() => setEditing(null)}
            onSubmit={(data) => {
              if (editing && editing.id) updateMut.mutate({ id: editing.id, data });
              else createMut.mutate(data);
            }}
            saving={createMut.isPending || updateMut.isPending}
          />
        )}
      </div>
    </div>
  );
}

function BranchCard({ branch, isOwner, onEdit, onPromote, onArchive, busy }) {
  const inactive = branch.is_active === false;
  const phone = branch.phone || '';
  const address = branch.address || '';
  const manager = branch.manager_name || branch.manager_username || '';

  return (
    <div style={{
      background: '#fff', border: `1px solid ${T.line}`, borderRadius: 12,
      padding: 18, opacity: inactive ? 0.65 : 1,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <div style={{
          fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700,
          color: T.ink, marginRight: 4, lineHeight: 1.2,
        }}>{branch.name}</div>
        {branch.code && (
          <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 6,
            background: T.surface, border: `1px solid ${T.line}`,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
            color: T.inkSoft,
          }}>{branch.code}</span>
        )}
        {branch.is_hq && (
          <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 6,
            background: T.greenT, color: T.green,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
          }}>HQ</span>
        )}
        {inactive && (
          <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 6,
            background: T.surface, color: T.muted,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
          }}>INACTIVE</span>
        )}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.6 }}>
        <Row label="Address" value={address} />
        <Row label="Phone" value={phone} />
        <Row label="Manager" value={manager} fallback="Unassigned" />
      </div>

      {isOwner && (
        <div style={{
          display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14,
          paddingTop: 12, borderTop: `1px solid ${T.line}`,
        }}>
          <button
            onClick={onEdit}
            style={cardBtn}
          >Edit</button>
          {!branch.is_hq && (
            <button
              onClick={onPromote}
              disabled={busy}
              style={{ ...cardBtn, color: T.green, borderColor: T.green }}
            >Promote to HQ</button>
          )}
          <button
            onClick={onArchive}
            disabled={branch.is_hq || busy}
            title={branch.is_hq ? 'Promote another branch to HQ first' : ''}
            style={{
              ...cardBtn,
              color: branch.is_hq ? T.muted : T.red,
              borderColor: branch.is_hq ? T.line : T.red,
              cursor: branch.is_hq ? 'not-allowed' : 'pointer',
              opacity: branch.is_hq ? 0.55 : 1,
            }}
          >Archive</button>
        </div>
      )}
    </div>
  );
}

const cardBtn = {
  padding: '6px 12px', borderRadius: 7,
  border: `1px solid ${T.line}`, background: '#fff',
  fontSize: 11, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'inherit', color: T.inkSoft,
};

function Row({ label, value, fallback }) {
  const isEmpty = !value;
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
      <span style={{ width: 70, color: T.muted, fontSize: 11 }}>{label}</span>
      <span style={{
        flex: 1, color: isEmpty ? T.muted : T.ink,
        fontStyle: isEmpty ? 'italic' : 'normal',
        wordBreak: 'break-word',
      }}>
        {isEmpty ? (fallback || '—') : value}
      </span>
    </div>
  );
}

function BranchModal({ branch, onClose, onSubmit, saving }) {
  const isNew = !branch || !branch.id;
  const [form, setForm] = useState({
    name:    branch?.name    || '',
    code:    branch?.code    || '',
    address: branch?.address || '',
    phone:   branch?.phone   || '',
    manager_name: branch?.manager_name || '',
    is_active:    branch?.is_active !== false,
  });
  const [err, setErr] = useState('');

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    setErr('');
    if (!form.name.trim()) { setErr('Name is required.'); return; }
    if (!/^[A-Z0-9]{3,8}$/.test(form.code)) {
      setErr('Code must be 3-8 uppercase letters or digits.');
      return;
    }
    onSubmit({
      name: form.name.trim(),
      code: form.code,
      address: form.address.trim(),
      phone: form.phone.trim(),
      manager_name: form.manager_name.trim(),
      is_active: !!form.is_active,
    });
  };

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
          maxWidth: 480, width: '92%', maxHeight: '92vh', overflowY: 'auto',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 20, fontWeight: 700, margin: 0, color: T.ink,
          }}>
            {isNew ? 'Add branch' : `Edit ${branch.name}`}
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22,
            cursor: 'pointer', color: T.muted, lineHeight: 1,
          }}>{'×'}</button>
        </div>

        <form onSubmit={submit}>
          <Field label="Name" required>
            <input
              autoFocus required type="text" value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Avenues Branch"
              style={inputStyle}
            />
          </Field>

          <Field label="Code" required hint="3-8 uppercase letters or digits, e.g. AVE, BR01">
            <input
              required type="text" value={form.code}
              onChange={(e) => update('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
              placeholder="AVE"
              style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '0.1em' }}
            />
          </Field>

          <Field label="Address">
            <textarea
              rows={2} value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="42 Sam Nujoma Street, Avenues, Harare"
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </Field>

          <Field label="Phone">
            <input
              type="tel" value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+263 77 123 4567"
              style={inputStyle}
            />
          </Field>

          <Field label="Manager" hint="Free-text for now — user picker coming soon.">
            <input
              type="text" value={form.manager_name}
              onChange={(e) => update('manager_name', e.target.value)}
              placeholder="Tendai Moyo"
              style={inputStyle}
            />
          </Field>

          <label style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 0', fontSize: 13, color: T.inkSoft,
            cursor: 'pointer',
          }}>
            <input
              type="checkbox" checked={!!form.is_active}
              onChange={(e) => update('is_active', e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            Active — branch appears in pickers and reports
          </label>

          {err && (
            <div style={{
              background: T.redT, color: T.red,
              padding: '8px 12px', borderRadius: 7,
              fontSize: 12, marginTop: 6, marginBottom: 6,
            }}>{err}</div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button
              type="submit" disabled={saving}
              style={{
                flex: 1, padding: 11, background: T.green, color: '#fff',
                border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1, fontFamily: 'inherit',
              }}
            >
              {saving ? 'Saving…' : (isNew ? 'Add branch' : 'Save changes')}
            </button>
            <button
              type="button" onClick={onClose}
              style={{
                flex: 1, padding: 11, background: T.surface, color: T.inkSoft,
                border: `1px solid ${T.line}`, borderRadius: 7,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 600,
        color: T.muted, marginBottom: 4, textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>
        {label}{required && <span style={{ color: T.red }}> *</span>}
      </label>
      {children}
      {hint && (
        <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{hint}</div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px',
  border: `1px solid ${T.line}`, borderRadius: 7,
  fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};
