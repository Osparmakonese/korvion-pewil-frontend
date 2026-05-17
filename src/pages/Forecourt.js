/**
 * Forecourt — main service-station dashboard.
 *
 * One row per fuel tank with live volume, ullage, last dip variance, and
 * 24-hour litres sold. Bottom panels: recent variance flags, recent
 * deliveries, link to grade + tank setup.
 *
 * If the tenant has no tanks yet, shows an onboarding card pointing to
 * /forecourt/setup which walks through creating a grade + tank.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getFuelDashboard, listFuelGrades, listFuelDeliveries,
  getDipVarianceReport,
} from '../api/retailApi';
import { fmt } from '../utils/format';

const T = {
  ink:     '#111827',
  inkSoft: '#374151',
  muted:   '#6b7280',
  line:    '#e5e7eb',
  surface: '#f9fafb',
  green:   '#1a6b3a',
  greenT:  '#e8f5ee',
  amber:   '#c77700',
  amberT:  '#fdeedd',
  red:     '#c0392b',
  redT:    '#fde8e8',
};

function FillBar({ pct, color }) {
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <div style={{
      height: 10, background: T.line, borderRadius: 6, overflow: 'hidden', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0, width: `${clamped}%`,
        background: color || T.green, transition: 'width .35s',
      }} />
    </div>
  );
}

function TankCard({ tank }) {
  const fillColor = tank.fuel_grade_color || T.green;
  const isLow = tank.fill_percent < 20;
  const hasFlaggedDip = tank.last_variance_pct != null && Math.abs(tank.last_variance_pct) > 0.5;
  return (
    <div style={{
      background: '#fff', border: `1px solid ${T.line}`, borderRadius: 14,
      padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, color: T.ink, fontSize: 16 }}>{tank.label}</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>
            {tank.branch} · <span style={{ color: fillColor, fontWeight: 600 }}>{tank.fuel_grade_name || tank.fuel_grade}</span>
          </div>
        </div>
        {isLow && (
          <span style={{
            background: T.amberT, color: T.amber, fontSize: 11,
            fontWeight: 700, padding: '4px 10px', borderRadius: 999,
          }}>Low</span>
        )}
        {hasFlaggedDip && (
          <span style={{
            background: T.redT, color: T.red, fontSize: 11,
            fontWeight: 700, padding: '4px 10px', borderRadius: 999, marginLeft: 6,
          }}>Variance</span>
        )}
      </div>
      <FillBar pct={tank.fill_percent} color={fillColor} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: T.muted }}>
        <span>{Number(tank.current_volume_litres || 0).toLocaleString()} L</span>
        <span>{tank.fill_percent}% full</span>
        <span>{Number(tank.capacity_litres || 0).toLocaleString()} L cap</span>
      </div>
      <div style={{
        marginTop: 4, padding: '10px 12px', background: T.surface, borderRadius: 10,
        fontSize: 12.5, color: T.inkSoft,
      }}>
        <div>Ullage: <strong>{Number(tank.ullage_litres || 0).toLocaleString()} L</strong></div>
        <div>24h sold: <strong>{Number(tank.litres_24h || 0).toLocaleString()} L</strong></div>
        {tank.last_dip_at && (
          <div style={{ marginTop: 4 }}>
            Last dip: <strong>{new Date(tank.last_dip_at).toLocaleString()}</strong>
            {tank.last_variance_pct != null && (
              <span style={{
                marginLeft: 6,
                color: Math.abs(tank.last_variance_pct) > 0.5 ? T.red : T.green,
                fontWeight: 600,
              }}>
                ({tank.last_variance_pct > 0 ? '+' : ''}{Number(tank.last_variance_pct).toFixed(2)}%)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Forecourt({ onTabChange }) {
  const go = (tab) => onTabChange && onTabChange(tab);
  const { data: dash, isLoading } = useQuery({
    queryKey: ['fuel-dashboard'],
    queryFn: getFuelDashboard,
    staleTime: 20_000,
  });
  const { data: grades = [] } = useQuery({
    queryKey: ['fuel-grades'],
    queryFn: listFuelGrades,
    staleTime: 60_000,
  });
  const { data: deliveries = [] } = useQuery({
    queryKey: ['fuel-deliveries-recent'],
    queryFn: () => listFuelDeliveries(),
    staleTime: 60_000,
  });
  const { data: variance } = useQuery({
    queryKey: ['fuel-dip-variance'],
    queryFn: getDipVarianceReport,
    staleTime: 60_000,
  });

  const tanks = dash?.tanks || [];
  const recentDeliveries = (deliveries || []).slice(0, 6);
  const flaggedDips = (variance?.rows || []).filter(r => r.flagged).slice(0, 10);

  return (
    <div style={{ padding: '20px 28px', background: T.surface, minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: T.ink, margin: 0 }}>Forecourt</h1>
          <p style={{ color: T.muted, fontSize: 14, marginTop: 4, marginBottom: 0 }}>
            Live tank stock, deliveries, dip readings and regulator returns.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => go('Fuel Grades')} style={navBtn}>Grades</button>
          <button onClick={() => go('Fuel Tanks')} style={navBtn}>Tanks</button>
          <button onClick={() => go('Fuel Deliveries')} style={navBtn}>Deliveries</button>
          <button onClick={() => go('Dip Readings')} style={navBtn}>Dip log</button>
          <button onClick={() => go('Fleet Cards')} style={navBtn}>Fleet cards</button>
          <button onClick={() => go('Regulator Returns')} style={navBtn}>Regulator</button>
          <a href="/price-board" target="_blank" rel="noopener" style={{ ...navBtn, background: T.green, color: '#fff', borderColor: T.green, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            Price board ↗
          </a>
        </div>
      </div>

      {/* Empty state */}
      {!isLoading && tanks.length === 0 && (
        <div style={{
          background: '#fff', border: `1px solid ${T.line}`, borderRadius: 16,
          padding: 32, textAlign: 'center', maxWidth: 640, margin: '40px auto',
        }}>
          <div style={{ fontSize: 40 }}>⛽</div>
          <h2 style={{ marginTop: 12, color: T.ink }}>No fuel tanks yet</h2>
          <p style={{ color: T.muted, marginTop: 8 }}>
            Set up your fuel grades and tanks to start tracking wet-stock,
            ringing fuel sales at the till and generating regulator
            returns.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 18 }}>
            {grades.length === 0
              ? <button onClick={() => go('Fuel Grades')} style={{ ...navBtn, background: T.green, color: '#fff', borderColor: T.green }}>
                  Start: add a fuel grade
                </button>
              : <button onClick={() => go('Fuel Tanks')} style={{ ...navBtn, background: T.green, color: '#fff', borderColor: T.green }}>
                  Add your first tank
                </button>}
          </div>
        </div>
      )}

      {/* Tank grid */}
      {tanks.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {tanks.map(t => <TankCard key={t.tank_id} tank={t} />)}
        </div>
      )}

      {/* Bottom panels */}
      {tanks.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 16, marginTop: 22,
        }}>
          <div style={panel}>
            <div style={panelHead}>Recent deliveries</div>
            {recentDeliveries.length === 0 ? (
              <div style={{ color: T.muted, padding: 14 }}>No deliveries yet.</div>
            ) : recentDeliveries.map(d => (
              <div key={d.id} style={panelRow}>
                <div>
                  <div style={{ fontWeight: 600, color: T.ink }}>
                    {d.reference} · {d.fuel_grade_code}
                  </div>
                  <div style={{ fontSize: 12.5, color: T.muted }}>
                    {d.delivery_date} · {d.tank_label} · {Number(d.net_litres || 0).toLocaleString()} L
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: T.green }}>
                  {fmt(Number(d.total_cost || 0))}
                </div>
              </div>
            ))}
            <button onClick={() => go('Fuel Deliveries')} style={panelLink}>View all →</button>
          </div>

          <div style={panel}>
            <div style={panelHead}>Flagged variance (last 30 days)</div>
            {flaggedDips.length === 0 ? (
              <div style={{ color: T.muted, padding: 14 }}>
                No flagged variances. All recent dips within ±0.5%.
              </div>
            ) : flaggedDips.map((r, i) => (
              <div key={i} style={panelRow}>
                <div>
                  <div style={{ fontWeight: 600, color: T.ink }}>
                    {r.tank} · {r.fuel_grade}
                  </div>
                  <div style={{ fontSize: 12.5, color: T.muted }}>
                    {r.date} {r.time} · {r.reading_type}
                  </div>
                </div>
                <div style={{
                  fontWeight: 700,
                  color: Math.abs(r.variance_pct) > 0.5 ? T.red : T.green,
                }}>
                  {r.variance_pct > 0 ? '+' : ''}{Number(r.variance_pct).toFixed(2)}%
                </div>
              </div>
            ))}
            <button onClick={() => go('Dip Readings')} style={panelLink}>View all dips →</button>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtn = {
  padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  color: T.inkSoft, background: '#fff', border: `1px solid ${T.line}`,
  textDecoration: 'none', cursor: 'pointer', fontFamily: 'inherit',
};
const panel = {
  background: '#fff', border: `1px solid ${T.line}`, borderRadius: 14,
  padding: 16, display: 'flex', flexDirection: 'column', gap: 8,
};
const panelHead = {
  fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 6,
};
const panelRow = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '10px 0', borderBottom: `1px solid ${T.line}`,
};
const panelLink = {
  marginTop: 8, color: T.green, fontWeight: 600, fontSize: 13,
  textDecoration: 'none', alignSelf: 'flex-end',
  background: 'transparent', border: 0, cursor: 'pointer', fontFamily: 'inherit',
  padding: 0,
};
