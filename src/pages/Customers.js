import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomers, getTopCustomers, createCustomer, deleteCustomer } from '../api/retailApi';
import { useAuth } from '../context/AuthContext';
import { fmt } from '../utils/format';
import { confirm } from '../utils/confirm';
import AIInsightCard from '../components/AIInsightCard';
import MobileCustomers from '../components/MobileCustomers';
import { invalidateCustomerCaches } from '../utils/queryCache';

export default function Customers({ onTabChange }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });

  // Mobile breakpoint — keep all hooks ABOVE the early return.
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth <= 500
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 500);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const isOwnerOrManager = user?.role === 'owner' || user?.role === 'manager';

  // Fetch customers
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['retail-customers', searchTerm],
    queryFn: () => getCustomers(searchTerm || undefined),
    staleTime: 30000,
  });

  // Fetch top customers
  const { data: topCustomersData = [] } = useQuery({
    queryKey: ['retail-top-customers'],
    queryFn: getTopCustomers,
    staleTime: 30000,
  });

  // Pretty-print API errors so silent failures stop catching us.
  const formatApiError = (err, fallback = 'Save failed') => {
    const data = err?.response?.data;
    if (typeof data === 'string') return data;
    if (data?.detail) return data.detail;
    if (data && typeof data === 'object') {
      const lines = Object.entries(data).map(([k, v]) =>
        `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
      if (lines.length) return lines.join('\n');
    }
    return err?.message || fallback;
  };

  // Create customer mutation — predicate-based invalidation reaches the
  // mobile mirror, top-customers, loyalty, and customer-history caches too.
  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      invalidateCustomerCaches(queryClient);
      setShowAddForm(false);
      setFormData({ name: '', phone: '', email: '' });
    },
    onError: (err) => alert('Could not create customer:\n\n' + formatApiError(err)),
  });

  // Delete customer mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      invalidateCustomerCaches(queryClient);
    },
    onError: (err) => alert('Could not delete customer:\n\n' + formatApiError(err)),
  });

  // Mobile branch — hooks above are sufficient to satisfy the rules-of-hooks
  // ordering contract; everything below is desktop-only render logic.
  if (isMobile) return <MobileCustomers />;

  const handleAddCustomer = (e) => {
    e.preventDefault();
    if (formData.name && formData.phone) {
      createMutation.mutate(formData);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (await confirm({ title: 'Archive customer', message: 'Archive this customer? Their past purchases stay on the books, but they\'ll stop appearing in the customer picker. An owner can restore them later from the archive.', confirmText: 'Archive', danger: false })) {
      deleteMutation.mutate(id);
    }
  };

  // Calculate metrics from customers data
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.is_active).length;
  const totalRevenue = customers.reduce((sum, c) => sum + (parseFloat(c.total_spent) || 0), 0);
  const avgSpend = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  // Format top customers for display
  const maxSpent = Math.max(...topCustomersData.map((c) => parseFloat(c.total_spent) || 0), 1);
  const topCustomers = topCustomersData.slice(0, 5).map((c) => ({
    name: c.name,
    amount: fmt(c.total_spent || 0, 'zwd'),
    percentage: ((parseFloat(c.total_spent) || 0) / maxSpent) * 100,
  }));

  const filteredCustomers = customers.filter(c =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone || '').includes(searchTerm) ||
    (c.id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (customer) => {
    if (!customer.is_active) {
      return { bg: '#f3f4f6', color: '#6b7280', text: 'Inactive' };
    }
    if (!customer.created_at || new Date(customer.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
      return { bg: '#EFF6FF', color: '#1e3a5f', text: 'New' };
    }
    return { bg: '#e8f5ee', color: '#1a6b3a', text: 'Active' };
  };

  const colors = ['#1e3a5f', '#1a6b3a', '#c97d1a', '#7c3aed', '#c0392b'];

  if (customersLoading) {
    return (
      <div style={{ padding: 24, fontFamily: "'Inter', sans-serif", backgroundColor: '#f9fafb', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: "'Inter', sans-serif", backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", margin: 0, color: '#111827' }}>
          Customers
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
            + Add Customer
          </button>
        )}
      </div>

      {/* Add Customer Form */}
      {showAddForm && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 24 }}>
          <form onSubmit={handleAddCustomer}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Customer Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                type="tel"
                placeholder="Phone *"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 7,
                  fontSize: 11,
                  fontFamily: "'Inter', sans-serif",
                }}
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
                {createMutation.isPending ? 'Saving...' : 'Save Customer'}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
        {/* Total Customers */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20
              }}
            >
              👥
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
                TOTAL CUSTOMERS
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#1e3a5f', marginBottom: 2 }}>
                {totalCustomers}
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>All time</div>
            </div>
          </div>
        </div>

        {/* Active This Month */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#e8f5ee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20
              }}
            >
              ✓
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
                ACTIVE CUSTOMERS
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#1a6b3a', marginBottom: 2 }}>
                {activeCustomers}
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>Currently active</div>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#e8f5ee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20
              }}
            >
              $
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
                TOTAL REVENUE
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#1a6b3a', marginBottom: 2 }}>
                {fmt(totalRevenue, 'zwd')}
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>All sales</div>
            </div>
          </div>
        </div>

        {/* Average Spend */}
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
              ≈
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
                AVG. SPEND
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#c97d1a', marginBottom: 2 }}>
                {fmt(avgSpend, 'zwd')}
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>Per customer</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        {/* Customer Table Card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <input
            type="text"
            placeholder="Search by name, phone, or customer ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 7,
              fontSize: 11,
              marginBottom: 16,
              fontFamily: "'Inter', sans-serif",
              boxSizing: 'border-box'
            }}
          />

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>ID</th>
                <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Name</th>
                <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Phone</th>
                <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Email</th>
                <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Purchases</th>
                <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Total Spent</th>
                <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Status</th>
                {isOwnerOrManager && <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => {
                const statusColors = getStatusColor(customer);
                return (
                  <tr key={customer.id}>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#1a6b3a', fontFamily: 'monospace', fontWeight: 600 }}>{customer.id}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 600 }}>{customer.name}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>{customer.phone}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151', fontSize: 10 }}>{customer.email || '-'}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151', textAlign: 'right' }}>{customer.total_purchases || 0}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 600, textAlign: 'right' }}>{fmt(customer.total_spent || 0, 'zwd')}</td>
                    <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', background: statusColors.bg, color: statusColors.color }}>
                        {statusColors.text}
                      </span>
                    </td>
                    {isOwnerOrManager && (
                      <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          disabled={deleteMutation.isPending}
                          style={{
                            background: '#fee2e2',
                            color: '#c0392b',
                            border: 'none',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 8,
                            fontWeight: 600,
                            cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
                            opacity: deleteMutation.isPending ? 0.6 : 1,
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Top Customers Card */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Inter', sans-serif", margin: '0 0 16px 0', color: '#111827' }}>
            Top Customers
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topCustomers.map((customer, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: colors[idx],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    flexShrink: 0
                  }}
                >
                  {idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                    {customer.name}
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: 6,
                      background: '#f3f4f6',
                      borderRadius: 3,
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        background: '#1a6b3a',
                        width: `${customer.percentage}%`
                      }}
                    />
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', textAlign: 'right', minWidth: 50 }}>
                  {customer.amount}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Customer Insights */}
        <AIInsightCard feature="retail_customer_insights" title="AI Customer Insights" compact />
      </div>
    </div>
  );
}
