import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminUsers, createAdminUser, updateAdminUser,
  resetAdminPassword, deactivateUser, reactivateUser, getAuditTrail,
} from '../api/farmApi';
import { useAuth } from '../context/AuthContext';
import { initials, avatarColor } from '../utils/format';
import PasswordPolicyPanel from '../components/PasswordPolicyPanel';

const TABS = ['Users', 'Permissions', 'Audit Trail', 'Password Policy'];
const ROLES = ['owner', 'manager', 'worker'];
// Per-module permission flags. `module: 'any'` is always shown; 'farm' or
// 'retail' entries are shown only when the tenant subscribes to that module.
// Retail-only tenants thus never see the farm-specific toggles.
const ALL_PERMS = [
  { key: 'can_view_report',  label: 'Can view Reports',        module: 'any' },
  { key: 'can_view_stock',   label: 'Can view Stock',          module: 'any' },
  { key: 'can_view_sales',   label: 'Can view Sales',          module: 'any' },
  { key: 'can_view_costs',   label: 'Can view Costs',          module: 'farm' },
  { key: 'can_view_workers', label: 'Can view Workers',        module: 'farm' },
  { key: 'can_view_hours',   label: 'Can view Hours & Pay',    module: 'farm' },
];
const emptyUser = { first_name: '', last_name: '', username: '', email: '', role: 'worker', password: '' };

const S = {
  header: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18,
  },
  headerTitle: {
    fontSize: 20, fontWeight: 700, color: '#111827',
    fontFamily: "'Playfair Display', serif",
  },
  headerSub: { fontSize: 11, color: '#6b7280' },
  superBadge: {
    background: '#c0392b', color: '#fff', fontSize: 9, fontWeight: 700,
    padding: '3px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  tabs: {
    display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb', marginBottom: 20,
  },
  tab: (active) => ({
    padding: '10px 18px', fontSize: 12, fontWeight: active ? 700 : 500,
    color: active ? '#1a6b3a' : '#6b7280', cursor: 'pointer',
    borderBottom: active ? '2px solid #1a6b3a' : '2px solid transparent',
    marginBottom: -2, background: 'none', border: 'none', fontFamily: 'inherit',
    transition: 'color 0.15s',
  }),
  card: {
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
    padding: '18px 20px', marginBottom: 14,
  },
  btn: (bg = '#1a6b3a', color = '#fff') => ({
    padding: '8px 14px', background: bg, color, border: 'none',
    borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  }),
  btnSm: (bg = '#f3f4f6', color = '#374151') => ({
    padding: '5px 10px', background: bg, color, border: 'none',
    borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
  }),
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
  th: {
    textAlign: 'left', padding: '8px 10px', fontSize: 9, fontWeight: 700,
    color: '#9ca3af', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb',
    background: '#f9fafb',
  },
  td: { padding: '8px 10px', borderBottom: '1px solid #f3f4f6', color: '#374151' },
  label: { display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 3, marginTop: 8 },
  input: {
    width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb',
    borderRadius: 7, fontSize: 12, outline: 'none', color: '#111827',
  },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    background: '#fff', borderRadius: 12, padding: 24, width: 420,
    maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
  modalTitle: { fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16 },
  pillGreen: {
    display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10,
    fontWeight: 600, background: '#e8f5ee', color: '#1a6b3a',
  },
  pillRed: {
    display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10,
    fontWeight: 600, background: '#fdecea', color: '#c0392b',
  },
  toggle: (on) => ({
    width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
    background: on ? '#1a6b3a' : '#d1d5db', position: 'relative',
    border: 'none', transition: 'background 0.2s', flexShrink: 0,
  }),
  toggleDot: (on) => ({
    position: 'absolute', top: 2, left: on ? 18 : 2,
    width: 16, height: 16, borderRadius: '50%', background: '#fff',
    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  }),
  locked: { textAlign: 'center', padding: 60, color: '#6b7280' },
  avatar: (bg) => ({
    width: 28, height: 28, borderRadius: '50%', background: bg, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 9, fontWeight: 700, flexShrink: 0,
  }),
};

/* ── Toggle Switch component ── */
function Toggle({ on, onChange }) {
  return (
    <button style={S.toggle(on)} onClick={() => onChange(!on)}>
      <div style={S.toggleDot(on)} />
    </button>
  );
}

export default function AdminPanel() {
  const { user } = useAuth();
  const role = user?.role || 'worker';
  const isSuperAdmin = !!user?.is_super_admin;
  const qc = useQueryClient();

  // Module-aware permission list. Retail-only tenants won't see Costs /
  // Workers / Hours toggles; farm-only tenants won't see any retail-specific
  // ones if those get added later. Falls back to showing all flags when the
  // tenant has both modules (or none populated — legacy backward-compat).
  const modules = user?.modules || [];
  const hasFarm = modules.includes('farm');
  const hasRetail = modules.includes('retail');
  const PERMS = modules.length === 0
    ? ALL_PERMS
    : ALL_PERMS.filter(p =>
        p.module === 'any'
        || (p.module === 'farm' && hasFarm)
        || (p.module === 'retail' && hasRetail)
      );

  const [activeTab, setActiveTab] = useState('Users');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState(emptyUser);
  const [resetPw, setResetPw] = useState({});       // { [userId]: 'newPass' }
  const [showResetFor, setShowResetFor] = useState(null);
  const [savedFlash, setSavedFlash] = useState(null); // userId for perm flash
  const [auditFilter, setAuditFilter] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: getAdminUsers,
    enabled: role === 'owner',
  });
  const { data: auditData = [] } = useQuery({
    queryKey: ['auditTrail'],
    queryFn: getAuditTrail,
    enabled: role === 'owner' && activeTab === 'Audit Trail',
  });

  const createMut = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminUsers'] }); setShowAddUser(false); setNewUser(emptyUser); },
  });
  const updateMut = useMutation({
    mutationFn: updateAdminUser,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['adminUsers'] });
      setSavedFlash(vars.id);
      setTimeout(() => setSavedFlash(null), 1500);
    },
  });
  const resetMut = useMutation({
    mutationFn: ({ userId, newPassword }) => resetAdminPassword(userId, newPassword),
    onSuccess: () => { setShowResetFor(null); setResetPw({}); },
  });
  const deactivateMut = useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminUsers'] }),
  });
  const reactivateMut = useMutation({
    mutationFn: reactivateUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminUsers'] }),
  });

  const filteredAudit = useMemo(() => {
    if (!auditFilter) return auditData;
    return auditData.filter(a => a.user === auditFilter);
  }, [auditData, auditFilter]);

  const auditUsers = useMemo(() => {
    const set = new Set(auditData.map(a => a.user));
    return [...set].sort();
  }, [auditData]);

  if (role !== 'owner') {
    return <div style={S.locked}><div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div><p>Admin Panel is only available to the tenant owner.</p></div>;
  }

  const exportCSV = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Model', 'Record', 'Changes'];
    const rows = filteredAudit.map(a => [a.timestamp, a.user, a.action, a.model, a.object, JSON.stringify(a.changes || '')]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'audit_trail.csv'; link.click();
    URL.revokeObjectURL(url);
  };

  const actionBg = (action) => {
    const a = (action || '').toLowerCase();
    if (a.includes('create')) return '#f0fdf4';
    if (a.includes('delete')) return '#fef2f2';
    if (a.includes('update')) return '#fffbeb';
    return 'transparent';
  };

  return (
    <>
      {/* Header */}
      <div style={S.header}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={S.headerTitle}>
              {isSuperAdmin ? '🔐 Super Admin Panel' : '🛡 Team & Access'}
            </span>
            <span style={isSuperAdmin ? S.superBadge : { ...S.superBadge, background: '#1a6b3a' }}>
              {isSuperAdmin ? 'SUPER ADMIN' : 'OWNER'}
            </span>
          </div>
          <div style={S.headerSub}>
            {isSuperAdmin
              ? 'Platform administration — visible across every tenant'
              : 'Your team, permissions, and audit log — scoped to your organisation'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t} style={S.tab(activeTab === t)} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {/* ═══════ TAB 1: Users ═══════ */}
      {activeTab === 'Users' && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <button style={S.btn()} onClick={() => setShowAddUser(true)}>＋ Add User</button>
          </div>

          {isLoading && <p style={{ fontSize: 11, color: '#9ca3af' }}>Loading users…</p>}

          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Name</th>
                  <th style={S.th}>Username</th>
                  <th style={S.th}>Email</th>
                  <th style={S.th}>Role</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Last Login</th>
                  <th style={S.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const ac = avatarColor(u.username || '');
                  return (
                    <tr key={u.id}>
                      <td style={S.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={S.avatar(ac.bg)}>{initials(u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username)}</div>
                          <span style={{ fontWeight: 600 }}>{u.first_name} {u.last_name}</span>
                        </div>
                      </td>
                      <td style={S.td}>{u.username}</td>
                      <td style={S.td}>{u.email || '—'}</td>
                      <td style={S.td}><span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{u.role}</span></td>
                      <td style={S.td}>
                        <span style={u.is_active ? S.pillGreen : S.pillRed}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={S.td}>{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <button style={S.btnSm('#e8f5ee', '#1a6b3a')} onClick={() => { setActiveTab('Permissions'); }}>
                            Permissions
                          </button>
                          <button style={S.btnSm('#f3f4f6', '#374151')} onClick={() => setShowResetFor(showResetFor === u.id ? null : u.id)}>
                            Reset PW
                          </button>
                          {u.username !== user?.username && (
                            u.is_active ? (
                              <button
                                style={S.btnSm('#fdecea', '#c0392b')}
                                onClick={() => deactivateMut.mutate(u.id)}
                                disabled={deactivateMut.isPending}
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                style={S.btnSm('#e8f5ee', '#1a6b3a')}
                                onClick={() => reactivateMut.mutate(u.id)}
                                disabled={reactivateMut.isPending}
                              >
                                Reactivate
                              </button>
                            )
                          )}
                        </div>
                        {showResetFor === u.id && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                            <input
                              style={{ ...S.input, width: 140 }}
                              type="password"
                              placeholder="New password"
                              value={resetPw[u.id] || ''}
                              onChange={e => setResetPw(p => ({ ...p, [u.id]: e.target.value }))}
                            />
                            <button
                              style={S.btnSm('#1a6b3a', '#fff')}
                              onClick={() => resetMut.mutate({ userId: u.id, newPassword: resetPw[u.id] || '' })}
                              disabled={resetMut.isPending || !(resetPw[u.id]?.length >= 6)}
                            >
                              {resetMut.isPending ? '…' : 'Reset'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && users.length === 0 && (
                  <tr><td style={S.td} colSpan={7}>No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add User Modal */}
          {showAddUser && (
            <div style={S.overlay} onClick={() => setShowAddUser(false)}>
              <div style={S.modal} onClick={e => e.stopPropagation()}>
                <div style={S.modalTitle}>Add New User</div>
                <form onSubmit={e => { e.preventDefault(); createMut.mutate(newUser); }}>
                  <div className="form-grid-2" style={S.row2}>
                    <div>
                      <label style={S.label}>First Name</label>
                      <input style={S.input} value={newUser.first_name} onChange={e => setNewUser(p => ({ ...p, first_name: e.target.value }))} required />
                    </div>
                    <div>
                      <label style={S.label}>Last Name</label>
                      <input style={S.input} value={newUser.last_name} onChange={e => setNewUser(p => ({ ...p, last_name: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="form-grid-2" style={S.row2}>
                    <div>
                      <label style={S.label}>Username</label>
                      <input style={S.input} value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} required />
                    </div>
                    <div>
                      <label style={S.label}>Email</label>
                      <input style={S.input} type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-grid-2" style={S.row2}>
                    <div>
                      <label style={S.label}>Role</label>
                      <select style={S.input} value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                        {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>Password</label>
                      <input style={S.input} type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} required minLength={6} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                    <button type="button" style={S.btn('#f3f4f6', '#374151')} onClick={() => setShowAddUser(false)}>Cancel</button>
                    <button type="submit" style={S.btn()} disabled={createMut.isPending}>{createMut.isPending ? 'Creating…' : 'Create User'}</button>
                  </div>
                  {createMut.isError && <p style={{ color: '#c0392b', fontSize: 10, marginTop: 6 }}>{createMut.error?.response?.data?.detail || JSON.stringify(createMut.error?.response?.data) || 'Failed'}</p>}
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ TAB 2: Permissions ═══════ */}
      {activeTab === 'Permissions' && (
        <div>
          {users.filter(u => u.role !== 'owner').length === 0 && (
            <p style={{ fontSize: 11, color: '#9ca3af' }}>No non-owner users to manage permissions for.</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {users.filter(u => u.role !== 'owner').map(u => {
              const ac = avatarColor(u.username || '');
              return (
                <div key={u.id} style={S.card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={S.avatar(ac.bg)}>{initials(u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username)}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{u.first_name} {u.last_name || u.username}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'capitalize' }}>{u.role}</div>
                    </div>
                    {savedFlash === u.id && (
                      <span style={{ ...S.pillGreen, marginLeft: 'auto', animation: 'fadeIn 0.3s' }}>Saved ✓</span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {PERMS.map(p => (
                      <div key={p.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                        <span style={{ fontSize: 11, color: '#374151' }}>{p.label}</span>
                        <Toggle
                          on={u[p.key] !== false}
                          onChange={(val) => updateMut.mutate({ id: u.id, [p.key]: val })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════ TAB 3: Audit Trail ═══════ */}
      {activeTab === 'Audit Trail' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <select
              style={{ ...S.input, width: 200 }}
              value={auditFilter}
              onChange={e => setAuditFilter(e.target.value)}
            >
              <option value="">All users</option>
              {auditUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <button style={S.btn()} onClick={exportCSV}>📥 Export to CSV</button>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{filteredAudit.length} entries</span>
          </div>

          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Timestamp</th>
                  <th style={S.th}>User</th>
                  <th style={S.th}>Action</th>
                  <th style={S.th}>Model</th>
                  <th style={S.th}>Record</th>
                  <th style={S.th}>What Changed</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudit.map(a => (
                  <tr key={a.id} style={{ background: actionBg(a.action) }}>
                    <td style={S.td}>{a.timestamp}</td>
                    <td style={{ ...S.td, fontWeight: 600 }}>{a.user}</td>
                    <td style={S.td}>
                      <span style={{
                        fontWeight: 600,
                        color: (a.action || '').toLowerCase().includes('create') ? '#1a6b3a'
                          : (a.action || '').toLowerCase().includes('delete') ? '#c0392b' : '#c97d1a',
                      }}>
                        {a.action}
                      </span>
                    </td>
                    <td style={{ ...S.td, textTransform: 'capitalize' }}>{a.model}</td>
                    <td style={S.td}>{a.object}</td>
                    <td style={{ ...S.td, fontSize: 10, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {typeof a.changes === 'string' ? a.changes : JSON.stringify(a.changes || '')}
                    </td>
                  </tr>
                ))}
                {filteredAudit.length === 0 && (
                  <tr><td style={S.td} colSpan={6}>No audit entries found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════ TAB 4: Password Policy ═══════ */}
      {activeTab === 'Password Policy' && (
        <div style={{ maxWidth: 560 }}>
          <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>
            Set the password rules enforced across your organisation. These apply to every
            new password, reset, and team-member account.
          </p>
          <PasswordPolicyPanel />
        </div>
      )}
    </>
  );
}
