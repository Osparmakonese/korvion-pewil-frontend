import React, { useState, useEffect } from 'react';
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

  // A shop that has been closed leaves its id behind in localStorage. The
  // dropdown then falls back to showing "All shops" while the interceptor
  // keeps sending ?branch=<dead id> on every read — the server resolves it
  // to nothing and answers chain-wide, so the numbers are right but the
  // stored choice is a lie waiting to be misread. Clear it once the branch
  // list has actually loaded and does not contain it.
  useEffect(() => {
    if (!viewing) return;
    if (!Array.isArray(branches) || branches.length === 0) return;
    if (branches.some((b) => String(b.id) === String(viewing))) return;
    try { localStorage.removeItem(VIEW_BRANCH_KEY); } catch (_) { /* private mode */ }
    setViewing('');
  }, [branches, viewing]);

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
      <span className="branch-chip" title={ownBranchName} style={{
        fontSize: 12, fontWeight: 600, color: '#1a6b3a',
        background: '#e8f5ee', padding: '5px 11px', borderRadius: 20,
        whiteSpace: 'nowrap',
        // Same shrink rules as the dropdown below — a long shop name in a
        // rigid pill is what pushed the mobile header past the viewport.
        minWidth: 0, maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis',
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
      className="branch-chip"
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
        // A <select> is sized by its LONGEST <option>, and a flex item
        // defaults to min-width:auto — so it refuses to shrink below that.
        // On a 360px phone one long shop name in this control pushed the
        // whole mobile header past the viewport and the page started
        // scrolling sideways (2026-08-16). Let it shrink and truncate; the
        // 768px rules in index.css cap it to a pill.
        minWidth: 0, flex: '0 1 auto',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}
    >
      <option value="">All shops</option>
      {branches.map((b) => (
        <option key={b.id} value={String(b.id)}>{b.name}</option>
      ))}
    </select>
  );
}
