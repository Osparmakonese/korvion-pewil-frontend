import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getReceiptTemplates, createReceiptTemplate, updateReceiptTemplate } from '../api/retailApi';

export default function ReceiptCustomization({ onTabChange }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = user?.role === 'owner';

  const { data: templates, isLoading } = useQuery({
    queryKey: ['retail-receipt-templates'],
    queryFn: getReceiptTemplates,
    staleTime: 30000
  });

  const template = templates?.[0];

  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [showLogo, setShowLogo] = useState(true);
  const [footerMessage, setFooterMessage] = useState('');
  const [showSocialMedia, setShowSocialMedia] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [paperWidth, setPaperWidth] = useState('80mm');
  const [fontSize, setFontSize] = useState('Medium');
  const [showBarcodeOnReceipt, setShowBarcodeOnReceipt] = useState(true);
  const [showQRCode, setShowQRCode] = useState(true);
  const [currencyDisplay, setCurrencyDisplay] = useState('Dual (USD + ZiG)');
  // Branding (A4 / invoice templates)
  const [logoUrl, setLogoUrl] = useState('');
  const [brandColor, setBrandColor] = useState('#1a6b3a');
  const [bankDetails, setBankDetails] = useState('');

  useEffect(() => {
    if (template) {
      setBusinessName(template.store_name || '');
      setAddress(`${template.address_line1 || ''}${template.address_line2 ? '\n' + template.address_line2 : ''}`);
      setPhone(template.phone || '');
      setVatNumber(template.vat_number || '');
      setTinNumber(template.tin || '');
      setShowLogo(template.show_logo ?? true);
      setFooterMessage(template.footer_message || '');
      setShowBarcodeOnReceipt(template.show_barcode ?? true);
      setPaperWidth(template.paper_width || '80mm');
      setLogoUrl(template.logo_url || '');
      setBrandColor(template.brand_color || '#1a6b3a');
      setBankDetails(template.bank_details || '');
    }
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (template) {
        return updateReceiptTemplate(template.id, data);
      } else {
        return createReceiptTemplate(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-receipt-templates'] });
    }
  });

  const Toggle = ({ checked, onChange }) => (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 24,
        borderRadius: 12,
        border: 'none',
        background: checked ? '#1a6b3a' : '#e5e7eb',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        padding: '2px 3px',
        position: 'relative',
        transition: 'background 0.2s'
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          background: '#fff',
          position: 'absolute',
          left: checked ? 18 : 2,
          transition: 'left 0.2s'
        }}
      />
    </button>
  );

  return (
    <div style={{ padding: 24, fontFamily: "'Inter', sans-serif", backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", margin: 0, color: '#111827' }}>
          Receipt Customization
        </h1>
        {isOwner && (
          <button
            onClick={() => saveMutation.mutate({
              store_name: businessName,
              address_line1: address.split('\n')[0],
              address_line2: address.split('\n')[1],
              phone: phone,
              vat_number: vatNumber,
              tin: tinNumber,
              header_message: '',
              footer_message: footerMessage,
              show_logo: showLogo,
              show_barcode: showBarcodeOnReceipt,
              paper_width: paperWidth,
              font_size: fontSize,
              logo_url: logoUrl,
              brand_color: brandColor,
              bank_details: bankDetails
            })}
            disabled={saveMutation.isPending}
            style={{
              background: '#1a6b3a',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: saveMutation.isPending ? 'not-allowed' : 'pointer',
              opacity: saveMutation.isPending ? 0.7 : 1
            }}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Template'}
          </button>
        )}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {/* Template Settings */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 16px 0', color: '#111827' }}>
            Receipt Configuration
          </h3>

          {/* Header Section */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 10, fontWeight: 600, color: '#fff', background: '#1a6b3a', padding: '4px 8px', borderRadius: 4, margin: '0 0 12px 0' }}>
              HEADER
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  BUSINESS NAME
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
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
              <div>
                <label style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  ADDRESS
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
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
              <div>
                <label style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  TIN (BPN) — printed beside VAT on fiscal receipts
                </label>
                <input
                  type="text"
                  value={tinNumber}
                  onChange={(e) => setTinNumber(e.target.value)}
                  placeholder="e.g. 2001234567"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  LOGO URL (branded A4 invoices)
                </label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://…/logo.png"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                    BRAND COLOUR
                  </label>
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    style={{ width: 48, height: 34, border: '1px solid #e5e7eb', borderRadius: 6, padding: 2, cursor: 'pointer' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                    BANK DETAILS (printed on invoices)
                  </label>
                  <input
                    type="text"
                    value={bankDetails}
                    onChange={(e) => setBankDetails(e.target.value)}
                    placeholder="Bank · Acc name · Acc no · Branch"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  PHONE
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
              <div>
                <label style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  VAT NUMBER
                </label>
                <input
                  type="text"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#111827' }}>SHOW LOGO</label>
                <Toggle checked={showLogo} onChange={setShowLogo} />
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 10, fontWeight: 600, color: '#fff', background: '#1a6b3a', padding: '4px 8px', borderRadius: 4, margin: '0 0 12px 0' }}>
              FOOTER
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                  FOOTER MESSAGE
                </label>
                <textarea
                  value={footerMessage}
                  onChange={(e) => setFooterMessage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    fontSize: 10,
                    fontFamily: "'Inter', sans-serif",
                    boxSizing: 'border-box',
                    minHeight: 60,
                    resize: 'vertical'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#111827' }}>SHOW SOCIAL MEDIA</label>
                <Toggle checked={showSocialMedia} onChange={setShowSocialMedia} />
              </div>
              {showSocialMedia && (
                <div>
                  <label style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                    WHATSAPP NUMBER
                  </label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
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
              )}
            </div>
          </div>

          {/* Format Section */}
          <div>
            <h4 style={{ fontSize: 10, fontWeight: 600, color: '#fff', background: '#1a6b3a', padding: '4px 8px', borderRadius: 4, margin: '0 0 12px 0' }}>
              FORMAT
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>
                  PAPER WIDTH
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['58mm', '80mm'].map((width) => (
                    <label key={width} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="width"
                        value={width}
                        checked={paperWidth === width}
                        onChange={() => setPaperWidth(width)}
                        style={{ cursor: 'pointer' }}
                      />
                      {width}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>
                  FONT SIZE
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Small', 'Medium', 'Large'].map((size) => (
                    <label key={size} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="size"
                        value={size}
                        checked={fontSize === size}
                        onChange={() => setFontSize(size)}
                        style={{ cursor: 'pointer' }}
                      />
                      {size}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#111827' }}>SHOW BARCODE</label>
                <Toggle checked={showBarcodeOnReceipt} onChange={setShowBarcodeOnReceipt} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#111827' }}>SHOW QR CODE (ZIMRA)</label>
                <Toggle checked={showQRCode} onChange={setShowQRCode} />
              </div>

              <div>
                <label style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>
                  CURRENCY DISPLAY
                </label>
                <select
                  value={currencyDisplay}
                  onChange={(e) => setCurrencyDisplay(e.target.value)}
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
                  <option>USD only</option>
                  <option>Dual (USD + ZiG)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 16px 0', color: '#111827' }}>
            Receipt Preview
          </h3>

          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 9,
              background: '#f9fafb',
              padding: 16,
              border: '1px dashed #e5e7eb',
              borderRadius: 8,
              maxWidth: 280,
              margin: '0 auto',
              lineHeight: 1.5,
              color: '#111827',
              whiteSpace: 'pre-wrap'
            }}
          >
            {`═══ ${businessName} ═══
${address}
Tel: ${phone}
VAT: ${vatNumber}
─────────────────────
Receipt: #0108
Date: 12 Apr 2026 17:45
Cashier: Mary Banda
─────────────────────
USB-C Charger   x1  $15.00
BT Earbuds      x1  $25.00
iPhone Case     x2  $16.00
─────────────────────
Subtotal:       $56.00
Discount (10%): -$5.60
VAT (15%):       $7.56
─────────────────────
TOTAL:          $57.96
Paid: EcoCash
─────────────────────
[QR Code placeholder]

${footerMessage}
${showSocialMedia ? `WhatsApp: ${whatsappNumber}` : ''}`}
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div
        style={{
          background: '#f3f4f6',
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          padding: 16,
          fontSize: 10,
          color: '#374151',
          lineHeight: 1.6
        }}
      >
        Receipt format is compatible with 58mm and 80mm thermal printers. Digital receipts can be sent via WhatsApp after each sale.
      </div>
    </div>
  );
}
