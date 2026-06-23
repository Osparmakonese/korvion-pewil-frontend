import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateMyTenant } from '../api/coreApi';
import { getVapidKey, subscribePush, unsubscribePush, sendTestPush } from '../api/farmApi';
import SecuritySettings from '../components/SecuritySettings';
import BusinessTypePanel from '../components/BusinessTypePanel';
import HapticsToggle from '../components/HapticsToggle';
import api from '../api/axios';

/* ─── Design 3 — Living Africa tokens (shared with Landing/Login/Register/Settings) ─── */
const C = {
  amber: '#f4a743',
  terra: '#d9562c',
  clay: '#b13b17',
  forest: '#1f3d26',
  forest2: '#2d5a37',
  sand: '#fff7ec',
  sand2: '#fdeedd',
  cream: '#fffcf7',
  ink: '#1b1b1b',
  muted: '#6b5d50',
  line: 'rgba(27,27,27,.12)',
  line2: 'rgba(27,27,27,.06)',
  danger: '#b1291b',
  dangerBg: '#fdecea',
  okBg: '#e8f5ee',
  ok: '#1a6b3a',
};
const SERIF = "'Fraunces', Georgia, serif";
const SANS = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";

/* ─── Shared style objects (mirrors Settings.js for consistency) ─── */
const pageShell = {
  fontFamily: SANS, color: C.ink, background: C.cream,
  padding: '24px 28px', minHeight: '100%',
};
const heroRow = { marginBottom: 20 };
const pageTitle = {
  fontFamily: SERIF, fontSize: 30, fontWeight: 700, color: C.forest,
  margin: '0 0 6px 0', letterSpacing: '-0.01em',
};
const pageSub = { fontSize: 14, color: C.muted, margin: 0 };

const twoCol = {
  display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20,
  alignItems: 'start',
};
const leftRail = {
  display: 'flex', flexDirection: 'column', gap: 2,
  background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14,
  padding: 8, position: 'sticky', top: 16,
};
const tabButton = (active) => ({
  textAlign: 'left', padding: '10px 14px', borderRadius: 10,
  fontSize: 14, fontWeight: active ? 700 : 500,
  fontFamily: SANS, cursor: 'pointer', border: 0,
  background: active ? C.sand : 'transparent',
  color: active ? C.forest : C.ink,
  transition: 'background .12s, color .12s',
});

const rightPane = { display: 'flex', flexDirection: 'column', gap: 20 };

const sectionCard = {
  background: '#fff', border: `1px solid ${C.line}`, borderRadius: 16,
  padding: '22px 24px', boxShadow: '0 1px 3px rgba(27,27,27,.04)',
};
const sectionHead = { marginBottom: 16 };
const sectionTitle = {
  fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: C.forest,
  margin: '0 0 4px 0',
};
const sectionSub = { fontSize: 13, color: C.muted, margin: 0 };

const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 };

const fieldBlock = { display: 'flex', flexDirection: 'column', gap: 6 };
const fieldLabel = {
  fontSize: 11, fontWeight: 700, color: C.muted,
  textTransform: 'uppercase', letterSpacing: '0.05em',
};
const input = {
  width: '100%', padding: '11px 14px', border: `1.5px solid ${C.line}`,
  borderRadius: 12, background: '#fff', fontSize: 14,
  fontFamily: SANS, color: C.ink, outline: 'none', boxSizing: 'border-box',
  transition: 'border .15s, box-shadow .15s',
};
const select = { ...input, appearance: 'none', backgroundImage: 'none' };

const btnBase = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: '11px 20px', borderRadius: 999, fontWeight: 600, fontSize: 14,
  border: 0, cursor: 'pointer', fontFamily: SANS, whiteSpace: 'nowrap',
  transition: 'transform .12s, box-shadow .15s, background .15s',
};
const btnPrimary = {
  ...btnBase,
  background: `linear-gradient(135deg, ${C.amber}, ${C.terra})`,
  color: '#fff',
  boxShadow: '0 10px 22px -10px rgba(217,86,44,.55)',
};
const btnForest = { ...btnBase, background: C.forest, color: '#fff' };
const btnOutline = {
  ...btnBase, background: 'transparent', color: C.ink,
  border: `1.5px solid ${C.line}`,
};

const toggleS = (on) => ({
  width: 44, height: 24, borderRadius: 999, position: 'relative',
  cursor: 'pointer', transition: 'background .2s',
  background: on ? C.forest : 'rgba(27,27,27,.2)',
  border: 0, padding: 0, flexShrink: 0,
});
const toggleK = (on) => ({
  width: 18, height: 18, borderRadius: '50%', background: '#fff',
  position: 'absolute', top: 3, left: on ? 23 : 3,
  transition: 'left .18s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
});
const toggleRow = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 16px', border: `1px solid ${C.line2}`, borderRadius: 12,
  background: C.cream,
};
const toggleLabel = { fontSize: 14, fontWeight: 600, color: C.ink, marginBottom: 2 };
const toggleDesc = { fontSize: 12.5, color: C.muted, lineHeight: 1.4 };

const savedBadge = (type) => ({
  fontSize: 12, fontWeight: 600, marginTop: 10,
  color: type === 'error' ? C.danger : C.forest,
});

const quickLinkCard = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 16px', border: `1px solid ${C.line2}`, borderRadius: 12,
  background: C.cream, gap: 14,
};

/* ─── Utilities ─── */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/* ─── Tab definitions — everything that used to be a separate retail sidebar
   entry is now a sub-tab here, so the sidebar stays focused on daily ops. ─── */
const TABS = [
  { key: 'general', label: 'General' },
  { key: 'branding', label: 'Branding' },
  { key: 'pos', label: 'POS & Stock' },
  { key: 'hardware', label: 'Hardware' },
  { key: 'fiscal', label: 'Fiscal & Tax' },
  { key: 'currencies', label: 'Currencies' },
  { key: 'payments', label: 'Payments' },
  { key: 'team', label: 'Team & Permissions' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'security', label: 'Security' },
  { key: 'api', label: 'API & Webhooks' },
  { key: 'billing', label: 'Billing & Plan' },
];

/* ─── Main component ─── */
export default function RetailSettings({ onTabChange }) {
  const { user } = useAuth();
  const role = user?.role || 'owner';
  const [activeTab, setActiveTab] = useState('general');

  /* ── Tenant details ── */
  const tenantName = user?.tenant_name || 'Acme Trading';
  const [bizName, setBizName] = useState(tenantName);
  const [tradingName, setTradingName] = useState(() => localStorage.getItem('trading_name') || '');
  const [primaryEmail, setPrimaryEmail] = useState(() => localStorage.getItem('primary_email') || user?.email || '');
  const [primaryPhone, setPrimaryPhone] = useState(() => localStorage.getItem('primary_phone') || '');
  const [country, setCountry] = useState('ZW');
  const [currency, setCurrency] = useState(() => localStorage.getItem('currency') || 'USD');
  const [timezone, setTimezone] = useState('Africa/Harare');
  const [saved, setSaved] = useState('');

  /* ── POS & Stock preferences ── */
  const [offlineFirst, setOfflineFirst] = useState(() => localStorage.getItem('offline_first') !== 'false');
  const [lowStockWA, setLowStockWA] = useState(() => localStorage.getItem('low_stock_wa') === 'true');
  const [autoFiscal, setAutoFiscal] = useState(() => localStorage.getItem('auto_fiscal') !== 'false');
  const [lowStockThreshold, setLowStockThreshold] = useState(() => localStorage.getItem('low_stock_threshold') || '5');
  const [cashRound, setCashRound] = useState(() => localStorage.getItem('cash_round') || 'none');
  const [showChange, setShowChange] = useState(() => localStorage.getItem('pos_show_change') !== 'false');
  const [receiptCopies, setReceiptCopies] = useState(() => localStorage.getItem('receipt_copies') || '1');
  const [eodDigest, setEodDigest] = useState(() => localStorage.getItem('eod_digest') === 'true');
  const [digestRecipients, setDigestRecipients] = useState(() => localStorage.getItem('digest_recipients') || '');
  const [digestHour, setDigestHour] = useState(() => parseInt(localStorage.getItem('digest_hour') || '18', 10));

  /* ── Fiscal & Tax ── */
  const [tin, setTin] = useState(() => localStorage.getItem('zimra_tin') || '');
  const [vat, setVat] = useState(() => localStorage.getItem('zimra_vat') || '');
  const [fiscalSerial, setFiscalSerial] = useState(() => localStorage.getItem('fiscal_serial') || '');
  const [vatRate, setVatRate] = useState(() => localStorage.getItem('vat_rate') || '15');

  /* ── Hardware ── */
  const [barcodeEnabled, setBarcodeEnabled] = useState(() => localStorage.getItem('barcode_enabled') !== 'false');
  const [scannerMode, setScannerMode] = useState(() => localStorage.getItem('scanner_mode') || 'usb_hid');
  const [barcodeFormat, setBarcodeFormat] = useState(() => localStorage.getItem('barcode_format') || 'auto');
  const [receiptPrinterEnabled, setReceiptPrinterEnabled] = useState(() => localStorage.getItem('receipt_printer') === 'true');

  /* ── Cashier permissions ── */
  const [permViewProducts, setPermViewProducts] = useState(true);
  const [permAddProducts, setPermAddProducts] = useState(false);
  const [permEditProducts, setPermEditProducts] = useState(false);
  const [permPOS, setPermPOS] = useState(true);
  const [permViewReports, setPermViewReports] = useState(false);
  const [permViewJournal, setPermViewJournal] = useState(false);

  /* ── Notifications ── */
  const [phone1, setPhone1] = useState(() => localStorage.getItem('wa_phone_1') || '');
  const [phone2, setPhone2] = useState(() => localStorage.getItem('wa_phone_2') || '');
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState('');

  /* ── Hydrate from server on first mount ──
     Mega-build 2026-05-17: the canonical store for these settings is now
     `RetailTenantSettings` on the server, not localStorage. We still
     read localStorage at useState() init so the form renders instantly
     with whatever the user saw last time, then this effect overrides
     with the server value once the GET resolves. Means a cashier
     switching browsers gets their settings back. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/retail/tenant-settings/');
        if (cancelled) return;
        const s = res.data || {};
        const safe = (v, def) => (v === null || v === undefined) ? def : v;
        // setX(...) on every field — useState's init already gave us
        // localStorage values, so the diff is "server overrides local
        // when the server has something". We don't try to be clever
        // about merge order; the server is the source of truth.
        if (s.trading_name !== undefined) { setTradingName(safe(s.trading_name, '')); localStorage.setItem('trading_name', safe(s.trading_name, '')); }
        if (s.primary_email !== undefined) { setPrimaryEmail(safe(s.primary_email, '')); localStorage.setItem('primary_email', safe(s.primary_email, '')); }
        if (s.primary_phone !== undefined) { setPrimaryPhone(safe(s.primary_phone, '')); localStorage.setItem('primary_phone', safe(s.primary_phone, '')); }
        if (s.offline_first !== undefined) { setOfflineFirst(!!s.offline_first); localStorage.setItem('offline_first', String(!!s.offline_first)); }
        if (s.low_stock_wa_alerts !== undefined) { setLowStockWA(!!s.low_stock_wa_alerts); localStorage.setItem('low_stock_wa', String(!!s.low_stock_wa_alerts)); }
        if (s.auto_fiscal !== undefined) { setAutoFiscal(!!s.auto_fiscal); localStorage.setItem('auto_fiscal', String(!!s.auto_fiscal)); }
        if (s.low_stock_threshold !== undefined) { setLowStockThreshold(String(s.low_stock_threshold)); localStorage.setItem('low_stock_threshold', String(s.low_stock_threshold)); }
        if (s.cash_round !== undefined) { setCashRound(safe(s.cash_round, 'none')); localStorage.setItem('cash_round', safe(s.cash_round, 'none')); }
        if (s.pos_show_change !== undefined) { setShowChange(!!s.pos_show_change); localStorage.setItem('pos_show_change', String(!!s.pos_show_change)); }
        if (s.receipt_copies !== undefined) { setReceiptCopies(String(s.receipt_copies)); localStorage.setItem('receipt_copies', String(s.receipt_copies)); }
        if (s.eod_digest !== undefined) { setEodDigest(!!s.eod_digest); localStorage.setItem('eod_digest', String(!!s.eod_digest)); }
        if (s.digest_recipients !== undefined) { setDigestRecipients(safe(s.digest_recipients, '')); localStorage.setItem('digest_recipients', safe(s.digest_recipients, '')); }
        if (s.digest_hour !== undefined && s.digest_hour !== null) { setDigestHour(parseInt(s.digest_hour, 10) || 18); }
        if (s.vat_rate !== undefined) { setVatRate(String(s.vat_rate)); localStorage.setItem('vat_rate', String(s.vat_rate)); }
        if (s.barcode_enabled !== undefined) { setBarcodeEnabled(!!s.barcode_enabled); localStorage.setItem('barcode_enabled', String(!!s.barcode_enabled)); }
        if (s.scanner_mode !== undefined) { setScannerMode(safe(s.scanner_mode, 'usb_hid')); localStorage.setItem('scanner_mode', safe(s.scanner_mode, 'usb_hid')); }
        if (s.barcode_format !== undefined) { setBarcodeFormat(safe(s.barcode_format, 'auto')); localStorage.setItem('barcode_format', safe(s.barcode_format, 'auto')); }
        if (s.receipt_printer_enabled !== undefined) { setReceiptPrinterEnabled(!!s.receipt_printer_enabled); localStorage.setItem('receipt_printer', String(!!s.receipt_printer_enabled)); }
        if (s.whatsapp_phone_1 !== undefined) { setPhone1(safe(s.whatsapp_phone_1, '')); localStorage.setItem('wa_phone_1', safe(s.whatsapp_phone_1, '')); }
        if (s.whatsapp_phone_2 !== undefined) { setPhone2(safe(s.whatsapp_phone_2, '')); localStorage.setItem('wa_phone_2', safe(s.whatsapp_phone_2, '')); }
      } catch (_) {
        // 404 / network failure — keep localStorage values. The first
        // PATCH from this page will create the row server-side.
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Push registration probe ── */
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((sub) => setPushOn(!!sub))
      ).catch(() => {});
    }
  }, []);

  /* ── Persist local toggles ── */
  useEffect(() => { localStorage.setItem('currency', currency); }, [currency]);
  useEffect(() => { localStorage.setItem('offline_first', String(offlineFirst)); }, [offlineFirst]);
  useEffect(() => { localStorage.setItem('low_stock_wa', String(lowStockWA)); }, [lowStockWA]);
  useEffect(() => { localStorage.setItem('auto_fiscal', String(autoFiscal)); }, [autoFiscal]);
  useEffect(() => { localStorage.setItem('eod_digest', String(eodDigest)); }, [eodDigest]);
  useEffect(() => { localStorage.setItem('low_stock_threshold', lowStockThreshold); }, [lowStockThreshold]);
  useEffect(() => { localStorage.setItem('cash_round', cashRound); }, [cashRound]);
  useEffect(() => { localStorage.setItem('pos_show_change', String(showChange)); }, [showChange]);
  useEffect(() => { localStorage.setItem('receipt_copies', receiptCopies); }, [receiptCopies]);
  useEffect(() => { localStorage.setItem('fiscal_serial', fiscalSerial); }, [fiscalSerial]);
  useEffect(() => { localStorage.setItem('vat_rate', vatRate); }, [vatRate]);
  useEffect(() => { localStorage.setItem('barcode_enabled', String(barcodeEnabled)); }, [barcodeEnabled]);
  useEffect(() => { localStorage.setItem('scanner_mode', scannerMode); }, [scannerMode]);
  useEffect(() => { localStorage.setItem('barcode_format', barcodeFormat); }, [barcodeFormat]);
  useEffect(() => { localStorage.setItem('receipt_printer', String(receiptPrinterEnabled)); }, [receiptPrinterEnabled]);

  /* ── Handlers ──
     Mega-build 2026-05-17: every save now PATCHes the server first
     (via the new /retail/tenant-settings/ endpoint), then mirrors to
     localStorage as a warm cache. Pre-2026-05 saves wrote to
     localStorage only and reads happened from localStorage only — which
     meant changing browsers wiped every preference. */
  const _patchTenantSettings = async (payload) => {
    try {
      await api.patch('/retail/tenant-settings/', payload);
    } catch (e) {
      // Surface but don't drop the save — localStorage still updates
      // below so the cashier on this device sees their change.
      console.warn('RetailSettings: server PATCH failed', e?.response?.data || e?.message);
      throw e;
    }
  };

  const saveTenant = async () => {
    try {
      // Tenant-level identity stays on the Tenant model.
      await updateMyTenant({ name: bizName, country, currency, timezone });
      // Everything else moves through RetailTenantSettings now.
      await _patchTenantSettings({
        trading_name: tradingName,
        primary_email: primaryEmail,
        primary_phone: primaryPhone,
        offline_first: offlineFirst,
        auto_fiscal: autoFiscal,
        low_stock_threshold: parseInt(lowStockThreshold, 10) || 5,
        low_stock_wa_alerts: lowStockWA,
        cash_round: cashRound,
        pos_show_change: showChange,
        receipt_copies: parseInt(receiptCopies, 10) || 1,
        receipt_printer_enabled: receiptPrinterEnabled,
        eod_digest: eodDigest,
        digest_recipients: digestRecipients,
        digest_hour: digestHour,
        vat_rate: vatRate,
        barcode_enabled: barcodeEnabled,
        scanner_mode: scannerMode,
        barcode_format: barcodeFormat,
      });
      // Warm cache.
      localStorage.setItem('currency', currency);
      localStorage.setItem('trading_name', tradingName);
      localStorage.setItem('zimra_tin', tin);
      localStorage.setItem('zimra_vat', vat);
      localStorage.setItem('primary_email', primaryEmail);
      localStorage.setItem('primary_phone', primaryPhone);
      setSaved('Changes saved!');
    } catch (e) {
      setSaved('Error saving: ' + (e?.response?.data?.detail || e.message));
    }
    setTimeout(() => setSaved(''), 3000);
  };

  const savePhones = async () => {
    localStorage.setItem('wa_phone_1', phone1);
    localStorage.setItem('wa_phone_2', phone2);
    try {
      // WhatsApp numbers live on RetailTenantSettings now (with the rest
      // of the retail prefs). `updateMyTenant` is still called for
      // backward compat — older flows that rely on Tenant.whatsapp_phone_1
      // keep working until they migrate.
      await Promise.all([
        updateMyTenant({ whatsapp_phone_1: phone1, whatsapp_phone_2: phone2 }).catch(() => {}),
        _patchTenantSettings({ whatsapp_phone_1: phone1, whatsapp_phone_2: phone2 }),
      ]);
      setSaved('Numbers saved!');
    } catch {
      setSaved('Numbers saved locally!');
    }
    setTimeout(() => setSaved(''), 3000);
  };
  const togglePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushMsg('Browser push not supported.'); return;
    }
    setPushBusy(true); setPushMsg('');
    try {
      const reg = await navigator.serviceWorker.ready;
      if (pushOn) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) { await unsubscribePush(sub.endpoint).catch(() => {}); await sub.unsubscribe(); }
        setPushOn(false); setPushMsg('Push disabled.');
      } else {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') { setPushMsg('Permission denied.'); setPushBusy(false); return; }
        const { public_key } = await getVapidKey();
        if (!public_key) { setPushMsg('Server not configured.'); setPushBusy(false); return; }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(public_key),
        });
        const json = sub.toJSON();
        await subscribePush({
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          user_agent: navigator.userAgent.slice(0, 280),
        });
        setPushOn(true); setPushMsg('Push enabled.');
      }
    } catch (e) { setPushMsg('Error: ' + (e.message || 'unknown')); }
    setPushBusy(false);
  };
  const testPush = async () => {
    try { await sendTestPush(); setPushMsg('Test sent.'); } catch { setPushMsg('Test failed.'); }
  };

  /* ── Role gate ── */
  if (role !== 'owner' && role !== 'manager') {
    return (
      <div style={{ ...pageShell, textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{'\u{1F512}'}</div>
        <h2 style={{ ...pageTitle, fontSize: 22, margin: 0 }}>Owner or Manager only</h2>
        <p style={{ ...pageSub, marginTop: 8 }}>Settings are restricted to store owners and managers.</p>
      </div>
    );
  }

  const go = (tab) => { if (typeof onTabChange === 'function') onTabChange(tab); };

  /* ── Render ── */
  return (
    <div className="set-shell" style={pageShell}>
      <header style={heroRow}>
        <h1 style={pageTitle}>Settings</h1>
        <p style={pageSub}>
          Configure your store, cashiers, hardware, tax, and billing — all in one place.
        </p>
      </header>

      <div className="set-2col" style={twoCol}>
        {/* Left rail — tabs */}
        <nav className="set-rail" style={leftRail} aria-label="Settings sections">
          {TABS.map((t) => (
            <button
              key={t.key}
              style={tabButton(activeTab === t.key)}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* Right pane — content */}
        <div style={rightPane}>
          {activeTab === 'general' && (
            <>
              <BusinessTypePanel />
              <HapticsToggle />
              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>General</h2>
                  <p style={sectionSub}>
                    Basic information about your store as it appears on receipts, invoices, and reports.
                  </p>
                </div>
                <div style={grid2}>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Business name</label>
                    <input style={input} value={bizName} onChange={(e) => setBizName(e.target.value)} />
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Trading name</label>
                    <input
                      style={input}
                      value={tradingName}
                      onChange={(e) => setTradingName(e.target.value)}
                      placeholder="Optional doing-business-as name"
                    />
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Primary email</label>
                    <input style={input} type="email" value={primaryEmail} onChange={(e) => setPrimaryEmail(e.target.value)} />
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Primary phone</label>
                    <input style={input} type="tel" value={primaryPhone} onChange={(e) => setPrimaryPhone(e.target.value)} placeholder="+263 77 123 4567" />
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Country / region</label>
                    <select style={select} value={country} onChange={(e) => setCountry(e.target.value)}>
                      <option value="ZW">Zimbabwe</option>
                      <option value="ZA">South Africa</option>
                      <option value="KE">Kenya</option>
                      <option value="NG">Nigeria</option>
                      <option value="US">United States</option>
                      <option value="GB">United Kingdom</option>
                    </select>
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Timezone</label>
                    <select style={select} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                      <option value="Africa/Harare">Africa/Harare (CAT)</option>
                      <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                      <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                    </select>
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Reporting currency</label>
                    <select style={select} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                      <option value="USD">USD ($)</option>
                      <option value="ZWG">ZWG</option>
                      <option value="ZAR">ZAR (R)</option>
                      <option value="KES">KES (KSh)</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button style={btnPrimary} onClick={saveTenant}>Save changes</button>
                  {saved && (
                    <div style={savedBadge(saved.startsWith('Error') ? 'error' : 'ok')}>
                      {saved.startsWith('Error') ? '' : '\u2713 '}{saved}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {activeTab === 'branding' && (
            <section style={sectionCard}>
              <div style={sectionHead}>
                <h2 style={sectionTitle}>Branding</h2>
                <p style={sectionSub}>
                  Logo and receipt copy shown to customers on printed and digital receipts.
                </p>
              </div>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 8, padding: '10px 12px', fontSize: 12, marginBottom: 4 }}>
                Logo upload is a preview and isn&apos;t saved yet. To set your shop name, address and the message printed on receipts today, use <strong>Receipt Customization</strong>.
              </div>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', padding: '18px 0' }}>
                <div
                  style={{
                    width: 96, height: 96, borderRadius: 20,
                    background: `linear-gradient(135deg, ${C.amber}, ${C.terra})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontFamily: SERIF, fontSize: 36, fontWeight: 700,
                    boxShadow: '0 10px 22px -10px rgba(217,86,44,.55)',
                  }}
                >
                  {(bizName || 'P').slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Upload your logo</div>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>PNG or SVG, at least 256x256, under 1 MB.</div>
                  <button style={btnOutline}>Choose file...</button>
                </div>
              </div>
              <div style={{ ...grid2, marginTop: 8 }}>
                <div style={fieldBlock}>
                  <label style={fieldLabel}>Receipt footer line 1</label>
                  <input style={input} placeholder="Thank you for shopping with us" />
                </div>
                <div style={fieldBlock}>
                  <label style={fieldLabel}>Receipt footer line 2</label>
                  <input style={input} placeholder="Returns accepted within 7 days" />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <QuickLink
                  title="Receipt template & print layout"
                  desc="Full editor for receipt header, QR, discount rendering, and fiscal footer."
                  cta="Open Receipt Setup"
                  onClick={() => go('Receipt Setup')}
                />
              </div>
              <div style={{ marginTop: 16 }}>
                <button style={btnPrimary}>Save branding</button>
              </div>
            </section>
          )}

          {activeTab === 'pos' && (
            <>
              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>Point of Sale</h2>
                  <p style={sectionSub}>How cashiers ring up orders and how receipts print.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <ToggleItem label="Offline-first mode" desc="Cashiers can keep selling when the network drops; orders sync when back online." on={offlineFirst} onToggle={() => setOfflineFirst(!offlineFirst)} />
                  <ToggleItem label="Auto-print ZIMRA fiscal receipt" desc="Every successful POS charge prints a ZIMRA-compliant paper receipt." on={autoFiscal} onToggle={() => setAutoFiscal(!autoFiscal)} />
                  <ToggleItem label="Show change calculator" desc="Pop up a tender/change pad when the cashier selects cash." on={showChange} onToggle={() => setShowChange(!showChange)} />
                </div>
                <div style={{ ...grid2, marginTop: 16 }}>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Cash rounding</label>
                    <select style={select} value={cashRound} onChange={(e) => setCashRound(e.target.value)}>
                      <option value="none">No rounding</option>
                      <option value="0.05">Nearest $0.05</option>
                      <option value="0.10">Nearest $0.10</option>
                      <option value="0.25">Nearest $0.25</option>
                    </select>
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Receipt copies per sale</label>
                    <select style={select} value={receiptCopies} onChange={(e) => setReceiptCopies(e.target.value)}>
                      <option value="1">1 (customer only)</option>
                      <option value="2">2 (customer + merchant)</option>
                      <option value="0">None (digital receipt only)</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <QuickLink title="POS screen layout & style" desc="Tile density, color accents, large-touch mode." cta="Open POS Style" onClick={() => go('POS Settings')} />
                </div>
              </section>

              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>Stock & inventory</h2>
                  <p style={sectionSub}>Low-stock thresholds and restock alerts.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <ToggleItem label="Low-stock WhatsApp alerts" desc="Send the manager a WhatsApp when any SKU crosses its reorder threshold." on={lowStockWA} onToggle={() => setLowStockWA(!lowStockWA)} />
                </div>
                <div style={{ ...grid2, marginTop: 16 }}>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Default low-stock threshold</label>
                    <input style={input} type="number" min="0" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} placeholder="5" />
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Stock count frequency</label>
                    <select style={select} defaultValue="weekly">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <button style={btnPrimary}>Save POS settings</button>
                </div>
              </section>
            </>
          )}

          {activeTab === 'hardware' && (
            <>
              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>Barcode scanner</h2>
                  <p style={sectionSub}>Plug-and-play USB, Bluetooth, or phone camera scanners.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <ToggleItem label="Enable barcode scanning" desc="Cashiers can scan SKUs straight into the cart." on={barcodeEnabled} onToggle={() => setBarcodeEnabled(!barcodeEnabled)} />
                </div>
                <div style={{ ...grid2, marginTop: 16 }}>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Scanner mode</label>
                    <select style={select} value={scannerMode} onChange={(e) => setScannerMode(e.target.value)}>
                      <option value="usb_hid">USB HID (plug & play)</option>
                      <option value="bluetooth">Bluetooth serial</option>
                      <option value="camera">Camera (phone/tablet)</option>
                    </select>
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Barcode format</label>
                    <select style={select} value={barcodeFormat} onChange={(e) => setBarcodeFormat(e.target.value)}>
                      <option value="auto">Auto-detect</option>
                      <option value="ean13">EAN-13</option>
                      <option value="upca">UPC-A</option>
                      <option value="code128">Code 128</option>
                      <option value="qr">QR Code</option>
                    </select>
                  </div>
                </div>
              </section>

              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>Receipt printer</h2>
                  <p style={sectionSub}>Thermal printer over USB, Bluetooth, or the Pewil Print Bridge.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <ToggleItem label="Enable receipt printing" desc="Automatically send receipts to the connected printer after each sale." on={receiptPrinterEnabled} onToggle={() => setReceiptPrinterEnabled(!receiptPrinterEnabled)} />
                </div>
              </section>

              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>Device configuration</h2>
                  <p style={sectionSub}>Pair hardware, set up Print Bridge, and configure ZIMRA fiscal devices.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <QuickLink title="Device & bridge setup" desc="Add a new terminal, pair a printer, check ZIMRA fiscal device health." cta="Open Device Config" onClick={() => go('Device Config')} />
                </div>
              </section>
            </>
          )}

          {activeTab === 'fiscal' && (
            <>
              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>ZIMRA registration</h2>
                  <p style={sectionSub}>Tax IDs printed on every fiscal receipt.</p>
                </div>
                <div style={grid2}>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>TIN (ZIMRA)</label>
                    <input style={input} value={tin} onChange={(e) => setTin(e.target.value)} placeholder="e.g. 1234567" />
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>VAT number</label>
                    <input style={input} value={vat} onChange={(e) => setVat(e.target.value)} placeholder="e.g. 10001234" />
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Fiscal device serial</label>
                    <input style={input} value={fiscalSerial} onChange={(e) => setFiscalSerial(e.target.value)} placeholder="FDMS-XXXXXX" />
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>VAT rate (%)</label>
                    <input style={input} value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
                  </div>
                </div>
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <ToggleItem label="Auto-submit fiscal receipts" desc="Every POS sale is transmitted to the ZIMRA FDMS within 5 seconds." on={autoFiscal} onToggle={() => setAutoFiscal(!autoFiscal)} />
                </div>
                <div style={{ marginTop: 18 }}>
                  <button style={btnPrimary} onClick={saveTenant}>Save tax settings</button>
                </div>
              </section>

              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>Compliance & payroll tax</h2>
                  <p style={sectionSub}>Fiscal device health, invoice queue, and Zimbabwe PAYE / NSSA bands.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <QuickLink title="ZIMRA fiscalisation" desc="Fiscal device status, re-queue failed receipts, view transmission log." cta="Open ZIMRA Fiscal" onClick={() => go('ZIMRA Fiscal')} />
                  <QuickLink title="PAYE & NSSA bands" desc="Current-year Zimbabwe payroll tax tables and NSSA contribution rates." cta="Open Tax Config" onClick={() => go('Tax Config')} />
                </div>
              </section>
            </>
          )}

          {activeTab === 'currencies' && (
            <section style={sectionCard}>
              <div style={sectionHead}>
                <h2 style={sectionTitle}>Currencies & exchange rates</h2>
                <p style={sectionSub}>Accept multiple currencies at the till and keep rates fresh.</p>
              </div>
              <div style={grid2}>
                <div style={fieldBlock}>
                  <label style={fieldLabel}>Primary currency</label>
                  <select style={select} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    <option value="USD">USD ($)</option>
                    <option value="ZWG">ZWG</option>
                    <option value="ZAR">ZAR (R)</option>
                  </select>
                </div>
                <div style={fieldBlock}>
                  <label style={fieldLabel}>Rate refresh</label>
                  <select style={select} defaultValue="daily">
                    <option value="manual">Manual only</option>
                    <option value="daily">Daily at 06:00</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <QuickLink title="Full exchange-rate board" desc="Add secondary currencies, set manual override rates, view historical board." cta="Open Multi-Currency" onClick={() => go('Multi-Currency')} />
              </div>
            </section>
          )}

          {activeTab === 'payments' && (
            <section style={sectionCard}>
              <div style={sectionHead}>
                <h2 style={sectionTitle}>Payments</h2>
                <p style={sectionSub}>Accept cards, EcoCash, and mobile money through your Pewil POS.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <ProviderRow name="Pesepay" desc="Cards (Visa/Mastercard) + EcoCash — the default primary rail." status="Connected" statusOk />
                <ProviderRow name="Paynow" desc="EcoCash, OneMoney, Telecash — mobile money fallback." status="Not connected" />
                <ProviderRow name="Paystack" desc="Legacy card rail — kept for historical accounts." status="Legacy" />
              </div>
            </section>
          )}

          {activeTab === 'team' && (
            <>
              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>Cashier permissions</h2>
                  <p style={sectionSub}>Control what workers with the cashier role can see and do in the POS.</p>
                </div>
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', borderRadius: 8, padding: '10px 12px', fontSize: 12, marginBottom: 12 }}>
                  These toggles are a preview. Permissions are set <strong>per staff member</strong> in <strong>Team &amp; Access</strong> — open that page to grant or restrict each person. Changes made here are not saved yet.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <ToggleItem label="View products" desc="See the product list and current prices." on={permViewProducts} onToggle={() => setPermViewProducts(!permViewProducts)} />
                  <ToggleItem label="Add products" desc="Create new products in the catalog." on={permAddProducts} onToggle={() => setPermAddProducts(!permAddProducts)} />
                  <ToggleItem label="Edit products" desc="Modify price and stock; mark stolen or damaged." on={permEditProducts} onToggle={() => setPermEditProducts(!permEditProducts)} />
                  <ToggleItem label="Process sales (POS)" desc="Use point of sale to ring up items and accept payment." on={permPOS} onToggle={() => setPermPOS(!permPOS)} />
                  <ToggleItem label="View reports" desc="Access financial reports and daily summaries." on={permViewReports} onToggle={() => setPermViewReports(!permViewReports)} />
                  <ToggleItem label="View journal" desc="See double-entry accounting ledger for audit." on={permViewJournal} onToggle={() => setPermViewJournal(!permViewJournal)} />
                </div>
                <div style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    style={{ ...btnPrimary, opacity: 0.5, cursor: 'not-allowed' }}
                    disabled
                    title="Set permissions per staff member in Team & Access"
                  >
                    Manage in Team &amp; Access
                  </button>
                </div>
              </section>

              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>Manager PIN</h2>
                  <p style={sectionSub}>Required for refunds, voids, discounts above threshold, and open-drawer events.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <QuickLink title="Set or rotate the manager PIN" desc="The 4-digit PIN cashiers use to approve sensitive POS actions." cta="Open Manager PIN" onClick={() => go('Manager PIN')} />
                  <QuickLink title="Invite team members" desc="Add owners, managers, and cashiers; send onboarding invites." cta="Open Team" onClick={() => go('Team')} />
                </div>
              </section>
            </>
          )}

          {activeTab === 'notifications' && (
            <>
              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>WhatsApp recipients</h2>
                  <p style={sectionSub}>Up to two numbers receive low-stock alerts, end-of-day digests, and approval requests.</p>
                </div>
                <div style={grid2}>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Primary phone</label>
                    <input style={input} type="tel" value={phone1} onChange={(e) => setPhone1(e.target.value)} placeholder="+263 77 123 4567" />
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Secondary phone</label>
                    <input style={input} type="tel" value={phone2} onChange={(e) => setPhone2(e.target.value)} placeholder="+263 78 987 6543" />
                  </div>
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button style={btnForest} onClick={savePhones}>Save numbers</button>
                  {saved && (
                    <div style={savedBadge(saved.startsWith('Error') ? 'error' : 'ok')}>
                      {saved.startsWith('Error') ? '' : '\u2713 '}{saved}
                    </div>
                  )}
                </div>
              </section>

              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>Alerts & digests</h2>
                  <p style={sectionSub}>What Pewil pings you about — each channel independently.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <ToggleItem label="Low-stock WhatsApp alerts" desc="Send a manager a WhatsApp when any SKU crosses its reorder threshold." on={lowStockWA} onToggle={() => setLowStockWA(!lowStockWA)} />
                  <ToggleItem label="Daily report email" desc="A plain-language analysis of each trading day — sales & trend, payment mix, top sellers, refunds and low stock — written up and emailed by Pewil." on={eodDigest} onToggle={() => setEodDigest(!eodDigest)} />
                  {eodDigest && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderLeft: '3px solid #1a6b3a', paddingLeft: 12, marginTop: 2 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>Send the report to</label>
                        <input style={input} value={digestRecipients} onChange={(e) => setDigestRecipients(e.target.value)}
                          placeholder={primaryEmail || 'owner@email.com'} />
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>
                          Comma-separate multiple addresses. Leave blank to use your primary email{primaryEmail ? ` (${primaryEmail})` : ''}.
                        </p>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 4 }}>Time of day</label>
                        <select style={{ ...input, maxWidth: 200 }} value={digestHour} onChange={(e) => setDigestHour(parseInt(e.target.value, 10))}>
                          {Array.from({ length: 24 }).map((_, h) => {
                            const ampm = h < 12 ? 'am' : 'pm'; const hr = (h % 12) || 12;
                            return <option key={h} value={h}>{hr}:00 {ampm}</option>;
                          })}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>Browser push</h2>
                  <p style={sectionSub}>Desktop/mobile web notifications for urgent events (manager PIN needed, tender over-short, fiscal device offline).</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button style={pushOn ? btnOutline : btnPrimary} onClick={togglePush} disabled={pushBusy}>
                    {pushBusy ? '\u2026' : pushOn ? 'Disable push' : 'Enable push'}
                  </button>
                  {pushOn && <button style={btnOutline} onClick={testPush}>Send test</button>}
                </div>
                {pushMsg && <div style={{ ...savedBadge(pushMsg.startsWith('Error') ? 'error' : 'ok'), marginTop: 10 }}>{pushMsg}</div>}
              </section>
            </>
          )}

          {activeTab === 'security' && (
            <section style={sectionCard}>
              <div style={sectionHead}>
                <h2 style={sectionTitle}>Security</h2>
                <p style={sectionSub}>Account login, password policy, and two-factor authentication.</p>
              </div>
              {/* Real password change + TOTP 2FA + email verification flows.
                  The QuickLinks that used to sit here had onClick={() => {}} —
                  dead wireframe buttons. Replaced with the SecuritySettings
                  component (which was fully built against authApi but wasn't
                  imported anywhere — dark code). */}
              <SecuritySettings />
              <div style={{ marginTop: 12 }}>
                <QuickLink title="Audit log" desc="See every change made to products, prices, settings, and team members." cta="Open Audit Log" onClick={() => go('Audit Log')} />
              </div>
            </section>
          )}

          {activeTab === 'api' && (
            <section style={sectionCard}>
              <div style={sectionHead}>
                <h2 style={sectionTitle}>API keys & webhooks</h2>
                <p style={sectionSub}>Integrate Pewil with your bookkeeping, website, or WhatsApp bot.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <InfoRow label="API base URL" value="https://api.pewil.org" mono />
                <InfoRow label="Your API key" value="pk_live_**************************" mono />
                <QuickLink title="Data export" desc="Download all your transactions, products, customers, and journal entries as CSV/Excel." cta="Open Data Export" onClick={() => go('Data Export')} />
              </div>
            </section>
          )}

          {activeTab === 'billing' && (
            <section style={sectionCard}>
              <div style={sectionHead}>
                <h2 style={sectionTitle}>Plan & billing</h2>
                <p style={sectionSub}>Your Pewil subscription, invoices, and usage meter.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <QuickLink title="Subscription & invoices" desc="Change plan, view invoices, update payment method." cta="Open Billing" onClick={() => go('Retail Billing')} />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */
function ToggleItem({ label, desc, on, onToggle }) {
  return (
    <div style={toggleRow}>
      <div style={{ flex: 1, paddingRight: 16 }}>
        <div style={toggleLabel}>{label}</div>
        <div style={toggleDesc}>{desc}</div>
      </div>
      <button style={toggleS(on)} onClick={onToggle} aria-pressed={on}>
        <span style={toggleK(on)} />
      </button>
    </div>
  );
}

function ProviderRow({ name, desc, status, statusOk }) {
  return (
    <div style={toggleRow}>
      <div style={{ flex: 1, paddingRight: 16 }}>
        <div style={toggleLabel}>{name}</div>
        <div style={toggleDesc}>{desc}</div>
      </div>
      <span
        style={{
          fontSize: 11, fontWeight: 700,
          padding: '5px 10px', borderRadius: 999,
          background: statusOk ? C.okBg : C.sand2,
          color: statusOk ? C.ok : C.terra,
          whiteSpace: 'nowrap',
        }}
      >
        {status}
      </span>
    </div>
  );
}

function QuickLink({ title, desc, cta, onClick }) {
  return (
    <div style={quickLinkCard}>
      <div style={{ flex: 1, paddingRight: 16 }}>
        <div style={toggleLabel}>{title}</div>
        <div style={toggleDesc}>{desc}</div>
      </div>
      <button style={btnOutline} onClick={onClick}>{cta} {'\u2192'}</button>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', border: `1px solid ${C.line2}`, borderRadius: 12,
        background: C.cream,
      }}
    >
      <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
      <span
        style={{
          fontSize: 13.5, fontWeight: 600, color: C.ink,
          fontFamily: mono ? 'ui-monospace, monospace' : SANS,
        }}
      >
        {value}
      </span>
    </div>
  );
}
