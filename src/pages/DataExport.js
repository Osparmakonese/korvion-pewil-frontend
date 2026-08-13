import { useState } from 'react';
import { exportData } from '../api/authApi';

const S = {
  card: { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 10, padding: '18px 20px', marginBottom: 16 },
  title: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 },
  p: { fontSize: 13, color: '#374151', lineHeight: 1.7, marginBottom: 10 },
  btn: (primary) => ({
    padding: '10px 20px', border: primary ? 'none' : '1px solid #e3e8e4',
    background: primary ? '#1a6b3a' : '#fff', color: primary ? '#fff' : '#374151',
    borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  }),
  optionCard: (selected) => ({
    border: selected ? '2px solid #1a6b3a' : '1px solid #e3e8e4',
    borderRadius: 10, padding: '16px 18px', cursor: 'pointer',
    background: selected ? '#e8f5ee' : '#fff', transition: 'all 0.15s',
    flex: 1, minWidth: 200,
  }),
  optionTitle: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 },
  optionDesc: { fontSize: 11, color: '#6b7280', lineHeight: 1.5 },
};

export default function DataExport() {
  const [format, setFormat] = useState('csv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleExport = async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await exportData(format);
      // Create download link from blob response
      const blob = new Blob([res.data], {
        type: format === 'csv' ? 'application/zip' : 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'csv' ? 'pewil-export.zip' : 'pewil-export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess('Export downloaded successfully!');
    } catch (err) {
      setError(err.response?.data?.detail || 'Export failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Explainer */}
      <div style={S.card}>
        <h3 style={S.title}>Export Your Data</h3>
        <p style={S.p}>
          Download all your Pewil data at any time. Your data belongs to you, and we make it easy to take it with you.
          Exports include all records from your tenant: fields, livestock, sales, costs, inventory, team members, and more.
        </p>
      </div>

      {/* Format selection */}
      <div style={S.card}>
        <h3 style={S.title}>Choose Format</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={S.optionCard(format === 'csv')} onClick={() => setFormat('csv')}>
            <div style={S.optionTitle}>CSV (Spreadsheet)</div>
            <div style={S.optionDesc}>
              Downloads as a ZIP file containing one CSV per data type.
              Perfect for opening in Excel, Google Sheets, or any spreadsheet tool.
            </div>
          </div>
          <div style={S.optionCard(format === 'json')} onClick={() => setFormat('json')}>
            <div style={S.optionTitle}>JSON (Developer)</div>
            <div style={S.optionDesc}>
              Single JSON file with all your data in a structured format.
              Ideal for importing into other systems or custom processing.
            </div>
          </div>
        </div>
      </div>

      {/* What's included */}
      <div style={S.card}>
        <h3 style={S.title}>What's Included</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {[
            'Fields & crops', 'Livestock records', 'Sales & market trips',
            'Costs & expenses', 'Stock & inventory', 'Workers & hours',
            'Harvest data', 'Budget entries', 'Water & irrigation',
            'Loans & credit', 'Farm assets', 'Products (retail)',
            'Customers', 'Sales history', 'Suppliers & POs',
            'Invoices & billing',
          ].map((item) => (
            <div key={item} style={{ fontSize: 12, color: '#374151', padding: '6px 10px', background: '#f6f8f6', borderRadius: 8, border: '1px solid #f3f4f6' }}>
              {'\u2713'} {item}
            </div>
          ))}
        </div>
      </div>

      {/* Action */}
      <div style={S.card}>
        {error && (
          <div style={{ background: '#fef2f2', color: '#991b1b', padding: '10px 14px', borderRadius: 10, fontSize: 12, marginBottom: 12 }}>{error}</div>
        )}
        {success && (
          <div style={{ background: '#e8f5ee', color: '#1a6b3a', padding: '10px 14px', borderRadius: 10, fontSize: 12, marginBottom: 12 }}>{success}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={S.btn(true)} onClick={handleExport} disabled={loading}>
            {loading ? 'Preparing export...' : `Download ${format.toUpperCase()} Export`}
          </button>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>
            This may take a moment for large datasets.
          </span>
        </div>
      </div>

      {/* Privacy note */}
      <div style={{ ...S.card, background: '#fffbeb', border: '1px solid #fde68a' }}>
        <h3 style={{ ...S.title, color: '#92400e' }}>Privacy Note</h3>
        <p style={{ ...S.p, color: '#92400e', fontSize: 12 }}>
          Your exported file contains sensitive business data. Store it securely and do not share it with untrusted parties.
          Exports are only available to tenant owners for security reasons.
        </p>
      </div>
    </div>
  );
}
