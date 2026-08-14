import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listBranches } from '../api/retailApi';
import { VIEW_BRANCH_KEY } from '../api/axios';
import { useAuth } from '../context/AuthContext';

/**
 * BranchSwitcher — lets an owner step into one shop and work as if there.
 *
 * The problem it solves
 * ---------------------
 * Multi-branch data existed long before there was any way to *be* in a
 * branch. An owner saw every shop's numbers mixed together and had no way
 * to ask "how is Avondale doing?" without doing arithmetic in their head.
 *
 * How it works
 * ------------
 * The choice is written to localStorage, and the axios interceptor adds
 * `?branch=<id>` to every retail GET. So one control re-points the whole
 * app — dashboards, reports, product prices — without every page needing
 * to know this feature exists.
 *
 * Who sees it
 * -----------
 * Only staff who have access to more than one shop: an owner or office
 * user (no branch assigned) at a tenant with 2+ branches. Someone assigned
 * to a shop already sees only that shop and has nothing to switch, so they
 * get a plain label instead of a dropdown — one less thing to understand.
 */
export default function BranchSwitcher() {
  const { user } = useAuth() || {};
  const isRetail = !!(user?.modules && user.modules[0] === 'retail');

  // A user pinned to a shop can't switch — they just see where they are.
  // Exception: the owner can grant a pinned manager "view all shops"
  // (can_view_all_branches), which puts the switcher back. The server
  // enforces the same rule, so this is purely which control renders.
  const ownBranchName = user?.branch_name || '';
  const canViewAll = user?.can_view_all_branches === true;
  const maySwitch = !ownBranchName || canViewAll;

  const { data: raw = [] } = useQuery({
    queryKey: ['retail-branches'],
    queryFn: listBranches,
    enabled: isRetail && maySwitch,
    staleTime: 60_000,
  });
  const branches = Array.isArray(raw) ? raw : (raw?.results || []);

  const [viewing, setViewing] = useState(() => {
    try { return localStorage.getItem(VIEW_BRANCH_KEY) || ''; } catch (_) { return ''; }
  });

  const choose = (value) => {
    try {
      if (value) localStorage.setItem(VIEW_BRANCH_KEY, value);
      else localStorage.removeItem(VIEW_BRANCH_KEY);
    } catch (_) { /* private mode — the switch just won't persist */ }
    setViewing(value);
    // Full reload rather than cache surgery: every cached retail query is
    // now answering for the wrong shop, and a reload is one honest line
    // instead of hunting down which keys to invalidate.
    window.location.reload();
  };

  if (!isRetail) return null;

  // Assigned staff without the all-shops right: show the shop, no control.
  if (ownBranchName && !canViewAll) {
    return (
      <span style={{
        fontSize: 12, fontWeight: 600, color: '#1a6b3a',
        background: '#e8f5ee', padding: '5px 11px', borderRadius: 20,
        whiteSpace: 'nowrap',
      }}>
        {ownBranchName}
      </span>
    );
  }

  // Single-shop business: nothing to switch between, so say nothing.
  if (branches.length < 2) return null;

  const current = branches.find((b) => String(b.id) === String(viewing));

  return (
    <select
      value={viewing}
      onChange={(e) => choose(e.target.value)}
      title="Choose which shop you are looking at"
      style={{
        fontSize: 12.5, fontWeight: 600,
        color: current ? '#1a6b3a' : '#374151',
        background: current ? '#e8f5ee' : '#fff',
        border: `1px solid ${current ? '#1a6b3a' : '#e3e8e4'}`,
        borderRadius: 20, padding: '6px 12px', cursor: 'pointer',
        maxWidth: 190, fontFamily: 'inherit',
      }}
    >
      <option value="">All shops</option>
      {branches.map((b) => (
        <option key={b.id} value={String(b.id)}>{b.name}</option>
      ))}
    </select>
  );
}
