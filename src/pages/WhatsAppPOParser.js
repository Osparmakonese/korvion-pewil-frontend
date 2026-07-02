/**
 * WhatsApp Supplier PO Parser
 *
 * Magic: paste a WhatsApp-style supplier message, Claude Haiku extracts the
 * structured PO (supplier, items, quantities, prices), and one click creates
 * a Draft PurchaseOrder in Pewil Retail.
 *
 * Shipped as the first AI proof-point for Pewil Retail — demonstrates that
 * the product understands how Zimbabwean shops actually do business.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { parseWhatsAppPO, getAIBudget } from '../api/aiApi';
import { createPurchaseOrder } from '../api/retailApi';
import useIsMobile from '../hooks/useIsMobile';

/* tokens */
const GREEN = '#1a6b3a';
const GREEN_TINT = '#e8f5ee';
const AMBER = '#c97d1a';
const AMBER_TINT = '#fdeedd';
const RED = '#c0392b';
const INK = '#111827';
const INK_3 = '#6b7280';
const BORDER = '#e5e7eb';
const SURFACE = '#f9fafb';

const card = {
  background: '#fff',
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: 20,
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
};
const label = {
  fontSize: 11,
  fontWeight: 700,
  color: INK_3,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 8,
};
const btn = {
  padding: '10px 18px',
  borderRadius: 8,
  border: 'none',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
};

const SAMPLE = `Hi Osy, morning 🌞
This is what I have for you today:
- 20 x 2L Mazoe Orange Crush @ $3.20 ea
- 12 crates of Chibuku @ $8.50
- 50kg mealie meal @ $1.10 per kg
Delivering tomorrow morning before 10. Cash please.
— Takesure, Harare Beverages`;

const CONFIDENCE_STYLES = {
  high: { bg: GREEN_TINT, fg: GREEN, label: 'High confidence' },
  medium: { bg: AMBER_TINT, fg: AMBER, label: 'Medium confidence' },
  low: { bg: '#fde8e8', fg: RED, label: 'Low confidence' },
};

const formatMoney = (n) => {
  const v = Number(n);
  return Number.isFinite(v) ? `$${v.toFixed(2)}` : '—';
};

export default function WhatsAppPOParser({ onTabChange }) {
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [poCreated, setPoCreated] = useState(null);

  const { data: budget } = useQuery({
    queryKey: ['aiBudget'],
    queryFn: getAIBudget,
    staleTime: 30000,
  });

  const handleParse = async () => {
    setError('');
    setResult(null);
    setPoCreated(null);
    const msg = message.trim();
    if (!msg) {
      setError('Paste a supplier WhatsApp message first.');
      return;
    }
    if (msg.length < 10) {
      setError('Message is too short to be a real order.');
      return;
    }
    setParsing(true);
    try {
      const res = await parseWhatsAppPO(msg);
      if (!res?.parsed) {
        setError('AI returned a response but it was not valid JSON. Raw: ' + (res?.analysis || '').slice(0, 200));
      } else {
        setResult(res);
      }
      qc.invalidateQueries({ queryKey: ['aiBudget'] });
    } catch (e) {
      const data = e?.response?.data;
      setError(data?.error || e?.message || 'Parse failed.');
    } finally {
      setParsing(false);
    }
  };

  const handleCreateDraft = async () => {
    if (!result?.parsed) return;
    const p = result.parsed;
    if (!p.supplier_id) {
      setError('Cannot create PO: no supplier matched. Add the supplier first, then re-parse.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const payload = {
        supplier: p.supplier_id,
        order_date: p.order_date || new Date().toISOString().slice(0, 10),
        expected_date: p.delivery_date || null,
        items_data: (p.items || []).map((it) => ({
          product_id: it.product_id || null,
          product_name: it.product_name || '',
          qty: Number(it.qty) || 0,
          unit_cost: Number(it.unit_cost) || 0,
          total: Number(it.total) || 0,
        })),
        subtotal: Number(p.subtotal) || 0,
        tax: Number(p.tax) || 0,
        total: Number(p.total) || 0,
        status: 'draft',
        notes: `Parsed by Pewil AI from WhatsApp message on ${new Date().toISOString().slice(0, 10)}.\n\n${p.notes || ''}`.trim(),
      };
      const po = await createPurchaseOrder(payload);
      setPoCreated(po);
    } catch (e) {
      const data = e?.response?.data;
      setError(data?.detail || JSON.stringify(data) || e?.message || 'Create draft failed.');
    } finally {
      setCreating(false);
    }
  };

  const handleReset = () => {
    setMessage('');
    setResult(null);
    setError('');
    setPoCreated(null);
  };

  const p = result?.parsed;
  const conf = (p?.confidence || '').toLowerCase();
  const confStyle = CONFIDENCE_STYLES[conf] || CONFIDENCE_STYLES.medium;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', gap: 18 }}>
      {/* LEFT — input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, color: INK, marginBottom: 4 }}>
                WhatsApp PO Parser
              </div>
              <div style={{ fontSize: 13, color: INK_3 }}>
                Paste a supplier message. Pewil AI turns it into a draft purchase order.
              </div>
            </div>
            <div style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: GREEN_TINT,
              color: GREEN,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              AI \u2022 Haiku
            </div>
          </div>

          <div style={label}>Supplier message</div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Paste or forward the WhatsApp message from your supplier here..."
            rows={10}
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 10,
              border: `1px solid ${BORDER}`,
              fontSize: 14,
              fontFamily: 'Inter, system-ui, sans-serif',
              lineHeight: 1.5,
              color: INK,
              background: SURFACE,
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <button
              onClick={handleParse}
              disabled={parsing || !message.trim()}
              style={{
                ...btn,
                background: parsing || !message.trim() ? '#9ca3af' : GREEN,
                color: '#fff',
                cursor: parsing || !message.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {parsing ? 'Parsing...' : 'Parse with AI'}
            </button>
            <button
              onClick={() => setMessage(SAMPLE)}
              style={{
                ...btn,
                background: '#fff',
                color: INK,
                border: `1px solid ${BORDER}`,
              }}
            >
              Load sample message
            </button>
            {(message || result) && (
              <button
                onClick={handleReset}
                style={{
                  ...btn,
                  background: '#fff',
                  color: INK_3,
                  border: `1px solid ${BORDER}`,
                }}
              >
                Clear
              </button>
            )}
          </div>

          {error && (
            <div style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 8,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: RED,
              fontSize: 13,
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {p && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={label}>Parsed order</div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 600, color: INK }}>
                  {p.supplier_guess || 'Unknown supplier'}
                  {p.supplier_id ? (
                    <span style={{ marginLeft: 8, fontSize: 12, color: GREEN, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
                      \u2713 matched
                    </span>
                  ) : (
                    <span style={{ marginLeft: 8, fontSize: 12, color: AMBER, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
                      ! not in your supplier list
                    </span>
                  )}
                </div>
              </div>
              <div style={{
                padding: '4px 10px',
                borderRadius: 999,
                background: confStyle.bg,
                color: confStyle.fg,
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {confStyle.label}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              <InfoCell title="Order date" value={p.order_date || '—'} />
              <InfoCell title="Delivery" value={p.delivery_date || 'Not stated'} />
              <InfoCell title="Total" value={formatMoney(p.total)} accent={GREEN} />
            </div>

            <div style={label}>Items</div>
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: SURFACE }}>
                    <th style={thStyle}>Product</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Qty</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Unit cost</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(p.items || []).map((it, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${BORDER}` }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600 }}>{it.product_name}</div>
                        <div style={{ fontSize: 11, color: it.product_id ? GREEN : AMBER, marginTop: 2 }}>
                          {it.product_id ? `\u2713 matched product #${it.product_id}` : '! no product match'}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {it.qty} {it.unit || ''}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{formatMoney(it.unit_cost)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{formatMoney(it.total)}</td>
                    </tr>
                  ))}
                  {(!p.items || p.items.length === 0) && (
                    <tr>
                      <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: INK_3, fontStyle: 'italic' }}>
                        No items extracted
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: SURFACE, borderTop: `2px solid ${BORDER}` }}>
                    <td colSpan={3} style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>Subtotal</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{formatMoney(p.subtotal)}</td>
                  </tr>
                  {Number(p.tax) > 0 && (
                    <tr style={{ background: SURFACE }}>
                      <td colSpan={3} style={{ ...tdStyle, textAlign: 'right' }}>Tax</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{formatMoney(p.tax)}</td>
                    </tr>
                  )}
                  <tr style={{ background: GREEN_TINT }}>
                    <td colSpan={3} style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: GREEN }}>Total</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: GREEN }}>{formatMoney(p.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {p.warnings && p.warnings.length > 0 && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: AMBER_TINT, border: `1px solid ${AMBER}40` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: AMBER, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  AI warnings
                </div>
                {p.warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: 13, color: INK, marginBottom: 4 }}>\u2022 {w}</div>
                ))}
              </div>
            )}

            {p.notes && (
              <div style={{ marginTop: 14, fontSize: 13, color: INK_3, fontStyle: 'italic' }}>
                {p.notes}
              </div>
            )}

            <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={handleCreateDraft}
                disabled={creating || !p.supplier_id || poCreated}
                style={{
                  ...btn,
                  background: creating || !p.supplier_id || poCreated ? '#9ca3af' : GREEN,
                  color: '#fff',
                  cursor: creating || !p.supplier_id || poCreated ? 'not-allowed' : 'pointer',
                }}
              >
                {creating ? 'Creating draft...' : poCreated ? '\u2713 Draft created' : 'Create draft PO'}
              </button>
              {!p.supplier_id && (
                <button
                  onClick={() => onTabChange && onTabChange('Suppliers')}
                  style={{ ...btn, background: '#fff', color: INK, border: `1px solid ${BORDER}` }}
                >
                  Go add supplier
                </button>
              )}
              {poCreated && (
                <button
                  onClick={() => onTabChange && onTabChange('Suppliers')}
                  style={{ ...btn, background: '#fff', color: INK, border: `1px solid ${BORDER}` }}
                >
                  View purchase orders
                </button>
              )}
            </div>

            {poCreated && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: GREEN_TINT, color: GREEN, fontSize: 13, fontWeight: 600 }}>
                \u2713 PO-{String(poCreated.id).padStart(4, '0')} created as a draft. Review, edit, then send to supplier.
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT — sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={card}>
          <div style={label}>AI credits</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 32, fontWeight: 700, color: INK }}>
              {budget?.credits_remaining ?? '—'}
            </div>
            <div style={{ fontSize: 12, color: INK_3 }}>/ {budget?.credits_total ?? '—'}</div>
          </div>
          <div style={{ marginTop: 8, height: 6, background: SURFACE, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${100 - (budget?.usage_percent || 0)}%`,
              background: GREEN,
            }} />
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: INK_3 }}>
            Each parse uses 2 credits. Resets on the 1st.
          </div>
        </div>

        <div style={card}>
          <div style={label}>How it works</div>
          <div style={{ fontSize: 13, color: INK, lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 10px' }}>
              <strong>1. Forward the WhatsApp message</strong> from your supplier into the big box on the left.
            </p>
            <p style={{ margin: '0 0 10px' }}>
              <strong>2. Hit Parse with AI.</strong> Pewil matches the supplier and every line item against your product list.
            </p>
            <p style={{ margin: '0 0 10px' }}>
              <strong>3. One-click a draft PO.</strong> Review, edit, send to supplier. No retyping.
            </p>
            <p style={{ margin: 0, color: INK_3, fontStyle: 'italic' }}>
              Best results when suppliers name products the way you do. Add aliases in Products &rarr; SKU.
            </p>
          </div>
        </div>

        <div style={{ ...card, background: GREEN_TINT, borderColor: `${GREEN}40` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Why this is magic
          </div>
          <div style={{ fontSize: 13, color: INK, lineHeight: 1.6 }}>
            Most African shops still retype supplier orders into a spreadsheet or notebook.
            Pewil reads the actual WhatsApp message and builds the PO for you \u2014 so the
            owner\u2019s evening doesn&rsquo;t disappear into admin.
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCell({ title, value, accent }) {
  return (
    <div style={{ background: SURFACE, borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: INK_3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: accent || INK, fontFamily: 'Inter, sans-serif' }}>
        {value}
      </div>
    </div>
  );
}

const thStyle = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: INK_3,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};
const tdStyle = {
  padding: '10px 12px',
  fontSize: 13,
  color: INK,
};
