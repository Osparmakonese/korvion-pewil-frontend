import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
  getZimraDevices, createZimraDevice, updateZimraDevice,
  getZReports, generateZReport,
  getFiscalCompliance, registerZimraDevice, syncZimraDevice,
  openFiscalDay, closeFiscalDay, flushFiscalQueue,
} from '../api/retailApi';

const G = '#1a6b3a', AMBER = '#c97d1a', RED = '#b91c1c';
const S = {
  page: { maxWidth: 1200, margin: '0 auto', padding: 20 },
  hero: {
    background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', borderRadius: 14,
    padding: '20px 24px', color: '#fff', marginBottom: 16, position: 'relative', overflow: 'hidden',
  },
  heroTitle: { fontSize: 20, fontWeight: 700, fontFamily: "'Playfair Display', serif", margin: 0, marginBottom: 4 },
  heroSub: { fontSize: 12, opacity: 0.9, margin: 0 },
  heroIcon: { fontSize: 90, opacity: 0.15, position: 'absolute', right: 20, top: -8 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 },
  stat: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, borderLeft: '4px solid #e5e7eb' },
  statLabel: { fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' },
  statValue: { fontSize: 22, fontWeight: 800, color: '#111827', marginTop: 6 },
  statHint: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 18 },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 14 },
  formGroup: { marginBottom: 12 },
  label: { display: 'block', fontSize: 10, fontWeight: 700, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 13, boxSizing: 'border-box', background: '#f9fafb', color: '#374151' },
  select: { width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 13, boxSizing: 'border-box', background: '#fff' },
  btnRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  btn: { padding: '10px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none' },
  btnSolid: { background: G, color: '#fff' },
  btnOutline: { background: '#fff', color: G, border: `1px solid ${G}` },
  btnBlue: { background: '#2563eb', color: '#fff' },
  btnAmber: { background: AMBER, color: '#fff' },
  btnGhost: { background: '#f3f4f6', color: '#374151' },
  info: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginTop: 12, fontSize: 11, color: '#6b7280', lineHeight: 1.6 },
  msgOk: { background: '#e8f5ee', border: `1px solid ${G}`, color: G, borderRadius: 8, padding: '10px 12px', fontSize: 12, marginBottom: 12 },
  msgErr: { background: '#fef2f2', border: `1px solid ${RED}`, color: RED, borderRadius: 8, padding: '10px 12px', fontSize: 12, marginBottom: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 6 },
  th: { fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', padding: '8px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', textAlign: 'left' },
  td: { padding: '8px', borderBottom: '1px solid #f3f4f6', color: '#374151' },
  badge: { display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 20, textTransform: 'uppercase' },
  pill: (bg, fg) => ({ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: bg, color: fg }),
};

export default function ZimraFiscal() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canEdit = user?.role === 'owner' || user?.role === 'manager' || user?.is_staff;
  const [msg, setMsg] = useState(null);   // {type:'ok'|'err', text}
  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 6000); };

  const { data: compliance, isLoading: compLoading } = useQuery({
    queryKey: ['fiscal-compliance'], queryFn: getFiscalCompliance, staleTime: 15000,
  });
  const { data: devices = [] } = useQuery({
    queryKey: ['retail-zimra-devices'], queryFn: getZimraDevices, staleTime: 30000,
  });
  const { data: zReports = [] } = useQuery({
    queryKey: ['retail-z-reports'], queryFn: getZReports, staleTime: 30000,
  });

  const device = compliance?.device || (devices[0] || null);

  const [form, setForm] = useState({
    vat_number: '', device_serial: '', device_id: '', activation_key: '',
    device_type: 'VFD', environment: 'sandbox', model_name: 'Pewil', model_version: '1.0',
    fdms_url: '',
  });
  useEffect(() => {
    if (device) {
      setForm((f) => ({
        ...f,
        vat_number: device.vat_number || '',
        device_serial: device.device_serial || '',
        device_id: device.device_id || '',
        device_type: device.device_type || 'VFD',
        environment: device.environment || 'sandbox',
        model_name: device.model_name || 'Pewil',
        model_version: device.model_version || '1.0',
      }));
    }
  }, [device?.id]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['fiscal-compliance'] });
    qc.invalidateQueries({ queryKey: ['retail-zimra-devices'] });
  };

  const onAct = (okMsg) => ({
    onSuccess: (r) => { refresh(); flash(r?.success === false ? 'err' : 'ok', r?.message || okMsg); },
    onError: (e) => flash('err', e?.response?.data?.message || e?.response?.data?.detail || 'Action failed.'),
  });
  const saveMut = useMutation({
    mutationFn: (data) => device?.id ? updateZimraDevice(device.id, data) : createZimraDevice(data),
    onSuccess: () => { refresh(); flash('ok', 'Device details saved.'); },
    onError: (e) => flash('err', e?.response?.data?.detail || 'Could not save device.'),
  });
  const registerMut = useMutation({ mutationFn: () => registerZimraDevice(device.id), ...onAct('Registered with ZIMRA.') });
  const syncMut = useMutation({ mutationFn: () => syncZimraDevice(device.id), ...onAct('Synced with ZIMRA.') });
  const openMut = useMutation({ mutationFn: () => openFiscalDay(device.id), ...onAct('Fiscal day opened.') });
  const closeMut = useMutation({ mutationFn: () => closeFiscalDay(device.id), ...onAct('Fiscal day closed.') });
  const flushMut = useMutation({ mutationFn: () => flushFiscalQueue(), ...onAct('Queue processed.') });
  const zMut = useMutation({ mutationFn: generateZReport, onSuccess: () => qc.invalidateQueries({ queryKey: ['retail-z-reports'] }) });

  const provisioned = compliance?.is_provisioned;
  const dayOpen = compliance?.fiscal_day_status === 'open';

  return (
    <div style={S.page}>
      <div style={S.hero}>
        <h1 style={S.heroTitle}>ZIMRA Fiscalisation</h1>
        <p style={S.heroSub}>Virtual fiscal device — real-time FDMS submission, QR receipts, fiscal day &amp; offline queue</p>
        <div style={S.heroIcon}>🧾</div>
      </div>

      {msg && <div style={msg.type === 'ok' ? S.msgOk : S.msgErr}>{msg.text}</div>}

      {/* Compliance snapshot */}
      <div style={S.grid3}>
        <div style={{ ...S.stat, borderLeftColor: provisioned ? G : AMBER }}>
          <div style={S.statLabel}>Device</div>
          <div style={{ ...S.statValue, color: provisioned ? G : AMBER }}>
            {provisioned ? 'Provisioned' : (device ? 'Not registered' : 'None')}
          </div>
          <div style={S.statHint}>{device ? `Serial ${device.device_serial || '—'}` : 'Add a device below'}</div>
        </div>
        <div style={{ ...S.stat, borderLeftColor: dayOpen ? G : '#9ca3af' }}>
          <div style={S.statLabel}>Fiscal day</div>
          <div style={{ ...S.statValue, color: dayOpen ? G : '#6b7280' }}>{dayOpen ? 'Open' : 'Closed'}</div>
          <div style={S.statHint}>Day #{compliance?.fiscal_day_no ?? 0}</div>
        </div>
        <div style={{ ...S.stat, borderLeftColor: (compliance?.unfiscalised_today || compliance?.failed_submissions) ? AMBER : G }}>
          <div style={S.statLabel}>Today</div>
          <div style={S.statValue}>{compliance?.fiscalised_today ?? 0} <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 600 }}>fiscalised</span></div>
          <div style={S.statHint}>{compliance?.unfiscalised_today ?? 0} not yet · {compliance?.pending_submissions ?? 0} queued · {compliance?.failed_submissions ?? 0} failed</div>
        </div>
      </div>

      {/* Cert expiry warning */}
      {compliance?.certificate_expiring_soon && (
        <div style={S.msgErr}>
          ⚠ This device's certificate expires on {device?.certificate_expiry}. Renew it with ZIMRA before it lapses or fiscalisation will stop.
        </div>
      )}

      {/* Device lifecycle actions */}
      {device && (
        <div style={{ ...S.card, marginBottom: 16 }}>
          <h2 style={S.cardTitle}>Device control</h2>
          <div style={S.btnRow}>
            <button style={{ ...S.btn, ...S.btnSolid }} disabled={!canEdit || registerMut.isPending}
              onClick={() => registerMut.mutate()}>
              {registerMut.isPending ? 'Registering…' : (provisioned ? 'Re-register' : 'Register with ZIMRA')}
            </button>
            <button style={{ ...S.btn, ...S.btnOutline }} disabled={!canEdit || !provisioned || syncMut.isPending}
              onClick={() => syncMut.mutate()}>Sync config</button>
            <button style={{ ...S.btn, ...S.btnBlue }} disabled={!canEdit || !provisioned || dayOpen || openMut.isPending}
              onClick={() => openMut.mutate()}>Open fiscal day</button>
            <button style={{ ...S.btn, ...S.btnAmber }} disabled={!canEdit || !dayOpen || closeMut.isPending}
              onClick={() => closeMut.mutate()}>Close day (Z-report)</button>
            {(compliance?.pending_submissions || compliance?.failed_submissions) ? (
              <button style={{ ...S.btn, ...S.btnGhost }} disabled={!canEdit || flushMut.isPending}
                onClick={() => flushMut.mutate()}>Retry queued ({(compliance?.pending_submissions || 0) + (compliance?.failed_submissions || 0)})</button>
            ) : null}
          </div>
          {provisioned && (
            <div style={S.info}>
              <b>{device.taxpayer_name || '—'}</b> · TIN {device.taxpayer_tin || '—'} · VAT {device.vat_number || '—'}<br />
              Environment: <b>{device.environment}</b> · Certificate valid till: <b>{device.certificate_expiry || '—'}</b> · Last receipt #{device.last_receipt_global_no || 0}
            </div>
          )}
        </div>
      )}

      <div style={S.twoCol}>
        {/* Device registration */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>{device ? 'Device details' : 'Add fiscal device'}</h2>
          <div style={S.formGroup}>
            <label style={S.label}>Device ID (from ZIMRA portal)</label>
            <input style={S.input} type="number" value={form.device_id}
              onChange={(e) => setForm({ ...form, device_id: e.target.value })} placeholder="e.g. 24455" />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Device serial number</label>
            <input style={S.input} value={form.device_serial}
              onChange={(e) => setForm({ ...form, device_serial: e.target.value })} placeholder="Your chosen serial" />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Activation key</label>
            <input style={S.input} value={form.activation_key}
              onChange={(e) => setForm({ ...form, activation_key: e.target.value })} placeholder="8-char key from the portal" />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>VAT number</label>
            <input style={S.input} value={form.vat_number}
              onChange={(e) => setForm({ ...form, vat_number: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ ...S.formGroup, flex: 1 }}>
              <label style={S.label}>Type</label>
              <select style={S.select} value={form.device_type}
                onChange={(e) => setForm({ ...form, device_type: e.target.value })}>
                <option value="VFD">Virtual (VFD)</option>
                <option value="PFD">Physical (PFD)</option>
              </select>
            </div>
            <div style={{ ...S.formGroup, flex: 1 }}>
              <label style={S.label}>Environment</label>
              <select style={S.select} value={form.environment}
                onChange={(e) => setForm({ ...form, environment: e.target.value })}>
                <option value="sandbox">Test (sandbox)</option>
                <option value="production">Live (production)</option>
              </select>
            </div>
          </div>
          <div style={S.btnRow}>
            <button style={{ ...S.btn, ...S.btnSolid, flex: 1 }} disabled={!canEdit || saveMut.isPending}
              onClick={() => saveMut.mutate({
                ...form,
                device_id: form.device_id ? parseInt(form.device_id, 10) : null,
              })}>
              {saveMut.isPending ? 'Saving…' : (device ? 'Save changes' : 'Add device')}
            </button>
          </div>
          <div style={S.info}>
            First create a <b>virtual device</b> on the ZIMRA FDMS portal to get a Device ID + Activation Key, enter them here,
            then press <b>Register with ZIMRA</b> above. Pewil generates the key-pair and certificate request automatically — no fiscal printer needed.
            VAT-registered businesses can claim 50% of fiscal device costs as input tax on the VAT 7 return.
          </div>
        </div>

        {/* Z-Reports */}
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ ...S.cardTitle, marginBottom: 0 }}>Fiscal Z-Reports</h2>
            <button style={{ ...S.btn, ...S.btnGhost }} disabled={zMut.isPending}
              onClick={() => zMut.mutate()}>{zMut.isPending ? '…' : 'Generate today'}</button>
          </div>
          <table style={S.table}>
            <thead>
              <tr><th style={S.th}>Date</th><th style={S.th}>Txns</th><th style={S.th}>Gross</th><th style={S.th}>VAT</th><th style={S.th}>Status</th></tr>
            </thead>
            <tbody>
              {zReports.length === 0 && (
                <tr><td style={S.td} colSpan={5}>No Z-reports yet.</td></tr>
              )}
              {zReports.map((r) => (
                <tr key={r.id}>
                  <td style={S.td}>{new Date(r.report_date).toLocaleDateString()}</td>
                  <td style={S.td}>{r.transaction_count}</td>
                  <td style={S.td}>${Number(r.gross_sales).toFixed(2)}</td>
                  <td style={S.td}>${Number(r.vat_collected).toFixed(2)}</td>
                  <td style={S.td}>
                    <span style={r.submitted ? S.pill('#e8f5ee', G) : S.pill('#fef3e2', AMBER)}>
                      {r.submitted ? 'Submitted' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {compLoading && <div style={{ color: '#9ca3af', fontSize: 12 }}>Loading compliance status…</div>}
    </div>
  );
}
