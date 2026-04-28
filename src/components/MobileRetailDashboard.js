/**
 * MobileRetailDashboard.js — Frame 3 of the locked mobile design.
 *
 * Drop-in replacement for the dense desktop RetailDashboard at
 * viewport ≤ 500px. Reuses getRetailDashboard() so data is identical;
 * only the layout differs. See mobile-mockups/PEWIL_MOBILE_PREVIEW_2026-04-26.html
 * Frame 3 for the visual reference.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getRetailDashboard } from '../api/retailApi';
import { fmt } from '../utils/format';

const T = {
  cream:   '#faf6ef',
  cream2:  '#f5ede0',
  ink:     '#1a1812',
  inkSoft: '#4b4636',
  muted:   '#8a8474',
  line:    '#e6dec8',
  green:   '#1a6b3a',
  green2:  '#2d9e58',
  orange:  '#d9562c',
  orange2: '#f4a743',
};

export default function MobileRetailDashboard() {
  const { user } = useAuth() || {};
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['retail-dashboard'],
    queryFn: getRetailDashboard,
    staleTime: 30000,
  });

  const username = user?.first_name || user?.username || 'there';
  const greeting = new Date().getHours() < 12
    ? 'Good morning'
    : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  if (isLoading) {
    return (
      <div style={mobilePage}>
        <Skeleton h={130} r={22} mb={18} />
        <div style={tileGrid}>
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} h={86} r={16} mb={0} />)}
        </div>
        <div style={{ height: 14 }} />
        <Skeleton h={180} r={16} mb={0} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={mobilePage}>
        <div style={{
          padding: 24, color: T.orange, textAlign: 'center',
          background: '#fff', border: `1px solid ${T.line}`, borderRadius: 16,
        }}>
          Couldn't load your dashboard. Pull to refresh in a moment.
        </div>
      </div>
    );
  }

  const todayRevenue = parseFloat(dashboard?.today_revenue || 0);
  const mtd = parseFloat(dashboard?.revenue_mtd || 0);
  const txCount = dashboard?.transaction_count || 0;
  const productCount = dashboard?.products_count || 0;
  const activeSessions = dashboard?.active_sessions || 0;
  const lowStock = (dashboard?.low_stock_alerts || []).length;
  const recentActivity = dashboard?.recent_activity || [];

  return (
    <div style={mobilePage}>
      {/* Greeting row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '4px 4px 14px',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: `linear-gradient(135deg, ${T.orange2}, ${T.orange})`,
          color: '#fff', fontWeight: 700, fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{(username[0] || '?').toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: T.muted }}>{greeting}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {username}
          </div>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 12,
          background: 'rgba(255,255,255,0.7)',
          border: `1px solid ${T.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: T.ink, fontSize: 16,
        }}>🔔</div>
      </div>

      {/* Today's revenue hero */}
      <div style={{
        background: `linear-gradient(135deg, ${T.green} 0%, ${T.green2} 100%)`,
        color: '#fff',
        borderRadius: 22,
        padding: '18px 20px',
        marginBottom: 18,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)', top: -80, right: -60,
        }} />
        <div style={{
          fontSize: 11, opacity: 0.85, fontWeight: 600,
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>Today's revenue</div>
        <div style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 38, fontWeight: 700, lineHeight: 1.1, marginTop: 4,
        }}>
          {fmt(todayRevenue, 'zwd')}
        </div>
        <div style={{
          marginTop: 8, fontSize: 12,
          display: 'inline-flex', gap: 6, alignItems: 'center',
          background: 'rgba(255,255,255,0.15)',
          padding: '4px 10px', borderRadius: 999,
        }}>
          MTD {fmt(mtd, 'zwd')}
        </div>
      </div>

      {/* 2x2 tile grid */}
      <div style={tileGrid}>
        <Tile label="Sales today" value={txCount} pill={`Avg ${fmt(txCount > 0 ? todayRevenue / txCount : 0, 'zwd')}`} />
        <Tile
          label="Low stock"
          value={lowStock}
          pill="below reorder level"
          warn={lowStock > 0}
        />
        <Tile label="Products" value={productCount} pill="in catalogue" />
        <Tile label="Open sessions" value={activeSessions} pill={activeSessions === 0 ? 'No active till' : 'Active'} />
      </div>

      <div style={{ height: 14 }} />

      {/* Recent activity */}
      <div style={{
        background: '#fff',
        borderRadius: 16,
        border: `1px solid ${T.line}`,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 14px',
          borderBottom: `1px dashed ${T.line}`,
          fontSize: 11, fontWeight: 700, color: T.inkSoft,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>Recent activity</div>
        {recentActivity.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: T.muted, fontSize: 13 }}>
            No sales yet today. Open a cashier session to get started.
          </div>
        ) : recentActivity.slice(0, 6).map((act, idx) => (
          <div key={act.id || idx} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px',
            borderBottom: idx < Math.min(recentActivity.length, 6) - 1 ? '1px solid #f4ecd8' : 'none',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: T.cream2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
            }}>🧾</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Receipt #{act.receipt} · {act.customer || 'Walk-in'}
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>
                {fmt(parseFloat(act.total) || 0, 'zwd')} ·{' '}
                {act.method === 'mobile_money' ? 'EcoCash'
                : act.method === 'mixed' ? 'Split'
                : (act.method || 'cash')}{' '}
                {act.time && `· ${act.time}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tile({ label, value, pill, warn }) {
  return (
    <div style={{
      background: warn ? '#fff7e6' : '#fff',
      border: `1px solid ${warn ? 'rgba(255,150,0,0.3)' : T.line}`,
      borderRadius: 16,
      padding: 14,
    }}>
      <div style={{
        fontSize: 11, color: warn ? '#b25c00' : T.muted, fontWeight: 600,
      }}>{label}</div>
      <div style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: 22, fontWeight: 700, lineHeight: 1.1, marginTop: 4,
        color: T.ink,
      }}>{value}</div>
      {pill && (
        <div style={{
          display: 'inline-block', marginTop: 8,
          fontSize: 10, padding: '2px 8px', borderRadius: 999,
          background: warn ? 'rgba(255,170,0,0.15)' : 'rgba(0,0,0,0.05)',
          color: warn ? '#b25c00' : T.muted, fontWeight: 600,
        }}>{pill}</div>
      )}
    </div>
  );
}

function Skeleton({ h, r, mb }) {
  return (
    <div style={{
      height: h, borderRadius: r, marginBottom: mb,
      background: 'linear-gradient(90deg, #f1e8d4, #f9efd9, #f1e8d4)',
      backgroundSize: '200% 100%',
      animation: 'pulseShimmer 1.4s ease-in-out infinite',
    }} />
  );
}

const mobilePage = {
  padding: '12px 16px 0',
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  background: 'transparent',
  minHeight: '100%',
  color: T.ink,
};

const tileGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 10,
};
