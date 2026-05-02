import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReturns, getReturnsSummary, createReturn, completeReturn } from '../api/retailApi';
import { useAuth } from '../context/AuthContext';
import { fmt } from '../utils/format';
import { confirm } from '../utils/confirm';
import { invalidateProductCaches, invalidateSaleCaches } from '../utils/queryCache';

export default function Returns({ onTabChange }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ original_sale: '', customer_name: '', reason: '', refund_amount: '' });

  const isOwnerOrManager = user?.role === 'owner' || user?.role === 'manager';

  // Fetch returns
  const { data: returns = [], isLoading: returnsLoading, error: returnsError } = useQuery({
    queryKey: ['retail-returns'],
    queryFn: getReturns,
    staleTime: 30000,
  });

  // Fetch returns summary
  const { data: summary = {} } = useQuery({
    queryKey: ['retail-returns-summary'],
    queryFn: getReturnsSummary,
    staleTime: 30000,
  });

  // Create return — touches the returns list, then on completion the
  // sale fan-out (stock comes back, sales totals shift, customer LTV
  // adjusts, EOD numbers recompute, dashboard refreshes).
  const createMutation = useMutation({
    mutationFn: createReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-returns'] });
      queryClient.invalidateQueries({ queryKey: ['retail-returns-summary'] });
      setShowAddForm(false);
      setFormData({ original_sale: '', customer_name: '', reason: '', refund_amount: '' });
    },
  });

  // Completing a return restocks the items and adjusts totals — fan-out
  // through invalidateSaleCaches so POS, low-stock, sales-history, EOD,
  // dashboard, and customer LTV all refresh.
  const completeMutation = useMutation({
    mutationFn: completeReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-returns'] });
      queryClient.invalidateQueries({ queryKey: ['retail-returns-summary'] });
      invalidateSaleCaches(queryClient);
      invalidateProductCaches(queryClient);
    },
  });

  const handleAddReturn = (e) => {
    e.preventDefault();
    if (formData.original_sale && formData.refund_amount) {
      createMutation.mutate(formData);
    }
  };

  const handleCompleteReturn = async (id) => {
    if (await confirm({ title: 'Complete return', message: 'Mark this return as completed?', confirmText: 'Complete', danger: false })) {
      completeMutation.mutate(id);
    }
  };

  const getReasonColor = (reason) => {
    switch (reason) {
      case 'Defective':
        return { bg: '#fdecea', color: '#c0392b' };
      case 'Wrong item':
        return { bg: '#EFF6FF', color: '#1d4ed8' };
      case 'Changed mind':
        return { bg: '#f3f4f6', color: '#6b7280' };
      case 'Damaged':
        return { bg: '#fef3e2', color: '#c97d1a' };
      default:
        return { bg: '#fff', color: '#111827' };
    }
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'Cash':
        return '#1a6b3a';
      case 'EcoCash':
        return '#2563eb';
      case 'Store Credit':
        return '#7c3aed';
      case 'Card':
        return '#6b7280';
      default:
        return '#374151';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
      case 'completed':
        return { bg: '#e8f5ee', color: '#1a6b3a' };
      case 'Pending':
      case 'pending':
        return { bg: '#fef3e2', color: '#c97d1a' };
      case 'Approved':
      case 'approved':
        return { bg: '#EFF6FF', color: '#1d4ed8' };
      default:
        return { bg: '#f3f4f6', color: '#6b7280' };
    }
  };

  if (returnsLoading) {
    return (
      <div style={{ padding: 24, fontFamily: "'Inter', sans-serif", backgroundColor: '#f9fafb', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>Loading...</div>
      </div>
    );
  }

  if (returnsError) {
    return (
      <div style={{ padding: 24, fontFamily: "'Inter', sans-serif", backgroundColor: '#f9fafb', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#c0392b' }}>Failed to load returns. Please try again later.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: "'Inter', sans-serif", backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", margin: 0, color: '#111827' }}>
          Returns & Refunds
        </h1>
        {isOwnerOrManager && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              background: '#1a6b3a',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            + Process Return
          </button>
        )}
      </div>

      {/* Add Return Form */}
      {showAddForm && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 24 }}>
          <form onSubmit={handleAddReturn}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Original Sale Receipt *"
                value={formData.original_sale}
                onChange={(e) => setFormData({ ...formData, original_sale: e.target.value })}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  fontSize: 11,
                  fontFamily: "'Inter', sans-serif",
                }}
                required
              />
              <input
                type="text"
                placeholder="Customer Name"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  fontSize: 11,
                  fontFamily: "'Inter', sans-serif",
                }}
              />
              <input
                type="text"
                placeholder="Reason (e.g., Defective) *"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  fontSize: 11,
                  fontFamily: "'Inter', sans-serif",
                }}
                required
              />
              <input
                type="number"
                placeholder="Refund Amount *"
                value={formData.refund_amount}
                onChange={(e) => setFormData({ ...formData, refund_amount: e.target.value })}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  fontSize: 11,
                  fontFamily: "'Inter', sans-serif",
                }}
                step="0.01"
                required
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                disabled={createMutation.isPending}
                style={{
                  background: '#1a6b3a',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: createMutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: createMutation.isPending ? 0.6 : 1,
                }}
              >
                {createMutation.isPending ? 'Processing...' : 'Process Return'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 7,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
        {/* Returns This Month */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#fdecea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20
              }}
            >
              ↩
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
                TOTAL RETURNS
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#c0392b', marginBottom: 2 }}>
                {summary?.total_returns || 0}
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>All time</div>
            </div>
          </div>
        </div>

        {/* Total Refunded */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#fdecea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20
              }}
            >
              💰
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
                TOTAL REFUNDED
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#c0392b', marginBottom: 2 }}>
                {fmt(summary?.total_refunded || 0, 'zwd')}
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>Total amount</div>
            </div>
          </div>
        </div>

        {/* Return Rate */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#fef3e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20
              }}
            >
              %
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
                RETURN RATE
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#c97d1a', marginBottom: 2 }}>
                {(summary?.return_rate || 0).toFixed(1)}%
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>Of all sales</div>
            </div>
          </div>
        </div>
      </div>

      {/* Returns Table Card */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Return #</th>
              <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Date</th>
              <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Original Sale</th>
              <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Customer</th>
              <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Items</th>
              <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Refund Amount</th>
              <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Method</th>
              <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Reason</th>
              <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Status</th>
              {isOwnerOrManager && <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {returns.map((ret) => {
              const reasonColors = getReasonColor(ret.reason);
              const methodColor = getMethodColor(ret.refund_method);
              const statusColors = getStatusColor(ret.status);
              return (
                <tr key={ret.id}>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#1a6b3a', fontFamily: 'monospace', fontWeight: 600 }}>{ret.id}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>
                    {ret.created_at ? new Date(ret.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#1a6b3a', fontFamily: 'monospace', fontWeight: 600 }}>{ret.original_sale_receipt || ret.original_sale || '-'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>{ret.customer_name || ret.customer || '-'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151', textAlign: 'right' }}>
                    {(ret.items_data || []).length || '-'}
                  </td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 600, textAlign: 'right' }}>
                    {fmt(ret.refund_amount || 0, 'zwd')}
                  </td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: methodColor, fontWeight: 500 }}>{ret.refund_method || '-'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', background: reasonColors.bg, color: reasonColors.color }}>
                      {ret.reason || 'Unknown'}
                    </span>
                  </td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', background: statusColors.bg, color: statusColors.color }}>
                      {ret.status || 'Pending'}
                    </span>
                  </td>
                  {isOwnerOrManager && (
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                      {ret.status !== 'completed' && (
                        <button
                          onClick={() => handleCompleteReturn(ret.id)}
                          disabled={completeMutation.isPending}
                          style={{
                            background: '#EFF6FF',
                            color: '#1d4ed8',
                            border: 'none',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 8,
                            fontWeight: 600,
                            cursor: completeMutation.isPending ? 'not-allowed' : 'pointer',
                            opacity: completeMutation.isPending ? 0.6 : 1,
                          }}
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Return Policy Info Card */}
      <div
        style={{
          background: '#EFF6FF',
          border: '1px solid #d0e5ff',
          borderRadius: 10,
          padding: 16,
          fontSize: 11,
          color: '#1e3a5f',
          lineHeight: '1.6'
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Return Policy</div>
        <div>
          Returns accepted within 7 days of purchase. Items must be in original condition. Refunds processed to original payment method.
        </div>
      </div>
    </div>
  );
}
