import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { getPasswordPolicy } from '../api/authApi';
import { initials, avatarColor } from '../utils/format';

// Generate a password that satisfies any tenant policy: always one of each
// character class, length meets the policy minimum. Excludes look-alike
// characters (0/O, 1/l) for readability when shared with a new teammate.
function strongPassword(policy) {
  const P = policy || {};
  const target = Math.max(Number(P.min_length) || 12, 14);
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digit = '23456789';
  const symbol = '!@#$%*?-_';
  const all = upper + lower + digit + symbol;
  const pick = (set) => set[Math.floor(Math.random() * set.length)];
  const chars = [pick(upper), pick(lower), pick(digit), pick(symbol)];
  while (chars.length < target) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' };
const pill = (bg, color) => ({ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, display: 'inline-block', letterSpacing: '0.02em', textTransform: 'uppercase', background: bg, color });
const sLabel = { fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 };
const btnS = (primary) => ({ padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: primary ? 'none' : '1px solid #1a6b3a', background: primary ? '#1a6b3a' : '#fff', color: primary ? '#fff' : '#1a6b3a', display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' });
const thS = { textAlign: 'left', padding: '7px 8px', fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f9fafb' };

const roleColors = {
  'owner': '#1a6b3a',
  'manager': '#2563eb',
  'cashier': '#c97d1a',
  'worker': '#9ca3af',
};

const roleBadgeBg = {
  'owner': '#e8f5ee',
  'manager': '#EFF6FF',
  'cashier': '#FEF3C7',
  'worker': '#F3F4F6',
};

function getUsers() {
  return api.get('/core/tenants/users/').then(res => res.data);
}

function inviteUser(data) {
  return api.post('/core/tenants/invite/', data).then(res => res.data);
}

function updateUser(id, data) {
  return api.patch(`/core/tenants/users/${id}/`, data).then(res => res.data);
}

export default function TeamManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    password: '',
    role: 'worker',
  });
  const { data: policy } = useQuery({ queryKey: ['passwordPolicy'], queryFn: getPasswordPolicy, staleTime: 60000 });
  const [autoPassword, setAutoPassword] = useState(true);
  const [inviteStatus, setInviteStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [inviteMessage, setInviteMessage] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', role: 'worker' });
  const [editStatus, setEditStatus] = useState(null);

  const { data: usersData = { count: 0, results: [] }, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    staleTime: 60000,
  });

  const inviteMut = useMutation({
    mutationFn: inviteUser,
    onSuccess: () => {
      setInviteStatus('success');
      setInviteMessage('User invited successfully!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setTimeout(() => {
        setShowInviteModal(false);
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          username: '',
          password: '',
          role: 'worker',
        });
        setInviteStatus(null);
      }, 2000);
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || 'Failed to invite user. Please try again.';
      setInviteStatus('error');
      setInviteMessage(msg);
    },
  });

  const updateUserMut = useMutation({
    mutationFn: ({ id, data }) => updateUser(id, data),
    onSuccess: () => {
      setEditStatus('success');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setTimeout(() => { setEditUser(null); setEditStatus(null); }, 1500);
    },
    onError: (err) => {
      const msg = err?.response?.data?.detail || 'Failed to update user.';
      setEditStatus('error');
    },
  });

  const handleEditSubmit = () => {
    if (!editUser) return;
    updateUserMut.mutate({ id: editUser.id, data: { first_name: editForm.first_name, last_name: editForm.last_name, role: editForm.role } });
  };

  const handleInviteSubmit = () => {
    if (!formData.first_name.trim()) {
      setInviteStatus('error');
      setInviteMessage('First name is required');
      return;
    }
    if (!formData.email.trim()) {
      setInviteStatus('error');
      setInviteMessage('Email is required');
      return;
    }
    if (!formData.username.trim()) {
      setInviteStatus('error');
      setInviteMessage('Username is required');
      return;
    }
    if (!autoPassword && !formData.password.trim()) {
      setInviteStatus('error');
      setInviteMessage('Password is required');
      return;
    }

    const payload = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      email: formData.email.trim(),
      username: formData.username.trim(),
      password: autoPassword ? strongPassword(policy) : formData.password,
      role: formData.role,
    };

    setInviteStatus('loading');
    inviteMut.mutate(payload);
  };

  const generatePassword = () => {
    const newPass = strongPassword(policy);
    setFormData({ ...formData, password: newPass });
  };

  const users = usersData?.results || [];
  const currentUserCount = users.length;

  // Determine max seats based on plan
  const maxSeats = {
    'starter': 3,
    'growth': 10,
    'enterprise': 999,
  }[user?.plan] || 3;

  const remainingSeats = maxSeats - currentUserCount;
  const seatUsagePercent = (currentUserCount / maxSeats) * 100;

  return (
    <div>
      {/* Header with invite button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Team & Users</h2>
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4, margin: 0 }}>Manage team members and permissions</p>
        </div>
        <button
          onClick={() => {
            setShowInviteModal(true);
            setInviteStatus(null);
            setFormData({ first_name: '', last_name: '', email: '', username: '', password: '', role: 'worker' });
          }}
          style={{ ...btnS(true), fontSize: 12, padding: '8px 14px' }}
        >
          {'\u002B'} Invite User
        </button>
      </div>

      {/* Seat usage bar */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Seat Usage</span>
          <span style={{ fontSize: 11, color: '#6b7280' }}>
            {currentUserCount} of {maxSeats} seats used · {remainingSeats} remaining · Extra seats: $5/user/month
          </span>
        </div>
        <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: 8,
            borderRadius: 4,
            width: Math.min(seatUsagePercent, 100) + '%',
            background: '#1a6b3a',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Users table */}
      {isLoading ? (
        <div style={{ ...card, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Loading team members...</div>
        </div>
      ) : (
        <div style={card}>
          <div style={sLabel}>Team Members</div>
          {users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
              <p style={{ fontSize: 12, marginBottom: 12 }}>No team members yet. Invite your first user to get started!</p>
              <button
                onClick={() => setShowInviteModal(true)}
                style={{ ...btnS(true), fontSize: 11, padding: '6px 12px' }}
              >
                {'\u002B'} Invite User
              </button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={thS}>User</th>
                  <th style={thS}>Role</th>
                  <th style={thS}>Module Access</th>
                  <th style={thS}>Status</th>
                  <th style={thS}>Last Active</th>
                  <th style={thS}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const initials_str = initials(u.username || '');
                  const ac = avatarColor(u.username || '');
                  const isOnline = u.last_login ? (new Date() - new Date(u.last_login)) < 300000 : false;
                  const lastActiveText = u.last_login
                    ? new Date(u.last_login).toLocaleDateString() + ' ' + new Date(u.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Never';

                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: ac.bg,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}>
                            {initials_str}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 12, color: '#111827' }}>
                              {u.first_name} {u.last_name}
                            </div>
                            <div style={{ fontSize: 10, color: '#6b7280' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={pill(roleBadgeBg[u.role] || '#f3f4f6', roleColors[u.role] || '#6b7280')}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: 11, color: '#374151' }}>Farm, Retail</td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: isOnline ? '#10b981' : '#d1d5db',
                          }} />
                          <span style={{ fontSize: 11, color: '#374151' }}>
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontSize: 11, color: '#6b7280' }}>
                        {lastActiveText}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {u.role !== 'owner' && (
                          <button style={{
                            background: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: 6,
                            padding: '4px 10px',
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#374151',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }} onClick={() => { setEditUser(u); setEditForm({ first_name: u.first_name || '', last_name: u.last_name || '', role: u.role || 'worker' }); setEditStatus(null); }} onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#1a6b3a'; e.currentTarget.style.color = '#1a6b3a'; }} onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}>
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* INVITE MODAL */}
      {showInviteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }} onClick={() => { if (inviteStatus !== 'loading') setShowInviteModal(false); }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: 28,
            width: 480,
            maxWidth: '90vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, margin: 0 }}>
                Invite Team Member
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                disabled={inviteStatus === 'loading'}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  cursor: inviteStatus === 'loading' ? 'default' : 'pointer',
                  color: '#6b7280',
                  padding: 0,
                  opacity: inviteStatus === 'loading' ? 0.5 : 1,
                }}
              >
                {'\u2715'}
              </button>
            </div>

            {/* Status messages */}
            {inviteStatus === 'success' && (
              <div style={{ background: '#e8f5ee', border: '1px solid #1a6b3a', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#1a6b3a' }}>{'\u2705'} {inviteMessage}</div>
              </div>
            )}

            {inviteStatus === 'error' && (
              <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#991B1B' }}>{inviteMessage}</div>
              </div>
            )}

            {inviteStatus !== 'success' && (
              <>
                {/* Full Name */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                    Full Name
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input
                      type="text"
                      placeholder="First name"
                      value={formData.first_name}
                      onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Last name"
                      value={formData.last_name}
                      onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Email */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Username */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                    Username
                  </label>
                  <input
                    type="text"
                    placeholder="johndoe"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>Password</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#6b7280', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={autoPassword}
                        onChange={e => {
                          setAutoPassword(e.target.checked);
                          if (e.target.checked) generatePassword();
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                      Auto-generate
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder={autoPassword ? 'Will be generated' : 'Enter password'}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      readOnly={autoPassword}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: autoPassword ? '#f9fafb' : '#fff',
                      }}
                    />
                    {autoPassword && (
                      <button
                        onClick={generatePassword}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 600,
                          background: '#fff',
                          color: '#374151',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#1a6b3a'; e.currentTarget.style.color = '#1a6b3a'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}
                      >
                        Refresh
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 4 }}>
                    {autoPassword ? 'Password will be auto-generated' : 'Use strong passwords with mix of characters'}
                  </div>
                </div>

                {/* Role */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="worker">Worker</option>
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                  </select>
                  <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 4 }}>
                    Worker: Basic access · Cashier: Transactions · Manager: Team management
                  </div>
                </div>

                {/* Module Access */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
                    Module Access
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {['Farm Module', 'Retail Module'].map(m => (
                      <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" defaultChecked style={{ cursor: 'pointer' }} />
                        <span style={{ fontSize: 12, color: '#374151' }}>{m}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleInviteSubmit}
                disabled={inviteStatus === 'loading' || inviteStatus === 'success'}
                style={{
                  ...btnS(true),
                  flex: 1,
                  justifyContent: 'center',
                  padding: '10px 16px',
                  fontSize: 13,
                  opacity: (inviteStatus === 'loading' || inviteStatus === 'success') ? 0.6 : 1,
                }}
              >
                {inviteStatus === 'loading' ? 'Sending...' : inviteStatus === 'success' ? 'Done' : 'Send Invite'}
              </button>
              <button
                onClick={() => setShowInviteModal(false)}
                disabled={inviteStatus === 'loading'}
                style={{
                  ...btnS(false),
                  justifyContent: 'center',
                  padding: '10px 16px',
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }} onClick={() => setEditUser(null)}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 28, width: 420, maxWidth: '90vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, margin: 0 }}>
                Edit User
              </h3>
              <button onClick={() => setEditUser(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>{'\u2715'}</button>
            </div>
            {editStatus === 'success' ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#1a6b3a', fontWeight: 600 }}>{'\u2705'} User updated!</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>First Name</label>
                    <input value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Last Name</label>
                    <input value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Role</label>
                  <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, background: '#fff', boxSizing: 'border-box' }}>
                    <option value="manager">Manager</option>
                    <option value="worker">Worker</option>
                    <option value="cashier">Cashier</option>
                  </select>
                </div>
                {editStatus === 'error' && <div style={{ color: '#c0392b', fontSize: 12, marginBottom: 12 }}>Failed to update user. Please try again.</div>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={handleEditSubmit} disabled={updateUserMut.isPending} style={{ ...btnS(true), flex: 1, justifyContent: 'center', padding: '10px 16px', fontSize: 13 }}>
                    {updateUserMut.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditUser(null)} style={{ ...btnS(false), flex: 1, justifyContent: 'center', padding: '10px 16px', fontSize: 13 }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
