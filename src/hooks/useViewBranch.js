import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listBranches } from '../api/retailApi';
import { VIEW_BRANCH_KEY } from '../api/axios';
import { useAuth } from '../context/AuthContext';

/**
 * useViewBranch — which shop is on screen, and is there more than one?
 *
 * Every per-shop surface needs the same two facts and each one was
 * re-deriving them, or worse, not asking at all: the Products page happily
 * printed the CHAIN stock total while the header said "Avenu". A number that
 * belongs to the whole business, shown under one shop's name, is the single
 * most expensive kind of wrong this app can be — it is how a cashier is
 * invited to sell goods that are in another town.
 *
 * Two ways a shop is in context, matching the server's `effective_branch()`
 * precedence exactly so the UI can never disagree with the data it renders:
 *
 *   1. the user IS of a shop (`user.branch_name`) — binding, no switcher.
 *   2. the owner's branch switcher (`localStorage[VIEW_BRANCH_KEY]`), which
 *      the axios interceptor turns into `?branch=` on every retail read.
 *
 * Returns:
 *   branchId      — string id in context, or '' for "All shops"
 *   branchName    — display name, or '' when chain-wide
 *   inShop        — true when a single shop is being looked at
 *   isMultiBranch — true when the business has 2+ shops. EVERYTHING that
 *                   behaves differently per shop must be gated on this, so
 *                   a single-shop tenant sees the app exactly as before.
 *   branches      — the branch list (already Array-guarded)
 */
export default function useViewBranch() {
  const { user } = useAuth() || {};
  const isRetail = !!(user?.modules && user.modules[0] === 'retail');

  const { data: raw = [] } = useQuery({
    queryKey: ['retail-branches'],
    queryFn: listBranches,
    enabled: isRetail,
    staleTime: 60_000,
  });

  const stored = (() => {
    try { return localStorage.getItem(VIEW_BRANCH_KEY) || ''; } catch (_) { return ''; }
  })();

  return useMemo(() => {
    // Malformed / paginated shapes have crashed this app before — never
    // assume an array came back. Derived INSIDE the memo so the guard does
    // not create a new array identity on every render and defeat it.
    const branches = Array.isArray(raw)
      ? raw
      : (Array.isArray(raw?.results) ? raw.results : []);
    const ownName = user?.branch_name || '';
    const canViewAll = user?.can_view_all_branches === true;
    const pinned = !!ownName && !canViewAll;

    // A pinned user cannot switch: the server ignores ?branch= for them and
    // answers for their own shop, so the UI must say the same thing.
    if (pinned) {
      const own = branches.find((b) => b.name === ownName);
      return {
        branchId: own ? String(own.id) : '',
        branchName: ownName,
        inShop: true,
        isMultiBranch: branches.length > 1,
        branches,
        pinned: true,
      };
    }

    const current = branches.find((b) => String(b.id) === String(stored));
    return {
      // A stale id for a closed shop resolves to nothing server-side, so
      // report chain-wide rather than naming a shop that is not there.
      branchId: current ? String(current.id) : '',
      branchName: current ? current.name : '',
      inShop: !!current,
      isMultiBranch: branches.length > 1,
      branches,
      pinned: false,
    };
  }, [raw, stored, user?.branch_name, user?.can_view_all_branches]);
}
