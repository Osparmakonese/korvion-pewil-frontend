import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getProducts } from '../api/retailApi';
import useIsMobile from '../hooks/useIsMobile';

export default function BarcodeGenerator({ onTabChange }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedProduct, setSelectedProduct] = useState('');
  const [barcodeFormat, setBarcodeFormat] = useState('EAN-13');
  const [quantity, setQuantity] = useState(1);
  const [labelSize, setLabelSize] = useState('Medium (50x30mm)');

  const isOwnerOrManager = user?.role === 'owner' || user?.role === 'manager';

  const { data: allProducts, isLoading } = useQuery({
    queryKey: ['retail-products'],
    queryFn: getProducts,
    staleTime: 30000
  });

  // DRF DecimalField serializes as string by default — coerce before .toFixed
  // to avoid "TypeError: x.toFixed is not a function" (Sentry MAKONESE-FARM-FRONTEND-4).
  const fmtPrice = (v) => `$${(Number(v) || 0).toFixed(2)}`;

  const products = allProducts?.map(p => ({
    sku: p.sku,
    name: p.name,
    price: fmtPrice(p.selling_price)
  })) || [];

  const productsWithoutBarcodes = allProducts?.filter(p => !p.barcode)?.map(p => ({
    sku: p.sku,
    name: p.name,
    category: p.category || 'Uncategorized',
    price: fmtPrice(p.selling_price),
    status: p.barcode ? 'Generated' : 'None'
  })) || [];

  const firstProduct = products[0];
  const defaultSku = selectedProduct || firstProduct?.sku || '';

  const currentProduct = products.find(p => p.sku === (selectedProduct || defaultSku)) || firstProduct || { sku: '', name: '', price: '$0.00' };

  if (selectedProduct === '' && defaultSku) {
    setSelectedProduct(defaultSku);
  }

  const BarcodeVisualization = () => (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '2px', height: 50 }}>
      {[1, 2, 3, 2, 1, 3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2, 1, 3, 2, 1].map((width, idx) => (
        <div
          key={idx}
          style={{
            width: width * 2 + 'px',
            height: '100%',
            background: '#111827',
            borderRadius: '1px'
          }}
        />
      ))}
    </div>
  );

  return (
    <div style={{ padding: 24, fontFamily: "'Inter', sans-serif", backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", margin: 0, color: '#111827' }}>
          Barcode & Labels
        </h1>
        {isOwnerOrManager && (
          <button
            onClick={() => window.print()}
            style={{
              background: '#1a6b3a',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Print All Labels
          </button>
        )}
      </div>

      {/* Info Banner */}
      <div
        style={{
          background: '#e8f5ee',
          border: '1px solid #1a6b3a',
          borderRadius: 8,
          padding: '8px 12px',
          marginBottom: 24,
          fontSize: 10,
          color: '#1a6b3a',
          lineHeight: 1.5
        }}
      >
        Generate barcodes for products without existing codes. Print shelf labels with price, SKU, and barcode.
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {/* Generate Barcode */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 16px 0', color: '#111827' }}>
            Generate New Barcode
          </h3>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>
                PRODUCT
              </label>
              <select
                value={selectedProduct || defaultSku}
                onChange={(e) => setSelectedProduct(e.target.value)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  fontSize: 11,
                  fontFamily: "'Inter', sans-serif",
                  boxSizing: 'border-box',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? (
                  <option>Loading products...</option>
                ) : (
                  products.map((p) => (
                    <option key={p.sku} value={p.sku}>
                      {p.name} ({p.sku})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>
                BARCODE FORMAT
              </label>
              <select
                value={barcodeFormat}
                onChange={(e) => setBarcodeFormat(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  fontSize: 11,
                  fontFamily: "'Inter', sans-serif",
                  boxSizing: 'border-box',
                  cursor: 'pointer'
                }}
              >
                <option>EAN-13</option>
                <option>Code 128</option>
                <option>QR Code</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>
                QUANTITY OF LABELS
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  fontSize: 11,
                  fontFamily: "'Inter', sans-serif",
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <button
            onClick={() => {
              window.print();
            }}
            style={{
              width: '100%',
              background: '#1a6b3a',
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 16
            }}
          >
            Generate
          </button>

          {/* Preview */}
          <div
            style={{
              background: '#f9fafb',
              border: '1px dashed #e5e7eb',
              borderRadius: 8,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12
            }}
          >
            <BarcodeVisualization />
            <div style={{ fontFamily: 'monospace', color: '#1a6b3a', fontWeight: 600, fontSize: 10 }}>
              {selectedProduct}
            </div>
            <div style={{ fontSize: 10, color: '#374151', textAlign: 'center', fontWeight: 500 }}>
              {currentProduct.name} — {currentProduct.price}
            </div>
          </div>
        </div>

        {/* Label Preview */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 16px 0', color: '#111827' }}>
            Shelf Label Preview
          </h3>

          {/* Mock Label */}
          <div
            style={{
              border: '2px solid #111827',
              borderRadius: 4,
              padding: 12,
              maxWidth: 200,
              margin: '0 auto 16px auto',
              background: '#fff',
              fontFamily: 'monospace',
              fontSize: 8,
              lineHeight: 1.5,
              textAlign: 'center'
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{user?.tenant_name || 'My Store'}</div>
            <div style={{ borderBottom: '1px solid #111827', marginBottom: 4, paddingBottom: 4 }}>
              ──────────────
            </div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>USB-C Charger</div>
            <div style={{ marginBottom: 4 }}>SKU: CHAR-USB</div>
            <div style={{ marginBottom: 8 }}>
              <BarcodeVisualization />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>$15.00</div>
            <div style={{ fontSize: 7 }}>VAT Incl.</div>
          </div>

          {/* Label Size Selector */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {['Small (30x20mm)', 'Medium (50x30mm)', 'Large (70x40mm)'].map((size) => (
              <button
                key={size}
                onClick={() => setLabelSize(size)}
                style={{
                  padding: '6px 12px',
                  border: labelSize === size ? 'none' : '1px solid #e5e7eb',
                  background: labelSize === size ? '#1a6b3a' : '#fff',
                  color: labelSize === size ? '#fff' : '#111827',
                  borderRadius: 6,
                  fontSize: 9,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Without Barcodes Table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 16px 0', color: '#111827' }}>
          Products Without Barcodes
        </h3>
        {isLoading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>Loading products...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>SKU</th>
                <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Product</th>
                <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Category</th>
                <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Price</th>
                <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Status</th>
                <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {productsWithoutBarcodes.map((product, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#1a6b3a', fontFamily: 'monospace', fontWeight: 600, fontSize: 10 }}>
                    {product.sku}
                  </td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 600 }}>
                    {product.name}
                  </td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151', fontSize: 10 }}>
                    {product.category}
                  </td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827', textAlign: 'right', fontWeight: 600 }}>
                    {product.price}
                  </td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6' }}>
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 20,
                        textTransform: 'uppercase',
                        background: product.status === 'Generated' ? '#e8f5ee' : '#fdecea',
                        color: product.status === 'Generated' ? '#1a6b3a' : '#c0392b'
                      }}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        window.print();
                      }}
                      style={{
                        background: product.status === 'Generated' ? '#e8f5ee' : '#1a6b3a',
                        color: product.status === 'Generated' ? '#1a6b3a' : '#fff',
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: 4,
                        fontSize: 9,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {product.status === 'Generated' ? 'Print' : 'Generate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
