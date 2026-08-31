import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDeviceProfiles, createDeviceProfile, updateDeviceProfile,
  deleteDeviceProfile, testDevice, setDefaultDevice, getDeviceSummary,
  getPrintBridgeStatus, getZimraDevices, getFiscalQueueStats,
} from '../api/retailApi';
import AIInsightCard from '../components/AIInsightCard';
import usePrimaryAction from '../hooks/usePrimaryAction';
import { buildTestBytes } from '../utils/escposReceipt';
import {
  pairBluetoothPrinter, printViaWebBluetooth, printViaRawBT,
  isWebBluetoothSupported, isAndroid, lastPrinterName,
} from '../utils/btPrinter';

export default function DeviceConfiguration({ onTabChange }) {
  // Top-bar primary action — see hooks/usePrimaryAction.js.
  usePrimaryAction(() => openAdd());

  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('devices');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  // ── Queries ──
  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['deviceProfiles'],
    queryFn: () => getDeviceProfiles(),
    staleTime: 30000,
  });
  const { data: summary } = useQuery({
    queryKey: ['deviceSummary'],
    queryFn: getDeviceSummary,
    staleTime: 30000,
  });
  const { data: bridgeStatus } = useQuery({
    queryKey: ['printBridgeStatus'],
    queryFn: getPrintBridgeStatus,
    staleTime: 15000,
    refetchInterval: 30000,
  });
  const { data: zimraDevices = [] } = useQuery({
    queryKey: ['zimraDevices'],
    queryFn: getZimraDevices,
    staleTime: 60000,
  });
  const { data: fiscalStats } = useQuery({
    queryKey: ['fiscalQueueStats'],
    queryFn: getFiscalQueueStats,
    staleTime: 30000,
  });

  // ── Mutations ──
  const createMut = useMutation({
    mutationFn: createDeviceProfile,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deviceProfiles'] }); qc.invalidateQueries({ queryKey: ['deviceSummary'] }); setShowAddModal(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateDeviceProfile(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deviceProfiles'] }); setEditDevice(null); },
  });
  const deleteMut = useMutation({
    mutationFn: deleteDeviceProfile,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deviceProfiles'] }); qc.invalidateQueries({ queryKey: ['deviceSummary'] }); },
  });
  // The server now answers honestly (bridge checked for real; till-attached
  // devices say they must be tested at the till) - so SHOW the answer, per
  // device, instead of a silent green flash on every row (2026-08-31).
  const [testResult, setTestResult] = useState(null);   // { id, success, message }
  const testMut = useMutation({
    mutationFn: testDevice,
    onSuccess: (data) => {
      setTestResult({ id: data?.device_id, success: data?.success, message: data?.message || '' });
      qc.invalidateQueries({ queryKey: ['deviceProfiles'] });
      qc.invalidateQueries({ queryKey: ['deviceSummary'] });
    },
    onError: (err, id) => {
      setTestResult({
        id,
        success: false,
        message: err?.response?.data?.detail || err?.message || 'Could not reach the server to test.',
      });
    },
  });
  const defaultMut = useMutation({ mutationFn: setDefaultDevice, onSuccess: () => qc.invalidateQueries({ queryKey: ['deviceProfiles'] }) });

  // ── Device type icons ──
  const typeIcons = {
    receipt_printer: '\u{1F5A8}',
    barcode_scanner: '\u{1F4F7}',
    cash_drawer: '\u{1F4B0}',
    scale: '\u2696\uFE0F',
    customer_display: '\u{1F4FA}',
    label_printer: '\u{1F3F7}\uFE0F',
  };
  const typeLabels = {
    receipt_printer: 'Receipt Printer',
    barcode_scanner: 'Barcode Scanner',
    cash_drawer: 'Cash Drawer',
    scale: 'Weighing Scale',
    customer_display: 'Customer Display',
    label_printer: 'Label Printer',
  };

  // ── Add/Edit Form State ──
  const [form, setForm] = useState({
    device_type: 'receipt_printer',
    device_name: '',
    connection_type: 'print_bridge',
    driver_profile: 'generic_escpos',
    paper_width: '80mm',
    connection_config: {},
  });

  const resetForm = () => setForm({
    device_type: 'receipt_printer',
    device_name: '',
    connection_type: 'print_bridge',
    driver_profile: 'generic_escpos',
    paper_width: '80mm',
    connection_config: {},
  });

  const handleSave = () => {
    if (editDevice) {
      updateMut.mutate({ id: editDevice.id, data: form });
    } else {
      createMut.mutate(form);
    }
  };

  const openEdit = (d) => {
    setForm({
      device_type: d.device_type,
      device_name: d.device_name,
      connection_type: d.connection_type,
      driver_profile: d.driver_profile,
      paper_width: d.paper_width || '80mm',
      connection_config: d.connection_config || {},
    });
    setEditDevice(d);
    setShowAddModal(true);
  };

  const openAdd = () => {
    resetForm();
    setEditDevice(null);
    setShowAddModal(true);
  };

  // ── Delete confirm ──
  const [delConfirm, setDelConfirm] = useState(null);

  // ── Bluetooth pair & REAL test print (2026-08-31) ──
  // The server's test can only vouch for the Print Bridge; a Bluetooth
  // printer can only be proven from THIS device, by putting ink on paper.
  const [btTest, setBtTest] = useState(null);   // 'working' | { ok, message }
  const btPairAndTest = async () => {
    setBtTest('working');
    try {
      await pairBluetoothPrinter();
      await printViaWebBluetooth(buildTestBytes('PEWIL PRINTER TEST'));
      setBtTest({ ok: true, message: `Test page sent to ${lastPrinterName() || 'the printer'}. If it printed, you are ready.` });
    } catch (e) {
      const base = e?.message || 'Could not reach the printer.';
      setBtTest({
        ok: false,
        message: isAndroid()
          ? `${base} If it is a classic-Bluetooth printer, use the RawBT button instead.`
          : base,
      });
    }
  };
  const btTestViaRawBT = () => {
    try {
      printViaRawBT(buildTestBytes('PEWIL PRINTER TEST'));
      setBtTest({ ok: true, message: 'Test page handed to RawBT. If nothing printed, install RawBT from the Play Store and select your printer inside it.' });
    } catch (e) {
      setBtTest({ ok: false, message: e?.message || 'RawBT hand-off failed.' });
    }
  };

  // ── Styles ──
  const card = { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 2px rgba(15,23,18,0.04), 0 12px 28px -18px rgba(15,23,18,0.14)' };
  const sectionLabel = { fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 };
  const btn = { padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'Inter, sans-serif' };
  const greenBtn = { ...btn, background: '#1a6b3a', color: '#fff' };
  const grayBtn = { ...btn, background: '#f3f4f6', color: '#374151', border: '1px solid #e3e8e4' };
  const redBtn = { ...btn, background: '#fee2e2', color: '#c0392b' };
  const tab = (active) => ({
    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: 13, fontFamily: 'Inter, sans-serif',
    background: active ? '#1a6b3a' : '#f3f4f6', color: active ? '#fff' : '#6b7280',
    transition: 'all 0.15s',
  });
  const statusDot = (s) => ({
    width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
    background: s === 'online' ? '#22c55e' : s === 'error' ? '#ef4444' : '#d1d5db',
  });
  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const modal = { background: '#fff', borderRadius: 16, padding: 28, width: '90%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' };

  return (
    <div style={{ padding: '0 8px 40px' }}>

      {/* ── Tab Bar ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { key: 'devices', label: 'Devices' },
          { key: 'bridge', label: 'Print Bridge' },
          { key: 'zimra', label: 'ZIMRA Fiscal' },
          { key: 'guide', label: 'Setup Guide' },
        ].map(t => (
          <button key={t.key} style={tab(activeTab === t.key)} onClick={() => setActiveTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ════════════ DEVICES TAB ════════════ */}
      {activeTab === 'devices' && (
        <>
          {/* Summary Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
            {summary && Object.entries(summary).map(([key, val]) => (
              <div key={key} style={{ ...card, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{typeIcons[key] || '\u{1F50C}'}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{val.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: val.count > 0 ? '#1a6b3a' : '#d1d5db', fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}>{val.count}</div>
                {val.has_online && <span style={{ ...statusDot('online'), marginTop: 4 }} />}
              </div>
            ))}
          </div>

          {/* Bluetooth printer — pair and PROVE it with a test page */}
          <div style={{ ...card, marginBottom: 20 }}>
            <div style={sectionLabel}>{'\u{1F4F6}'} Bluetooth printer</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10, lineHeight: 1.6 }}>
              Pair the till{'\u2019'}s Bluetooth thermal printer and print a real test page.
              A test that puts ink on paper is the only test that counts.
              {lastPrinterName() ? <> Last paired: <b>{lastPrinterName()}</b>.</> : null}
            </div>
            {btTest && btTest !== 'working' && (
              <div role="status" style={{
                fontSize: 12, lineHeight: 1.5, borderRadius: 8, padding: '8px 10px', marginBottom: 10,
                background: btTest.ok ? '#e8f5ee' : '#fef2f2',
                border: `1px solid ${btTest.ok ? '#bbe3cd' : '#fecaca'}`,
                color: btTest.ok ? '#166534' : '#991b1b',
              }}>
                {btTest.message}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {isWebBluetoothSupported() ? (
                <button style={greenBtn} onClick={btPairAndTest} disabled={btTest === 'working'}>
                  {btTest === 'working' ? 'Printing\u2026' : 'Pair & print test page'}
                </button>
              ) : (
                <span style={{ fontSize: 12, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px' }}>
                  This browser has no Web Bluetooth {'\u2014'} use Chrome{isAndroid() ? '' : ' on Android or desktop'}.
                </span>
              )}
              {isAndroid() && (
                <button style={grayBtn} onClick={btTestViaRawBT}>Test via RawBT (classic Bluetooth)</button>
              )}
            </div>
          </div>

          {/* Add Device Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={sectionLabel}>{'\u{1F50C}'} Configured Devices</div>
            <button style={greenBtn} onClick={openAdd}>+ Add Device</button>
          </div>

          {/* Device Cards Grid */}
          {isLoading ? (
            <div style={{ ...card, textAlign: 'center', padding: 40, color: '#6b7280' }}>Loading devices...</div>
          ) : devices.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{'\u{1F50C}'}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 6 }}>No Devices Configured</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Add your printers, scanners, scales and other POS hardware.</div>
              <button style={greenBtn} onClick={openAdd}>+ Add Your First Device</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {devices.map(d => (
                <div key={d.id} style={{ ...card, position: 'relative' }}>
                  {d.is_default && (
                    <div style={{ position: 'absolute', top: 8, right: 8, background: '#e8f5ee', color: '#1a6b3a', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase' }}>Default</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 28 }}>{typeIcons[d.device_type] || '\u{1F50C}'}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{d.device_name}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{typeLabels[d.device_type]}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={statusDot(d.status)} />
                    <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>{d.status}</span>
                    {d.last_seen && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>Last: {new Date(d.last_seen).toLocaleTimeString()}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>
                    {d.connection_type.replace(/_/g, ' ')} {'\u00B7'} {d.driver_profile.replace(/_/g, ' ')}
                    {d.paper_width ? ` \u00B7 ${d.paper_width}` : ''}
                  </div>
                  {testResult && testResult.id === d.id && (
                    <div role="status" style={{
                      marginBottom: 10, padding: '8px 10px', borderRadius: 8, fontSize: 11, lineHeight: 1.5,
                      background: testResult.success === true ? '#e8f5ee' : testResult.success === false ? '#fef2f2' : '#fffbeb',
                      border: `1px solid ${testResult.success === true ? '#bbe3cd' : testResult.success === false ? '#fecaca' : '#fde68a'}`,
                      color: testResult.success === true ? '#166534' : testResult.success === false ? '#991b1b' : '#92400e',
                    }}>
                      {testResult.message}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button style={{ ...grayBtn, fontSize: 11, padding: '5px 10px' }} onClick={() => { setTestResult(null); testMut.mutate(d.id); }}>
                      {testMut.isPending && testMut.variables === d.id ? 'Testing...' : '\u{1F50D} Test'}
                    </button>
                    <button style={{ ...grayBtn, fontSize: 11, padding: '5px 10px' }} onClick={() => openEdit(d)}>{'\u270F\uFE0F'} Edit</button>
                    {!d.is_default && (
                      <button style={{ ...grayBtn, fontSize: 11, padding: '5px 10px' }} onClick={() => defaultMut.mutate(d.id)}>{'\u2B50'} Set Default</button>
                    )}
                    {delConfirm === d.id ? (
                      <>
                        <button style={{ ...redBtn, fontSize: 11, padding: '5px 10px' }} onClick={() => { deleteMut.mutate(d.id); setDelConfirm(null); }}>Yes, Remove</button>
                        <button style={{ ...grayBtn, fontSize: 11, padding: '5px 10px' }} onClick={() => setDelConfirm(null)}>Cancel</button>
                      </>
                    ) : (
                      <button style={{ ...redBtn, fontSize: 11, padding: '5px 10px' }} onClick={() => setDelConfirm(d.id)}>{'\u{1F5D1}\uFE0F'} Remove</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI Insight */}
          <div style={{ marginTop: 20 }}>
            <AIInsightCard feature="device_configuration" title="AI Hardware Advisor" />
          </div>
        </>
      )}

      {/* ════════════ PRINT BRIDGE TAB ════════════ */}
      {activeTab === 'bridge' && (
        <>
          <div style={{ ...card, marginBottom: 16, borderLeft: bridgeStatus?.is_online ? '4px solid #22c55e' : '4px solid #d1d5db' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 36 }}>{bridgeStatus?.installed ? '\u{1F5A8}' : '\u{1F4E5}'}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>
                  Print Bridge {bridgeStatus?.is_online ? 'Online' : bridgeStatus?.installed ? 'Offline' : 'Not Installed'}
                </div>
                {bridgeStatus?.installed ? (
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    Version {bridgeStatus.version} {'\u00B7'} {bridgeStatus.os_type} {'\u00B7'} Last heartbeat: {bridgeStatus.last_heartbeat ? new Date(bridgeStatus.last_heartbeat).toLocaleTimeString() : 'Never'}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    Download and install the Print Bridge to enable direct thermal printing, cash drawer control, and customer displays.
                  </div>
                )}
              </div>
            </div>
          </div>

          {!bridgeStatus?.installed && (
            <div style={{ ...card, background: '#dbeafe', border: '1px solid #93c5fd', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1e40af', marginBottom: 8 }}>{'\u{1F4E5}'} Download Print Bridge</div>
              <div style={{ fontSize: 13, color: '#1e3a5f', marginBottom: 12 }}>
                The Print Bridge is a small background service (~5MB) that runs on your POS computer. It enables instant silent receipt printing, cash drawer kicks, and customer display updates.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button style={{ ...greenBtn, opacity: 0.6, cursor: 'not-allowed' }}>Windows (.exe)</button>
                <button style={{ ...grayBtn, opacity: 0.6, cursor: 'not-allowed' }}>macOS (.dmg)</button>
                <button style={{ ...grayBtn, opacity: 0.6, cursor: 'not-allowed' }}>Linux (.deb)</button>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8, fontStyle: 'italic' }}>
                Print Bridge downloads will be available once the service is built (Phase 2 of hardware roadmap).
              </div>
            </div>
          )}

          {/* Detected Printers */}
          {bridgeStatus?.printers && bridgeStatus.printers.length > 0 && (
            <div style={{ ...card, marginBottom: 16 }}>
              <div style={sectionLabel}>{'\u{1F5A8}'} Detected Printers</div>
              {bridgeStatus.printers.map((p, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < bridgeStatus.printers.length - 1 ? '1px solid #f3f4f6' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name || p}</div>
                    {p.port && <div style={{ fontSize: 11, color: '#6b7280' }}>Port: {p.port}</div>}
                  </div>
                  <button style={{ ...grayBtn, fontSize: 11, padding: '4px 10px' }}>Configure</button>
                </div>
              ))}
            </div>
          )}

          {/* Detected Serial Ports */}
          {bridgeStatus?.serial_ports && bridgeStatus.serial_ports.length > 0 && (
            <div style={{ ...card }}>
              <div style={sectionLabel}>{'\u{1F50C}'} Serial Ports (for legacy devices)</div>
              {bridgeStatus.serial_ports.map((p, i) => (
                <div key={i} style={{ padding: '6px 0', fontSize: 13, color: '#374151' }}>
                  {p.port || p} {p.description && `\u2014 ${p.description}`}
                </div>
              ))}
            </div>
          )}

          {/* How Print Bridge Works */}
          <div style={{ ...card, marginTop: 16, background: '#f6f8f6' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 8 }}>How the Print Bridge Works</div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
              The Print Bridge is a lightweight local service that runs on your POS computer. When you complete a sale, Pewil sends the receipt data to the bridge at localhost:9100. The bridge converts it to ESC/POS commands and sends them directly to your thermal printer {'\u2014'} instant, silent, no browser dialog. It also handles cash drawer kicks (sends a pulse command via the printer port), customer display updates, and label printing.
            </div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginTop: 8 }}>
              For legacy RS-232 serial devices, use a USB-to-Serial adapter (CH340 or PL2302 chip). The bridge detects the adapter as a COM port and communicates normally {'\u2014'} your software does not care whether the device is USB native or serial.
            </div>
          </div>
        </>
      )}

      {/* ════════════ ZIMRA TAB ════════════ */}
      {activeTab === 'zimra' && (
        <>
          {/* Active Fiscal Device */}
          {zimraDevices.length > 0 ? zimraDevices.map(zd => (
            <div key={zd.id} style={{ ...card, marginBottom: 12, borderLeft: zd.status === 'active' ? '4px solid #1a6b3a' : '4px solid #c97d1a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{zd.device_type === 'VFD' ? 'Virtual Fiscal Device' : 'Physical Fiscal Device'}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Serial: {zd.device_serial}</div>
                </div>
                <div style={{ padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  background: zd.status === 'active' ? '#e8f5ee' : '#fef3c7',
                  color: zd.status === 'active' ? '#1a6b3a' : '#c97d1a',
                }}>{zd.status}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                <div style={{ background: '#f6f8f6', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>VAT Number</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{zd.vat_number}</div>
                </div>
                <div style={{ background: '#f6f8f6', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Fiscal Day</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{zd.current_fiscal_day || 0}</div>
                </div>
                <div style={{ background: '#f6f8f6', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Environment</div>
                  <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{zd.environment || 'sandbox'}</div>
                </div>
                <div style={{ background: '#f6f8f6', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Last Sync</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{zd.last_sync ? new Date(zd.last_sync).toLocaleDateString() : 'Never'}</div>
                </div>
                {zd.certificate_expiry && (
                  <div style={{ background: zd.certificate_expiring_soon ? '#fee2e2' : '#f6f8f6', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: zd.certificate_expiring_soon ? '#c0392b' : '#6b7280', textTransform: 'uppercase' }}>Cert Expiry</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: zd.certificate_expiring_soon ? '#c0392b' : '#111827' }}>{zd.certificate_expiry}</div>
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div style={{ ...card, textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{'\u{1F4CB}'}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No ZIMRA Device Registered</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Register a Virtual Fiscal Device (VFD) to start submitting receipts to ZIMRA FDMS.</div>
              <button style={greenBtn} onClick={() => onTabChange('ZIMRA Fiscal')}>Go to ZIMRA Fiscal Setup</button>
            </div>
          )}

          {/* Fiscal Queue Stats */}
          {fiscalStats && (
            <div style={{ ...card, marginTop: 16 }}>
              <div style={sectionLabel}>{'\u{1F4E8}'} Fiscal Queue</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
                {[
                  { label: 'Pending', val: fiscalStats.pending, color: '#c97d1a' },
                  { label: 'Submitted', val: fiscalStats.submitted, color: '#1a6b3a' },
                  { label: 'Failed', val: fiscalStats.failed, color: '#c0392b' },
                  { label: 'Retrying', val: fiscalStats.retrying, color: '#2563eb' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}>{s.val || 0}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ════════════ SETUP GUIDE TAB ════════════ */}
      {activeTab === 'guide' && (
        <>
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#1a6b3a', marginBottom: 16, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}>Hardware Setup Guide</div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, marginBottom: 16 }}>
              Pewil is a cloud-based SaaS {'\u2014'} you bring your own hardware, and our software configures itself to work with whatever devices you have. This guide explains how to set up each device type.
            </div>

            {/* Section 1: Barcode Scanner */}
            <div style={{ background: '#f6f8f6', borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{'\u{1F4F7}'} Barcode Scanner</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                <strong>USB Scanner (Recommended):</strong> Plug in any USB barcode scanner. Most scanners work in "keyboard wedge" mode {'\u2014'} they type the barcode number into whatever field is focused, just like a keyboard. No configuration needed. Just make sure the POS search field is focused when you scan.
              </div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginTop: 8 }}>
                <strong>Camera Scanner:</strong> If you do not have a hardware scanner, enable "Camera" mode in the scanner settings. Your phone or tablet camera will decode barcodes using the built-in camera. Slower than hardware but works with no extra equipment.
              </div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginTop: 8 }}>
                <strong>Supported formats:</strong> EAN-13, UPC-A, Code 128, QR Code, and more. Leave format on "Auto-detect" unless you have specific needs.
              </div>
            </div>

            {/* Section 2: Receipt Printer */}
            <div style={{ background: '#f6f8f6', borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{'\u{1F5A8}'} Receipt Printer</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                <strong>With Print Bridge (Recommended):</strong> Install the Print Bridge service on your POS computer. It enables instant, silent receipt printing with no browser dialog. Supports Epson TM series, Star TSP, Bixolon, and any ESC/POS compatible thermal printer (58mm or 80mm paper).
              </div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginTop: 8 }}>
                <strong>Without Print Bridge:</strong> Pewil falls back to browser printing (Ctrl+P). This works but shows a print dialog each time and is slower. Good for starting out, but install the Print Bridge for a professional setup.
              </div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginTop: 8 }}>
                <strong>Legacy serial printers:</strong> If you have an older RS-232 serial printer, use a USB-to-Serial adapter (CH340 or PL2302 chip, costs $3-5). Plug the adapter into USB, connect the serial cable, and the Print Bridge will detect it as a COM port.
              </div>
            </div>

            {/* Section 3: Cash Drawer */}
            <div style={{ background: '#f6f8f6', borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{'\u{1F4B0}'} Cash Drawer</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                Cash drawers connect to the receipt printer via an RJ11 cable (the small phone-style plug on the back of most thermal printers). When the Print Bridge sends a receipt, it also sends a "kick" command to open the drawer automatically after cash payments. No separate configuration needed {'\u2014'} just plug the drawer into the printer.
              </div>
            </div>

            {/* Section 4: Weighing Scale */}
            <div style={{ background: '#f6f8f6', borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{'\u2696\uFE0F'} Weighing Scale</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                <strong>USB HID Scale:</strong> Many modern scales connect via USB and report weights through the standard HID protocol. Chrome can read these directly through the WebHID API with no additional software.
              </div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginTop: 8 }}>
                <strong>Serial Scale:</strong> Older scales with RS-232 ports need the Print Bridge + USB-to-Serial adapter. The bridge reads weight data from the COM port and makes it available to the POS.
              </div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginTop: 8 }}>
                <strong>No scale?</strong> The POS allows manual weight entry for by-weight products. Cashier types the weight on the number pad.
              </div>
            </div>

            {/* Section 5: Customer Display */}
            <div style={{ background: '#f6f8f6', borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{'\u{1F4FA}'} Customer Display (VFD Pole)</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                Customer-facing pole displays show the current item price and sale total. They connect via serial port (RS-232) or USB. The Print Bridge sends text commands to update the display during each scan and at the payment step. Add a device profile with type "Customer Display" and configure the COM port.
              </div>
            </div>

            {/* Section 6: Label Printer */}
            <div style={{ background: '#f6f8f6', borderRadius: 10, padding: 16, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{'\u{1F3F7}\uFE0F'} Label Printer</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                For shelf labels and product barcode stickers, add a label printer profile. Supports Zebra (ZPL), TSC (TSPL), and generic EPL printers. The Print Bridge sends label commands. Configure paper width (usually 4 inch for shelf labels) and the driver profile matching your printer brand.
              </div>
            </div>

            {/* Section 7: ZIMRA */}
            <div style={{ background: '#e8f5ee', borderRadius: 10, padding: 16, marginBottom: 12, border: '1px solid #1a6b3a' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#1a6b3a' }}>{'\u{1F4CB}'} ZIMRA Fiscal Compliance</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                ZIMRA requires every sale to be reported via the Fiscal Device Management System (FDMS). Pewil uses Virtual Fiscal Device (VFD) mode {'\u2014'} this is 100% software, no physical fiscal device needed. Go to the ZIMRA Fiscal tab to register your VFD with your VAT number. Once active, every sale is automatically submitted to FDMS with a fiscal receipt number and QR code. If ZIMRA's API is temporarily down, receipts are queued and retried automatically.
              </div>
            </div>

            {/* Section 8: Offline */}
            <div style={{ background: '#fff7ed', borderRadius: 10, padding: 16, border: '1px solid #c97d1a' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#c97d1a' }}>{'\u{1F4F6}'} What Happens When Internet Goes Down?</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                Pewil is designed for Zimbabwe's connectivity realities. When your internet drops: sales are saved locally on the device and automatically sync when the connection returns. Receipts still print (the Print Bridge runs locally). ZIMRA submissions are queued and retried. The POS never blocks a sale due to network issues. An orange "Offline Mode" banner appears so the cashier knows, but operations continue normally.
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════════ ADD/EDIT DEVICE MODAL ════════════ */}
      {showAddModal && (
        <div style={overlay} onClick={() => { setShowAddModal(false); setEditDevice(null); }}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{editDevice ? 'Edit Device' : 'Add New Device'}</div>
              <button style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }} onClick={() => { setShowAddModal(false); setEditDevice(null); }}>{'\u2715'}</button>
            </div>

            {/* Device Type */}
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Device Type</label>
            <select value={form.device_type} onChange={e => setForm({ ...form, device_type: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e3e8e4', fontSize: 13, marginBottom: 14, fontFamily: 'Inter, sans-serif' }}>
              <option value="receipt_printer">Receipt Printer</option>
              <option value="barcode_scanner">Barcode Scanner</option>
              <option value="cash_drawer">Cash Drawer</option>
              <option value="scale">Weighing Scale</option>
              <option value="customer_display">Customer Display</option>
              <option value="label_printer">Label Printer</option>
            </select>

            {/* Device Name */}
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Device Name</label>
            <input type="text" placeholder="e.g. Front Counter Printer" value={form.device_name} onChange={e => setForm({ ...form, device_name: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e3e8e4', fontSize: 13, marginBottom: 14, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }} />

            {/* Connection Type */}
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Connection Type</label>
            <select value={form.connection_type} onChange={e => setForm({ ...form, connection_type: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e3e8e4', fontSize: 13, marginBottom: 14, fontFamily: 'Inter, sans-serif' }}>
              <option value="print_bridge">Print Bridge Service</option>
              <option value="usb_hid">USB HID (Plug & Play)</option>
              <option value="serial">Serial / COM Port</option>
              <option value="network">Network (IP/TCP)</option>
              <option value="bluetooth">Bluetooth</option>
              <option value="keyboard_wedge">Keyboard Wedge</option>
              <option value="camera">Camera (Phone/Tablet)</option>
            </select>

            {/* Driver Profile */}
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Driver Profile</label>
            <select value={form.driver_profile} onChange={e => setForm({ ...form, driver_profile: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e3e8e4', fontSize: 13, marginBottom: 14, fontFamily: 'Inter, sans-serif' }}>
              <option value="generic_escpos">Generic ESC/POS</option>
              <option value="epson_tm">Epson TM Series</option>
              <option value="star_tsp">Star TSP Series</option>
              <option value="bixolon">Bixolon SRP Series</option>
              <option value="zebra_zpl">Zebra ZPL (Labels)</option>
              <option value="cas_scale">CAS Scale Protocol</option>
              <option value="hid_scale">USB HID Scale</option>
              <option value="custom">Custom / Other</option>
            </select>

            {/* Paper Width (for printers) */}
            {(form.device_type === 'receipt_printer' || form.device_type === 'label_printer') && (
              <>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Paper Width</label>
                <select value={form.paper_width} onChange={e => setForm({ ...form, paper_width: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e3e8e4', fontSize: 13, marginBottom: 14, fontFamily: 'Inter, sans-serif' }}>
                  <option value="58mm">58mm (Mini Thermal)</option>
                  <option value="80mm">80mm (Standard Thermal)</option>
                  <option value="4inch">4 inch (Label)</option>
                </select>
              </>
            )}

            {/* Network config */}
            {form.connection_type === 'network' && (
              <>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>IP Address</label>
                <input type="text" placeholder="192.168.1.100" value={form.connection_config.ip || ''} onChange={e => setForm({ ...form, connection_config: { ...form.connection_config, ip: e.target.value } })} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e3e8e4', fontSize: 13, marginBottom: 14, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }} />
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Port</label>
                <input type="text" placeholder="9100" value={form.connection_config.port || ''} onChange={e => setForm({ ...form, connection_config: { ...form.connection_config, port: e.target.value } })} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e3e8e4', fontSize: 13, marginBottom: 14, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }} />
              </>
            )}

            {/* Serial config */}
            {form.connection_type === 'serial' && (
              <>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>COM Port</label>
                <input type="text" placeholder="COM3 or /dev/ttyUSB0" value={form.connection_config.com_port || ''} onChange={e => setForm({ ...form, connection_config: { ...form.connection_config, com_port: e.target.value } })} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e3e8e4', fontSize: 13, marginBottom: 14, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }} />
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Baud Rate</label>
                <select value={form.connection_config.baud_rate || '9600'} onChange={e => setForm({ ...form, connection_config: { ...form.connection_config, baud_rate: e.target.value } })} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e3e8e4', fontSize: 13, marginBottom: 14, fontFamily: 'Inter, sans-serif' }}>
                  <option value="9600">9600</option>
                  <option value="19200">19200</option>
                  <option value="38400">38400</option>
                  <option value="115200">115200</option>
                </select>
              </>
            )}

            {/* Save */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button style={{ ...greenBtn, flex: 1 }} onClick={handleSave} disabled={!form.device_name || createMut.isPending || updateMut.isPending}>
                {createMut.isPending || updateMut.isPending ? 'Saving...' : editDevice ? 'Update Device' : 'Add Device'}
              </button>
              <button style={grayBtn} onClick={() => { setShowAddModal(false); setEditDevice(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
