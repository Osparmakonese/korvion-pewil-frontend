import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { getPasswordPolicy } from '../api/authApi';
import { initials, avatarColor } from '../utils/format';
import usePrimaryAction from '../hooks/usePrimaryAction';
import useIsMobile from '../hooks/useIsMobile';
import { listBranches } from '../api/retailApi';
import TeamShopSection from '../components/TeamShopSection';

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

const card = { background: '#fff', border: '1px solid #e3e8e4', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 2px rgba(15,23,18,0.04), 0 12px 28px -18px rgba(15,23,18,0.14)' };
const pill = (bg, color) => ({ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, display: 'inline-block', letterSpacing: '0.02em', textTransform: 'uppercase', background: bg, color });
const sLabel = { fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 };
const btnS = (primary) => ({ padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: primary ? 'none' : '1px solid #1a6b3a', background: primary ? '#1a6b3a' : '#fff', color: primary ? '#fff' : '#1a6b3a', display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' });
const thS = { textAlign: 'left', padding: '7px 8px', fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f6f8f6' };
// Person tile used inside a shop section.
const personS = { border: '1px solid #e8ece9', borderRadius: 12, background: '#fff', padding: '12px 13px' };
const miniSelectS = { width: '100%', padding: '7px 9px', border: '1px solid #e3e8e4', borderRadius: 8, fontSize: 12, background: '#fff', color: '#111827', boxSizing: 'border-box', cursor: 'pointer', outline: 'none' };
const fieldLabelS = { fontSize: 9.5, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 };

// Keyed by the stored role value. There is no 'cashier' role — retail simply
// labels 'worker' as "Cashier" (see roleLabel below).
const roleColors = {
  'owner': '#1a6b3a',
  'manager': '#2563eb',
  'worker': '#9ca3af',
};

const roleBadgeBg = {
  'owner': '#e8f5ee',
  'manager': '#EFF6FF',
  'worker': '#F3F4F6',
};

// Managers list above cashiers inside a shop — that is the order an owner
// reads a branch roster in.
const roleRank = { owner: 0, manager: 1, worker: 2 };

function getUsers() {
  return api.get('/core/tenants/users/').then(res => res.data);
}

function inviteUser(data) {
  return api.post('/core/tenants/invite/', data).then(res => res.data);
}

// The backend exposes user updates at .../users/<id>/permissions/ — there is no
// PATCH .../users/<id>/ route, so the previous path 404'd on every edit and the
// Edit User modal could never save anything.
function updateUser(id, data) {
  return api.patch(`/core/tenants/users/${id}/permissions/`, data).then(res => res.data);
}

export default function TeamManagement() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  // Retail calls a 'worker' a "Cashier"; farm calls them a "Worker". This is a
  // LABEL only — the stored role value is 'worker' in both cases. There is no
  // 'cashier' role in the database and adding one would mean migrating live
  // staff accounts that already have open cashier sessions.
  const isRetail = !!(user?.modules && user.modules[0] === 'retail');
  // The old "Module" column (one module per tenant, so the same value on
  // every row) was replaced by "Works at" + "Access" in the 2026-08-14
  // access rework — those answer real questions; the module never did.
  const roleLabel = (role) => {
    if (role === 'worker') return isRetail ? 'Cashier' : 'Worker';
    if (role === 'manager') return 'Manager';
    if (role === 'owner') return 'Owner';
    return role;
  };
  // ── Access rights ────────────────────────────────────────────────
  // These map 1:1 to the backend's permission booleans on the user row.
  // There are deliberately NO new roles here: a "cashier", "accountant"
  // or "view-only member" is role=worker plus a toggle combination —
  // the DB roles stay owner / manager / worker (see 4 Aug repair notes).
  const PERM_FIELDS = isRetail
    ? [
        { key: 'can_add_products', label: 'Add products', desc: 'Create new catalogue items' },
        { key: 'can_edit_products', label: 'Edit products & prices', desc: 'Change details, prices, stock' },
        { key: 'can_view_reports', label: 'View reports', desc: 'Sales, P&L, analytics' },
        { key: 'can_view_journal', label: 'View accounting journal', desc: 'Double-entry records' },
      ]
    : [
        { key: 'can_view_report', label: 'View P&L report', desc: '' },
        { key: 'can_view_costs', label: 'View costs', desc: '' },
        { key: 'can_view_workers', label: 'View workers', desc: '' },
        { key: 'can_view_stock', label: 'View stock', desc: '' },
        { key: 'can_view_sales', label: 'View sales', desc: '' },
        { key: 'can_view_hours', label: 'View hours & pay', desc: '' },
      ];
  const permsFromUser = (u) => Object.fromEntries(
    PERM_FIELDS.map(f => [f.key, u ? u[f.key] !== false : true])
  );
  // One-click profiles — shorthand for a role + toggle combination.
  // Role part applies only when the editor is the owner (role changes
  // are owner-only server-side); toggles apply for managers too.
  const PRESETS = isRetail ? [
    { name: 'Cashier — till only', role: 'worker',
      perms: { can_add_products: false, can_edit_products: false, can_view_reports: false, can_view_journal: false } },
    { name: 'Senior cashier', role: 'worker',
      perms: { can_add_products: true, can_edit_products: true, can_view_reports: false, can_view_journal: false } },
    { name: 'Shop manager', role: 'manager',
      perms: { can_add_products: true, can_edit_products: true, can_view_reports: true, can_view_journal: true } },
    { name: 'View only — accountant', role: 'worker',
      perms: { can_add_products: false, can_edit_products: false, can_view_reports: true, can_view_journal: true } },
  ] : [];
  // Human summary of what a person can actually do, for the team list.
  const accessSummary = (u) => {
    if (u.role === 'owner') return 'Everything';
    if (!isRetail) return roleLabel(u.role);
    const canSell = u.role === 'worker' || u.role === 'manager';
    const edits = (u.can_add_products !== false) || (u.can_edit_products !== false);
    const views = (u.can_view_reports !== false) || (u.can_view_journal !== false);
    if (!edits && views && u.role === 'worker') return 'View only';
    const parts = [];
    if (canSell) parts.push('Till');
    if (edits) parts.push('Products');
    if (views) parts.push('Reports');
    return parts.length ? parts.join(' · ') : 'Till only';
  };
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    password: '',
    role: 'worker',
    branch: '',
  });
  const { data: policy } = useQuery({ queryKey: ['passwordPolicy'], queryFn: getPasswordPolicy, staleTime: 60000 });
  const [autoPassword, setAutoPassword] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [inviteStatus, setInviteStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [inviteMessage, setInviteMessage] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', role: 'worker', branch: '', can_view_all_branches: false, perms: {} });
  const [editStatus, setEditStatus] = useState(null);
  const [editMessage, setEditMessage] = useState('');
  // Inline (in-card) saves — shop picker and the all-shops toggle. Kept
  // separate from the Edit modal's state so a failure shows against the
  // person it belongs to instead of in a modal that isn't open.
  const [quickError, setQuickError] = useState(null); // { id, msg }

  const { data: usersData = { count: 0, results: [] }, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    staleTime: 60000,
  });

  // Shops, for the "Works at" picker. Retail only — a farm tenant has no
  // branches — and the shop layout itself stays hidden until there are 2+, so
  // a single-shop owner never meets the concept.
  const { data: branchList = [] } = useQuery({
    queryKey: ['retail-branches'],
    queryFn: listBranches,
    enabled: isRetail,
    staleTime: 60000,
  });
  // Memoised because the shop grouping below depends on them — a fresh array
  // identity on every render would make that useMemo pointless (and CRA's
  // exhaustive-deps rule says so, which fails the build under CI=true).
  const branches = useMemo(
    () => (Array.isArray(branchList) ? branchList : (Array.isArray(branchList?.results) ? branchList.results : [])),
    [branchList]
  );

  const users = useMemo(
    () => (Array.isArray(usersData?.results) ? usersData.results : []),
    [usersData]
  );

  // 2026-07-30: seat-limit/pricing removed. Team size is not capped by
  // plan and is not billed per-seat -- only certain features are
  // plan-gated, not headcount.

  // A second shop is the moment the flat list stops describing the business.
  // Below that, keep the plain table — a single-shop tenant should never be
  // asked "which shop?" about anything.
  const multiShop = isRetail && branches.length > 1;
  // Only the owner may move people between shops or grant the all-shops
  // right; the server rejects those keys from a manager anyway.
  const isOwner = user?.role === 'owner';
  const canAssign = isOwner && multiShop;

  // ── Group the team by shop ───────────────────────────────────────
  // Driven by the SHOP list, not the people list, so a branch created five
  // minutes ago shows up immediately with an empty state instead of being
  // invisible until someone happens to be assigned to it.
  const { shopSections, unassigned } = useMemo(() => {
    const map = new Map();
    const ordered = [...branches].sort((a, b) => {
      if (!!a.is_hq !== !!b.is_hq) return a.is_hq ? -1 : 1;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    ordered.forEach(b => map.set(String(b.id), { branch: b, people: [] }));

    const loose = [];
    users.forEach(u => {
      const key = (u.branch === null || u.branch === undefined || u.branch === '')
        ? null
        : String(u.branch);
      if (key === null) { loose.push(u); return; }
      if (!map.has(key)) {
        // Pinned to a shop this viewer cannot list. Give it its own section
        // rather than dropping the person into "sees every shop", which
        // would be untrue.
        map.set(key, { branch: { id: u.branch, name: u.branch_name || 'Other shop' }, people: [] });
      }
      map.get(key).people.push(u);
    });

    const byRoleThenName = (a, b) => {
      const ra = roleRank[a.role] ?? 9;
      const rb = roleRank[b.role] ?? 9;
      if (ra !== rb) return ra - rb;
      return String(a.first_name || a.username || '').localeCompare(String(b.first_name || b.username || ''));
    };
    const sections = Array.from(map.values());
    sections.forEach(s => s.people.sort(byRoleThenName));
    loose.sort(byRoleThenName);
    return { shopSections: sections, unassigned: loose };
  }, [branches, users]);

  const inviteMut = useMutation({
    // The invite endpoint has no shop field (it is a plain Serializer, so an
    // extra key is silently dropped). Send the invite, then pin the new
    // person to their shop with the id it returns — one action for the owner.
    mutationFn: async (payload) => {
      const { branch, ...invite } = payload;
      const created = await inviteUser(invite);
      if (branch && created?.id) {
        try {
          await updateUser(created.id, { branch });
        } catch (_) {
          // The account exists either way; it just lands in "works across all
          // shops" and the owner can set the shop on the card.
        }
      }
      return created;
    },
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
          branch: '',
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
      setEditMessage('');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setTimeout(() => { setEditUser(null); setEditStatus(null); }, 1500);
    },
    onError: (err) => {
      // DRF returns either {detail: "..."} or a field map like {role: "..."}.
      // The message was previously computed and then thrown away, so every
      // failure looked identical to the owner.
      const data = err?.response?.data;
      let msg = 'Failed to update user. Please try again.';
      if (typeof data?.detail === 'string') {
        msg = data.detail;
      } else if (data && typeof data === 'object') {
        const first = Object.values(data)[0];
        if (typeof first === 'string') msg = first;
        else if (Array.isArray(first) && typeof first[0] === 'string') msg = first[0];
      }
      setEditMessage(msg);
      setEditStatus('error');
    },
  });

  // Same endpoint, used for the one-field saves on a person's card.
  const quickMut = useMutation({
    mutationFn: ({ id, data }) => updateUser(id, data),
    onMutate: () => setQuickError(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err, vars) => {
      const data = err?.response?.data;
      let msg = 'Could not save that. Please try again.';
      if (typeof data?.detail === 'string') {
        msg = data.detail;
      } else if (data && typeof data === 'object') {
        const first = Object.values(data)[0];
        if (typeof first === 'string') msg = first;
        else if (Array.isArray(first) && typeof first[0] === 'string') msg = first[0];
      }
      setQuickError({ id: vars?.id, msg });
    },
  });

  const assignToShop = (userId, branchValue) => {
    quickMut.mutate({ id: userId, data: { branch: branchValue === '' ? null : branchValue } });
  };

  const setAllShops = (userId, checked) => {
    quickMut.mutate({ id: userId, data: { can_view_all_branches: !!checked } });
  };

  const openInvite = (branchId = '') => {
    setShowInviteModal(true);
    setInviteStatus(null);
    setShowPassword(false);
    setPasswordCopied(false);
    // Pre-generate so the auto password is visible + copyable before sending.
    setFormData({
      first_name: '', last_name: '', email: '', username: '',
      password: autoPassword ? strongPassword(policy) : '',
      role: 'worker',
      branch: branchId ? String(branchId) : '',
    });
  };

  // Top-bar primary action — see hooks/usePrimaryAction.js. Declared after
  // openInvite so the handler is never referenced before it exists.
  usePrimaryAction(() => openInvite());

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      role: u.role || 'worker',
      branch: u.branch ? String(u.branch) : '',
      can_view_all_branches: u.can_view_all_branches === true,
      perms: permsFromUser(u),
    });
    setEditStatus(null);
  };

  const handleEditSubmit = () => {
    if (!editUser) return;
    // Managers may only send the day-to-day fields — the server rejects the
    // whole PATCH if an owner-only key (role, branch, all-shops right) is
    // present, so don't include them unless this user is the owner.
    const data = { first_name: editForm.first_name, last_name: editForm.last_name, ...editForm.perms };
    if (user?.role === 'owner') {
      data.role = editForm.role;
      data.branch = editForm.branch === '' ? null : editForm.branch;
      data.can_view_all_branches = editForm.can_view_all_branches === true;
    }
    updateUserMut.mutate({ id: editUser.id, data });
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
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      setInviteStatus('error');
      setInviteMessage('Enter a valid email address (e.g. name@example.com)');
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
      // When auto-generating, send exactly the password shown in the field
      // (so the owner can copy it), only generating fresh if it's blank.
      password: autoPassword ? (formData.password || strongPassword(policy)) : formData.password,
      role: formData.role,
      // Stripped out of the invite body by the mutation and applied as a
      // follow-up PATCH — see inviteMut.
      branch: canAssign ? formData.branch : '',
    };

    setInviteStatus('loading');
    inviteMut.mutate(payload);
  };

  const generatePassword = () => {
    const newPass = strongPassword(policy);
    setPasswordCopied(false);
    setFormData(prev => ({ ...prev, password: newPass }));
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(formData.password);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 1500);
    } catch (_) { /* clipboard unavailable */ }
  };

  const fullName = (u) => `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || '—';

  // ── One person, as a card inside a shop section ──────────────────
  const renderPerson = (u) => {
    const ac = avatarColor(u.username || '');
    const saving = quickMut.isPending && quickMut.variables?.id === u.id;
    const rowError = quickError && quickError.id === u.id ? quickError.msg : '';
    const isOnline = u.last_login ? (new Date() - new Date(u.last_login)) < 300000 : false;
    // The all-shops right only means anything for someone pinned to a shop,
    // and in practice it is a manager's grant — the owner already sees
    // everything and a till cashier has no use for chain-wide figures.
    const showAllShops = canAssign && u.role === 'manager' && !!u.branch;

    return (
      <div key={u.id} style={personS}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: ac.bg, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            {initials(u.username || '')}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: 12.5, color: '#111827', wordBreak: 'break-word' }}>
                {fullName(u)}
              </span>
              <span style={pill(roleBadgeBg[u.role] || '#f3f4f6', roleColors[u.role] || '#6b7280')}>
                {roleLabel(u.role)}
              </span>
              {isOnline && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#10b981', fontWeight: 600 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
                  Online
                </span>
              )}
            </div>
            <div style={{ fontSize: 10.5, color: '#6b7280', wordBreak: 'break-all' }}>{u.email || u.username}</div>
            <div style={{ fontSize: 10.5, color: '#68766c', marginTop: 3 }}>Can do: {accessSummary(u)}</div>
          </div>
          {u.role !== 'owner' && (
            <button
              onClick={() => openEdit(u)}
              style={{
                background: '#fff', border: '1px solid #e3e8e4', borderRadius: 8,
                padding: '4px 10px', fontSize: 10, fontWeight: 600, color: '#374151',
                cursor: 'pointer', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f6f8f6'; e.currentTarget.style.borderColor = '#1a6b3a'; e.currentTarget.style.color = '#1a6b3a'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e3e8e4'; e.currentTarget.style.color = '#374151'; }}
            >
              Edit
            </button>
          )}
        </div>

        {/* Which shop this person works at — the owner can move them straight
            from the card, and it re-files them under the other shop. */}
        {canAssign && u.role !== 'owner' && (
          <div style={{ marginTop: 10 }}>
            <label style={fieldLabelS} htmlFor={`tm-shop-${u.id}`}>Works at</label>
            <select
              id={`tm-shop-${u.id}`}
              value={u.branch ? String(u.branch) : ''}
              disabled={saving}
              onChange={e => assignToShop(u.id, e.target.value)}
              style={{ ...miniSelectS, opacity: saving ? 0.6 : 1 }}
            >
              <option value="">Works across all shops</option>
              {branches.map(b => (
                <option key={b.id} value={String(b.id)}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* The all-shops right used to exist only inside the Edit modal, so
            nobody knew it was there. Plain words, on the card. */}
        {showAllShops && (
          <label
            htmlFor={`tm-all-${u.id}`}
            style={{
              marginTop: 10, display: 'flex', alignItems: 'flex-start', gap: 9,
              padding: '9px 11px', background: '#f6f8f6', border: '1px solid #e3e8e4',
              borderRadius: 10, cursor: saving ? 'default' : 'pointer',
            }}
          >
            <input
              id={`tm-all-${u.id}`}
              type="checkbox"
              checked={u.can_view_all_branches === true}
              disabled={saving}
              onChange={e => setAllShops(u.id, e.target.checked)}
              style={{ marginTop: 1, width: 15, height: 15, accentColor: '#1a6b3a', cursor: 'pointer', flexShrink: 0 }}
            />
            <span style={{ fontSize: 11.5, color: '#374151', lineHeight: 1.45 }}>
              <strong style={{ color: '#111827' }}>Can see all shops</strong>
              <span style={{ display: 'block', fontSize: 10.5, color: '#6b7280' }}>
                {u.can_view_all_branches === true
                  ? 'Sees every shop’s figures, still works at this shop.'
                  : 'Off — sees only this shop’s figures and staff.'}
              </span>
            </span>
          </label>
        )}

        {saving && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6 }}>Saving…</div>}
        {rowError && <div style={{ fontSize: 10.5, color: '#c0392b', marginTop: 6 }}>{rowError}</div>}
      </div>
    );
  };

  // "Assign someone…" — the empty-shop nudge. Lists anyone the owner is
  // allowed to move who isn't already at this shop.
  const renderAssignPicker = (branchId) => {
    const candidates = users.filter(
      u => u.role !== 'owner' && String(u.branch || '') !== String(branchId)
    );
    if (!candidates.length) return null;
    return (
      <select
        value=""
        onChange={e => { if (e.target.value) assignToShop(Number(e.target.value), String(branchId)); }}
        style={{ ...miniSelectS, maxWidth: 260, margin: '0 auto', display: 'block' }}
      >
        <option value="">Assign someone to this shop{'…'}</option>
        {candidates.map(c => (
          <option key={c.id} value={c.id}>
            {fullName(c)} {'—'} {roleLabel(c.role)}
          </option>
        ))}
      </select>
    );
  };

  // ── The flat table (single-shop tenants, and farm) ───────────────
  const renderTable = () => (
    <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #e3e8e4' }}>
          <th style={thS}>User</th>
          <th style={thS}>Role</th>
          <th style={thS}>Works at</th>
          <th style={thS}>Access</th>
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
                  {roleLabel(u.role)}
                </span>
              </td>
              <td style={{ padding: '12px 8px', fontSize: 11, color: '#374151' }}>
                {u.role === 'owner' || !u.branch
                  ? <span style={{ color: '#68766c' }}>All shops</span>
                  : (branches.find(b => String(b.id) === String(u.branch))?.name || u.branch_name || '—')}
                {u.can_view_all_branches === true && u.branch && (
                  <span title="Can view all shops" style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: '#1a6b3a', background: '#e8f5ee', padding: '2px 6px', borderRadius: 999 }}>ALL-SHOPS VIEW</span>
                )}
              </td>
              <td style={{ padding: '12px 8px', fontSize: 11, color: '#374151' }}>{accessSummary(u)}</td>
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
                    border: '1px solid #e3e8e4',
                    borderRadius: 8,
                    padding: '4px 10px',
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }} onClick={() => openEdit(u)} onMouseEnter={e => { e.currentTarget.style.background = '#f6f8f6'; e.currentTarget.style.borderColor = '#1a6b3a'; e.currentTarget.style.color = '#1a6b3a'; }} onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e3e8e4'; e.currentTarget.style.color = '#374151'; }}>
                    Edit
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table></div>
  );

  const emptyTeam = (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
      <p style={{ fontSize: 12, marginBottom: 12 }}>No team members yet. Invite your first user to get started!</p>
      <button
        onClick={() => openInvite()}
        style={{ ...btnS(true), fontSize: 11, padding: '6px 12px' }}
      >
        {'\u002B'} Invite User
      </button>
    </div>
  );

  return (
    <div>
      {/* Header with invite button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Team &amp; Users</h2>
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4, margin: 0 }}>
            {multiShop
              ? `${users.length} ${users.length === 1 ? 'person' : 'people'} across ${branches.length} shops — who works where, and what they can see`
              : 'Manage team members and permissions'}
          </p>
        </div>
        <button
          onClick={() => openInvite()}
          style={{ ...btnS(true), fontSize: 12, padding: '8px 14px' }}
        >
          {'\u002B'} Invite User
        </button>
      </div>

      {isLoading ? (
        <div style={{ ...card, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Loading team members...</div>
        </div>
      ) : multiShop ? (
        /* ── Shop-first layout ─────────────────────────────────────
           One section per shop, straight off the branch list, then
           everyone who isn't tied to a single shop. */
        <div>
          {shopSections.map(({ branch, people }) => (
            <TeamShopSection
              key={branch.id}
              title={branch.name || 'Shop'}
              code={branch.code || ''}
              isHQ={!!branch.is_hq}
              managerName={
                branch.manager_name
                || (people.find(p => p.role === 'manager') ? fullName(people.find(p => p.role === 'manager')) : '')
              }
              note={people.length ? 'Sees and sells at this shop only, unless given the all-shops view.' : ''}
              count={people.length}
              isMobile={isMobile}
              emptyText={
                canAssign
                  ? 'No one assigned yet — assign someone to this shop, or invite a new person straight into it.'
                  : 'No one assigned to this shop yet.'
              }
              emptyAction={canAssign ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  {renderAssignPicker(branch.id)}
                  <button
                    onClick={() => openInvite(branch.id)}
                    style={{ ...btnS(false), fontSize: 11 }}
                  >
                    {'\u002B'} Invite someone new here
                  </button>
                </div>
              ) : null}
            >
              {people.map(renderPerson)}
            </TeamShopSection>
          ))}

          <TeamShopSection
            title="Works across all shops"
            accent="#2563eb"
            note="Not tied to one shop — these people see every shop's figures and can work at any till. Owners, area managers and office staff belong here."
            count={unassigned.length}
            isMobile={isMobile}
            emptyText="Everyone is assigned to a shop."
          >
            {unassigned.map(renderPerson)}
          </TeamShopSection>
        </div>
      ) : (
        /* ── Single-shop tenants (and farm): the flat list, as before ── */
        <div style={card}>
          <div style={sLabel}>Team Members</div>
          {users.length === 0 ? emptyTeam : (
            isMobile ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                {users.map(renderPerson)}
              </div>
            ) : renderTable()
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
          padding: 16,
          overflowY: 'auto',
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
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", fontSize: 18, fontWeight: 700, margin: 0 }}>
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
                        border: '1px solid #e3e8e4',
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
                        border: '1px solid #e3e8e4',
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
                      border: '1px solid #e3e8e4',
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
                      border: '1px solid #e3e8e4',
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
                    {/* Auto-generated passwords are shown revealed so the owner can copy
                        them; manual passwords are masked with an eye toggle. */}
                    <input
                      type={autoPassword || showPassword ? 'text' : 'password'}
                      placeholder={autoPassword ? 'Will be generated' : 'Enter password'}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      readOnly={autoPassword}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        border: '1px solid #e3e8e4',
                        borderRadius: 8,
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: autoPassword ? '#f6f8f6' : '#fff',
                      }}
                    />
                    {!autoPassword && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(s => !s)}
                        title={showPassword ? 'Hide password' : 'Show password'}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        style={{
                          padding: '8px 10px',
                          border: '1px solid #e3e8e4',
                          borderRadius: 8,
                          fontSize: 13,
                          background: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        {showPassword ? '\u{1F648}' : '\u{1F441}'}
                      </button>
                    )}
                    {autoPassword && (
                      <>
                        <button
                          type="button"
                          onClick={copyPassword}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid ' + (passwordCopied ? '#1a6b3a' : '#e3e8e4'),
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 600,
                            background: passwordCopied ? '#e8f5ee' : '#fff',
                            color: passwordCopied ? '#1a6b3a' : '#374151',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {passwordCopied ? 'Copied ✓' : 'Copy'}
                        </button>
                        <button
                          type="button"
                          onClick={generatePassword}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #e3e8e4',
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 600,
                            background: '#fff',
                            color: '#374151',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#f6f8f6'; e.currentTarget.style.borderColor = '#1a6b3a'; e.currentTarget.style.color = '#1a6b3a'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e3e8e4'; e.currentTarget.style.color = '#374151'; }}
                        >
                          Refresh
                        </button>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 4 }}>
                    {autoPassword ? 'Password will be auto-generated' : 'Use strong passwords with mix of characters'}
                  </div>
                </div>

                {/* Role */}
                <div style={{ marginBottom: canAssign ? 16 : 20 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e3e8e4',
                      borderRadius: 8,
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="worker">{roleLabel('worker')}</option>
                    <option value="manager">Manager</option>
                  </select>
                  <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 4 }}>
                    {roleLabel('worker')}: Tills &amp; day-to-day work · Manager: Team management
                  </div>
                </div>

                {/* Which shop the new person works at. Only shown once there is
                    more than one shop; sent as a follow-up PATCH because the
                    invite endpoint itself has no shop field. */}
                {canAssign && (
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                      Works at
                    </label>
                    <select
                      value={formData.branch}
                      onChange={e => setFormData({ ...formData, branch: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #e3e8e4',
                        borderRadius: 8,
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">Works across all shops</option>
                      {branches.map(b => (
                        <option key={b.id} value={String(b.id)}>{b.name}</option>
                      ))}
                    </select>
                    <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 4 }}>
                      {formData.branch
                        ? 'Sees only this shop, and can only open a till here.'
                        : 'Sees every shop. Right for owners and office staff.'}
                    </div>
                  </div>
                )}

                {/* Module-access checkboxes removed: the invite endpoint (/core/tenants/invite/) has no per-user module field in the API layer, so they were never saved. */}
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
          padding: 16, overflowY: 'auto',
        }} onClick={() => setEditUser(null)}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 28, width: 420, maxWidth: '90vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", fontSize: 18, fontWeight: 700, margin: 0 }}>
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
                    <input value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e3e8e4', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Last Name</label>
                    <input value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e3e8e4', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                {/* Role, shop assignment and the all-shops right are the
                    OWNER'S controls — a manager editing their shop's staff
                    only gets names + permission toggles, and the server
                    rejects owner-only keys from managers anyway. */}
                {user?.role === 'owner' && (
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Role</label>
                    <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e3e8e4', borderRadius: 8, fontSize: 14, background: '#fff', boxSizing: 'border-box' }}>
                      <option value="manager">Manager</option>
                      <option value="worker">{roleLabel('worker')}</option>
                    </select>
                  </div>
                )}
                {/* Which shop this person works at. Only worth showing once
                    there is more than one shop — a single-branch owner should
                    never meet this concept. Empty = every shop. */}
                {user?.role === 'owner' && isRetail && branches.length > 1 && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Works at
                    </label>
                    <select
                      value={editForm.branch}
                      onChange={e => setEditForm({ ...editForm, branch: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e3e8e4', borderRadius: 8, fontSize: 14, background: '#fff', boxSizing: 'border-box' }}
                    >
                      <option value="">All shops</option>
                      {branches.map(b => (
                        <option key={b.id} value={String(b.id)}>{b.name}</option>
                      ))}
                    </select>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 5, lineHeight: 1.45 }}>
                      {editForm.branch
                        ? 'Sees only this shop, and can only open a till here.'
                        : 'Sees every shop. Right for owners and office staff.'}
                    </div>
                  </div>
                )}
                {/* All-shops viewing right — only meaningful for someone
                    pinned to a shop. Lets the owner pin a manager to their
                    branch and still allow chain-wide figures. */}
                {user?.role === 'owner' && isRetail && branches.length > 1 && editForm.branch !== '' && (
                  <div style={{ marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: '#f6f8f6', border: '1px solid #e3e8e4', borderRadius: 10 }}>
                    <input
                      id="tm-view-all-shops"
                      type="checkbox"
                      checked={editForm.can_view_all_branches === true}
                      onChange={e => setEditForm({ ...editForm, can_view_all_branches: e.target.checked })}
                      style={{ marginTop: 2, width: 16, height: 16, accentColor: '#1a6b3a', cursor: 'pointer' }}
                    />
                    <label htmlFor="tm-view-all-shops" style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.5, cursor: 'pointer' }}>
                      <strong style={{ color: '#111827' }}>Can view all shops</strong><br />
                      Sees every branch&apos;s figures in reports and the branch
                      switcher, but still works and rings sales at their own shop.
                    </label>
                  </div>
                )}
                {/* ── Access rights ──────────────────────────────────
                    Toggle what this person can actually do. Managers can
                    set these for their own shop's cashiers; role/shop
                    stay owner-only (enforced server-side too). */}
                {PRESETS.length > 0 && editUser?.role !== 'owner' && (
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Quick profiles
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {PRESETS.map(p => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => setEditForm(prev => ({
                            ...prev,
                            role: user?.role === 'owner' ? p.role : prev.role,
                            perms: { ...prev.perms, ...p.perms },
                          }))}
                          style={{ background: '#f6f8f6', border: '1px solid #e3e8e4', borderRadius: 999, padding: '6px 12px', fontSize: 11, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#6b7280', marginTop: 5, lineHeight: 1.45 }}>
                      A profile is a shortcut — it sets the toggles below{user?.role === 'owner' ? ' and the role' : ''}. Fine-tune afterwards if needed.
                    </div>
                  </div>
                )}
                {editUser?.role !== 'owner' && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                      Access rights
                    </label>
                    <div style={{ border: '1px solid #e3e8e4', borderRadius: 10, overflow: 'hidden' }}>
                      {PERM_FIELDS.map((f, idx) => (
                        <label key={f.key} htmlFor={`tm-perm-${f.key}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderBottom: idx < PERM_FIELDS.length - 1 ? '1px solid #f0f4f1' : 'none', cursor: 'pointer', background: editForm.perms[f.key] !== false ? '#fff' : '#fafbfa' }}>
                          <input
                            id={`tm-perm-${f.key}`}
                            type="checkbox"
                            checked={editForm.perms[f.key] !== false}
                            onChange={e => setEditForm(prev => ({ ...prev, perms: { ...prev.perms, [f.key]: e.target.checked } }))}
                            style={{ marginTop: 2, width: 15, height: 15, accentColor: '#1a6b3a', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: 12.5, color: '#111827', fontWeight: 600, lineHeight: 1.4 }}>
                            {f.label}
                            {f.desc ? <span style={{ display: 'block', fontSize: 10.5, fontWeight: 500, color: '#6b7280' }}>{f.desc}</span> : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {editStatus === 'error' && <div style={{ color: '#c0392b', fontSize: 12, marginBottom: 12 }}>{editMessage || 'Failed to update user. Please try again.'}</div>}
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
