import React, { useState, useRef } from 'react';
import axios from 'axios';

const S = {
  page: { maxWidth: 780, margin: '0 auto' },
  header: { marginBottom: 20 },
  title: { fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", fontSize: 22, fontWeight: 700, color: '#111827' },
  sub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  card: { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 10, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 6 },
  cardText: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  greenCard: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 20, marginBottom: 16 },
  btn: { padding: '10px 20px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'opacity .15s' },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  dropzone: (active) => ({
    border: `2px dashed ${active ? '#1a6b3a' : '#d1d5db'}`,
    borderRadius: 10, padding: '36px 20px', textAlign: 'center',
    cursor: 'pointer', transition: 'all .2s',
    background: active ? '#f0fdf4' : '#fafafa',
  }),
  dropIcon: { fontSize: 32, marginBottom: 8 },
  dropText: { fontSize: 12, color: '#6b7280' },
  dropHint: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
  fileName: { fontSize: 12, fontWeight: 600, color: '#1a6b3a', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 },
  resultBox: (color) => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
    borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 6,
    background: color === 'green' ? '#f0fdf4' : color === 'amber' ? '#fefce8' : '#fef2f2',
    color: color === 'green' ? '#166534' : color === 'amber' ? '#92400e' : '#991b1b',
    border: `1px solid ${color === 'green' ? '#bbf7d0' : color === 'amber' ? '#fde68a' : '#fecaca'}`,
  }),
  detailsToggle: { background: 'none', border: 'none', color: '#1a6b3a', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '6px 0', marginTop: 4 },
  detailList: { fontSize: 11, color: '#374151', lineHeight: 1.8, padding: '8px 0 0', maxHeight: 300, overflowY: 'auto' },
  detailItem: (type) => ({ padding: '3px 0', borderBottom: '1px solid #f3f4f6', color: type === 'error' ? '#991b1b' : type === 'skip' ? '#92400e' : '#374151' }),
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 8 },
  th: { textAlign: 'left', padding: '8px 10px', fontSize: 10, fontWeight: 700, color: '#6b7280', borderBottom: '2px solid #e3e8e4', background: '#f6f8f6' },
  td: { padding: '8px 10px', borderBottom: '1px solid #f3f4f6', color: '#374151', verticalAlign: 'top' },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: '#991b1b', marginBottom: 12 },
};

const TEMPLATE_INFO = [
  { sheet: 'Fields', columns: 'name, crop, size_ha, plant_date, notes', notes: 'crop: tomatoes / maize / tobacco / vegetables / other' },
  { sheet: 'Workers', columns: 'name, role, pay_type, rate', notes: 'pay_type: hourly / daily / monthly' },
  { sheet: 'Stock', columns: 'name, category, unit, opening_qty, unit_cost, alert_at', notes: 'category: chemical / fertilizer / seed / equipment / fuel' },
  { sheet: 'Expenses', columns: 'field, description, amount, category, expense_date, logged_by', notes: 'field must match an existing field name' },
];

export default function Import() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const fileRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setSelectedFile(file);
      setResults(null);
      setError('');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResults(null);
      setError('');
    }
  };

  const downloadTemplate = () => {
    window.open(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/api/import/template/`, '_blank');
  };

  async function handleImport() {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/api/import/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      setResults(res.data);
    } catch (err) {
      setError('Import failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }

  const created = Array.isArray(results?.created) ? results.created : [];
  const skipped = Array.isArray(results?.skipped) ? results.skipped : [];
  const errors = Array.isArray(results?.errors) ? results.errors : [];

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.title}>📥 Import Data from Excel</div>
        <div style={S.sub}>Upload an Excel file to populate fields, workers, stock, and expenses all at once.</div>
      </div>

      {/* Step 1 — Download template */}
      <div style={S.greenCard}>
        <div style={S.cardTitle}>Step 1 — Download the template</div>
        <div style={S.cardText}>Download our Excel template, fill it in, then upload it below.</div>
        <button style={S.btn} onClick={downloadTemplate}>
          📥 Download Excel Template
        </button>
      </div>

      {/* Step 2 — Upload */}
      <div style={S.card}>
        <div style={S.cardTitle}>Step 2 — Upload your filled template</div>
        <div style={S.cardText}>Drag and drop or click to browse for your completed Excel file.</div>

        <div
          style={S.dropzone(dragActive)}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div style={S.dropIcon}>📤</div>
          <div style={S.dropText}>Drag and drop your Excel file here, or click to browse</div>
          <div style={S.dropHint}>Accepts .xlsx and .xls files only</div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {selectedFile && (
          <div style={S.fileName}>
            📎 {selectedFile.name}
            <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400 }}>
              ({(selectedFile.size / 1024).toFixed(1)} KB)
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setResults(null); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 11, fontWeight: 700, marginLeft: 4 }}
            >
              ✕ Remove
            </button>
          </div>
        )}

        <button
          style={{ ...S.btn, marginTop: 14, width: '100%', justifyContent: 'center', ...((!selectedFile || loading) ? S.btnDisabled : {}) }}
          onClick={handleImport}
          disabled={!selectedFile || loading}
        >
          {loading ? '⏳ Importing…' : '📥 Import Data'}
        </button>
      </div>

      {/* Error */}
      {error && <div style={S.errorBox}>{error}</div>}

      {/* Results */}
      {results && (
        <div style={S.card}>
          <div style={S.cardTitle}>Import Results</div>

          {created.length > 0 && (
            <div style={S.resultBox('green')}>
              ✓ {created.length} record{created.length !== 1 ? 's' : ''} created successfully
            </div>
          )}
          {skipped.length > 0 && (
            <div style={S.resultBox('amber')}>
              ⚠ {skipped.length} row{skipped.length !== 1 ? 's' : ''} skipped (already exist)
            </div>
          )}
          {errors.length > 0 && (
            <div style={S.resultBox('red')}>
              ✗ {errors.length} error{errors.length !== 1 ? 's' : ''}
            </div>
          )}
          {created.length === 0 && skipped.length === 0 && errors.length === 0 && (
            <div style={{ fontSize: 12, color: '#6b7280' }}>No data was processed. Check that the file matches the template structure.</div>
          )}

          {(created.length > 0 || skipped.length > 0 || errors.length > 0) && (
            <>
              <button style={S.detailsToggle} onClick={() => setShowDetails(!showDetails)}>
                {showDetails ? '▾ Hide details' : '▸ View details'}
              </button>
              {showDetails && (
                <div style={S.detailList}>
                  {created.map((item, i) => (
                    <div key={`c-${i}`} style={S.detailItem('created')}>✓ Created: {item}</div>
                  ))}
                  {skipped.map((item, i) => (
                    <div key={`s-${i}`} style={S.detailItem('skip')}>⚠ Skipped: {item}</div>
                  ))}
                  {errors.map((item, i) => (
                    <div key={`e-${i}`} style={S.detailItem('error')}>✗ Error: {item}</div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Instructions / Template structure */}
      <div style={S.card}>
        <div style={S.cardTitle}>📋 Excel Template Structure</div>
        <div style={S.cardText}>Your Excel file should have these sheets with the following columns:</div>
        <div style={{ overflowX: 'auto' }}><table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Sheet Name</th>
              <th style={S.th}>Column Names</th>
              <th style={S.th}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {TEMPLATE_INFO.map((row, i) => (
              <tr key={i}>
                <td style={{ ...S.td, fontWeight: 700 }}>{row.sheet}</td>
                <td style={S.td}><code style={{ fontSize: 10, background: '#f3f4f6', padding: '2px 4px', borderRadius: 3 }}>{row.columns}</code></td>
                <td style={{ ...S.td, fontSize: 10, color: '#6b7280' }}>{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
