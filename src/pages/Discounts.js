import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getDiscounts, createDiscount, updateDiscount, deleteDiscount } from '../api/retailApi';
import { confirm } from '../utils/confirm';

const S = {
  page: { maxWidth: 1200, margin: '0 auto', padding: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 13, fontWeight: 700, color: '#111827', fontFamily: "'Playfair Display', serif", margin: 0 },
  headerBtn: { background: '#1a6b3a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 20 },
  metricCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 },
  metricLabel: { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 8 },
  metricValue: { fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, marginBottom: 12 },
  metricIcon: { width: 48, height: 48, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 12 },
  promoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 },
  promoCard: { border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, borderLeft: '4px solid', position: 'relative' },
  promoName: { fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 4 },
  promoDesc: { fontSize: 11, color: '#6b7280', marginBottom: 8 },
  promoMeta: { fontSize: 10, color: '#9ca3af', marginBottom: 8 },
  badge: { display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', marginRight: 6 },
  badgeGreen: { background: '#e8f5ee', color: '#1a6b3a' },
  badgeBlue: { background: '#EFF6FF', color: '#2563eb' },
  badgePurple: { background: '#f3e8ff', color: '#7c3aed' },
  badgeAmber: { background: '#fef3e2', color: '#c97d1a' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11 },
  th: { fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', textAlign: 'left' },
  td: { padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151' },
};

export default function Discounts({ onTabChange }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwnerOrManager = user?.role === 'owner' || user?.role === 'manager';
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    discount_type: 'percentage',
    value: 10,
    active: true,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const { data: allDiscounts = [], isLoading } = useQuery({
    queryKey: ['retail-discounts'],
    queryFn: getDiscounts,
    staleTime: 30000
  });

  const createDiscountMutation = useMutation({
    mutationFn: createDiscount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['retail-discounts'] })
  });

  const updateDiscountMutation = useMutation({
    mutationFn: ({ id, data }) => updateDiscount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-discounts'] });
      setShowModal(false);
      setEditingDiscount(null);
    }
  });

  const deleteDiscountMutation = useMutation({
    mutationFn: deleteDiscount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['retail-discounts'] })
  });

  const getBorderColor = (type) => {
    const typeMap = {
      'percentage': '#1a6b3a',
      'fixed': '#2563eb',
      'bogo': '#7c3aed',
      'bundle': '#c97d1a'
    };
    return typeMap[type?.toLowerCase()] || '#1a6b3a';
  };

  const getBadgeClass = (type) => {
    const typeMap = {
      'percentage': 'badgeGreen',
      'fixed': 'badgeBlue',
      'bogo': 'badgePurple',
      'bundle': 'badgeAmber'
    };
    return typeMap[type?.toLowerCase()] || 'badgeGreen';
  };

  const activePromotions = useMemo(() =>
    allDiscounts.filter(d => d.is_current === true).map(d => ({
      id: d.id,
      name: d.name,
      description: d.code ? `Code: ${d.code}` : d.name,
      runs: d.start_date && d.end_date ? `${d.start_date} – ${d.end_date}` : 'Ongoing',
      type: d.discount_type,
      borderColor: getBorderColor(d.discount_type),
      badgeClass: getBadgeClass(d.discount_type),
      status: 'Active'
    }))
  , [allDiscounts]);

  const pastPromotions = useMemo(() =>
    allDiscounts.filter(d => d.is_expired === true).map(d => ({
      id: d.id,
      name: d.name,
      type: d.discount_type,
      period: d.start_date && d.end_date ? `${d.start_date} – ${d.end_date}` : 'N/A',
      timesUsed: d.times_used || 0,
      discounted: `$${(d.value || 0).toFixed(2)}`,
      impact: `${d.times_used > 0 ? '+' : ''}${(d.value * d.times_used).toFixed(2)}`
    }))
  , [allDiscounts]);

  const totalDiscounted = allDiscounts.reduce((sum, d) => sum + (d.times_used * d.value || 0), 0);
  const avgRate = allDiscounts.length > 0
    ? (allDiscounts.reduce((sum, d) => sum + (d.discount_type === 'percentage' ? d.value : 0), 0) / allDiscounts.length)
    : 0;

  useEffect(() => {
    if (editingDiscount) {
      setForm({
        name: editingDiscount.name || '',
        code: editingDiscount.code || '',
        discount_type: editingDiscount.discount_type || 'percentage',
        value: editingDiscount.value || 10,
        active: editingDiscount.active !== false,
        start_date: editingDiscount.start_date || new Date().toISOString().split('T')[0],
        end_date: editingDiscount.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    } else {
      setForm({
        name: '',
        code: '',
        discount_type: 'percentage',
        value: 10,
        active: true,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    }
  }, [editingDiscount]);

  const handleSaveDiscount = () => {
    if (editingDiscount) {
      updateDiscountMutation.mutate({ id: editingDiscount.id, data: form });
    } else {
      createDiscountMutation.mutate(form);
    }
  };

  const handleOpenModal = (discount = null) => {
    setEditingDiscount(discount);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDiscount(null);
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <h1 style={S.title}>Discounts & Promotions</h1>
        {isOwnerOrManager && (
          <button
            onClick={() => handleOpenModal()}
            disabled={createDiscountMutation.isPending}
            style={{
              ...S.headerBtn,
              opacity: createDiscountMutation.isPending ? 0.6 : 1,
              cursor: createDiscountMutation.isPending ? 'not-allowed' : 'pointer'
            }}
          >
            + Create Discount
          </button>
        )}
      </div>

      {/* Discount Modal */}
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
          onClick={handleCloseModal}
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
              {editingDiscount ? 'Edit Discount' : 'New Discount'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                  Code
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                  Type
                </label>
                <select
                  value={form.discount_type}
                  onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 7,
                    fontSize: 12,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                  Value
                </label>
                <input
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
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
                  End Date
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <label style={{ fontSize: 11, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
                Active
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleSaveDiscount}
                disabled={createDiscountMutation.isPending || updateDiscountMutation.isPending}
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
                  opacity: createDiscountMutation.isPending || updateDiscountMutation.isPending ? 0.6 : 1,
                }}
              >
                {editingDiscount ? 'Update' : 'Create'}
              </button>
              <button
                onClick={handleCloseModal}
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

      {/* Metrics */}
      <div style={S.metricsGrid}>
        <div style={S.metricCard}>
          <div style={S.metricLabel}>Active Promotions</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ ...S.metricValue, color: '#1a6b3a' }}>{activePromotions.length}</div>
            <div style={{ ...S.metricIcon, background: '#e8f5ee' }}>🎯</div>
          </div>
        </div>
        <div style={S.metricCard}>
          <div style={S.metricLabel}>Total Discount Given</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ ...S.metricValue, color: '#c97d1a' }}>${totalDiscounted.toFixed(2)}</div>
            <div style={{ ...S.metricIcon, background: '#fef3e2' }}>💰</div>
          </div>
        </div>
        <div style={S.metricCard}>
          <div style={S.metricLabel}>Avg. Discount Rate</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ ...S.metricValue, color: '#2563eb' }}>{avgRate.toFixed(1)}%</div>
            <div style={{ ...S.metricIcon, background: '#EFF6FF' }}>📊</div>
          </div>
        </div>
      </div>

      {/* Active Promotions */}
      <div style={S.card}>
        <h2 style={S.cardTitle}>Active Promotions</h2>
        {isLoading ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>Loading promotions...</div>
        ) : activePromotions.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>No active promotions</div>
        ) : (
          <div style={S.promoGrid}>
            {activePromotions.map(promo => (
              <div key={promo.id} style={{ ...S.promoCard, borderLeftColor: promo.borderColor }}>
                <div style={S.promoName}>{promo.name}</div>
                <div style={S.promoDesc}>{promo.description}</div>
                <div style={S.promoMeta}>Runs: {promo.runs}</div>
                <div>
                  <span style={{ ...S.badge, ...S[promo.badgeClass] }}>{promo.type}</span>
                  <span style={{ ...S.badge, background: '#e8f5ee', color: '#1a6b3a' }}>
                    {promo.status === 'Active' ? '✓' : '◯'} {promo.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Promotions Table */}
      <div style={S.card}>
        <h2 style={S.cardTitle}>Past Promotions</h2>
        {pastPromotions.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>No past promotions</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Name</th>
                <th style={S.th}>Type</th>
                <th style={S.th}>Period</th>
                <th style={S.th}>Times Used</th>
                <th style={S.th}>Total Discounted</th>
                <th style={S.th}>Revenue Impact</th>
                {isOwnerOrManager && <th style={S.th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {pastPromotions.map((promo) => {
                const fullDiscount = allDiscounts.find(d => d.id === promo.id);
                return (
                  <tr key={promo.id}>
                    <td style={S.td}>{promo.name}</td>
                    <td style={S.td}>{promo.type}</td>
                    <td style={S.td}>{promo.period}</td>
                    <td style={S.td}>{promo.timesUsed}</td>
                    <td style={S.td}>{promo.discounted}</td>
                    <td style={{ ...S.td, color: '#1a6b3a', fontWeight: 600 }}>{promo.impact}</td>
                    {isOwnerOrManager && (
                      <td style={S.td}>
                        <button
                          onClick={() => handleOpenModal(fullDiscount)}
                          style={{
                            padding: '4px 10px',
                            border: '1px solid #1a6b3a',
                            background: 'transparent',
                            color: '#1a6b3a',
                            borderRadius: 5,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            marginRight: 6,
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (await confirm({ title: 'Archive promotion', message: `Archive "${promo.name}"? Past sales that used it stay intact. Restore later from the archive if you change your mind.`, confirmText: 'Archive', danger: false })) {
                              deleteDiscountMutation.mutate(promo.id);
                            }
                          }}
                          style={{
                            padding: '4px 10px',
                            border: '1px solid #c0392b',
                            background: 'transparent',
                            color: '#c0392b',
                            borderRadius: 5,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
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
        )}
      </div>
    </div>
  );
}
