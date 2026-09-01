// Styles & Variants — Phase 4 (2026-08-31), for clothing and footwear.
//
// One style card fans out into real products (size × colour, each with its
// own barcode and stock), season markdowns drop every variant at once with
// an audit row, and a size exchange swaps stock without touching money.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProductStyles, createProductStyle, generateVariants, markdownStyle,
  getMarkdowns, createSizeExchange, getProducts,
} from '../api/retailApi';
import useIsMobile from '../hooks/useIsMobile';

const arr = (d) => (Array.isArray(d) ? d : (d?.results || []));
const card = { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 12, padding: 16, marginBottom: 16 };
const label = { fontSize: 10, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 3, marginTop: 8 };
const input = { width: '100%', padding: '8px 10px', border: '1px solid #e3e8e4', borderRadius: 10, fontSize: 12, boxSizing: 'border-box' };
const btn = { padding: '9px 16px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };
const miniBtn = { padding: '6px 10px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#111827' };
const th = { textAlign: 'left', padding: '6px 8px', fontSize: 9, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f6f8f6' };
const td = { padding: '6px 8px', fontSize: 12, borderBottom: '1px solid #f3f4f6' };

export default function StylesVariants() {
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['product-styles'], queryFn: getProductStyles });
  const { data: mdData } = useQuery({ queryKey: ['markdowns'], queryFn: getMarkdowns });
  const { data: prodData } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const styles = arr(data);
  const markdowns = arr(mdData);
  const products = arr(prodData);

  const emptyStyle = { name: '', code: '', base_cost: '', base_price: '', sizes: '', colours: '', season: '' };
  const [form, setForm] = useState(emptyStyle);
  const [openStyle, setOpenStyle] = useState(null);
  const [mdPrice, setMdPrice] = useState('');
  const [mdReason, setMdReason] = useState('End of season');
  const [exch, setExch] = useState({ product_returned: '', product_taken: '' });
  const [exchMsg, setExchMsg] = useState('');

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['product-styles'] });
    qc.invalidateQueries({ queryKey: ['markdowns'] });
    qc.invalidateQueries({ queryKey: ['products'] });
  };
  const create = useMutation({
    mutationFn: createProductStyle,
    onSuccess: () => { invalidate(); setForm(emptyStyle); },
  });
  const generate = useMutation({ mutationFn: generateVariants, onSuccess: invalidate });
  const markdown = useMutation({
    mutationFn: ({ id, new_price, reason }) => markdownStyle(id, { new_price, reason }),
    onSuccess: () => { invalidate(); setMdPrice(''); },
  });
  const exchange = useMutation({
    mutationFn: createSizeExchange,
    onSuccess: () => { invalidate(); setExch({ product_returned: '', product_taken: '' }); setExchMsg('Swapped — stock moved, no money.'); },
    onError: (err) => setExchMsg(String(err?.response?.data?.product_taken || err?.response?.data?.detail || 'Exchange failed.')),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.name) return;
    create.mutate({
      ...form,
      base_cost: form.base_cost || 0,
      base_price: form.base_price || 0,
      sizes: form.sizes.split(',').map((s) => s.trim()).filter(Boolean),
      colours: form.colours.split(',').map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <div className="vtl-stack" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 16 }}>
        <div>
          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Styles</h3>
            {styles.length === 0 && <p style={{ fontSize: 12, color: '#6b7280' }}>No styles yet — create one on the right.</p>}
            {styles.map((s) => (
              <div key={s.id} style={{ borderBottom: '1px solid #f3f4f6', padding: '10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{s.name} {s.season && <span style={{ fontSize: 10, color: '#6b7280' }}>({s.season})</span>}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                      {(s.sizes || []).join(' / ') || 'no sizes'} × {(s.colours || []).join(' / ') || 'no colours'} · {(s.variants || []).length} variant(s)
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(s.variants || []).length === 0 ? (
                      <button onClick={() => generate.mutate(s.id)} disabled={generate.isPending}
                              style={{ ...miniBtn, borderColor: '#1a6b3a', color: '#1a6b3a' }}>
                        {generate.isPending ? '…' : 'Generate variants'}
                      </button>
                    ) : (
                      <button onClick={() => setOpenStyle(openStyle === s.id ? null : s.id)} style={miniBtn}>
                        {openStyle === s.id ? 'Hide' : 'Open matrix'}
                      </button>
                    )}
                  </div>
                </div>
                {openStyle === s.id && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr><th style={th}>Variant</th><th style={th}>SKU</th><th style={th}>Barcode</th><th style={th}>Price</th><th style={th}>Stock</th></tr></thead>
                      <tbody>
                        {(s.variants || []).map((v) => (
                          <tr key={v.id}>
                            <td style={td}>{v.colour} {v.size}</td>
                            <td style={td}>{v.sku}</td>
                            <td style={{ ...td, color: v.barcode ? '#111827' : '#991b1b' }}>{v.barcode || 'no barcode yet'}</td>
                            <td style={td}>{v.selling_price}</td>
                            <td style={td}>{v.quantity_in_stock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input style={{ ...input, width: 100 }} type="number" step="0.01" placeholder="New price"
                             value={mdPrice} onChange={(e) => setMdPrice(e.target.value)} />
                      <input style={{ ...input, width: 160 }} value={mdReason} onChange={(e) => setMdReason(e.target.value)} />
                      <button disabled={!mdPrice || markdown.isPending}
                              onClick={() => markdown.mutate({ id: s.id, new_price: mdPrice, reason: mdReason })}
                              style={{ ...miniBtn, color: '#92400e', borderColor: '#92400e' }}>
                        {markdown.isPending ? '…' : '▼ Mark down all'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Markdown history</h3>
            {markdowns.length === 0 && <p style={{ fontSize: 12, color: '#6b7280' }}>No markdowns yet.</p>}
            {markdowns.slice(0, 10).map((m) => (
              <div key={m.id} style={{ fontSize: 12, borderBottom: '1px solid #f3f4f6', padding: '6px 0' }}>
                <b>{m.style_name || m.product_name}</b>: {m.old_price} → {m.new_price}
                <span style={{ color: '#6b7280' }}> · {m.reason} · {m.products_affected} item(s) · {(m.created_at || '').slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>New style</h3>
            <form onSubmit={submit}>
              <label style={label}>Style name</label>
              <input style={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <label style={label}>Style code (builds variant SKUs)</label>
              <input style={input} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="LCS01" />
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ flex: 1 }}>
                  <label style={label}>Cost each</label>
                  <input style={input} type="number" step="0.01" value={form.base_cost} onChange={(e) => setForm({ ...form, base_cost: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={label}>Price each</label>
                  <input style={input} type="number" step="0.01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} />
                </div>
              </div>
              <label style={label}>Sizes (comma-separated)</label>
              <input style={input} value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} placeholder="4, 5, 6, 7" />
              <label style={label}>Colours (comma-separated)</label>
              <input style={input} value={form.colours} onChange={(e) => setForm({ ...form, colours: e.target.value })} placeholder="Black, Brown" />
              <label style={label}>Season</label>
              <input style={input} value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} placeholder="Winter 2026" />
              <button style={btn} disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Save style'}</button>
            </form>
          </div>

          <div style={card}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Size exchange</h3>
            <p style={{ fontSize: 10, color: '#6b7280', marginTop: 0 }}>Same price both ways — stock swaps, no money moves.</p>
            <label style={label}>Customer returns</label>
            <select style={input} value={exch.product_returned}
                    onChange={(e) => setExch({ ...exch, product_returned: e.target.value })}>
              <option value="">Select…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <label style={label}>Customer takes</label>
            <select style={input} value={exch.product_taken}
                    onChange={(e) => setExch({ ...exch, product_taken: e.target.value })}>
              <option value="">Select…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button style={btn} disabled={!exch.product_returned || !exch.product_taken || exchange.isPending}
                    onClick={() => { setExchMsg(''); exchange.mutate({ ...exch, quantity: '1' }); }}>
              {exchange.isPending ? 'Swapping…' : 'Swap sizes'}
            </button>
            {exchMsg && <div style={{ fontSize: 11, marginTop: 6, color: exchMsg.startsWith('Swapped') ? '#1a6b3a' : '#991b1b' }}>{exchMsg}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
