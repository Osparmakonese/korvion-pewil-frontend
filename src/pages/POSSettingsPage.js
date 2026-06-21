/**
 * POSSettingsPage.js — manager/owner-facing page to configure the POS
 * cashier-screen style and which panels are visible.
 *
 * Backs a per-tenant singleton on the server (GET/PUT /retail/pos-settings/).
 * The POS page reads these on load; changes take effect after the cashier's
 * next POS page load.
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getPOSSettings, updatePOSSettings } from '../api/retailApi';

const THEMES = [
  {
    id: 'light',
    label: 'Counter (Light)',
    hint: 'Clean split layout — products on the left, the sale always visible on the right with big totals. Bright and friendly; fastest to learn.',
    preview: { bg: 'linear-gradient(135deg, #f4f6f2 60%, #1a6b3a 100%)', fg: '#064e3b' },
  },
  {
    id: 'dark',
    label: 'Counter (Dark)',
    hint: 'The same Counter layout in an easy-on-the-eyes dark theme. Great for evening shifts and bright stores.',
    preview: { bg: 'linear-gradient(135deg, #0e1411 55%, #34c172 100%)', fg: '#eafff1' },
  },
  {
    id: 'pnp',
    label: 'Lane Terminal',
    hint: 'Scan-first supermarket lane: itemised ledger with line numbers, a huge balance-due, colour-coded function keys (Qty / Void / Manager) and tender. Best for high-volume tills.',
    preview: { bg: 'linear-gradient(135deg, #1f2937 58%, #15803d 100%)', fg: '#fff' },
  },
];

const TOGGLES = [
  { key: 'show_product_tiles',     label: 'Show product tiles',         hint: 'Grid of tappable products. Turn off for scan-only lanes.' },
  { key: 'show_category_sidebar',  label: 'Show category sidebar',      hint: 'Left-hand category filter tree.' },
  { key: 'show_quick_tiles',       label: 'Show Quick Tiles panel',     hint: 'Large tap-targets for unbarcoded items (produce, bread).' },
  { key: 'show_keypad',            label: 'Show on-screen numeric keypad', hint: 'Inline 4×4 keypad for QTY / PRICE / % entry.' },
  { key: 'show_receipt_preview',   label: 'Show live receipt preview',  hint: 'Right-hand pane showing each line as it\u2019s added.' },
  { key: 'enable_hotkeys',         label: 'Enable F-key hotkeys',       hint: 'F2 scan, F4 discount, F10 complete, etc.' },
  { key: 'customer_display_enabled', label: 'Customer-facing display',  hint: 'Broadcast cart + total to the secondary screen.' },
  { key: 'auto_focus_scan',        label: 'Auto-focus scan bar',        hint: 'Keep the cursor in the scan input between sales.' },
  { key: 'blind_close',            label: 'Blind drawer close',         hint: 'Require cashier to count the drawer by denomination without seeing the expected total. Variance is revealed only after submit \u2014 stops "making it balance" anchoring.' },
];

const DEFAULTS = {
  theme: 'light',
  show_product_tiles: true,
  show_category_sidebar: true,
  show_quick_tiles: true,
  show_keypad: false,
  show_receipt_preview: true,
  enable_hotkeys: true,
  customer_display_enabled: true,
  auto_focus_scan: true,
  blind_close: false,
  variance_threshold: 5,
};

export default function POSSettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canEdit = user?.role === 'owner' || user?.role === 'manager' || user?.is_staff;

  const { data, isLoading } = useQuery({
    queryKey: ['pos-settings'],
    queryFn: getPOSSettings,
    staleTime: 30000,
  });

  const [form, setForm] = useState(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setForm({ ...DEFAULTS, ...data });
  }, [data]);

  const saveMut = useMutation({
    mutationFn: updatePOSSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  if (isLoading) return <div style={{ padding: 20, color: '#64748b' }}>Loading POS settings…</div>;

  return (
    <div style={{ padding: 20, maxWidth: 980, margin: '0 auto' }}>
      {!canEdit && (
        <div style={styles.warn}>
          Only managers and owners can change POS settings. You can view the current configuration below.
        </div>
      )}

      {/* Theme picker */}
      <section style={styles.card}>
        <div style={styles.tag}>Look &amp; feel</div>
        <h2 style={styles.h2}>Cashier screen style</h2>
        <p style={styles.p}>Pick the theme every cashier at this store will see when they open the POS.</p>
        <div style={styles.themes}>
          {THEMES.map((t) => {
            const selected = form.theme === t.id;
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => canEdit && set({ theme: t.id })}
                style={{
                  ...styles.themeCard,
                  borderColor: selected ? '#1a6b3a' : '#e2e8f0',
                  background: selected ? '#f0fdf4' : '#fff',
                  cursor: canEdit ? 'pointer' : 'not-allowed',
                }}
              >
                <div style={{ ...styles.preview, background: t.preview.bg, color: t.preview.fg }}>
                  {t.label.toUpperCase()}
                </div>
                <div style={styles.themeLabel}>
                  <b>{t.label}</b>
                  {selected && <span style={styles.chk}>✓</span>}
                </div>
                <small style={styles.themeHint}>{t.hint}</small>
              </button>
            );
          })}
        </div>
      </section>

      {/* Panel toggles */}
      <section style={styles.card}>
        <div style={styles.tag}>Layout</div>
        <h2 style={styles.h2}>What cashiers see</h2>
        <p style={styles.p}>
          Toggle individual panels. Scan-only supermarket lanes usually turn <b>product tiles</b> off so
          cashiers focus on the scanner and the receipt.
        </p>
        <div>
          {TOGGLES.map((t) => (
            <div key={t.key} style={styles.row}>
              <div style={{ flex: 1 }}>
                <b style={styles.rowLabel}>{t.label}</b>
                <div style={styles.rowHint}>{t.hint}</div>
              </div>
              <button
                type="button"
                onClick={() => canEdit && set({ [t.key]: !form[t.key] })}
                style={{
                  ...styles.switch,
                  background: form[t.key] ? '#1a6b3a' : '#cbd5e1',
                  cursor: canEdit ? 'pointer' : 'not-allowed',
                }}
                aria-pressed={form[t.key]}
              >
                <span style={{
                  ...styles.switchDot,
                  left: form[t.key] ? 20 : 2,
                }} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Cash reconciliation */}
      <section style={styles.card}>
        <div style={styles.tag}>Cash reconciliation</div>
        <h2 style={styles.h2}>Variance approval threshold</h2>
        <p style={styles.p}>
          When a cashier closes their drawer and |variance| exceeds this amount, the POS forces them to
          pick a reason code and get a manager PIN sign-off before the session can close. Set to
          <b> -1</b> to disable the gate entirely, or <b>0</b> to require approval on any non-zero variance.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input
            type="number"
            step="0.01"
            min="-1"
            value={form.variance_threshold ?? 5}
            onChange={(e) => canEdit && set({ variance_threshold: e.target.value })}
            disabled={!canEdit}
            style={{ width: 160, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 14, outline: 'none' }}
          />
          <span style={{ fontSize: 12, color: '#64748b' }}>USD</span>
        </div>
      </section>

      {/* Save */}
      <div style={styles.saveBar}>
        {saved && <span style={styles.savedMsg}>✓ Saved. Cashiers see changes after refreshing their POS.</span>}
        {saveMut.isError && (
          <span style={styles.errMsg}>
            Could not save — {saveMut.error?.response?.data?.detail || saveMut.error?.message || 'unknown error'}.
          </span>
        )}
        <button
          type="button"
          onClick={() => saveMut.mutate(form)}
          disabled={!canEdit || saveMut.isPending}
          style={{ ...styles.saveBtn, opacity: (!canEdit || saveMut.isPending) ? 0.5 : 1 }}
        >
          {saveMut.isPending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  warn: {
    background: '#fef3c7', border: '1px solid #fde68a', color: '#78350f',
    padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14,
  },
  card: {
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
    padding: 20, marginBottom: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  tag: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' },
  h2: { fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '4px 0 4px' },
  p: { fontSize: 13, color: '#64748b', margin: '0 0 14px' },
  themes: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  themeCard: {
    border: '2px solid #e2e8f0', borderRadius: 10, padding: 12, textAlign: 'left',
    background: '#fff', font: 'inherit', color: 'inherit',
  },
  preview: {
    height: 72, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', marginBottom: 10,
  },
  themeLabel: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#0f172a' },
  themeHint: { display: 'block', fontSize: 11, color: '#64748b', marginTop: 4, lineHeight: 1.4 },
  chk: {
    background: '#1a6b3a', color: '#fff', fontSize: 10, width: 18, height: 18,
    borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800,
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 0', borderBottom: '1px solid #f1f5f9',
  },
  rowLabel: { display: 'block', fontSize: 13, color: '#0f172a' },
  rowHint: { fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 1.4 },
  switch: {
    position: 'relative', width: 40, height: 22, border: 'none', borderRadius: 12, transition: 'background 0.15s',
  },
  switchDot: {
    position: 'absolute', top: 2, width: 18, height: 18, background: '#fff',
    borderRadius: '50%', transition: 'left 0.15s',
  },
  saveBar: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 12 },
  saveBtn: {
    padding: '10px 20px', background: '#1a6b3a', color: '#fff',
    border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
  },
  savedMsg: { color: '#059669', fontSize: 12, fontWeight: 600 },
  errMsg: { color: '#b91c1c', fontSize: 12, fontWeight: 600 },
};
