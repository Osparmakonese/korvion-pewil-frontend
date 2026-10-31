/**
 * printReceipt.js — one Bluetooth print path for every receipt screen.
 *
 * WHY THIS FILE EXISTS (2026-10-31)
 *
 * Bluetooth printing was written into the desktop ReceiptModal and nowhere
 * else. The phone till does not show that modal: at mobile widths the POS
 * renders MobileSaleComplete, whose only print button opened the browser's
 * print dialog — the Android page-printer sheet, offering A4 printers and
 * "Save as PDF", which cannot reach a 58mm Bluetooth thermal at all. So on
 * every phone till the receipt could not be printed, and the cashier was
 * looking at a dialog about A4 paper.
 *
 * The ESC/POS bytes, the fiscal block and the paper width are the same
 * wherever the receipt is shown, so they live here and both screens call
 * `printReceiptBluetooth`. Anything added to a receipt must be added once,
 * here, or the phone goes quietly out of step with the desktop again.
 */
import { buildReceiptBytes } from './escposReceipt';
import { printBytes as btPrintBytes, isPrinterReady, lastPrinterName } from './btPrinter';
import getLocalization from './localization';

/** The merchant's receipt template, whatever shape the API returned it in. */
export function templateFrom(tmplData) {
  if (Array.isArray(tmplData)) return tmplData[0] || null;
  return (tmplData && tmplData.results && tmplData.results[0]) || null;
}

/** ESC/POS bytes for this sale, branded and fiscalised like the slip. */
export function receiptBytes(receipt, template) {
  const LOC = getLocalization();
  const FAUTH = LOC.authority_short || 'ZIMRA';
  const items = receipt.items_data || receipt.items || [];
  const taxCodeFor = (it) => ((it && it.is_vat_exempt) ? 'B' : 'A');
  const fiscalised = !!receipt.fiscal_submitted;
  // Only a sale that will actually go to the authority says "pending".
  const qrTextExpected = receipt.fiscal_submitted === false
    && Number(receipt.tax) > 0;
  const payLabel = (() => {
    const m = receipt.payment_method;
    if (m === 'mobile_money') return 'Mobile Money';
    if (m === 'mixed') return 'Split';
    if (m === 'on_account') return 'On Account';
    return m || 'Cash';
  })();

  return buildReceiptBytes({
    storeName: (template && template.store_name) || 'Your Store',
    addr: template
      ? [template.address_line1, template.address_line2].filter(Boolean).join(', ')
      : '',
    phone: (template && template.phone) || '',
    vatNo: (template && template.vat_number) || '',
    tinNo: (template && template.tin) || '',
    isFiscal: Number(receipt.tax) > 0,
    receiptNo: receipt.receipt_number,
    // The moment of sale. A sale rung offline has no created_at yet and
    // falls back to now, which IS when it was rung.
    date: new Date(receipt.sold_at || receipt.created_at || Date.now()).toLocaleString(),
    items: items.map((it) => ({ ...it, taxCode: taxCodeFor(it) })),
    subtotal: receipt.subtotal,
    discount: receipt.discount,
    tax: receipt.tax,
    total: receipt.total,
    tendered: receipt.amount_tendered,
    change: (parseFloat(receipt.amount_tendered) || 0) - (parseFloat(receipt.total) || 0),
    payLabel,
    footer: (template && template.footer_message) || 'Thank you for shopping with us!',
    fiscalPending: !fiscalised && !!qrTextExpected,
    fiscal: fiscalised
      ? {
        qrText: receipt.fiscal_qr_code || '',
        vcode: receipt.fiscal_verification_code || '',
        fday: receipt.fiscal_day_no != null ? receipt.fiscal_day_no : '',
        gno: receipt.fiscal_global_no != null ? receipt.fiscal_global_no : '',
        authority: FAUTH,
      }
      : { authority: FAUTH },
  }, { width: (template && template.paper_width === '80mm') ? 48 : 32 });
}

/** Per-device: print every slip without being asked. */
const AUTO_KEY = 'pewil_autoprint';

export function autoPrintOn() {
  try { return localStorage.getItem(AUTO_KEY) === '1'; } catch (_) { return false; }
}

export function setAutoPrint(on) {
  try { localStorage.setItem(AUTO_KEY, on ? '1' : '0'); } catch (_) { /* private mode */ }
}

/**
 * Print the slip on the till's Bluetooth thermal printer.
 *
 * Never throws: returns { ok, message } written for a cashier, because the
 * only person who sees it is standing at a counter with a customer waiting.
 *
 * `silent` is for the automatic print after a sale: with no printer already
 * connected it does nothing at all, because the chooser needs a tap and a
 * cashier mid-sale should not be handed a permission dialog they did not
 * ask for.
 */
export async function printReceiptBluetooth(receipt, template, { silent = false } = {}) {
  if (silent && !isPrinterReady()) return { ok: false, skipped: true, message: '' };
  try {
    const res = await btPrintBytes(receiptBytes(receipt, template));
    return {
      ok: true,
      message: res.via === 'rawbt'
        ? 'Sent to RawBT. If nothing printed, open RawBT and pick your printer in it.'
        : `Printed${res.printer ? ` on ${res.printer}` : ''}.`,
    };
  } catch (e) {
    return { ok: false, message: e?.message || 'Bluetooth print failed.' };
  }
}

export { lastPrinterName };
