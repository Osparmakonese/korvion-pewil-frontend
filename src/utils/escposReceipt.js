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
 * THE LAYOUT (rewritten 2026-10-31, "Ledger")
 *
 * The slip is a ledger: three columns that never move — item, quantity at
 * its unit price, amount — under a column header, with the parts the eye
 * must land on set in white-on-black. What was there before had the unit
 * price trailing each item name, so it sat at a different place on every
 * line and the middle of the receipt read as a mess.
 *
 * Every column is computed from the paper width, so 58mm (32 columns) and
 * 80mm (48 columns) are the same design, not two hand-tuned ones. On the
 * wider roll the extra characters all go to the item name, which is where
 * they are worth something: few names need shortening at 48 columns.
 *
 * Rules this file now keeps, each one a fault on a real slip:
 *   - a word is never split: 'Granny Hwanda Grocery Shop' wrapped as
 *     'Granny Hwanda Gr / ocery Shop' on a customer's receipt;
 *   - the receipt number and the date get a line each, so neither can be
 *     pushed onto the next line by the other;
 *   - tax letters and VAT lines print only for a VAT-registered shop;
 *   - no 'Subtotal' line that just repeats the total;
 *   - a price keeps the decimal places it has, the cash column is cents.
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
// One step up, not two. Double height alone for the shop name and double
// width alone for the total: both read from across the counter without the
// shouty block that double-width-AND-height gives (2026-10-31).
const SIZE_TALL = [GS, 0x21, 0x01];     // double height, normal width
const SIZE_WIDE = [GS, 0x21, 0x10];     // double width, normal height
// NO WHITE-ON-BLACK (2026-10-31). A reversed bar is a solid block of
// burned paper: it is the slowest thing a thermal head does, it wears the
// head, and on a till printing hundreds of slips a day the shop pays for it
// in rolls and in printers. The headings earn their weight with bold text
// and the rules that are already on the slip.
const FEED = (n) => [ESC, 0x64, n];
// Partial cut with feed. Printers without a cutter ignore it.
const CUT = [GS, 0x56, 66, 3];

/** Best-effort ASCII: strip diacritics, map a few common symbols, drop the
 *  rest. Spaces are KEPT exactly as given — see toAscii below. */
function toAsciiRaw(s) {
  return String(s == null ? '' : s)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/·/g, '.')
    .replace(/[^\x20-\x7e]/g, '');
}

/** The same, trimmed — for a field value such as a shop name or a phone. */
export function toAscii(s) {
  return toAsciiRaw(s).trim();
}

function encode(s) {
  // NOT toAscii: trimming here quietly ate every bit of layout this file
  // builds — the padding that centres a heading inside its black bar, the
  // spaces that hold a column, the indent under a line item. The bar came
  // out as a short black stub and the columns drifted (2026-10-31).
  const out = [];
  const a = toAsciiRaw(s);
  for (let i = 0; i < a.length; i += 1) out.push(a.charCodeAt(i));
  return out;
}

/** "LEFT........RIGHT" padded to `width`; left is truncated before right. */
function padBetween(left, right, width) {
  const l = toAscii(left);
  const r = toAscii(right);
  const room = width - r.length - 1;
  const lt = l.length > room ? l.slice(0, Math.max(0, room - 1)) + '.' : l;
  return lt + ' '.repeat(Math.max(1, width - lt.length - r.length)) + r;
}

/**
 * Wrap on spaces. A word that would have fitted on the next line is never
 * split — that is what turned a shop called 'Granny Hwanda Grocery Shop'
 * into 'Granny Hwanda Gr / ocery Shop' on every receipt it printed. Only a
 * single word longer than the whole line is broken, because it has to be.
 */
function wrap(text, width) {
  const out = [];
  let cur = '';
  for (let word of toAscii(text).split(/\s+/).filter(Boolean)) {
    while (word.length > width) {
      if (cur) { out.push(cur); cur = ''; }
      out.push(word.slice(0, width));
      word = word.slice(width);
    }
    if (!cur) cur = word;
    else if (cur.length + 1 + word.length <= width) cur += ' ' + word;
    else { out.push(cur); cur = word; }
  }
  if (cur) out.push(cur);
  return out;
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

// Cash, to the cent, with no currency sign: the sign would repeat down
// every line of a column that is already labelled, and on 32 characters
// that is a character better spent on the product name. The currency is
// named once, in the heading bar (2026-10-31).
const mny = (n) => (parseFloat(n) || 0).toFixed(2);
// A per-unit price can carry up to nine places (a case price over its
// singles, a price per kilogram). Printing it rounded to the cent would put
// a line on the slip the customer cannot reproduce: 18 x $0.54 is not
// $9.80. Print the price as it is, cash at the line as cash (2026-10-05).
const unitMoney = (n) => {
  const v = parseFloat(n) || 0;
  const s = v.toFixed(9).replace(/0+$/, '');
  return s.endsWith('.') ? v.toFixed(2)
    : (s.split('.')[1] || '').length < 2 ? v.toFixed(2) : s;
};

/**
 * Build a full receipt — the "Ledger" layout.
 *
 * @param {object} r     receipt fields; see utils/printReceipt.js
 * @param {object} opts  { width: 32|48, drawerKick: bool }
 * @returns Uint8Array of ESC/POS bytes
 */
export function buildReceiptBytes(r, { width = 32, drawerKick = false } = {}) {
  const W = width >= 42 ? 48 : 32;          // 80mm or 58mm, nothing between
  const out = [];
  const push = (...chunks) => chunks.forEach((c) => out.push(...c));
  const line = (s = '') => push(encode(s), [0x0a]);
  const rule = (ch = '-') => line(ch.repeat(W));
  const bold = (s) => { push(BOLD_ON); line(s); push(BOLD_OFF); };
  const centre = (s) => { push(ALIGN_CENTER); line(s); push(ALIGN_LEFT); };
  // A heading: centred and bold, between the rules the slip already uses.
  const heading = (s) => { push(ALIGN_CENTER, BOLD_ON); line(toAscii(s)); push(BOLD_OFF, ALIGN_LEFT); };

  const items = r.items || [];
  const vatShop = parseFloat(r.tax) > 0;
  const money = (n) => mny(n);
  const currency = toAscii(r.currency || 'USD').toUpperCase() || 'USD';

  // ── the three columns, measured from the paper ──────────────────────
  // amount holds '1234.56' plus the tax letter on a VAT invoice; qty@each
  // holds '24@0.25'. Everything left over goes to the item name, which is
  // why 80mm paper barely shortens a name and 58mm sometimes must.
  const AW = vatShop ? 9 : 7;
  const QW = 8;
  const NW = W - QW - 1 - AW - 1;
  const row = (name, qtyPrice, amount) =>
    `${toAscii(name).padEnd(NW).slice(0, NW)} ${String(qtyPrice).padStart(QW)} `
    + `${String(amount).padStart(AW)}`;
  const shorten = (name) => {
    const t = toAscii(name);
    return t.length <= NW ? t : t.slice(0, NW - 1).trimEnd() + '.';
  };

  push(INIT);
  if (drawerKick) push([ESC, 0x70, 0, 25, 250]);   // pulse pin 2 — fires the drawer

  // ── who the shop is ──────────────────────────────────────────────────
  push(ALIGN_CENTER, SIZE_TALL, BOLD_ON);
  for (const l of wrap(r.storeName || 'RECEIPT', W)) line(l);
  push(SIZE_NORMAL, BOLD_OFF);
  for (const l of wrap(r.addr || '', W)) line(l);
  if (r.phone) line(toAscii(r.phone));
  if (r.vatNo || r.tinNo) {
    line([r.vatNo ? `VAT ${r.vatNo}` : '', r.tinNo ? `TIN ${r.tinNo}` : '']
      .filter(Boolean).join('  '));
  }
  push(ALIGN_LEFT);
  line();

  // ── what this piece of paper is ──────────────────────────────────────
  rule();
  heading(`${vatShop ? 'TAX INVOICE' : 'SALE RECEIPT'} - ${currency}`);
  // A slip run off again later says so on its face: the original is what
  // the customer was handed, and a copy that looks identical can be
  // presented as a second sale.
  if (r.isReprint) heading('* COPY OF RECEIPT *');
  rule();
  line(padBetween(r.receiptNo ? `No ${r.receiptNo}` : '', r.date || '', W));
  if (r.cashier || r.till) {
    line(padBetween(r.till ? `Till ${toAscii(r.till)}` : '',
                    r.cashier ? toAscii(r.cashier) : '', W));
  }
  line();

  // ── the basket ───────────────────────────────────────────────────────
  bold(row('ITEM', 'QTY@EACH', vatShop ? 'AMT T' : 'AMOUNT'));
  rule('=');
  let units = 0;
  for (const it of items) {
    const qty = parseFloat(it.qty != null ? it.qty : it.quantity) || 1;
    const unit = parseFloat(it.unit_price != null
      ? it.unit_price : (it.total || 0) / qty) || 0;
    const amount = money(it.total != null ? it.total : qty * unit)
      + (vatShop ? ` ${it.taxCode || 'A'}` : '');
    const priced = `${qty}@${unitMoney(unit)}`;
    units += qty;
    // A price can carry nine decimal places (a case price over its
    // singles, a price per kilogram) and would run straight through the
    // amount column. It is never rounded to make it fit: the quantity
    // stays in the column, and the exact price goes on its own line under
    // the item, where the customer can still check the arithmetic.
    if (priced.length <= QW) {
      line(row(shorten(it.product_name || it.name || 'Item'), priced, amount));
    } else {
      line(row(shorten(it.product_name || it.name || 'Item'), String(qty), amount));
      line(`  @ ${unitMoney(unit)} each`);
    }
  }
  rule('=');

  // ── what it comes to ─────────────────────────────────────────────────
  const lineCount = `${items.length} line${items.length === 1 ? '' : 's'}`;
  const unitCount = `${Number.isInteger(units) ? units : units.toFixed(3)} units`;
  line(padBetween(`${lineCount}  ${unitCount}`, money(r.subtotal), W));
  if (parseFloat(r.discount) > 0) {
    line(padBetween('Discount', '-' + money(r.discount), W));
  }
  // Double WIDTH only, bold: as wide as the paper, and the only thing on
  // the slip set that large, so the eye lands on it without a black bar.
  push(SIZE_WIDE, BOLD_ON);
  line(padBetween('TOTAL', money(r.total), Math.floor(W / 2)));
  push(BOLD_OFF, SIZE_NORMAL);
  line(padBetween(r.payLabel || 'CASH',
                  money(r.tendered != null ? r.tendered : r.total), W));
  if (parseFloat(r.change) > 0) bold(padBetween('CHANGE', money(r.change), W));
  if (vatShop) {
    const rate = r.vatRate != null ? r.vatRate : 15;
    line(padBetween(`Incl VAT @ ${rate}%`, money(r.tax), W));
    line(`T: A = VAT ${rate}%   B = zero rated`);
  }
  line();

  // ── the authority's part ─────────────────────────────────────────────
  const f = r.fiscal || {};
  if (f.vcode) {
    rule();
    heading(`${f.authority || 'ZIMRA'} FISCALISED`);
    if (f.qrText) { push(ALIGN_CENTER, qrBytes(f.qrText), ALIGN_LEFT); line(); }
    bold(padBetween('Verification', f.vcode, W));
    if (f.fday !== '' && f.fday != null) {
      line(padBetween('Fiscal day', String(f.fday), W));
    }
    if (f.gno !== '' && f.gno != null) {
      line(padBetween('Global no', String(f.gno), W));
    }
    centre('fdms.zimra.co.zw');
    line();
  } else if (r.fiscalPending) {
    heading(`PENDING - WILL SYNC TO ${f.authority || 'ZIMRA'}`);
    line();
  }

  // ── the shop's last word ─────────────────────────────────────────────
  push(ALIGN_CENTER);
  for (const l of wrap(r.footer || 'Thank you!', W)) line(l);
  line('Powered by Pewil');
  push(ALIGN_LEFT, FEED(4), CUT);
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
