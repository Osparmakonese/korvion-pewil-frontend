import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGRVs } from '../api/retailApi';

const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const S = {
  page: { maxWidth: 1000, margin: '0 auto', padding: 20 },
  h1: { fontSize: 20, fontWeight: 800, margin: '0 0 4px', fontFamily: "'Playfair Display', serif", color: '#0f172a' },
  sub: { fontSize: 12, color: '#64748b', margin: '0 0 16px' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 4 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'left', padding: '10px', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '10px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
};

export default function GoodsReceived() {
  const { data: rows = [] } = useQuery({ queryKey: ['grvs'], queryFn: getGRVs });
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Goods-Received Vouchers</h1>
      <p style={S.sub}>A GRV is raised automatically each time a purchase order is received, recording exactly what came in.</p>
      <div style={S.card}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>GRV #</th><th style={S.th}>Supplier</th><th style={S.th}>Date</th><th style={S.th}>Lines</th><th style={S.th}>Total</th><th style={S.th}>Delivery note</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td style={S.td} colSpan={6}>No GRVs yet — receive a purchase order to raise one.</td></tr>}
            {rows.map((g) => (
              <tr key={g.id}>
                <td style={S.td}><b>{g.grv_number}</b></td>
                <td style={S.td}>{g.supplier_display || g.supplier_name || '—'}</td>
                <td style={S.td}>{g.received_date}</td>
                <td style={S.td}>{(g.items_data || []).length}</td>
                <td style={S.td}>{money(g.total)}</td>
                <td style={S.td}>{g.delivery_note_ref || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
