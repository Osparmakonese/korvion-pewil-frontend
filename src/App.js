import OfflineBanner from './OfflineBanner';
// v3 - V1 release with all pages, routes, security, onboarding
import React, { Suspense, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './context/AuthContext';
import { getDashboard, getLowStock } from './api/farmApi';
import { getRetailDashboard, getLowStockProducts } from './api/retailApi';
import Layout from './components/Layout';
import CookieConsent from './components/CookieConsent';
import OnboardingWalkthrough from './components/OnboardingWalkthrough';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import DemoBanner from './components/DemoBanner';
import StagingBanner from './components/StagingBanner';
import TrialNotification from './components/TrialNotification';

/* --- Eagerly loaded (critical path) --- */
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

/* --- Lazy loaded pages (code splitting) --- */
const CustomerDisplay = React.lazy(() => import('./pages/CustomerDisplay'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = React.lazy(() => import('./pages/VerifyEmail'));
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const RefundPolicy = React.lazy(() => import('./pages/RefundPolicy'));
const Pricing = React.lazy(() => import('./pages/Pricing'));
const Contact = React.lazy(() => import('./pages/Contact'));
const Status = React.lazy(() => import('./pages/Status'));
const Fields = React.lazy(() => import('./pages/Fields'));
const Sales = React.lazy(() => import('./pages/Sales'));
const Costs = React.lazy(() => import('./pages/Costs'));
const Stock = React.lazy(() => import('./pages/Stock'));
const Workers = React.lazy(() => import('./pages/Workers'));
const Hours = React.lazy(() => import('./pages/Hours'));
const Report = React.lazy(() => import('./pages/Report'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Import = React.lazy(() => import('./pages/Import'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
const PlanSimulator = React.lazy(() => import('./pages/PlanSimulator'));
const FarmAssets = React.lazy(() => import('./pages/FarmAssets'));
const Cattle = React.lazy(() => import('./pages/Cattle'));
const Goats = React.lazy(() => import('./pages/Goats'));
const Sheep = React.lazy(() => import('./pages/Sheep'));
const Pigs = React.lazy(() => import('./pages/Pigs'));
const Broilers = React.lazy(() => import('./pages/Broilers'));
const Layers = React.lazy(() => import('./pages/Layers'));
const Harvest = React.lazy(() => import('./pages/Harvest'));
const Budget = React.lazy(() => import('./pages/Budget'));
const Water = React.lazy(() => import('./pages/Water'));
const Loans = React.lazy(() => import('./pages/Loans'));
const MarketPrices = React.lazy(() => import('./pages/MarketPrices'));
const Economics = React.lazy(() => import('./pages/Economics'));
const Billing = React.lazy(() => import('./pages/Billing'));
const TeamManagement = React.lazy(() => import('./pages/TeamManagement'));
const RetailDashboard = React.lazy(() => import('./pages/RetailDashboard'));
const Products = React.lazy(() => import('./pages/Products'));
const POS = React.lazy(() => import('./pages/POS'));
const SalesHistory = React.lazy(() => import('./pages/SalesHistory'));
const CashierSessions = React.lazy(() => import('./pages/CashierSessions'));
const StockAdjustments = React.lazy(() => import('./pages/StockAdjustments'));
const Categories = React.lazy(() => import('./pages/Categories'));
const RetailReport = React.lazy(() => import('./pages/RetailReport'));
const JournalEntries = React.lazy(() => import('./pages/JournalEntries'));
const RetailPayroll = React.lazy(() => import('./pages/RetailPayroll'));
const RetailSettings = React.lazy(() => import('./pages/RetailSettings'));
const Customers = React.lazy(() => import('./pages/Customers'));
const Returns = React.lazy(() => import('./pages/Returns'));
const Suppliers = React.lazy(() => import('./pages/Suppliers'));
const Discounts = React.lazy(() => import('./pages/Discounts'));
const LowStockAlerts = React.lazy(() => import('./pages/LowStockAlerts'));
const ZimraFiscal = React.lazy(() => import('./pages/ZimraFiscal'));
const MultiCurrency = React.lazy(() => import('./pages/MultiCurrency'));
const EndOfDayReport = React.lazy(() => import('./pages/EndOfDayReport'));
const CashierPerformance = React.lazy(() => import('./pages/CashierPerformance'));
const CustomerLoyalty = React.lazy(() => import('./pages/CustomerLoyalty'));
const BarcodeGenerator = React.lazy(() => import('./pages/BarcodeGenerator'));
const ReceiptCustomization = React.lazy(() => import('./pages/ReceiptCustomization'));
const POSSettingsPage = React.lazy(() => import('./pages/POSSettingsPage'));
const ManagerPinPage = React.lazy(() => import('./pages/ManagerPinPage'));
const ProfitMargins = React.lazy(() => import('./pages/ProfitMargins'));
const DeviceConfiguration = React.lazy(() => import('./pages/DeviceConfiguration'));
const TaxConfigPage = React.lazy(() => import('./pages/TaxConfigPage'));
// V1 new pages
const HelpSupport = React.lazy(() => import('./pages/HelpSupport'));
const DataExport = React.lazy(() => import('./pages/DataExport'));
const AuditLog = React.lazy(() => import('./pages/AuditLog'));
const WhatsAppPOParser = React.lazy(() => import('./pages/WhatsAppPOParser'));
const VoiceBriefing = React.lazy(() => import('./pages/VoiceBriefing'));
const TheftScan = React.lazy(() => import('./pages/TheftScan'));
const PriceDrift = React.lazy(() => import('./pages/PriceDrift'));
const LossPrevention = React.lazy(() => import('./pages/LossPrevention'));

/* --- Loading fallback for lazy pages --- */
const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: '#9ca3af', fontSize: 13 }}>
    Loading...
  </div>
);

/* --- */
const PAGES = {
  'Dashboard': Dashboard,
  'Fields': Fields,
  'Sales & Market': Sales,
  'Costs': Costs,
  'Stock': Stock,
  'Workers': Workers,
  'Hours & Pay': Hours,
  'Report': Report,
  'Settings': Settings,
  'Import': Import,
  'Farm Assets': FarmAssets,
  'Cattle': Cattle,
  'Goats': Goats,
  'Sheep': Sheep,
  'Pigs': Pigs,
  'Broilers': Broilers,
  'Layers': Layers,
  'Harvest': Harvest,
  'Budget': Budget,
  'Water': Water,
  'Loans': Loans,
  'Market Prices': MarketPrices,
  'Economics': Economics,
  'Admin Panel': AdminPanel,
  'Plan Simulator': PlanSimulator,
  // Retail module
  'Retail': RetailDashboard,
  'Products': Products,
  'POS': POS,
  'Sales History': SalesHistory,
  'Cashier Sessions': CashierSessions,
  'Stock Adjustments': StockAdjustments,
  'Categories': Categories,
  'Retail Report': RetailReport,
  'Journal Entries': JournalEntries,
  'Retail Payroll': RetailPayroll,
  // 'Retail Billing' key now routes to the real Billing component (used to be
  // a designer mockup at pages/RetailBilling.js with hardcoded invoices and dead
  // "Upgrade Plan" / "Update Payment" buttons — removed 2026-04-23).
  'Retail Billing': Billing,
  'Retail Settings': RetailSettings,
  'Customers': Customers,
  'Returns': Returns,
  'Suppliers': Suppliers,
  'Discounts': Discounts,
  'Low Stock Alerts': LowStockAlerts,
  'ZIMRA Fiscal': ZimraFiscal,
  'Multi-Currency': MultiCurrency,
  'End of Day': EndOfDayReport,
  'Cashier Performance': CashierPerformance,
  'Customer Loyalty': CustomerLoyalty,
  'Barcode Labels': BarcodeGenerator,
  'Receipt Setup': ReceiptCustomization,
  'POS Settings': POSSettingsPage,
  'Manager PIN': ManagerPinPage,
  'Profit Margins': ProfitMargins,
  'Device Config': DeviceConfiguration,
  'Tax Config': TaxConfigPage,
  // Billing & Account
  'Billing': Billing,
  'Team': TeamManagement,
  // V1 new pages
  'Help': HelpSupport,
  'Data Export': DataExport,
  'Audit Log': AuditLog,
  'WhatsApp PO': WhatsAppPOParser,
  'Voice Briefing': VoiceBriefing,
  'Theft Scan': TheftScan,
  'Price Drift': PriceDrift,
  'Loss Prevention': LossPrevention,
};

/* --- */
const PAGE_META = {
  'Dashboard': { title: 'Dashboard', sub: 'Season overview - Pewil' },
  'Fields': { title: 'Fields', sub: 'Manage your farm fields' },
  'Sales & Market': { title: 'Sales & Market', sub: 'Market trips and direct income' },
  'Costs': { title: 'Costs', sub: 'Farm expenses and inputs' },
  'Stock': { title: 'Stock', sub: 'Inventory and usage tracking' },
  'Cattle': { title: 'Cattle', sub: 'Herd management and health records' },
  'Goats': { title: 'Goats', sub: 'Goat records and health tracking' },
  'Sheep': { title: 'Sheep', sub: 'Flock management and health records' },
  'Pigs': { title: 'Pigs', sub: 'Pig management and litter tracking' },
  'Broilers': { title: 'Broilers', sub: 'Meat bird batches and expenses' },
  'Layers': { title: 'Layers', sub: 'Egg production and flock management' },
  'Workers': { title: 'Workers', sub: 'Roster and wage management' },
  'Hours & Pay': { title: 'Hours & Pay', sub: 'Attendance and payroll' },
  'Report': { title: 'Financial Report', sub: 'Season P&L - Owner only' },
  'Farm Assets': { title: 'Farm Assets', sub: 'Equipment and long-term investments' },
  'Settings': { title: 'Settings', sub: 'Tenant configuration - Pewil' },
  'Import': { title: 'Import Data', sub: 'Upload Excel to populate your farm data' },
  'Harvest': { title: 'Harvest & Yield', sub: 'Track harvest output per field' },
  'Budget': { title: 'Season Budget', sub: 'Plan your spending vs actual' },
  'Water': { title: 'Water & Irrigation', sub: 'Track water usage and rainfall' },
  'Loans': { title: 'Loans & Credit', sub: 'Track borrowing and repayments' },
  'Market Prices': { title: 'Market Prices', sub: 'Commodity price tracking' },
  'Economics': { title: 'Farm Economics', sub: 'Profitability and enterprise analysis' },
  'Admin Panel': { title: 'Super Admin Panel', sub: 'Pewil system administration' },
  'Plan Simulator': { title: 'Plan Simulator', sub: 'Dev preview of every plan tier' },
  // Retail module
  'Retail': { title: 'Retail Dashboard', sub: 'Store overview and daily metrics' },
  'Products': { title: 'Products', sub: 'Product catalog and inventory' },
  'POS': { title: 'Point of Sale', sub: 'Process sales and manage cart' },
  'Sales History': { title: 'Sales History', sub: 'View all retail transactions and receipts' },
  'Cashier Sessions': { title: 'Cashier Sessions', sub: 'Open, close, and manage cashier sessions' },
  'Stock Adjustments': { title: 'Stock Adjustments', sub: 'Log damaged, stolen, or restocked items' },
  'Categories': { title: 'Categories', sub: 'Organize products into categories' },
  'Retail Report': { title: 'Retail Report', sub: 'Store P&L, inventory and performance' },
  'Journal Entries': { title: 'Journal Entries', sub: 'Double-entry accounting ledger' },
  'Retail Payroll': { title: 'Payroll', sub: 'PAYE + NSSA — Zimbabwe payroll' },
  'Retail Billing': { title: 'Billing & Subscription', sub: 'Manage your Pewil plan and payments' },
  'Retail Settings': { title: 'Settings', sub: 'Tenant configuration and permissions' },
  'Customers': { title: 'Customers', sub: 'Customer profiles and purchase history' },
  'Returns': { title: 'Returns & Refunds', sub: 'Process returns and manage refunds' },
  'Suppliers': { title: 'Suppliers & Purchase Orders', sub: 'Vendor directory and procurement' },
  'Discounts': { title: 'Discounts & Promotions', sub: 'Manage sales and promotional offers' },
  'Low Stock Alerts': { title: 'Low Stock Alerts', sub: 'Reorder points and stock monitoring' },
  'ZIMRA Fiscal': { title: 'ZIMRA Fiscalisation', sub: 'Fiscal device and compliance management' },
  'Multi-Currency': { title: 'Currency Management', sub: 'Exchange rates and multi-currency settings' },
  'End of Day': { title: 'End of Day Report', sub: 'Daily closing summary and reconciliation' },
  'Cashier Performance': { title: 'Cashier Performance', sub: 'Staff analytics and leaderboard' },
  'Customer Loyalty': { title: 'Customer Loyalty', sub: 'Points, rewards, and retention program' },
  'Barcode Labels': { title: 'Barcode & Labels', sub: 'Generate barcodes and print shelf labels' },
  'Receipt Setup': { title: 'Receipt Customization', sub: 'Receipt template and printer settings' },
  'POS Settings': { title: 'POS Settings', sub: 'Cashier-screen style, layout, and behaviour' },
  'Manager PIN': { title: 'Manager PIN', sub: 'Set the PIN cashiers will use to unlock approvals' },
  'Profit Margins': { title: 'Profit Margins', sub: 'Margin analysis and pricing insights' },
  'Device Config': { title: 'Device Configuration', sub: 'Hardware setup, Print Bridge, and ZIMRA compliance' },
  'Tax Config': { title: 'Tax Config', sub: 'Zimbabwe PAYE bands and NSSA rates' },
  // Billing
  'Billing': { title: 'Billing', sub: 'Pewil subscription, invoices, and usage' },
  'Team': { title: 'Team & Users', sub: 'Manage team members and permissions' },
  // V1 new pages
  'Help': { title: 'Help & Support', sub: 'FAQ, guides, and contact support' },
  'Data Export': { title: 'Data Export', sub: 'Download all your business data' },
  'Audit Log': { title: 'Audit Log', sub: 'Track all changes made by your team' },
  'WhatsApp PO': { title: 'WhatsApp PO Parser', sub: 'Turn supplier messages into draft purchase orders — AI powered' },
  'Voice Briefing': { title: 'Voice Briefing', sub: 'Trilingual daily farm update — English, Shona, Ndebele' },
  'Theft Scan': { title: 'Theft Scan', sub: 'AI-powered loss prevention — anomaly detection on today’s sales' },
  'Price Drift': { title: 'Price Drift', sub: 'Supplier cost creep detection — catch silent price increases' },
  'Loss Prevention': { title: 'Loss Prevention', sub: 'Signal-based anti-theft — events, flags, trust scores, shrinkage, alerts' },
};

/* --- */
const PRIMARY_ACTIONS = {
  'Dashboard': '+ Log expense',
  'Fields': '+ Open field',
  'Sales & Market': '+ Record trip',
  'Costs': '+ Log expense',
  'Stock': '+ Add stock',
  'Cattle': '+ Add cattle',
  'Goats': '+ Add goat',
  'Sheep': '+ Add sheep',
  'Pigs': '+ Add pig',
  'Broilers': '+ Add batch',
  'Layers': '+ Add flock',
  'Workers': '+ Add worker',
  'Hours & Pay': '+ Log hours',
  'Report': 'Export PDF',
  'Farm Assets': '+ Add asset',
  'Harvest': '+ Log harvest',
  'Budget': '+ Add budget line',
  'Water': '+ Log water',
  'Loans': '+ Add loan',
  'Market Prices': '+ Add price',
  'Settings': 'Save changes',
  'Retail': null,
  'Products': '+ Add product',
  'POS': null,
  'Sales History': null,
  'Cashier Sessions': '+ Open Session',
  'Stock Adjustments': '+ Log Adjustment',
  'Categories': '+ Add Category',
  'Retail Report': null,
  'Journal Entries': '+ New Entry',
  'Retail Payroll': '+ New Run',
  'Retail Billing': null,
  'Retail Settings': 'Save Changes',
  'Customers': '+ Add Customer',
  'Returns': '+ Process Return',
  'Suppliers': '+ New Purchase Order',
  'Discounts': '+ Create Discount',
  'Low Stock Alerts': null,
  'ZIMRA Fiscal': null,
  'Multi-Currency': 'Update Rates',
  'End of Day': 'Generate Report',
  'Cashier Performance': null,
  'Customer Loyalty': null,
  'Barcode Labels': 'Print All Labels',
  'Receipt Setup': 'Save Template',
  'POS Settings': null,
  'Manager PIN': null,
  'Profit Margins': 'Export CSV',
  'Device Config': '+ Add Device',
  'Tax Config': 'Save tax configuration',
  'Billing': 'Change Plan',
  'Team': '+ Invite User',
  'Help': null,
  'Data Export': null,
  'Audit Log': null,
  'WhatsApp PO': null,
  'Voice Briefing': null,
  'Theft Scan': null,
  'Price Drift': null,
  'Loss Prevention': null,
};

/* --- */
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

/* --- */
function FarmApp() {
  const { user, logout } = useAuth();

  // SINGLE-MODULE RULE (April 2026): activeModule is derived directly from
  // the tenant's one module — no in-app switching. An account is either
  // farm or retail for its lifetime.
  const activeModule = (user?.modules && user.modules[0] === 'retail') ? 'retail' : 'farm';
  const [activeTab, setActiveTab] = useState(activeModule === 'retail' ? 'Retail' : 'Dashboard');

  // 2026-04-30 — fix sidebar/topbar dashboard prop on retail tenants.
  // Previously this always called getDashboard() (the FARM endpoint)
  // regardless of activeModule. For a retail tenant that returned an
  // empty/wrong payload (best case) or a 403 from HasFarmModule (worst
  // case), so the sidebar badge counts never reflected retail reality.
  // Now we route each tenant to its own dashboard endpoint AND use a
  // module-keyed queryKey so cache invalidation is module-correct.
  const isRetail = activeModule === 'retail';
  const { data: dashboardData } = useQuery({
    queryKey: isRetail ? ['retail-dashboard'] : ['dashboard'],
    queryFn: isRetail ? getRetailDashboard : getDashboard,
    staleTime: 30000,
  });

  const { data: lowStockData = [] } = useQuery({
    queryKey: isRetail ? ['retail-low-stock'] : ['lowStock'],
    queryFn: isRetail ? getLowStockProducts : getLowStock,
    staleTime: 60000,
  });

  const Page = PAGES[activeTab] || Dashboard;
  const meta = PAGE_META[activeTab] || PAGE_META['Dashboard'];
  const primaryAction = PRIMARY_ACTIONS[activeTab];

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      user={user}
      onLogout={logout}
      pageTitle={meta.title}
      pageSub={meta.sub}
      primaryAction={primaryAction}
      onPrimaryAction={() => {
        window.dispatchEvent(new CustomEvent('pewil-primary-action', { detail: { tab: activeTab } }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      dashboardData={dashboardData}
      lowStockCount={lowStockData.length}
      activeModule={activeModule}
    >
      <DemoBanner />
      <TrialNotification />
      <Suspense fallback={<PageLoader />}>
        <Page onTabChange={setActiveTab} activeModule={activeModule} />
      </Suspense>
      <PWAInstallPrompt />
      <OfflineBanner />
      <OnboardingWalkthrough />
    </Layout>
  );
}

export default function App() {
  return (
    <>
      <StagingBanner />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense>} />
        <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>} />
        <Route path="/verify-email" element={<Suspense fallback={<PageLoader />}><VerifyEmail /></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={<PageLoader />}><TermsOfService /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense>} />
        <Route path="/refunds" element={<Suspense fallback={<PageLoader />}><RefundPolicy /></Suspense>} />
        <Route path="/pricing" element={<Suspense fallback={<PageLoader />}><Pricing /></Suspense>} />
        <Route path="/contact" element={<Suspense fallback={<PageLoader />}><Contact /></Suspense>} />
        <Route path="/status" element={<Suspense fallback={<PageLoader />}><Status /></Suspense>} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <FarmApp />
            </ProtectedRoute>
          }
        />
        <Route path="/customer-display" element={<Suspense fallback={<PageLoader />}><CustomerDisplay /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
