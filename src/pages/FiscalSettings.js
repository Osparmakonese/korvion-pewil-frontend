/**
 * FiscalSettings — multi-country tax-authority configuration page.
 *
 * Replaces the old single-purpose ZimraFiscal page with a country-aware
 * grid: every adapter Pewil supports is shown as a card; the operator
 * clicks the one that matches their country (or any country they trade
 * in) and pastes the credentials their tax authority issued.
 *
 * UX
 * --
 *   1. On load, fetch /retail/fiscal-credentials/adapters/ which returns
 *      a list of { name, authority_name, country_code, country_name,
 *      tax_id_label, tier, is_realtime, is_my_country, is_configured,
 *      credential_schema }.
 *   2. Render the tenant's own country's card at the top, then real-time
 *      countries, then alphabetical.
 *   3. "Configure" opens a modal with one input per credential_schema
 *      entry. `secret: true` fields render type=password with a
 *      "show/hide" toggle. Existing values come back as `••••` so the
 *      operator sees "configured" without leaking the secret.
 *   4. After save, the card flips to the "Configured ✓" state with
 *      sandbox/production toggle and last-sync timestamp.
 *
 * Why one page for all countries instead of per-country pages: most
 * Pewil tenants operate in ONE country. The page filters to their
 * country's card by default and collapses everything else under a
 * "Other countries" disclosure. Multi-country tenants (regional chains)
 * see the full grid.
 *
 * Permissions: visible to owner + manager. Workers don't see fiscal
 * settings at all.
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
  getFiscalAdapters,
  listFiscalCredentials,
  createFiscalCredentials as apiCreate,
  updateFiscalCredentials as apiUpdate,
} from '../api/retailApi';
import BackLink from '../components/BackLink';

// Re-export under the names used inside the modal so the modal helper
// component stays readable. Keeps the imports minimal at the top.
const createFiscalCredentials = apiCreate;
const updateFiscalCredentials = apiUpdate;

const T = {
  ink:     '#111827',
  inkSoft: '#374151',
  muted:   '#6b7280',
  line:    '#e5e7eb',
  surface: '#f9fafb',
  green:   '#1a6b3a',
  greenT:  '#e8f5ee',
  amber:   '#c77700',
  amberT:  '#fdeedd',
  red:     '#c0392b',
  blue:    '#1d4ed8',
  blueT:   '#dbeafe',
};

const TIER_PILL = {
  A: { bg: T.greenT, fg: T.green, label: 'Real-time' },
  B: { bg: T.amberT, fg: T.amber, label: 'Periodic' },
  C: { bg: T.surface, fg: T.muted, label: 'Rate only' },
  D: { bg: T.surface, fg: T.muted, label: 'Manual' },
};

export default function FiscalSettings() {
  const { user } = useAuth() || {};
  const qc = useQueryClient();
  const isOwnerOrManager = user?.role === 'owner' || user?.role === 'manager';
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState(null); // { adapter, credential }

  const { data: adapterList, isLoading: adaptersLoading } = useQuery({
    queryKey: ['fiscal-adapters'],
    queryFn: getFiscalAdapters,
    staleTime: 60_000,
  });
  const { data: credList = [] } = useQuery({
    queryKey: ['fiscal-credentials'],
    queryFn: listFiscalCredentials,
    staleTime: 30_000,
  });

  const credByAdapter = useMemo(() => {
    const m = {};
    (Array.isArray(credList) ? credList : credList?.results || [])
      .forEach((row) => { m[row.adapter_name] = row; });
    return m;
  }, [credList]);

  const adapters = adapterList?.adapters || [];
  const myAdapter = adapters.find(a => a.is_my_country);
  const otherAdapters = adapters.filter(a => !a.is_my_country);

  if (!isOwnerOrManager) {
    return (
      <div style={{ padding: 32, fontFamily: "'Inter', sans-serif" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: T.ink }}>
          Tax compliance
        </h1>
        <p style={{ color: T.muted, fontSize: 14 }}>
          Only owners and managers can configure tax-authority credentials.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      padding: 32, fontFamily: "'Inter', system-ui, sans-serif",
      background: T.surface, minHeight: '100%', color: T.ink,
    }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ marginBottom: 6 }}>
          <BackLink to="/app" label="Back to dashboard" variant="subtle" />
        </div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 28, fontWeight: 700, color: T.ink, margin: 0,
        }}>Tax compliance</h1>
        <p style={{ color: T.muted, fontSize: 14, marginTop: 6, lineHeight: 1.55 }}>
          Connect Pewil to your country's tax authority so receipts are
          fiscalised in real time. Without credentials, Pewil still
          computes correct VAT and prints a receipt — your accountant
          handles the periodic filing.
        </p>

        {adaptersLoading && (
          <div style={{ marginTop: 24, color: T.muted }}>Loading adapters…</div>
        )}

        {/* My country */}
        {myAdapter && (
          <section style={{ marginTop: 24 }}>
            <h2 style={sectionTitle}>Your country</h2>
            <AdapterCard
              adapter={myAdapter}
              credential={credByAdapter[myAdapter.name]}
              onEdit={() => setEditing({
                adapter: myAdapter,
                credential: credByAdapter[myAdapter.name],
              })}
            />
          </section>
        )}

        {/* Other countries */}
        <section style={{ marginTop: 32 }}>
          <button
            type="button"
            onClick={() => setShowAll((s) => !s)}
            style={{
              background: 'transparent', border: 0, cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 700, fontSize: 14,
              color: T.inkSoft, padding: 0,
            }}
          >
            {showAll ? '▾' : '▸'} Other countries ({otherAdapters.length})
          </button>
          {showAll && (
            <div style={{
              marginTop: 14,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: 14,
            }}>
              {otherAdapters.map((a) => (
                <AdapterCard
                  key={a.name}
                  adapter={a}
                  credential={credByAdapter[a.name]}
                  onEdit={() => setEditing({
                    adapter: a,
                    credential: credByAdapter[a.name],
                  })}
                />
              ))}
            </div>
          )}
        </section>

        {/* Edit modal */}
        {editing && (
          <FiscalCredentialsModal
            adapter={editing.adapter}
            credential={editing.credential}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              qc.invalidateQueries({ queryKey: ['fiscal-adapters'] });
              qc.invalidateQueries({ queryKey: ['fiscal-credentials'] });
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Adapter card ─── */
function AdapterCard({ adapter, credential, onEdit }) {
  const tier = TIER_PILL[adapter.tier] || TIER_PILL.C;
  const configured = !!credential;
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${configured ? T.greenT : T.line}`,
      borderRadius: 14,
      padding: 18,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 15, color: T.ink }}>
          {adapter.country_name || adapter.authority_name}
        </strong>
        <span style={pillStyle(tier.bg, tier.fg)}>{tier.label}</span>
        {configured && (
          <span style={pillStyle(T.greenT, T.green)}>● Configured</span>
        )}
        {!configured && adapter.is_realtime && (
          <span style={pillStyle(T.amberT, T.amber)}>Not configured</span>
        )}
      </div>
      <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
        {adapter.authority_name}
        {' · '}
        {(adapter.tax_rate * 100).toFixed(adapter.tax_rate < 0.1 ? 2 : 1)}% {/* eg 7.50% NG, 18.0% UG */}
        {' · '}
        {adapter.currency || '—'}
      </div>
      {configured && credential && (
        <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>
          {credential.tax_id && <>Tax ID: <strong>{credential.tax_id}</strong> · </>}
          {credential.environment === 'production' ? 'Live' : 'Sandbox'}
          {credential.last_synced_at && (
            <> · Last sync {new Date(credential.last_synced_at).toLocaleString()}</>
          )}
          {credential.last_error && (
            <div style={{ color: T.red, marginTop: 4 }}>
              ⚠ {credential.last_error}
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button
          type="button"
          onClick={onEdit}
          style={{
            background: configured ? T.surface : T.green,
            color: configured ? T.ink : '#fff',
            border: configured ? `1px solid ${T.line}` : 0,
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {configured ? 'Edit credentials' : 'Configure'}
        </button>
      </div>
    </div>
  );
}

/* ─── Edit modal ─── */
function FiscalCredentialsModal({ adapter, credential, onClose, onSaved }) {
  const schema = adapter.credential_schema || [];
  const [environment, setEnvironment] = useState(credential?.environment || 'sandbox');
  const [taxId, setTaxId] = useState(credential?.tax_id || '');
  const [businessName, setBusinessName] = useState(credential?.business_name || '');
  const [creds, setCreds] = useState(() => {
    const init = {};
    for (const f of schema) {
      init[f.key] = (credential?.credentials || {})[f.key] || '';
    }
    return init;
  });
  const [show, setShow] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        adapter_name: adapter.name,
        environment,
        credentials: creds,
        tax_id: taxId,
        business_name: businessName,
      };
      if (credential?.id) {
        await updateFiscalCredentials(credential.id, payload);
      } else {
        await createFiscalCredentials(payload);
      }
      onSaved();
    } catch (e) {
      const data = e?.response?.data;
      setError(typeof data === 'string' ? data
        : (data?.detail || JSON.stringify(data || {}) || e.message || 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, padding: 28, maxWidth: 520, width: '92%',
          maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.25)',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 20, color: T.ink }}>
            {adapter.country_name || adapter.authority_name}
          </h2>
          <button onClick={onClose} style={closeBtn}>×</button>
        </div>
        <p style={{ color: T.muted, fontSize: 13, marginBottom: 18 }}>
          {adapter.authority_name}
        </p>

        <Field label="Environment">
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            style={input}
          >
            <option value="sandbox">Sandbox / Test</option>
            <option value="production">Production / Live</option>
          </select>
        </Field>

        <Field label={adapter.tax_id_label || 'Tax ID'}>
          <input
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            style={input}
            placeholder="As issued by your tax authority"
          />
        </Field>

        <Field label="Business name (as registered)">
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            style={input}
          />
        </Field>

        {schema.map((f) => (
          <Field key={f.key} label={f.label}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type={f.secret && !show[f.key] ? 'password' : 'text'}
                value={creds[f.key]}
                onChange={(e) => setCreds((c) => ({ ...c, [f.key]: e.target.value }))}
                style={{ ...input, flex: 1 }}
                placeholder={f.secret ? 'paste secret here' : ''}
              />
              {f.secret && (
                <button
                  type="button"
                  onClick={() => setShow((s) => ({ ...s, [f.key]: !s[f.key] }))}
                  style={smallBtn}
                >{show[f.key] ? 'hide' : 'show'}</button>
              )}
            </div>
          </Field>
        ))}

        {error && (
          <div style={{
            color: T.red, background: '#fef2f2', border: `1px solid #fecaca`,
            padding: '10px 12px', borderRadius: 8, fontSize: 12, marginTop: 8,
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button onClick={onClose} style={cancelBtn}>Cancel</button>
          <button
            onClick={save}
            disabled={saving}
            style={{
              ...saveBtn,
              opacity: saving ? 0.6 : 1,
              cursor: saving ? 'wait' : 'pointer',
            }}
          >{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Style helpers ─── */
const sectionTitle = {
  fontFamily: "'Playfair Display', serif",
  fontSize: 18, fontWeight: 700, color: T.ink,
  margin: '0 0 12px',
};

const pillStyle = (bg, fg) => ({
  display: 'inline-block', background: bg, color: fg,
  fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
  letterSpacing: '0.04em',
});

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700, color: T.inkSoft,
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
      }}>{label}</label>
      {children}
    </div>
  );
}

const input = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: `1px solid ${T.line}`, fontSize: 13,
  fontFamily: 'inherit', boxSizing: 'border-box',
  background: '#fff', color: T.ink,
};

const smallBtn = {
  padding: '8px 12px', borderRadius: 8,
  border: `1px solid ${T.line}`, background: '#fff',
  fontSize: 11, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'inherit', color: T.inkSoft,
};

const cancelBtn = {
  padding: '8px 16px', borderRadius: 8,
  background: T.surface, color: T.ink,
  border: `1px solid ${T.line}`, fontWeight: 600, fontSize: 13,
  cursor: 'pointer', fontFamily: 'inherit',
};

const saveBtn = {
  padding: '8px 18px', borderRadius: 8,
  background: T.green, color: '#fff',
  border: 0, fontWeight: 700, fontSize: 13,
  fontFamily: 'inherit',
};

const closeBtn = {
  background: 'transparent', border: 0, fontSize: 24, cursor: 'pointer',
  color: T.muted, padding: 0, lineHeight: 1, fontFamily: 'inherit',
};
