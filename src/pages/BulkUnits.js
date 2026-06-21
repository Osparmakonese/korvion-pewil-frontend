import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, updateProduct } from '../api/retailApi';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16 };
const input = { width: '100%', padding: '7px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' };
const th = { textAlign: 'left', padding: '7px 8px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f9fafb' };
const td = { padding: '7px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6' };

function Row({ p }) {
  const qc = useQueryClient();
  const [unit, setUnit] = useState(p.purchase_unit || '');
  const [per, setPer] = useState(p.units_per_purchase || 1);
  const save = useMutation({ mutationFn: () => updateProduct(p.id, { purchase_unit: unit, units_per_purchase: Number(per) || 1 }), onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }) });
  const dirty = unit !== (p.purchase_unit || '') || String(per) !== String(p.units_per_purchase || 1);
  return (
    <tr>
      <td style={{ ...td, fontWeight: 600 }}>{p.name}</td>
      <td style={td}><input style={input} placeholder="e.g. box" value={unit} onChange={(e) => setUnit(e.target.value)} /></td>
      <td style={td}><input style={input} type="number" min={1} step="0.01" value={per} onChange={(e) => setPer(e.target.value)} /></td>
      <td style={td}>{unit ? `Buy 1 ${unit} = ${Number(per) || 1} ${p.unit || 'each'}` : 'Sold the same way it is bought'}</td>
      <td style={td}>{dirty && <button onClick={() => save.mutate()} style={{ background: '#1a6b3a', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{save.isPending ? '…' : 'Save'}</button>}</td>
    </tr>
  );
}

export default function BulkUnits() {
  const { data } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const products = arr(data);
  const [q, setQ] = useState('');
  const filtered = products.filter((p) => !q || (p.name || '').toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Bulk / pack units</h3>
          <input style={{ ...input, width: 200 }} placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <p style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 10 }}>
          Set how a product is bought versus sold — e.g. buy a <strong>box of 100</strong> screws, sell them as singles.
          When you receive a purchase order in boxes, the stock is expanded to singles automatically.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Product</th><th style={th}>Purchase unit</th><th style={th}>Units per pack</th><th style={th}>Meaning</th><th style={th}></th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td style={td} colSpan={5}>No products.</td></tr>}
            {filtered.slice(0, 200).map((p) => <Row key={p.id} p={p} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
