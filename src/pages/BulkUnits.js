import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, updateProduct } from '../api/retailApi';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 12, padding: 16, marginBottom: 16 };
const input = { width: '100%', padding: '7px 8px', border: '1px solid #e3e8e4', borderRadius: 8, fontSize: 12, boxSizing: 'border-box' };
const th = { textAlign: 'left', padding: '7px 8px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f6f8f6' };
const td = { padding: '7px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6' };

function Row({ p }) {
  const qc = useQueryClient();
  const [unit, setUnit] = useState(p.purchase_unit || '');
  const [per, setPer] = useState(p.units_per_purchase || 1);
  // THE PACK'S OWN PRICE (2026-11-09). A carton is hardly ever the single
  // price times eighteen — that is why a customer buys a carton. Empty
  // means exactly what it meant before this box existed: charge the single
  // price times the pack size.
  const [packPrice, setPackPrice] = useState(
    p.pack_price == null ? '' : String(p.pack_price));
  const save = useMutation({
    mutationFn: () => updateProduct(p.id, {
      purchase_unit: unit,
      units_per_purchase: Number(per) || 1,
      pack_price: packPrice === '' ? null : Number(packPrice),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
  const size = Number(per) || 1;
  const single = Number(p.branch_price ?? p.selling_price) || 0;
  const dirty = unit !== (p.purchase_unit || '')
    || String(per) !== String(p.units_per_purchase || 1)
    || packPrice !== (p.pack_price == null ? '' : String(p.pack_price));
  const meaning = () => {
    if (!unit || size <= 1) return 'Sold the same way it is bought';
    const charged = packPrice === '' ? single * size : Number(packPrice) || 0;
    const saving = Math.round((single * size - charged) * 100) / 100;
    return `Sell 1 ${unit} (${size} ${p.unit || 'each'}) at $${charged.toFixed(2)}`
      + (packPrice === '' ? ' — singles x pack size'
        : saving > 0 ? ` — $${saving.toFixed(2)} off ${size} singles`
          : saving < 0 ? ` — $${Math.abs(saving).toFixed(2)} MORE than singles`
            : ' — same as singles');
  };
  return (
    <tr>
      <td style={{ ...td, fontWeight: 600 }}>{p.name}</td>
      <td style={td}><input style={input} placeholder="e.g. box" value={unit} onChange={(e) => setUnit(e.target.value)} /></td>
      <td style={td}><input style={input} type="number" min={1} step="0.01" value={per} onChange={(e) => setPer(e.target.value)} /></td>
      <td style={td}><input style={input} type="number" min={0} step="any" placeholder={size > 1 ? (single * size).toFixed(2) : '—'} value={packPrice} onChange={(e) => setPackPrice(e.target.value)} /></td>
      <td style={td}>{meaning()}</td>
      <td style={td}>{dirty && <button onClick={() => save.mutate()} style={{ background: '#1a6b3a', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{save.isPending ? '…' : 'Save'}</button>}</td>
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
        <p style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 10 }}>
          Give a pack its own <strong>pack price</strong> and the till offers both at the counter:
          one single, or a whole pack at that price. Selling a pack takes its singles off the
          shelf. Leave the price empty and a pack simply costs the single price times the pack size.
        </p>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={th}>Product</th><th style={th}>Purchase unit</th><th style={th}>Units per pack</th><th style={th}>Pack price</th><th style={th}>Meaning</th><th style={th}></th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td style={td} colSpan={6}>No products.</td></tr>}
            {filtered.slice(0, 200).map((p) => <Row key={p.id} p={p} />)}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
