/**
 * escposReceipt.js — build raw ESC/POS bytes for a till receipt.
 *
 * WHY BYTES, NOT HTML: the receipts printed by window.print() go through the
 * OS print system, which Bluetooth ESC/POS thermal printers (the standard
 * till printer in Zimbabwe — 58mm, R200 from town) are not part of. To reach
 * them the app must speak the printer's own language: ESC/POS command bytes,
 * delivered over Web Bluetooth or handed to RawBT. This module builds those
 * bytes; utils/btPrinter.js delivers them.
 *
 * Scope is deliberately narrow and battle-tested:
 *   - ASCII only. The cheap clones ship dozens of code pages and no two
 *     agree; non-ASCII is transliterated to its nearest ASCII or dropped,
 *     which beats a receipt full of 'Ã©'.
 *   - Native QR (GS ( k). Every mainstream chipset since ~2015 supports it;
 *     a printer that does not simply skips those bytes — and the fiscal
 *     verification CODE is always printed as text right below, so the
 *     legally required information survives even then.
 *   - 32 or 48 columns (58mm / 80mm paper).
 */

const ESC = 0x1b;
const GS = 0x1d;

const INIT = [ESC, 0x40];
const ALIGN_LEFT = [ESC, 0x61, 0];
const ALIGN_CENTER = [ESC, 0x61, 1];
const BOLD_ON = [ESC, 0x45, 1];
const BOLD_OFF = [ESC, 0x45, 0];
const SIZE_NORMAL = [GS, 0x21, 0x00];
const SIZE_DOUBLE = [GS, 0x21, 0x11];   // double width + height
const FEED = (n) => [ESC, 0x64, n];
// Partial cut with feed. Printers without a cutter ignore it.
const CUT = [GS, 0x56, 66, 3];

/** Best-effort ASCII: strip diacritics, map a few common symbols, drop the rest. */
export function toAscii(s) {
  return String(s == null ? '' : s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/·/g, '.')
    .replace(/[^\x20-\x7e]/g, '')
    .trim();
}

function encode(s) {
  const out = [];
  const a = toAscii(s);
  for (let i = 0; i < a.length; i += 1) out.push(a.charCodeAt(i));
  return out;
}

/** "LEFT........RIGHT" padded to `width`; left is truncated before right. */
function padBetween(left, right, width) {
  const l = toAscii(left);
  const r = toAscii(right);
  const space = width - r.length;
  const lt = l.length > space - 1 ? l.slice(0, Math.max(0, space - 1)) : l;
  return lt + ' '.repeat(Math.max(1, width - lt.length - r.length)) + r;
}

function wrap(text, width) {
  const words = toAscii(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= width) cur = (cur + ' ' + w).trim();
    else { if (cur) lines.push(cur); cur = w.slice(0, width); }
  }
  if (cur) lines.push(cur);
  return lines;
}

function qrBytes(text) {
  const data = encode(text);
  if (!data.length) return [];
  const store = data.length + 3;
  return [
    GS, 0x28, 0x6b, 4, 0, 49, 65, 50, 0,               // model 2
    GS, 0x28, 0x6b, 3, 0, 49, 67, 6,                   // module size 6
    GS, 0x28, 0x6b, 3, 0, 49, 69, 49,                  // ECC level M
    GS, 0x28, 0x6b, store & 0xff, (store >> 8) & 0xff, 49, 80, 48, ...data,
    GS, 0x28, 0x6b, 3, 0, 49, 81, 48,                  // print it
  ];
}

const money = (n) => '$' + (parseFloat(n) || 0).toFixed(2);

/**
 * Build a full receipt.
 *
 * @param {object} r  — see the call site in POS.js ReceiptModal for shape.
 * @param {object} opts { width: 32|48, drawerKick: bool }
 * @returns Uint8Array of ESC/POS bytes
 */
export function buildReceiptBytes(r, { width = 32, drawerKick = false } = {}) {
  const out = [];
  const push = (...chunks) => chunks.forEach((c) => out.push(...c));
  const line = (s = '') => push(encode(s), [0x0a]);
  const rule = () => line('-'.repeat(width));

  push(INIT);
  if (drawerKick) push([ESC, 0x70, 0, 25, 250]);   // pulse pin 2 — fires the drawer

  push(ALIGN_CENTER, SIZE_DOUBLE, BOLD_ON);
  line(r.storeName || 'RECEIPT');
  push(SIZE_NORMAL, BOLD_OFF);
  for (const l of wrap(r.addr || '', width)) line(l);
  if (r.phone) line(toAscii(r.phone));
  if (r.vatNo || r.tinNo) {
    line([r.vatNo ? `VAT ${r.vatNo}` : '', r.tinNo ? `TIN ${r.tinNo}` : ''].filter(Boolean).join('  '));
  }
  line();
  push(BOLD_ON);
  line(r.isFiscal ? 'FISCAL TAX INVOICE' : 'RECEIPT');
  push(BOLD_OFF, ALIGN_LEFT);
  rule();
  line(padBetween(`No ${r.receiptNo || ''}`, r.date || '', width));
  if (r.cashier) line(`Cashier: ${toAscii(r.cashier)}`);
  rule();

  for (const it of (r.items || [])) {
    const qty = parseFloat(it.qty || it.quantity || 1) || 1;
    const unit = parseFloat(it.unit_price != null ? it.unit_price : (it.total || 0) / qty) || 0;
    const name = it.product_name || it.name || 'Item';
    const tax = it.taxCode ? ` ${it.taxCode}` : '';
    line(padBetween(name, money(it.total != null ? it.total : qty * unit) + tax, width));
    line(`  ${qty} x ${money(unit)}`);
  }
  rule();

  line(padBetween('Subtotal', money(r.subtotal), width));
  if (parseFloat(r.discount) > 0) line(padBetween('Discount', '-' + money(r.discount), width));
  if (parseFloat(r.tax) > 0) line(padBetween('VAT', money(r.tax), width));
  push(BOLD_ON, SIZE_DOUBLE);
  line(padBetween('TOTAL', money(r.total), Math.floor(width / 2)));
  push(SIZE_NORMAL, BOLD_OFF);
  line(padBetween(r.payLabel || 'Cash', money(r.tendered != null ? r.tendered : r.total), width));
  if (parseFloat(r.change) > 0) line(padBetween('Change', money(r.change), width));
  rule();

  const f = r.fiscal || {};
  if (f.vcode) {
    push(ALIGN_CENTER);
    line(`${f.authority || 'ZIMRA'} FISCALISED`);
    if (f.qrText) { push(qrBytes(f.qrText)); line(); }
    line('Verification code');
    push(BOLD_ON); line(f.vcode); push(BOLD_OFF);
    if (f.fday !== '' && f.fday != null) line(`Day ${f.fday}  Global No ${f.gno != null ? f.gno : ''}`);
    line(`Verify: fdms.zimra.co.zw`);
    push(ALIGN_LEFT);
    rule();
  } else if (r.fiscalPending) {
    push(ALIGN_CENTER);
    line(`FISCAL PENDING - will sync to ${f.authority || 'ZIMRA'}`);
    push(ALIGN_LEFT);
    rule();
  }

  push(ALIGN_CENTER);
  for (const l of wrap(r.footer || 'Thank you!', width)) line(l);
  push(FEED(4), CUT);
  return Uint8Array.from(out);
}

/** A short self-identifying test print, for "pair & test" buttons. */
export function buildTestBytes(label = 'PEWIL PRINTER TEST') {
  const out = [];
  out.push(...INIT, ...ALIGN_CENTER, ...BOLD_ON, ...encode(label), 0x0a, ...BOLD_OFF);
  out.push(...encode(new Date().toLocaleString()), 0x0a);
  out.push(...encode('If you can read this,'), 0x0a);
  out.push(...encode('the printer is connected.'), 0x0a);
  out.push(...FEED(3), ...CUT);
  return Uint8Array.from(out);
}

export default { buildReceiptBytes, buildTestBytes, toAscii };
