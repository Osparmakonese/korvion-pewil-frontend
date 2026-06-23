import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Sidebar, { NAV_ITEMS } from './Sidebar';
import Topbar from './Topbar';
import Logo from './Logo';
import { initials, avatarColor } from '../utils/format';
import { listBranches, listFuelTanks } from '../api/retailApi';
import haptics from '../utils/haptics';

/*
  UX Laws applied to mobile drawer:
  - Miller's Law: Items grouped into 5 sections (within 7+-2 rule)
  - Proximity Law: Section headers + spacing separate groups visually
  - Hick's Law: Sections reduce cognitive load vs flat 20-item grid
  - Von Restorff Effect: Active item has green border + bg to stand out
*/
const FARM_DRAWER_SECTIONS = [
  { label: 'Farm Operations', items: [
    { key: 'Costs', emoji: '\u{1F9FE}', label: 'Costs', sub: 'Farm expenses' },
    { key: 'Farm Assets', emoji: '\u{1F3D7}\uFE0F', label: 'Assets', sub: 'Equipment' },
  ]},
  { label: 'Economics', items: [
    { key: 'Harvest', emoji: '\u{1F33E}', label: 'Harvest', sub: 'Yield tracking' },
    { key: 'Budget', emoji: '\u{1F4CB}', label: 'Budget', sub: 'Plan vs actual' },
    { key: 'Water', emoji: '\u{1F4A7}', label: 'Water', sub: 'Irrigation logs' },
    { key: 'Loans', emoji: '\u{1F3E6}', label: 'Loans', sub: 'Credit tracker' },
    { key: 'Market Prices', emoji: '\u{1F4CA}', label: 'Prices', sub: 'Commodity prices' },
    { key: 'Economics', emoji: '\u{1F4C8}', label: 'Analytics', sub: 'Profitability', ownerOnly: true },
  ]},
  { label: 'Livestock', items: [
    { key: 'Cattle', emoji: '\u{1F404}', label: 'Cattle', sub: 'Herd management' },
    { key: 'Goats', emoji: '\u{1F410}', label: 'Goats', sub: 'Goat records' },
    { key: 'Sheep', emoji: '\u{1F411}', label: 'Sheep', sub: 'Flock records' },
    { key: 'Pigs', emoji: '\u{1F437}', label: 'Pigs', sub: 'Pig management' },
    { key: 'Broilers', emoji: '\u{1F414}', label: 'Broilers', sub: 'Meat birds' },
    { key: 'Layers', emoji: '\u{1F95A}', label: 'Layers', sub: 'Egg production' },
  ]},
  { label: 'People', items: [
    { key: 'Workers', emoji: '\u{1F477}', label: 'Workers', sub: 'Roster & wages' },
    { key: 'Hours & Pay', emoji: '\u23F1\uFE0F', label: 'Hours & Pay', sub: 'Attendance' },
  ]},
  { label: 'AI Tools', items: [
    { key: 'Voice Briefing', emoji: '\u{1F3A4}', label: 'Voice Briefing', sub: 'Daily update — EN/SN/ND' },
  ]},
  { label: 'Admin', items: [
    { key: 'Report', emoji: '\u{1F4C8}', label: 'Report', sub: 'P&L overview', ownerOnly: true },
    { key: 'Settings', emoji: '\u2699\uFE0F', label: 'Settings', sub: 'Configuration' },
    { key: 'Import', emoji: '\u{1F4E5}', label: 'Import', sub: 'Excel upload' },
    { key: 'Admin Panel', emoji: '\u{1F510}', label: 'Admin', sub: 'Super admin', ownerOnly: true },
  ]},
];

const RETAIL_DRAWER_SECTIONS = [
  { label: 'Retail', items: [
    { key: 'POS', emoji: '\u{1F6D2}', label: 'POS', sub: 'Process sales' },
    { key: 'Products', emoji: '\u{1F3F7}\uFE0F', label: 'Products', sub: 'Catalog' },
    { key: 'Customers', emoji: '\u{1F465}', label: 'Customers', sub: 'CRM' },
    { key: 'Sales History', emoji: '\u{1F4CB}', label: 'Sales', sub: 'Transactions' },
    { key: 'Returns', emoji: '\u{1F504}', label: 'Returns', sub: 'Refunds' },
    { key: 'Cashier Sessions', emoji: '\u{1F4B5}', label: 'Sessions', sub: 'Registers' },
    { key: 'Discounts', emoji: '\u{1F3F7}\uFE0F', label: 'Discounts', sub: 'Promotions' },
  ]},
  { label: 'Inventory', items: [
    { key: 'Categories', emoji: '\u{1F5C2}', label: 'Categories', sub: 'Organize' },
    { key: 'Suppliers', emoji: '\u{1F4E6}', label: 'Suppliers', sub: 'Vendors & POs' },
    { key: 'WhatsApp PO', emoji: '\u{1F4AC}', label: 'WhatsApp PO', sub: 'AI-parse supplier msgs' },
    { key: 'Stock Adjustments', emoji: '\u{1F504}', label: 'Adjustments', sub: 'Stock changes' },
    { key: 'Stock Transfers', emoji: '\u{1F4E6}', label: 'Transfers', sub: 'Move stock between branches' },
    { key: 'Branches', emoji: '\u{1F3EA}', label: 'Branches', sub: 'Locations & HQ', ownerOnly: true },
    { key: 'Low Stock Alerts', emoji: '\u{1F6A8}', label: 'Alerts', sub: 'Reorder' },
    { key: 'Barcode Labels', emoji: '\u{1F4CF}', label: 'Barcodes', sub: 'Labels' },
  ]},
  { label: 'Enterprise', items: [
    { key: 'Chain Rollup', emoji: '\u{1F30D}', label: 'Chain Rollup', sub: 'All branches at a glance', ownerOnly: true },
  ]},
  // Forecourt module — gated to fuel-station business type via feature keys
  // (same gating as the desktop sidebar). Hidden for hardware/general/etc.
  { label: 'Forecourt', items: [
    { key: 'Forecourt', emoji: '⛽', label: 'Forecourt', sub: 'Live tanks + dashboard', feature: 'fuel_forecourt' },
    { key: 'Fuel Tanks', emoji: '\u{1F6E2}️', label: 'Tanks', sub: 'Storage + capacity', feature: 'fuel_tanks' },
    { key: 'Fuel Grades', emoji: '\u{1F539}', label: 'Grades', sub: 'Diesel, ULP93, etc', feature: 'fuel_tanks' },
    { key: 'Fuel Deliveries', emoji: '\u{1F69B}', label: 'Deliveries', sub: 'Bulk fills', feature: 'fuel_deliveries' },
    { key: 'Dip Readings', emoji: '\u{1F4CF}', label: 'Dip log', sub: 'Wet-stock reconciliation', feature: 'fuel_dips' },
    { key: 'Fleet Cards', emoji: '\u{1F4B3}', label: 'Fleet cards', sub: 'Engen, Total, Puma...', feature: 'fleet_cards' },
    { key: 'Regulator Returns', emoji: '\u{1F4DC}', label: 'Regulator', sub: 'ZERA / EPRA / NMDPRA', ownerOnly: true, feature: 'regulator_returns' },
  ]},
  // Pharmacy module — gated to pharmacy business type.
  { label: 'Pharmacy', items: [
    { key: 'Batches', emoji: '\u{1F4E6}', label: 'Batches & Expiry', sub: 'Lot + expiry tracking', feature: 'batch_tracking' },
    { key: 'Prescriptions', emoji: '\u{1F48A}', label: 'Prescriptions', sub: 'Dispensing', feature: 'prescriptions' },
    { key: 'Controlled Register', emoji: '\u{1F512}', label: 'Controlled Register', sub: 'Scheduled-drug log', ownerOnly: true, feature: 'controlled_substances' },
  ]},
  // Restaurant module — gated to restaurant business type.
  { label: 'Restaurant', items: [
    { key: 'Tables', emoji: '\u{1F37D}️', label: 'Tables', sub: 'Floor & status', feature: 'tables' },
    { key: 'Kitchen', emoji: '\u{1F373}', label: 'Kitchen', sub: 'Order tickets', feature: 'kitchen_orders' },
    { key: 'Modifiers', emoji: '➕', label: 'Modifiers', sub: 'Menu options', feature: 'modifiers' },
  ]},
  { label: 'Accounting', items: [
    { key: 'Journal Entries', emoji: '\u{1F4D2}', label: 'Journal', sub: 'Double-entry' },
    { key: 'Retail Report', emoji: '\u{1F4CA}', label: 'Reports', sub: 'P&L + analytics', ownerOnly: true },
    { key: 'Retail Payroll', emoji: '\u{1F4B0}', label: 'Payroll', sub: 'PAYE + NSSA' },
    { key: 'End of Day', emoji: '\u{1F4C4}', label: 'EOD Report', sub: 'Daily close' },
    { key: 'Profit Margins', emoji: '\u{1F4C8}', label: 'Margins', sub: 'Profitability', ownerOnly: true },
  ]},
  { label: 'Loss Prevention', items: [
    { key: 'Loss Prevention', emoji: '\u{1F6E1}\uFE0F', label: 'LP Dashboard', sub: 'Events, flags, trust, shrinkage' },
    { key: 'Theft Scan', emoji: '\u{1F50D}', label: 'Theft Scan', sub: 'AI anomaly detection', ownerOnly: true },
    { key: 'Price Drift', emoji: '\u{1F4B0}', label: 'Price Drift', sub: 'Supplier cost creep', ownerOnly: true },
  ]},
  { label: 'Marketing', items: [
    { key: 'Customer Loyalty', emoji: '\u2B50', label: 'Loyalty', sub: 'Points & rewards' },
    { key: 'Cashier Performance', emoji: '\u{1F3C6}', label: 'Performance', sub: 'Staff analytics' },
  ]},
  { label: 'System', items: [
    { key: 'Device Config', emoji: '\u{1F50C}', label: 'Devices', sub: 'Hardware setup' },
    { key: 'Tax Compliance', emoji: '\u{1F4CB}', label: 'Tax Compliance', sub: 'Country-specific fiscal config' },
    { key: 'Multi-Currency', emoji: '\u{1F4B1}', label: 'Currency', sub: 'Exchange rates' },
    { key: 'Receipt Setup', emoji: '\u{1F9FE}', label: 'Receipts', sub: 'Templates' },
    { key: 'POS Settings', emoji: '\u{1F5A5}\uFE0F', label: 'POS Style', sub: 'Cashier screen look', ownerOnly: true },
    { key: 'Manager PIN', emoji: '\u{1F510}', label: 'Manager PIN', sub: 'Unlock cashier approvals' },
    { key: 'Tax Config', emoji: '\u{1F4DC}', label: 'Tax Config', sub: 'PAYE + NSSA bands', ownerOnly: true },
    { key: 'Retail Billing', emoji: '\u{1F4B3}', label: 'Billing', sub: 'Subscription' },
    { key: 'Retail Settings', emoji: '\u2699\uFE0F', label: 'Settings', sub: 'Configuration' },
  ]},
];

const FARM_BOTTOM_PRIMARY = ['Dashboard', 'Fields', 'Sales & Market', 'Stock'];
const RETAIL_BOTTOM_PRIMARY = ['Retail', 'POS', 'Products', 'Cashier Sessions'];

export default function Layout({
  activeTab, onTabChange, user, onLogout,
  pageTitle, pageSub, primaryAction, onPrimaryAction,
  dashboardData, lowStockCount, children,
  activeModule, onModuleChange,
}) {
  const [showMobileMore, setShowMobileMore] = useState(false);
  const role = user?.role || 'worker';
  const ac = avatarColor(user?.username || '');
  // Business-type feature gating for the mobile nav (mirrors Sidebar.js). When
  // the token has no `features` (older cached login) we don't gate, preserving
  // prior behaviour until the next sign-in.
  const features = Array.isArray(user?.features) ? user.features : null;
  const hasFeature = (key) => !key || !features || features.includes(key);
  const BOTTOM_PRIMARY = activeModule === 'retail' ? RETAIL_BOTTOM_PRIMARY : FARM_BOTTOM_PRIMARY;

  // ── Mobile drawer, derived from the desktop sidebar's single source ──
  // Same NAV_ITEMS + same role/feature/showWhen gating as Sidebar.js, so the
  // mobile "More" menu can never drift from the real system again.
  const isSuperAdmin = !!user?.is_super_admin;
  const hasRetail = activeModule === 'retail';
  const hasFarm = activeModule === 'farm';
  const { data: navBranches = [] } = useQuery({
    queryKey: ['retail-branches'], queryFn: listBranches, enabled: hasRetail, staleTime: 60000,
  });
  const { data: navFuelTanks = [] } = useQuery({
    queryKey: ['fuel-tanks'], queryFn: () => listFuelTanks(), enabled: hasRetail, staleTime: 60000,
  });
  const hasMultibranch = (navBranches?.length || 0) > 1;
  const hasFuel = (navFuelTanks?.length || 0) > 0;
  const meetsShowWhen = (sw) => {
    if (!sw) return true;
    if (sw === 'multibranch') return hasMultibranch;
    if (sw === 'fuel') return hasFuel;
    if (sw === 'multibranch_or_fuel') return hasMultibranch || hasFuel;
    return true;
  };
  const navDrawerSections = NAV_ITEMS
    .filter((s) => {
      if (s.ownerOnly && role !== 'owner') return false;
      if (s.superOnly && !isSuperAdmin) return false;
      if (s.module === 'retail' && !hasRetail) return false;
      if (s.module === 'farm' && !hasFarm) return false;
      if (s.module && s.module !== 'any' && s.module !== 'retail' && s.module !== 'farm') return false;
      if (!s.module && !hasFarm) return false; // untagged sections default to farm
      if (!meetsShowWhen(s.showWhen)) return false;
      return true;
    })
    .map((s) => ({
      label: s.section,
      items: s.items.filter((it) =>
        (!it.ownerOnly || role === 'owner') && meetsShowWhen(it.showWhen) && hasFeature(it.feature)
      ),
    }))
    .filter((s) => s.items.length > 0);
  // The legacy *_DRAWER_SECTIONS consts above are kept only as a defensive
  // fallback and are otherwise unused — NAV_ITEMS is the source of truth.
  const DRAWER_SECTIONS = navDrawerSections.length
    ? navDrawerSections
    : (activeModule === 'retail' ? RETAIL_DRAWER_SECTIONS : FARM_DRAWER_SECTIONS);
  const moduleAccent = activeModule === 'retail' ? '#c97d1a' : '#1a6b3a';
  const moduleAccentBg = activeModule === 'retail' ? '#fdeedd' : '#e8f5ee';
  const moduleAccentRing = activeModule === 'retail' ? 'rgba(201,125,26,0.15)' : 'rgba(26,107,58,0.15)';
  // SINGLE-MODULE RULE (April 2026): no in-app switching between farm and
  // retail. Each tenant is one-or-the-other. Mobile drawer drops the toggle.
  const isMore = !BOTTOM_PRIMARY.includes(activeTab);
  const goTab = (tab) => {
    haptics.tap();
    onTabChange(tab);
    setShowMobileMore(false);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div className="sidebar-desktop">
        <Sidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          user={user}
          onLogout={onLogout}
          lowStockCount={lowStockCount}
          activeModule={activeModule}
          onModuleChange={onModuleChange}
        />
      </div>
      <div className="main-content" style={{ marginLeft: 220, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Mobile header */}
        <div className="mobile-header">
          <div>
            <Logo size={30} />
          </div>
          <div className="mh-right">
            <button className="mobile-wa-btn" onClick={() => window.open('https://wa.me/', '_blank')}>
              {'\u{1F4F1}'} WhatsApp
            </button>
            <div className="mobile-avatar" style={{ background: ac.bg }}>
              {initials(user?.username || '')}
            </div>
          </div>
        </div>
        <div className="topbar-desktop">
          <Topbar
            pageTitle={pageTitle}
            pageSub={pageSub}
            primaryAction={primaryAction}
            onPrimaryAction={onPrimaryAction}
            dashboardData={dashboardData}
            activeModule={activeModule}
          />
        </div>
        <main className="page-content-mobile" style={{ flex: 1, padding: '20px 24px', background: '#fffcf7' }}>
          {children}
        </main>
      </div>

      {/* Bottom nav — Hick's Law: only 5 primary choices */}
      <div className="bottom-nav" style={{ '--bn-active': moduleAccent }}>
        {activeModule === 'farm' ? (
          <>
            <button className={`bn-tab${activeTab === 'Dashboard' ? ' active' : ''}`} onClick={() => goTab('Dashboard')}>
              <span className="bn-icon">{'\u{1F3E0}'}</span>
              <span className="bn-label">Home</span>
            </button>
            <button className={`bn-tab${activeTab === 'Fields' ? ' active' : ''}`} onClick={() => goTab('Fields')}>
              <span className="bn-icon">{'\u{1F33E}'}</span>
              <span className="bn-label">Fields</span>
            </button>
            <button className={`bn-tab${activeTab === 'Sales & Market' ? ' active' : ''}`} onClick={() => goTab('Sales & Market')}>
              <span className="bn-icon">{'\u{1F69A}'}</span>
              <span className="bn-label">Sales</span>
            </button>
            <button className={`bn-tab${activeTab === 'Stock' ? ' active' : ''}`} onClick={() => goTab('Stock')}>
              <span className="bn-icon">{'\u{1F4E6}'}</span>
              <span className="bn-label">Stock</span>
              {lowStockCount > 0 && <span className="bn-badge">{lowStockCount}</span>}
            </button>
          </>
        ) : (
          <>
            <button className={`bn-tab${activeTab === 'Retail' ? ' active' : ''}`} onClick={() => goTab('Retail')}>
              <span className="bn-icon">{'\u{1F4CA}'}</span>
              <span className="bn-label">Home</span>
            </button>
            <button className={`bn-tab${activeTab === 'POS' ? ' active' : ''}`} onClick={() => goTab('POS')}>
              <span className="bn-icon">{'\u{1F6D2}'}</span>
              <span className="bn-label">POS</span>
            </button>
            <button className={`bn-tab${activeTab === 'Products' ? ' active' : ''}`} onClick={() => goTab('Products')}>
              <span className="bn-icon">{'\u{1F3F7}\uFE0F'}</span>
              <span className="bn-label">Products</span>
            </button>
            <button className={`bn-tab${activeTab === 'Cashier Sessions' ? ' active' : ''}`} onClick={() => goTab('Cashier Sessions')}>
              <span className="bn-icon">{'\u{1F4B5}'}</span>
              <span className="bn-label">Sessions</span>
            </button>
          </>
        )}
        <button className={`bn-tab${isMore ? ' active' : ''}`} onClick={() => { haptics.select(); setShowMobileMore(true); }}>
          <span className="bn-icon">{'\u22EF'}</span>
          <span className="bn-label">More</span>
        </button>
      </div>

      {/* Mobile More drawer — restyled 2026-04-28 to match Frame 6 of the
          locked mobile mockup. Profile card up top, optional trial banner,
          then grouped iOS-style menu rows. Each row drives the same
          activeTab change as the desktop sidebar so behaviour is
          unchanged — only the visual layer is new. */}
      {showMobileMore && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(20,16,8,0.55)', zIndex: 400 }}
            onClick={() => setShowMobileMore(false)}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: '#faf6ef',
            borderRadius: '28px 28px 0 0',
            padding: '12px 20px calc(28px + env(safe-area-inset-bottom, 0px))',
            maxHeight: '85vh', overflowY: 'auto', zIndex: 450,
            boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
            fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          }}>
            {/* Grabber */}
            <div style={{ width: 44, height: 4, background: '#e6dec8', borderRadius: 999, margin: '4px auto 14px' }} />

            {/* Profile card */}
            <div style={{
              background: 'linear-gradient(135deg, #fff, #f9efd9)',
              border: '1px solid #e6dec8',
              borderRadius: 18,
              padding: 16,
              marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg, #f4a743, #d9562c)',
                color: '#fff', fontWeight: 700, fontSize: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flex: '0 0 52px',
              }}>{initials(user?.username || '')}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1812' }}>
                  {user?.username || 'User'}
                </div>
                <div style={{ marginTop: 3, fontSize: 11, color: '#8a8474', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    background: 'rgba(26,107,58,0.10)', color: '#1a6b3a',
                    padding: '2px 8px', borderRadius: 999, fontWeight: 700,
                    textTransform: 'capitalize',
                  }}>{role}</span>
                  <span>{user?.tenant_name ? `Pewil ${activeModule === 'retail' ? 'Retail' : 'Farm'}` : 'Pewil'}</span>
                </div>
              </div>
              <button
                onClick={() => { setShowMobileMore(false); onLogout(); }}
                style={{
                  background: '#fff', border: '1px solid #e6dec8',
                  borderRadius: 10, padding: '8px 12px',
                  fontSize: 11, color: '#c0392b', fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Logout
              </button>
            </div>

            {/* Grouped menu rows — one card per drawer section.
                Single-module rule: DRAWER_SECTIONS already filtered by module. */}
            {DRAWER_SECTIONS.map((section, sIdx) => {
              const visibleItems = section.items.filter(t =>
                (!t.ownerOnly || role === 'owner') && hasFeature(t.feature)
              );
              if (visibleItems.length === 0) return null;
              return (
                <div key={section.label} style={{ marginBottom: sIdx < DRAWER_SECTIONS.length - 1 ? 14 : 0 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: '#8a8474',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    margin: '0 6px 8px',
                  }}>
                    {section.label}
                  </div>
                  <div style={{
                    background: '#fff',
                    border: '1px solid #e6dec8',
                    borderRadius: 16,
                    overflow: 'hidden',
                  }}>
                    {visibleItems.map((t, idx) => {
                      const isActive = activeTab === t.key;
                      const isLast = idx === visibleItems.length - 1;
                      return (
                        <button
                          key={t.key}
                          onClick={() => goTab(t.key)}
                          style={{
                            width: '100%',
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '13px 14px',
                            background: isActive ? 'rgba(26,107,58,0.06)' : 'transparent',
                            border: 'none',
                            borderBottom: isLast ? 'none' : '1px solid #f3ecdc',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                          }}
                        >
                          <span style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: isActive ? 'rgba(26,107,58,0.12)' : '#f5ede0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14,
                          }}>{t.emoji}</span>
                          <span style={{
                            flex: 1,
                            fontWeight: isActive ? 700 : 600,
                            fontSize: 13,
                            color: isActive ? '#1a6b3a' : '#1a1812',
                          }}>{t.label}</span>
                          <span style={{ color: '#8a8474', fontSize: 14 }}>›</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
