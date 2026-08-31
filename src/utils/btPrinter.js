/**
 * btPrinter.js — get ESC/POS bytes onto a Bluetooth thermal printer.
 *
 * Two roads, tried in order, because the tills here are cheap Android
 * phones and the printers are cheap Bluetooth thermals (2026-08-31):
 *
 *  1. WEB BLUETOOTH (Chrome/Edge, Android + desktop). Works for BLE
 *     printers — most 58mm units sold since ~2018 advertise a serial-ish
 *     GATT service. The cashier picks the printer ONCE in the browser's
 *     chooser; after that this module reconnects silently. No app to
 *     install. iOS Safari has no Web Bluetooth — road 2 or the browser
 *     print dialog.
 *
 *  2. RAWBT (Android). Classic-Bluetooth-only (SPP) printers are invisible
 *     to Web Bluetooth. RawBT is the app every till here already knows: we
 *     hand it the same bytes via its rawbt:base64, URL scheme and it does
 *     the Bluetooth. If it is not installed, Android shows nothing happens
 *     — so callers surface a message with the Play Store name.
 *
 * Chunked writes: BLE payloads are small (20 bytes on old stacks). 100-byte
 * chunks with a short gap prints a receipt in ~2s and never overruns the
 * printer's buffer. writeValueWithoutResponse where offered, writeValue
 * otherwise.
 */

// GATT services the common chipsets expose (printer-as-serial):
const KNOWN = [
  { service: '000018f0-0000-1000-8000-00805f9b34fb', write: '00002af1-0000-1000-8000-00805f9b34fb' },
  { service: '0000ffe0-0000-1000-8000-00805f9b34fb', write: '0000ffe1-0000-1000-8000-00805f9b34fb' },
  { service: '0000ff00-0000-1000-8000-00805f9b34fb', write: '0000ff02-0000-1000-8000-00805f9b34fb' },
  { service: '49535343-fe7d-4ae5-8fa9-9fafd205e455', write: '49535343-8841-43f4-a8d4-ecbe34729bb3' },
  { service: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', write: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f' },
];

const LAST_KEY = 'pewil-bt-printer-name';

let _device = null;
let _char = null;

export function isWebBluetoothSupported() {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth;
}

export function isAndroid() {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent || '');
}

export function lastPrinterName() {
  try { return localStorage.getItem(LAST_KEY) || ''; } catch (_) { return ''; }
}

function rememberName(name) {
  try { localStorage.setItem(LAST_KEY, name || ''); } catch (_) {}
}

async function findWritable(server) {
  // Known pairs first — exact and fast.
  for (const k of KNOWN) {
    try {
      const svc = await server.getPrimaryService(k.service);
      const ch = await svc.getCharacteristic(k.write);
      if (ch.properties.write || ch.properties.writeWithoutResponse) return ch;
    } catch (_) { /* not this chipset */ }
  }
  // Fallback: first writable characteristic anywhere.
  try {
    const services = await server.getPrimaryServices();
    for (const svc of services) {
      const chars = await svc.getCharacteristics();
      for (const ch of chars) {
        if (ch.properties.write || ch.properties.writeWithoutResponse) return ch;
      }
    }
  } catch (_) { /* fall through */ }
  return null;
}

async function open(device) {
  const server = await device.gatt.connect();
  const ch = await findWritable(server);
  if (!ch) {
    try { device.gatt.disconnect(); } catch (_) {}
    const err = new Error('Connected, but this device does not accept print data. It may be a classic-Bluetooth printer — use RawBT.');
    err.code = 'NO_WRITE_CHAR';
    throw err;
  }
  _device = device;
  _char = ch;
  rememberName(device.name || 'Bluetooth printer');
  device.addEventListener('gattserverdisconnected', () => {
    if (_device === device) _char = null;
  });
  return { device, char: ch };
}

/**
 * Show the browser's chooser and connect. MUST be called from a click.
 */
export async function pairBluetoothPrinter() {
  if (!isWebBluetoothSupported()) {
    const err = new Error('This browser has no Web Bluetooth. Use Chrome on Android or desktop, or print through RawBT.');
    err.code = 'NOT_SUPPORTED';
    throw err;
  }
  const device = await navigator.bluetooth.requestDevice({
    // Most cheap printers do not ADVERTISE their serial service, so a
    // service filter would show an empty chooser. Show everything and ask
    // for the known services as optional so we may open them after pairing.
    acceptAllDevices: true,
    optionalServices: KNOWN.map((k) => k.service),
  });
  return open(device);
}

/** Reconnect to the device paired earlier in this page session, if any. */
async function ensureConnected() {
  if (_char && _device?.gatt?.connected) return _char;
  if (_device) {
    try { return (await open(_device)).char; } catch (_) { /* fall through */ }
  }
  // Chrome behind a flag can list permitted devices; use it when present so
  // a reload does not need the chooser again.
  try {
    if (navigator.bluetooth?.getDevices) {
      const devices = await navigator.bluetooth.getDevices();
      const wanted = lastPrinterName();
      const match = devices.find((d) => !wanted || d.name === wanted) || devices[0];
      if (match) return (await open(match)).char;
    }
  } catch (_) { /* chooser it is */ }
  return null;
}

/**
 * Print bytes over Web Bluetooth. Pairs (chooser) if nothing is connected.
 * Throws with a human message when it cannot; callers decide the fallback.
 */
export async function printViaWebBluetooth(bytes) {
  let ch = await ensureConnected();
  if (!ch) ch = (await pairBluetoothPrinter()).char;
  const CHUNK = 100;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.slice(i, i + CHUNK);
    if (ch.properties.writeWithoutResponse && ch.writeValueWithoutResponse) {
      await ch.writeValueWithoutResponse(slice);
      // A breath between packets: the printer's serial buffer is tiny.
      await new Promise((r) => setTimeout(r, 20));
    } else {
      await ch.writeValue(slice);   // with-response paces itself
    }
  }
  return { via: 'web-bluetooth', printer: _device?.name || '' };
}

/**
 * Hand the bytes to RawBT (Android). Resolves immediately — RawBT gives no
 * result back; if it is not installed nothing visible happens, so callers
 * should tell the user what to install when they report a blank.
 */
export function printViaRawBT(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  window.location.href = 'rawbt:base64,' + b64;
  return { via: 'rawbt' };
}

/**
 * The one call sites use: try Web Bluetooth, fall back to RawBT on Android.
 * Returns { via, printer? }. Throws only when NO road exists — the message
 * is written for a cashier, show it verbatim.
 */
export async function printBytes(bytes) {
  if (isWebBluetoothSupported()) {
    try {
      return await printViaWebBluetooth(bytes);
    } catch (e) {
      if (e && (e.name === 'NotFoundError' || e.code === 'NOT_SUPPORTED')) {
        // Chooser cancelled, or no BLE — try the RawBT road on Android.
        if (isAndroid()) return printViaRawBT(bytes);
        throw new Error('No Bluetooth printer was chosen. Pick it in the chooser, or use the normal Print button.');
      }
      if (isAndroid() && e && e.code === 'NO_WRITE_CHAR') return printViaRawBT(bytes);
      throw new Error(
        (e && e.message ? e.message + ' ' : '')
        + 'If the printer is classic Bluetooth, install the RawBT app and try again.'
      );
    }
  }
  if (isAndroid()) return printViaRawBT(bytes);
  const err = new Error('This browser cannot reach Bluetooth printers. Use Chrome, or print with the normal Print button.');
  err.code = 'NOT_SUPPORTED';
  throw err;
}

export default {
  isWebBluetoothSupported, isAndroid, lastPrinterName,
  pairBluetoothPrinter, printViaWebBluetooth, printViaRawBT, printBytes,
};
