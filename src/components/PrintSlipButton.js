/**
 * PrintSlipButton — reprint any sale on the till's Bluetooth thermal
 * printer, from wherever the sale is on screen (2026-10-31).
 *
 * A customer comes back with a query, or a slip jams half-printed, and the
 * cashier needs that receipt again. Every screen that could reprint one
 * opened the browser's print dialog, which on a phone is the Android page
 * printer — A4 and "Save as PDF", no way to reach a 58mm thermal. So an old
 * receipt could not be put on paper at all.
 *
 * The bytes come from utils/printReceipt, the same ones the sale screen
 * sends, so a reprint looks exactly like the original except for the COPY
 * line the builder adds. Drop this into any screen holding a FULL sale row
 * (it reads items_data, subtotal, tax, the fiscal fields).
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getReceiptTemplates } from '../api/retailApi';
import { printReceiptBluetooth, templateFrom, lastPrinterName } from '../utils/printReceipt';
import { isWebBluetoothSupported, isAndroid } from '../utils/btPrinter';

export default function PrintSlipButton({ sale, style, label = 'Print slip' }) {
  const { data: tmplData } = useQuery({
    queryKey: ['receipt-template'], queryFn: getReceiptTemplates,
    staleTime: 300000, retry: false,
  });
  const [state, setState] = useState(null);   // 'printing' | { ok, message }
  const capable = isWebBluetoothSupported() || isAndroid();
  if (!capable || !sale) return null;

  const printer = lastPrinterName();
  const go = async () => {
    if (state === 'printing') return;
    setState('printing');
    setState(await printReceiptBluetooth(sale, templateFrom(tmplData),
                                         { isReprint: true }));
  };

  return (
    <>
      {state && state !== 'printing' && (
        <div role="status" style={{
          fontSize: 11.5, lineHeight: 1.45, borderRadius: 8, padding: '7px 10px',
          marginBottom: 8, fontWeight: 600,
          background: state.ok ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${state.ok ? '#bbf7d0' : '#fecaca'}`,
          color: state.ok ? '#166534' : '#991b1b',
        }}>
          {state.message}
        </div>
      )}
      <button
        type="button"
        onClick={go}
        disabled={state === 'printing'}
        title={printer ? `Bluetooth printer: ${printer}` : 'Print on the till printer'}
        style={{
          padding: 10, background: '#1a6b3a', color: '#fff', border: 'none',
          borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit', opacity: state === 'printing' ? 0.6 : 1,
          ...style,
        }}
      >
        {state === 'printing' ? 'Printing…' : label}
      </button>
    </>
  );
}
