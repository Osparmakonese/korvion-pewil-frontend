import { useState, useEffect, useCallback } from 'react';
import { getAuditLog } from '../api/authApi';

const S = {
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '18px 20px', marginBottom: 16 },
  title: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #e5e7eb', fontWeight: 700, fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '8px 10px', borderBottom: '1px solid #f3f4f6', color: '#374151', verticalAlign: 'top' },
  badge: (color) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: color === 'green' ? '#e8f5ee' : color === 'amber' ? '#fffbeb' : color === 'red' ? '#fef2f2' : '#f3f4f6', color: color === 'green' ? '#1a6b3a' : color === 'amber' ? '#92400e' : color === 'red' ? '#991b1b' : '#374151' }),
  filterBar: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' },
  select: { padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, color: '#374151', outline: 'none', background: '#fff' },
  btn: (active) => ({ padding: '6px 14px', border: active ? 'none' : '1px solid #e5e7eb', background: active ? '#1a6b3a' : '#fff', color: active ? '#fff' : '#374151', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }),
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
};

const ACTION_COLORS = { 0: 'green', 1: 'amber', 2: 'red' }; // 0=create, 1=update, 2=delete
const ACTION_LABELS = { 0: 'Created', 1: 'Updated', 2: 'Deleted' };

export default function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const limit = 25;

  const fetchEntries = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { page, limit };
      if (actionFilter) params.action = actionFilter;
      const res = await getAuditLog(params);
      // getAuditLog already unwraps axios's .data, so `res` is the JSON body
      // { count, page, limit, results }.  The previous code (res.data.results)
      // was double-unwrapping and always resolved to [].
      setEntries(res.results || []);
      setTotal(res.count || 0);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load audit log.');
    } finally { setLoading(false); }
  }, [page, actionFilter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const totalPages = Math.ceil(total / limit) || 1;

  const formatDate = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('en-ZW', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-ZW', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={S.card}>
        <h3 style={S.title}>Audit Log</h3>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
          Complete record of all changes made by your team. Available to owners and managers.
        </p>

        {/* Filters */}
        <div style={S.filterBar}>
          <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Filter:</span>
          <button style={S.btn(!actionFilter)} onClick={() => { setActionFilter(''); setPage(1); }}>All</button>
          <button style={S.btn(actionFilter === '0')} onClick={() => { setActionFilter('0'); setPage(1); }}>Created</button>
          <button style={S.btn(actionFilter === '1')} onClick={() => { setActionFilter('1'); setPage(1); }}>Updated</button>
          <button style={S.btn(actionFilter === '2')} onClick={() => { setActionFilter('2'); setPage(1); }}>Deleted</button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', color: '#991b1b', padding: '10px 14px', borderRadius: 7, fontSize: 12, marginBottom: 12 }}>{error}</div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>Loading audit entries...</div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>No audit entries found.</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Date</th>
                    <th style={S.th}>User</th>
                    <th style={S.th}>Action</th>
                    <th style={S.th}>Model</th>
                    <th style={S.th}>Object</th>
                    <th style={S.th}>Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr key={entry.id || i}>
                      <td style={{ ...S.td, whiteSpace: 'nowrap', fontSize: 11 }}>{formatDate(entry.timestamp)}</td>
                      <td style={{ ...S.td, fontWeight: 600 }}>{entry.actor || '-'}</td>
                      <td style={S.td}>
                        <span style={S.badge(ACTION_COLORS[entry.action] || 'gray')}>
                          {ACTION_LABELS[entry.action] || entry.action}
                        </span>
                      </td>
                      <td style={S.td}>{entry.content_type || '-'}</td>
                      <td style={S.td}>{entry.object_repr || entry.object_id || '-'}</td>
                      <td style={{ ...S.td, fontSize: 11, color: '#6b7280', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.changes ? (typeof entry.changes === 'string' ? entry.changes : JSON.stringify(entry.changes).slice(0, 120)) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={S.pagination}>
              <span style={{ fontSize: 11, color: '#6b7280' }}>
                Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total} entries
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  style={S.btn(false)}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </button>
                <span style={{ fontSize: 11, color: '#374151', padding: '6px 10px' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  style={S.btn(false)}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
