import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getLoyaltyStats, getLoyaltyTransactions } from '../api/retailApi';

export default function CustomerLoyalty({ onTabChange }) {
  useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['retail-loyalty-stats'],
    queryFn: getLoyaltyStats,
    staleTime: 30000
  });

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['retail-loyalty-transactions'],
    queryFn: () => getLoyaltyTransactions({}),
    staleTime: 30000
  });

  const tierColors = {
    gold: '#c97d1a',
    silver: '#2563eb',
    bronze: '#1a6b3a'
  };

  const tiers = [
    {
      name: 'Gold',
      borderColor: tierColors.gold,
      range: '500+ points',
      members: stats?.tier_breakdown?.gold || 0,
      benefits: '15% discount, free delivery, birthday reward'
    },
    {
      name: 'Silver',
      borderColor: tierColors.silver,
      range: '200-499 points',
      members: stats?.tier_breakdown?.silver || 0,
      benefits: '10% discount, early access to sales'
    },
    {
      name: 'Bronze',
      borderColor: tierColors.bronze,
      range: '0-199 points',
      members: stats?.tier_breakdown?.bronze || 0,
      benefits: '5% discount on next purchase'
    }
  ];

  const earningRules = [
    { rule: 'Every $1 spent', points: '1 point' },
    { rule: 'First purchase bonus', points: '50 points' },
    { rule: 'Refer a friend', points: '100 points' },
    { rule: 'Birthday month', points: '2x points' },
    { rule: 'Buy 10 items', points: '25 bonus points' }
  ];

  const getTierColor = (tier) => {
    if (tier === 'gold' || tier?.includes('Gold')) return tierColors.gold;
    if (tier === 'silver' || tier?.includes('Silver')) return tierColors.silver;
    return tierColors.bronze;
  };

  const formatTransactionRow = (txn) => {
    const date = new Date(txn.created_at);
    return {
      date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      customer: txn.member_name || txn.member,
      action: txn.description,
      points: txn.points >= 0 ? `+${txn.points}` : `${txn.points}`,
      balance: txn.points,
      tier: txn.transaction_type,
      tierColor: getTierColor(txn.transaction_type)
    };
  };

  const recentActivity = transactionsData ? transactionsData.map(formatTransactionRow) : [];

  return (
    <div style={{ padding: 24, fontFamily: "'Inter', sans-serif", backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", margin: 0, color: '#111827' }}>
          Customer Loyalty Program
        </h1>
      </div>

      {/* Hero Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          borderRadius: 14,
          padding: '24px',
          marginBottom: 24,
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: 100
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontFamily: "'Playfair Display', serif", margin: '0 0 8px 0', fontWeight: 700 }}>
            Customer Loyalty Program
          </h2>
          <p style={{ fontSize: 10, margin: 0, opacity: 0.85 }}>
            Reward repeat customers and drive retention
          </p>
        </div>
        <div style={{ fontSize: 48, opacity: 0.2 }}>⭐</div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 24 }}>
        {/* Members Enrolled */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#f3e8ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18
              }}
            >
              👥
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
                MEMBERS ENROLLED
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#7c3aed', marginBottom: 2 }}>
                {statsLoading ? '—' : stats?.total_members || 0}
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>Active members</div>
            </div>
          </div>
        </div>

        {/* Points Issued (MTD) */}
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
                fontSize: 18
              }}
            >
              ⭐
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
                POINTS ISSUED (MTD)
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#1a6b3a', marginBottom: 2 }}>
                {statsLoading ? '—' : stats?.points_issued_mtd || 0}
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>This month</div>
            </div>
          </div>
        </div>

        {/* Points Redeemed (MTD) */}
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
                fontSize: 18
              }}
            >
              🎁
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
                POINTS REDEEMED (MTD)
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#c97d1a', marginBottom: 2 }}>
                {statsLoading ? '—' : stats?.points_redeemed_mtd || 0}
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>This month</div>
            </div>
          </div>
        </div>

        {/* Redemption Rate */}
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
                fontSize: 18
              }}
            >
              📊
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>
                REDEMPTION RATE
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#2563eb', marginBottom: 2 }}>
                {statsLoading ? '—' : `${(stats?.redemption_rate || 0).toFixed(0)}%`}
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>Conversion rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 12, marginBottom: 24 }}>
        {/* Loyalty Tiers */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 16px 0', color: '#111827' }}>
            Loyalty Tiers
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tiers.map((tier, idx) => (
              <div
                key={idx}
                style={{
                  border: `2px solid ${tier.borderColor}`,
                  borderLeft: `4px solid ${tier.borderColor}`,
                  borderRadius: 8,
                  padding: 12,
                  background: '#f9fafb'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, margin: 0, color: tier.borderColor }}>
                    {tier.name}
                  </h4>
                  <span style={{ fontSize: 9, color: '#6b7280', fontWeight: 600 }}>
                    {tier.members} members
                  </span>
                </div>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 8 }}>
                  {tier.range}
                </div>
                <div style={{ fontSize: 9, color: '#374151', lineHeight: 1.4 }}>
                  {tier.benefits}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Earning Rules */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 16px 0', color: '#111827' }}>
            How Customers Earn Points
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {earningRules.map((rule, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#e8f5ee',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    color: '#1a6b3a',
                    flexShrink: 0,
                    fontWeight: 700
                  }}
                >
                  {idx + 1}
                </div>
                <div style={{ flex: 1, fontSize: 10, color: '#374151' }}>
                  {rule.rule}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#1a6b3a', whiteSpace: 'nowrap' }}>
                  {rule.points}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 16px 0', color: '#111827' }}>
          Recent Loyalty Activity
        </h3>
        {transactionsLoading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>Loading transactions...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Date</th>
                <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Customer</th>
                <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Action</th>
                <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Points</th>
                <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>Balance</th>
                <th style={{ fontSize: 8, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '7px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'left' }}>Tier</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((activity, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151', fontSize: 10 }}>{activity.date}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 600 }}>{activity.customer}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#374151', fontSize: 10 }}>{activity.action}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#1a6b3a', fontWeight: 600, textAlign: 'right' }}>{activity.points}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6', color: '#111827', fontWeight: 600, textAlign: 'right' }}>{activity.balance}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 20, textTransform: 'uppercase', background: activity.tierColor + '20', color: activity.tierColor }}>
                      {activity.tier}
                    </span>
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
