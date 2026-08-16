import React from 'react';

/**
 * ReportScopeChip — says, on the report itself, which shop the figures are for.
 *
 * Why this exists
 * ---------------
 * Reports get printed, exported and shown to accountants and lenders, long
 * after the header switcher that produced them has been forgotten. And until
 * 2026-08-15 several of them were not answering for the shop the switcher was
 * on at all: Financial Reports returned the whole chain's stock valuation for
 * every branch, and the Retail Report mixed ONE shop's sales with the WHOLE
 * chain's inventory, so its turnover, GMROI and days-of-inventory were wrong
 * by a factor of however many shops the business has.
 *
 * Those are fixed. This chip is the other half of the fix: a number that
 * belongs to one shop and a number that belongs to the business must never
 * again look the same on screen.
 *
 * Props
 *   scope     — the `scope` object the API now returns:
 *               { branch_id, branch_name, chain_only }
 *   note      — optional extra sentence, for a report that is only partly
 *               narrowed (a branch P&L still carries the whole payroll).
 *
 * Renders nothing when there is no scope to report, so a single-branch tenant
 * — whose API answers carry `branch_name: "All shops"` and nothing to
 * disambiguate — sees no new furniture.
 */
export default function ReportScopeChip({ scope, note, hideWhenChainWide = true }) {
  if (!scope || typeof scope !== 'object') return null;
  const name = scope.branch_name || '';
  const chainOnly = scope.chain_only === true;
  const isChainWide = !scope.branch_id;

  if (isChainWide && !chainOnly && hideWhenChainWide) return null;

  const amber = chainOnly && !isChainWide;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        background: amber ? '#fef3e2' : '#e8f5ee',
        color: amber ? '#c97d1a' : '#1a6b3a',
        border: `1px solid ${amber ? '#f3ddb8' : '#cfe7da'}`,
        marginBottom: 10,
      }}
    >
      <span aria-hidden="true">{chainOnly ? '🏢' : '📍'}</span>
      <span>{chainOnly ? 'All shops (whole business)' : name}</span>
      {note ? (
        <span style={{ fontWeight: 500, opacity: 0.85 }}>· {note}</span>
      ) : null}
    </div>
  );
}
