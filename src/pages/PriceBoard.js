/**
 * PriceBoard — full-screen tablet-friendly price display.
 *
 * One row per fuel grade with: name, code (large), price/L (huge).
 * Auto-refreshes every 60s in case the operator edits a product price.
 * Designed for a tablet on the forecourt window — high contrast,
 * minimal chrome, hides sidebar/topbar.
 *
 * Press F to toggle fullscreen.
 */
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listFuelGrades, getProducts } from '../api/retailApi';
import { fmt } from '../utils/format';

const T = {
  bg: '#0b1410',         // deep forest near-black
  ink: '#ffffff',
  inkSoft: 'rgba(255,255,255,.78)',
  inkMuted: 'rgba(255,255,255,.55)',
  panel: 'rgba(255,255,255,.07)',
  panelLine: 'rgba(255,255,255,.12)',
};

export default function PriceBoard() {
  const [now, setNow] = useState(new Date());

  // Auto-refresh prices every 60s. Grade list + product prices via react-query.
  const { data: grades = [] } = useQuery({
    queryKey: ['fuel-grades'],
    queryFn: listFuelGrades,
    refetchInterval: 60_000,
  });
  const { data: products = [] } = useQuery({
    queryKey: ['retail-products-for-price-board'],
    queryFn: getProducts,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Try to suggest fullscreen on first key press.
    const onKey = (e) => {
      if ((e.key === 'f' || e.key === 'F') && document.documentElement.requestFullscreen) {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Match each grade to its fuel Product and pull selling_price.
  const rows = grades.map(g => {
    const prod = (products || []).find(p => p.is_fuel && Number(p.fuel_grade) === Number(g.id));
    return {
      id: g.id,
      name: g.name,
      code: g.code,
      color: g.color_hex || '#1f3d26',
      price: prod ? Number(prod.selling_price || 0) : null,
    };
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, background: T.bg, color: T.ink,
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '24px 36px', borderBottom: `1px solid ${T.panelLine}`,
      }}>
        <div>
          <div style={{ fontSize: 14, color: T.inkMuted, letterSpacing: '.18em', textTransform: 'uppercase' }}>Pewil · Forecourt</div>
          <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>Today's prices</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div style={{ fontSize: 14, color: T.inkMuted, marginTop: 4 }}>{now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center' }}>
        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', color: T.inkMuted }}>
            No fuel grades configured.
          </div>
        ) : rows.map(r => (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: T.panel, border: `1px solid ${T.panelLine}`,
            borderRadius: 24, padding: '28px 36px',
            borderLeft: `12px solid ${r.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: r.color }}>{r.code}</div>
              <div style={{ fontSize: 22, color: T.inkSoft }}>{r.name}</div>
            </div>
            <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: '-.02em' }}>
              {r.price == null ? <span style={{ color: T.inkMuted, fontSize: 32, fontWeight: 600 }}>price not set</span>
                              : fmt(r.price)}
              <span style={{ fontSize: 22, color: T.inkMuted, fontWeight: 500, marginLeft: 6 }}>/ L</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 36px', borderTop: `1px solid ${T.panelLine}`, color: T.inkMuted, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
        <span>Prices update automatically. Last refresh: {now.toLocaleTimeString()}.</span>
        <span>Press F for fullscreen</span>
      </div>
    </div>
  );
}
