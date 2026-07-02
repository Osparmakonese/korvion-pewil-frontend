import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getJournalEntries, createJournalEntry, getTrialBalance } from '../api/retailApi';
import { fmt } from '../utils/format';

const styles = {
  page: { maxWidth: 1200, margin: '0 auto', padding: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, color: '#111827', fontFamily: "'Playfair Display', serif", margin: 0 },
  addBtn: { padding: '10px 18px', background: '#1a6b3a', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 },
  summaryCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  summaryLabel: { fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 },
  summaryValue: { fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#1a6b3a' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '12px 12px', fontSize: 12, color: '#374151', borderBottom: '1px solid #e5e7eb' },
  refCell: { fontFamily: 'monospace', color: '#1a6b3a', fontWeight: 600 },
  monospaceCell: { fontFamily: 'monospace' },
  statusPill: (status) => ({
    fontSize: 8,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 20,
    display: 'inline-block',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    background: status === 'Posted' ? '#e8f5ee' : '#f3f4f6',
    color: status === 'Posted' ? '#1a6b3a' : '#6b7280',
  }),
  trHover: { background: '#f9fafb' },
};

export default function JournalEntries({ onTabChange }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canCreate = user?.role === 'owner' || user?.role === 'manager';
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    account: '',
    debit_amount: '',
    credit_amount: '',
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['retail-journal-entries'],
    queryFn: getJournalEntries,
    staleTime: 30000
  });

  const { data: trialBalance = {}, isLoading: balanceLoading } = useQuery({
    queryKey: ['retail-trial-balance'],
    queryFn: getTrialBalance,
    staleTime: 30000
  });

  const createEntryMutation = useMutation({
    mutationFn: createJournalEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['retail-trial-balance'] });
      setShowModal(false);
      setForm({
        entry_date: new Date().toISOString().split('T')[0],
        description: '',
        account: '',
        debit_amount: '',
        credit_amount: '',
      });
    }
  });

  const formattedEntries = useMemo(() =>
    entries.map(entry => ({
      id: entry.id,
      date: entry.entry_date,
      ref: `JE-${String(entry.id).padStart(4, '0')}`,
      description: entry.description || entry.entry_type,
      debit: fmt(entry.debit_amount || 0),
      credit: fmt(entry.credit_amount || 0),
      status: entry.created_at ? 'Posted' : 'Draft'
    }))
  , [entries]);

  const totals = useMemo(() => ({
    debits: fmt(trialBalance.total_debit || 0),
    credits: fmt(trialBalance.total_credit || 0),
    balance: fmt(Math.abs((trialBalance.total_debit || 0) - (trialBalance.total_credit || 0))),
    isBalanced: trialBalance.balanced === true
  }), [trialBalance]);

  const handleCreateEntry = () => {
    createEntryMutation.mutate({
      entry_date: form.entry_date,
      description: form.description,
      account: form.account,
      debit_amount: form.debit_amount ? parseFloat(form.debit_amount) : 0,
      credit_amount: form.credit_amount ? parseFloat(form.credit_amount) : 0,
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Journal Entries</h1>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            disabled={createEntryMutation.isPending}
            style={{
              ...styles.addBtn,
              opacity: createEntryMutation.isPending ? 0.6 : 1,
              cursor: createEntryMutation.isPending ? 'not-allowed' : 'pointer'
            }}
          >
            {'\u002B'} New Entry
          </button>
        )}
      </div>

      {/* New Entry Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '24px',
              maxWidth: 500,
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 16px 0' }}>
              New Journal Entry
            </h2>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                Date
              </label>
              <input
                type="date"
                value={form.entry_date}
                onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  fontSize: 12,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                Description
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  fontSize: 12,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                Account
              </label>
              <input
                type="text"
                value={form.account}
                onChange={(e) => setForm({ ...form, account: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  fontSize: 12,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                  Debit Amount
                </label>
                <input
                  type="number"
                  value={form.debit_amount}
                  onChange={(e) => setForm({ ...form, debit_amount: e.target.value })}
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 7,
                    fontSize: 12,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                  Credit Amount
                </label>
                <input
                  type="number"
                  value={form.credit_amount}
                  onChange={(e) => setForm({ ...form, credit_amount: e.target.value })}
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 7,
                    fontSize: 12,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleCreateEntry}
                disabled={createEntryMutation.isPending}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#1a6b3a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: createEntryMutation.isPending ? 0.6 : 1,
                }}
              >
                {createEntryMutation.isPending ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div style={styles.summaryRow}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Debits</div>
          <div style={styles.summaryValue}>{balanceLoading ? '...' : totals.debits}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Credits</div>
          <div style={styles.summaryValue}>{balanceLoading ? '...' : totals.credits}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Balance</div>
          <div style={{ ...styles.summaryValue, color: balanceLoading ? '#6b7280' : totals.isBalanced ? '#1a6b3a' : '#c0392b' }}>
            {balanceLoading ? '...' : totals.balance}
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div style={styles.card}>
        {entriesLoading ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>Loading journal entries...</div>
        ) : formattedEntries.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>No journal entries found</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Ref</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Debit</th>
                <th style={styles.th}>Credit</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {formattedEntries.map((row, idx) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: idx < formattedEntries.length - 1 ? '1px solid #e5e7eb' : 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={styles.td}>{row.date}</td>
                  <td style={{ ...styles.td, ...styles.refCell }}>{row.ref}</td>
                  <td style={styles.td}>{row.description}</td>
                  <td style={{ ...styles.td, ...styles.monospaceCell }}>{row.debit}</td>
                  <td style={{ ...styles.td, ...styles.monospaceCell }}>{row.credit}</td>
                  <td style={styles.td}>
                    <span style={styles.statusPill(row.status)}>{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
