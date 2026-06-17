import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMyTenant, updateMyTenant } from '../api/coreApi';
import { getVapidKey, subscribePush, unsubscribePush, sendTestPush } from '../api/farmApi';
import { getAIBudget } from '../api/aiApi';
import { useQuery } from '@tanstack/react-query';
import TwoFactorPanel from '../components/TwoFactorPanel';
import PasswordPolicyPanel from '../components/PasswordPolicyPanel';

/* ─── Design 3 — Living Africa tokens (shared with Landing/Login/Register) ─── */
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
};
const SERIF = "'Fraunces', Georgia, serif";
const SANS = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";

/* ─── Shared style objects ─── */
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
const dangerTab = (active) => ({
  ...tabButton(active),
  color: active ? C.clay : C.danger,
  background: active ? C.dangerBg : 'transparent',
  marginTop: 8, borderTop: `1px solid ${C.line2}`, borderRadius: 10,
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
const grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 };

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
const btnDanger = {
  ...btnBase, background: '#fff', color: C.danger,
  border: `1.5px solid ${C.danger}`,
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

/* ─── Utilities ─── */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/* ─── Tab definitions — Farm-only.
   Retail-specific settings (POS preferences, fiscal/tax, hardware, currencies)
   live under the Retail module's own Settings page; this Settings page is the
   farm/agriculture hub only. ─── */
function buildTabs({ farmOn }) {
  const tabs = [
    { key: 'general', label: 'General' },
    { key: 'branding', label: 'Branding' },
  ];
  if (farmOn) tabs.push({ key: 'farm', label: 'Pewil Farm' });
  tabs.push(
    { key: 'payments', label: 'Payments' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'security', label: 'Security' },
    { key: 'api', label: 'API & Webhooks' },
    { key: 'billing', label: 'Billing & Plan' },
  );
  return tabs;
}

/* ─── Main component ─── */
export default function Settings({ onTabChange }) {
  const { user } = useAuth();
  const role = user?.role || 'owner';
  const [activeTab, setActiveTab] = useState('general');

  /* ── Tenant details ── */
  const tenantName = user?.tenant_name || 'Pewil';
  const [bizName, setBizName] = useState(tenantName);
  const [tradingName, setTradingName] = useState(() => localStorage.getItem('trading_name') || '');
  const [tin, setTin] = useState(() => localStorage.getItem('zimra_tin') || '');
  const [vat, setVat] = useState(() => localStorage.getItem('zimra_vat') || '');
  const [primaryEmail, setPrimaryEmail] = useState(() => localStorage.getItem('primary_email') || user?.email || '');
  const [primaryPhone, setPrimaryPhone] = useState(() => localStorage.getItem('primary_phone') || '');
  const [country, setCountry] = useState('ZW');
  const [currency, setCurrency] = useState(() => localStorage.getItem('currency') || 'USD');
  const [timezone, setTimezone] = useState('Africa/Harare');
  const [saved, setSaved] = useState('');

  /* ── Shared operational preferences ── */
  const [eodDigest, setEodDigest] = useState(() => localStorage.getItem('eod_digest') === 'true');

  /* ── Retail-only preferences ── */
  const [offlineFirst, setOfflineFirst] = useState(() => localStorage.getItem('offline_first') !== 'false');
  const [lowStockWA, setLowStockWA] = useState(() => localStorage.getItem('low_stock_wa') === 'true');
  const [autoFiscal, setAutoFiscal] = useState(() => localStorage.getItem('auto_fiscal') !== 'false');
  const [lowStockThreshold, setLowStockThreshold] = useState(() => localStorage.getItem('low_stock_threshold') || '5');
  const [cashRound, setCashRound] = useState(() => localStorage.getItem('cash_round') || 'none');
  const [showChange, setShowChange] = useState(() => localStorage.getItem('pos_show_change') !== 'false');
  const [receiptCopies, setReceiptCopies] = useState(() => localStorage.getItem('receipt_copies') || '1');

  /* ── Farm-only preferences ── */
  const [fieldUnit, setFieldUnit] = useState(() => localStorage.getItem('field_unit') || 'hectares');
  const [harvestUnit, setHarvestUnit] = useState(() => localStorage.getItem('harvest_unit') || 'kg');
  const [waterUnit, setWaterUnit] = useState(() => localStorage.getItem('water_unit') || 'L');
  const [weeklyDigestDay, setWeeklyDigestDay] = useState(() => localStorage.getItem('weekly_digest_day') || 'sunday');
  const [weeklyDigestTime, setWeeklyDigestTime] = useState(() => localStorage.getItem('weekly_digest_time') || '18:00');
  const [livestockOn, setLivestockOn] = useState(() => localStorage.getItem('livestock_on') === 'true');
  const [autoAIAnalysis, setAutoAIAnalysis] = useState(() => localStorage.getItem('auto_ai_analysis') === 'true');
  const [weatherAlerts, setWeatherAlerts] = useState(() => localStorage.getItem('weather_alerts') !== 'false');
  const [rainLogReminder, setRainLogReminder] = useState(() => localStorage.getItem('rain_log_reminder') === 'true');

  /* ── Modules — farm page only cares about farmOn.
     Retail module toggle lives on the Retail Settings page. ── */
  const modules = user?.modules || ['farm', 'retail'];
  const [farmOn] = useState(modules.includes('farm'));

  /* ── Cashier permissions ── */
  const [permViewProducts, setPermViewProducts] = useState(true);
  const [permAddProducts, setPermAddProducts] = useState(false);
  const [permEditProducts, setPermEditProducts] = useState(false);
  const [permPOS, setPermPOS] = useState(true);
  const [permViewReports, setPermViewReports] = useState(false);

  /* ── Notifications ── */
  const [phone1, setPhone1] = useState(() => localStorage.getItem('wa_phone_1') || '');
  const [phone2, setPhone2] = useState(() => localStorage.getItem('wa_phone_2') || '');
  const [reminder, setReminder] = useState(() => localStorage.getItem('reminder_9pm') === 'true');
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState('');

  /* ── AI Budget ── */
  const { data: aiBudget, isLoading: aiLoading } = useQuery({
    queryKey: ['ai-budget'],
    queryFn: getAIBudget,
    staleTime: 30000,
  });

  /* ── Push registration probe ── */
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((sub) => setPushOn(!!sub))
      ).catch(() => {});
    }
  }, []);

  /* ── Persist local-state toggles to localStorage ── */
  useEffect(() => { localStorage.setItem('currency', currency); }, [currency]);
  useEffect(() => { localStorage.setItem('reminder_9pm', String(reminder)); }, [reminder]);
  useEffect(() => { localStorage.setItem('offline_first', String(offlineFirst)); }, [offlineFirst]);
  useEffect(() => { localStorage.setItem('low_stock_wa', String(lowStockWA)); }, [lowStockWA]);
  useEffect(() => { localStorage.setItem('auto_fiscal', String(autoFiscal)); }, [autoFiscal]);
  useEffect(() => { localStorage.setItem('eod_digest', String(eodDigest)); }, [eodDigest]);
  useEffect(() => { localStorage.setItem('low_stock_threshold', lowStockThreshold); }, [lowStockThreshold]);
  useEffect(() => { localStorage.setItem('cash_round', cashRound); }, [cashRound]);
  useEffect(() => { localStorage.setItem('pos_show_change', String(showChange)); }, [showChange]);
  useEffect(() => { localStorage.setItem('receipt_copies', receiptCopies); }, [receiptCopies]);
  useEffect(() => { localStorage.setItem('field_unit', fieldUnit); }, [fieldUnit]);
  useEffect(() => { localStorage.setItem('harvest_unit', harvestUnit); }, [harvestUnit]);
  useEffect(() => { localStorage.setItem('water_unit', waterUnit); }, [waterUnit]);
  useEffect(() => { localStorage.setItem('weekly_digest_day', weeklyDigestDay); }, [weeklyDigestDay]);
  useEffect(() => { localStorage.setItem('weekly_digest_time', weeklyDigestTime); }, [weeklyDigestTime]);
  useEffect(() => { localStorage.setItem('livestock_on', String(livestockOn)); }, [livestockOn]);
  useEffect(() => { localStorage.setItem('auto_ai_analysis', String(autoAIAnalysis)); }, [autoAIAnalysis]);
  useEffect(() => { localStorage.setItem('weather_alerts', String(weatherAlerts)); }, [weatherAlerts]);
  useEffect(() => { localStorage.setItem('rain_log_reminder', String(rainLogReminder)); }, [rainLogReminder]);

  /* ── Compute visible tabs from enabled modules (farm hub — retail has its own page) ── */
  const TABS = buildTabs({ farmOn });

  /* ── Handlers ── */
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

  const saveTenant = async () => {
    try {
      await updateMyTenant({ name: bizName, country, currency, timezone });
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
      await updateMyTenant({ whatsapp_phone_1: phone1, whatsapp_phone_2: phone2 });
      setSaved('Numbers saved!');
    } catch {
      setSaved('Numbers saved locally!');
    }
    setTimeout(() => setSaved(''), 3000);
  };

  /* ── Role gate ── */
  if (role !== 'owner') {
    return (
      <div style={{ ...pageShell, textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{'\u{1F512}'}</div>
        <h2 style={{ ...pageTitle, fontSize: 22, margin: 0 }}>Owner-only area</h2>
        <p style={{ ...pageSub, marginTop: 8 }}>Settings are reserved for the organization owner.</p>
      </div>
    );
  }

  /* ── Render ── */
  return (
    <div style={pageShell}>
      {/* Page hero */}
      <header style={heroRow}>
        <h1 style={pageTitle}>Settings</h1>
        <p style={pageSub}>
          Configure your organization, branding, and operational preferences.
        </p>
      </header>

      <div style={twoCol}>
        {/* Left rail — tabs */}
        <nav style={leftRail} aria-label="Settings sections">
          {TABS.map((t) => (
            <button
              key={t.key}
              style={tabButton(activeTab === t.key)}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
          <button
            style={dangerTab(activeTab === 'danger')}
            onClick={() => setActiveTab('danger')}
          >
            Danger zone
          </button>
        </nav>

        {/* Right pane — content */}
        <div style={rightPane}>
          {activeTab === 'general' && (
            <>
              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>General settings</h2>
                  <p style={sectionSub}>
                    Basic information about your organization as it appears on invoices,
                    receipts, and reports.
                  </p>
                </div>
                <div style={grid2}>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Organization name</label>
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
                    <label style={fieldLabel}>TIN (ZIMRA)</label>
                    <input
                      style={input}
                      value={tin}
                      onChange={(e) => setTin(e.target.value)}
                      placeholder="e.g. 1234567"
                    />
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>VAT number</label>
                    <input
                      style={input}
                      value={vat}
                      onChange={(e) => setVat(e.target.value)}
                      placeholder="e.g. 10001234"
                    />
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Primary email</label>
                    <input
                      style={input}
                      type="email"
                      value={primaryEmail}
                      onChange={(e) => setPrimaryEmail(e.target.value)}
                    />
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Primary phone</label>
                    <input
                      style={input}
                      type="tel"
                      value={primaryPhone}
                      onChange={(e) => setPrimaryPhone(e.target.value)}
                      placeholder="+263 77 123 4567"
                    />
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

              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>Operational preferences</h2>
                  <p style={sectionSub}>
                    Org-wide preferences. Farm-specific settings live under the Farm tab; retail
                    preferences have their own Settings page on the Retail module.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <ToggleItem
                    label="Daily end-of-day email digest"
                    desc="06:00 summary to owners & managers."
                    on={eodDigest}
                    onToggle={() => setEodDigest(!eodDigest)}
                  />
                </div>
              </section>
            </>
          )}

          {activeTab === 'branding' && (
            <section style={sectionCard}>
              <div style={sectionHead}>
                <h2 style={sectionTitle}>Branding</h2>
                <p style={sectionSub}>
                  Logo, colors, and tone shown on customer-facing receipts and invoices.
                </p>
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
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 4 }}>
                    Upload your logo
                  </div>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
                    PNG or SVG, at least 256x256, under 1 MB.
                  </div>
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
              <div style={{ marginTop: 16 }}>
                <button style={btnPrimary}>Save branding</button>
              </div>
            </section>
          )}

          {activeTab === 'farm' && (
            <>
              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>Farm preferences</h2>
                  <p style={sectionSub}>
                    How the Farm module behaves - units, livestock, and AI analysis.
                  </p>
                </div>
                <div style={grid2}>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Field size unit</label>
                    <select style={select} value={fieldUnit} onChange={(e) => setFieldUnit(e.target.value)}>
                      <option value="hectares">Hectares (ha)</option>
                      <option value="acres">Acres</option>
                      <option value="sqm">Square metres</option>
                    </select>
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Harvest yield unit</label>
                    <select style={select} value={harvestUnit} onChange={(e) => setHarvestUnit(e.target.value)}>
                      <option value="kg">Kilograms (kg)</option>
                      <option value="tonnes">Tonnes (t)</option>
                      <option value="bags">Bags (50 kg)</option>
                    </select>
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Water volume unit</label>
                    <select style={select} value={waterUnit} onChange={(e) => setWaterUnit(e.target.value)}>
                      <option value="L">Litres (L)</option>
                      <option value="m3">Cubic metres</option>
                      <option value="gal">Gallons (gal)</option>
                    </select>
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Default rainy-season start</label>
                    <select style={select} defaultValue="october">
                      <option value="october">October</option>
                      <option value="november">November</option>
                      <option value="december">December</option>
                    </select>
                  </div>
                </div>
              </section>

              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>Farm features</h2>
                  <p style={sectionSub}>Turn on modules that match how you farm.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <ToggleItem
                    label="Livestock tracking"
                    desc="Enable cattle, goats, chickens, and pigs with health logs and breeding records."
                    on={livestockOn}
                    onToggle={() => setLivestockOn(!livestockOn)}
                  />
                  <ToggleItem
                    label="Auto AI analysis on month close"
                    desc="Claude generates a P&L insight summary on the 1st of every month."
                    on={autoAIAnalysis}
                    onToggle={() => setAutoAIAnalysis(!autoAIAnalysis)}
                  />
                  <ToggleItem
                    label="Weather & rainfall alerts"
                    desc="WhatsApp heads-up before storms, frost, or heavy rain."
                    on={weatherAlerts}
                    onToggle={() => setWeatherAlerts(!weatherAlerts)}
                  />
                  <ToggleItem
                    label="Rain-log reminder"
                    desc="Morning nudge after rain to record the amount in each field."
                    on={rainLogReminder}
                    onToggle={() => setRainLogReminder(!rainLogReminder)}
                  />
                  <ToggleItem
                    label="9 PM daily farm reminder (WhatsApp)"
                    desc="Evening nudge to log today's harvest, costs, and attendance."
                    on={reminder}
                    onToggle={() => setReminder(!reminder)}
                  />
                </div>
              </section>

              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>Weekly farm digest</h2>
                  <p style={sectionSub}>
                    Owners get a single WhatsApp summary of the week.
                  </p>
                </div>
                <div style={grid2}>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Day of week</label>
                    <select style={select} value={weeklyDigestDay} onChange={(e) => setWeeklyDigestDay(e.target.value)}>
                      <option value="sunday">Sunday</option>
                      <option value="monday">Monday</option>
                      <option value="friday">Friday</option>
                      <option value="saturday">Saturday</option>
                    </select>
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Delivery time</label>
                    <input
                      style={input}
                      type="time"
                      value={weeklyDigestTime}
                      onChange={(e) => setWeeklyDigestTime(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <button style={btnPrimary}>Save farm settings</button>
                </div>
              </section>
            </>
          )}

          {activeTab === 'payments' && (
            <section style={sectionCard}>
              <div style={sectionHead}>
                <h2 style={sectionTitle}>Payments</h2>
                <p style={sectionSub}>
                  Accept cards, EcoCash, and mobile money through your Pewil POS.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <ProviderRow
                  name="Pesepay"
                  desc="Cards (Visa/Mastercard) + EcoCash - the default primary rail."
                  status="Connected"
                  statusOk
                />
                <ProviderRow
                  name="Paynow"
                  desc="EcoCash, OneMoney, Telecash - mobile money fallback."
                  status="Not connected"
                />
                <ProviderRow
                  name="Paystack"
                  desc="Legacy card rail - kept for historical accounts."
                  status="Legacy"
                />
              </div>
            </section>
          )}

          {activeTab === 'notifications' && (
            <>
              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>WhatsApp recipients</h2>
                  <p style={sectionSub}>
                    Who gets the 9 PM reminder and low-stock pings.
                  </p>
                </div>
                <div style={grid2}>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Owner number 1</label>
                    <input
                      style={input}
                      type="tel"
                      value={phone1}
                      onChange={(e) => setPhone1(e.target.value)}
                      placeholder="+263..."
                    />
                  </div>
                  <div style={fieldBlock}>
                    <label style={fieldLabel}>Owner number 2</label>
                    <input
                      style={input}
                      type="tel"
                      value={phone2}
                      onChange={(e) => setPhone2(e.target.value)}
                      placeholder="+263..."
                    />
                  </div>
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button style={btnPrimary} onClick={savePhones}>Save numbers</button>
                  {(saved === 'Numbers saved!' || saved === 'Numbers saved locally!') && (
                    <div style={savedBadge('ok')}>{'\u2713 '}{saved}</div>
                  )}
                </div>
              </section>

              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>Alert channels</h2>
                  <p style={sectionSub}>Choose how Pewil reaches you.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={toggleRow}>
                    <div style={{ flex: 1 }}>
                      <div style={toggleLabel}>Browser push alerts</div>
                      <div style={toggleDesc}>
                        Low stock, wages due, livestock health - delivered via your browser.
                      </div>
                      {pushMsg && <div style={{ ...savedBadge('ok'), marginTop: 8 }}>{pushMsg}</div>}
                      {pushOn && (
                        <button
                          style={{ ...btnOutline, marginTop: 10, padding: '8px 14px', fontSize: 13 }}
                          onClick={testPush}
                        >
                          Send test push
                        </button>
                      )}
                    </div>
                    <button style={toggleS(pushOn)} onClick={togglePush} disabled={pushBusy}>
                      <div style={toggleK(pushOn)} />
                    </button>
                  </div>
                  <ToggleItem
                    label="Daily end-of-day email digest"
                    desc="06:00 summary to owners & managers."
                    on={eodDigest}
                    onToggle={() => setEodDigest(!eodDigest)}
                  />
                </div>
                <p style={{ ...sectionSub, marginTop: 14 }}>
                  Farm-specific reminders (9 PM log nudge, rain-log, weather) live under the Farm tab.
                  Retail notifications (low-stock alerts, end-of-day) live on the Retail Settings page.
                </p>
              </section>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>Role reference</h2>
                  <p style={sectionSub}>How each role works across the app.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <RolePill
                    role="Owner"
                    tone={C.forest}
                    bg="#e7f2ea"
                    desc="Full access - all tabs, reports, settings, billing, AI."
                  />
                  <RolePill
                    role="Manager"
                    tone="#1d4ed8"
                    bg="#e6efff"
                    desc="Logs expenses, stock, attendance, trips. No reports or settings."
                  />
                  <RolePill
                    role="Cashier / Worker"
                    tone={C.clay}
                    bg={C.sand2}
                    desc="POS access or view-only for their own hours."
                  />
                </div>
              </section>

              <TwoFactorPanel
                C={C}
                SERIF={SERIF}
                SANS={SANS}
                sectionCard={sectionCard}
                sectionHead={sectionHead}
                sectionTitle={sectionTitle}
                sectionSub={sectionSub}
                btnPrimary={btnPrimary}
                btnOutline={btnOutline}
                btnDanger={btnDanger}
                input={input}
                fieldLabel={fieldLabel}
                fieldBlock={fieldBlock}
              />

              <PasswordPolicyPanel />

              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>Sign-in safeguards</h2>
                  <p style={sectionSub}>Lockout and session policy enforced across the app.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <StaticRow label="Failed-login lockout" value="5 attempts / 1 hour" />
                  <StaticRow label="Session expiry" value="30 minutes idle" />
                </div>
              </section>
            </>
          )}

          {activeTab === 'api' && (
            <section style={sectionCard}>
              <div style={sectionHead}>
                <h2 style={sectionTitle}>API &amp; webhooks</h2>
                <p style={sectionSub}>
                  Programmatic access for integrations - accounting, BI tools, custom dashboards.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Wireframe stubs used to live here — "Rotate" / "Save webhook" /
                    "Send test event" buttons with no onClick, and a fake
                    `sk_live_****` key that wasn't loaded from anywhere. No
                    backend endpoints exist for API keys or webhooks yet, so
                    the UI now honestly reflects that. */}
                <StaticRow
                  label="API base URL"
                  value="https://api.pewil.org/api/"
                  mono
                />
                <div
                  style={{
                    padding: '14px 16px',
                    background: C.sand,
                    border: `1px solid ${C.line}`,
                    borderRadius: 10,
                    fontSize: 13,
                    color: C.ink,
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    API keys &amp; webhooks — coming soon
                  </div>
                  <div style={{ color: C.muted }}>
                    Programmatic access for bookkeeping, WhatsApp bots, and third-party integrations is on the roadmap.
                    If you need early access, email{' '}
                    <a href="mailto:support@pewil.org" style={{ color: C.forest, textDecoration: 'underline' }}>
                      support@pewil.org
                    </a>
                    {' '}and tell us what you want to integrate.
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'billing' && (
            <>
              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>Billing &amp; plan</h2>
                  <p style={sectionSub}>Your subscription, invoices, and next charge.</p>
                </div>
                <div
                  style={{
                    background: `linear-gradient(135deg, ${C.sand}, ${C.sand2})`,
                    border: `1px solid ${C.line}`, borderRadius: 14,
                    padding: '18px 20px', display: 'grid',
                    gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                      Current plan
                    </div>
                    <div style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 700, color: C.forest, marginTop: 4 }}>
                      {aiBudget?.plan ? aiBudget.plan[0].toUpperCase() + aiBudget.plan.slice(1) : 'Starter'}
                    </div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                      Next charge on the 1st.
                    </div>
                  </div>
                  <button
                    style={btnForest}
                    onClick={() => { if (typeof onTabChange === 'function') onTabChange('Billing'); }}
                  >
                    Change plan
                  </button>
                </div>
              </section>

              <section style={sectionCard}>
                <div style={sectionHead}>
                  <h2 style={sectionTitle}>AI usage this month</h2>
                  <p style={sectionSub}>Credits are included with your plan and reset on the 1st.</p>
                </div>
                {aiLoading ? (
                  <div style={{ fontSize: 13, color: C.muted }}>Loading usage...</div>
                ) : aiBudget ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, marginBottom: 6 }}>
                      <span>
                        {aiBudget.credits_used} / {aiBudget.credits_total} credits used
                      </span>
                      <span>{aiBudget.credits_remaining} left</span>
                    </div>
                    <div style={{ height: 10, background: C.line2, borderRadius: 99, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%', borderRadius: 99, transition: 'width .3s',
                          width: `${Math.min(aiBudget.usage_percent, 100)}%`,
                          background:
                            aiBudget.usage_percent > 80
                              ? C.clay
                              : aiBudget.usage_percent > 50
                              ? C.amber
                              : C.forest,
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, marginTop: 12 }}>
                      <span>API cost this month</span>
                      <span style={{ fontWeight: 600, color: C.ink }}>
                        ${parseFloat(aiBudget.cost_usd || 0).toFixed(4)}
                      </span>
                    </div>
                    {aiBudget.usage_by_feature?.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ ...fieldLabel, marginBottom: 8 }}>Usage breakdown</div>
                        {aiBudget.usage_by_feature.map((f, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex', justifyContent: 'space-between',
                              padding: '8px 0', borderBottom: `1px solid ${C.line2}`,
                              fontSize: 13,
                            }}
                          >
                            <span style={{ color: C.ink }}>{f.description}</span>
                            <span style={{ fontWeight: 600, color: C.ink }}>{f.count}x</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: C.muted }}>AI usage data unavailable.</div>
                )}
              </section>
            </>
          )}

          {activeTab === 'danger' && (
            <section style={{ ...sectionCard, borderColor: C.danger, background: '#fff' }}>
              <div style={sectionHead}>
                <h2 style={{ ...sectionTitle, color: C.danger }}>Danger zone</h2>
                <p style={sectionSub}>
                  These actions are irreversible. Proceed with care.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <DangerRow
                  title="Cancel subscription"
                  desc="Your plan will stay active until the end of the billing period, then downgrade to read-only."
                  cta="Cancel subscription"
                />
                <DangerRow
                  title="Delete account"
                  desc="Permanently removes your organization, users, and all data after a 14-day grace period."
                  cta="Delete account"
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/* Small presentational helpers */
function ToggleItem({ label, desc, on, onToggle }) {
  return (
    <div style={toggleRow}>
      <div style={{ flex: 1, paddingRight: 14 }}>
        <div style={toggleLabel}>{label}</div>
        <div style={toggleDesc}>{desc}</div>
      </div>
      <button style={toggleS(on)} onClick={onToggle} aria-pressed={on}>
        <div style={toggleK(on)} />
      </button>
    </div>
  );
}

function ProviderRow({ name, desc, status, statusOk }) {
  return (
    <div style={toggleRow}>
      <div style={{ flex: 1, paddingRight: 14 }}>
        <div style={toggleLabel}>{name}</div>
        <div style={toggleDesc}>{desc}</div>
      </div>
      <span
        style={{
          fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 999,
          background: statusOk ? '#e7f2ea' : C.sand2,
          color: statusOk ? C.forest : C.muted,
        }}
      >
        {status}
      </span>
    </div>
  );
}

function RolePill({ role, tone, bg, desc }) {
  return (
    <div
      style={{
        background: bg, borderRadius: 12, padding: '12px 16px',
        border: `1px solid ${C.line2}`,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: tone, letterSpacing: '.02em' }}>
        {role.toUpperCase()}
      </div>
      <div style={{ fontSize: 13, color: C.ink, marginTop: 4, lineHeight: 1.45 }}>{desc}</div>
    </div>
  );
}

function StaticRow({ label, value, mono }) {
  return (
    <div
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
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

function DangerRow({ title, desc, cta }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', border: `1px solid ${C.danger}`, borderRadius: 12,
        background: C.dangerBg, gap: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.danger }}>{title}</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>{desc}</div>
      </div>
      <button style={btnDanger}>{cta}</button>
    </div>
  );
}
