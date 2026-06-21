import api from './axios';

// ── Categories ──
export const getCategories = () => api.get('/retail/categories/').then(r => r.data);
export const createCategory = (data) => api.post('/retail/categories/', data).then(r => r.data);
export const updateCategory = (id, data) => api.patch(`/retail/categories/${id}/`, data).then(r => r.data);
export const deleteCategory = (id) => api.delete(`/retail/categories/${id}/`);

// ── Pharmacy: batches / prescriptions / controlled register (Phase 2) ──
export const getProductBatches = (params) => api.get('/retail/product-batches/', { params }).then(r => r.data);
export const createProductBatch = (data) => api.post('/retail/product-batches/', data).then(r => r.data);
export const updateProductBatch = (id, data) => api.patch(`/retail/product-batches/${id}/`, data).then(r => r.data);
export const deleteProductBatch = (id) => api.delete(`/retail/product-batches/${id}/`);
export const getExpiringBatches = (days = 90) => api.get('/retail/product-batches/expiring/', { params: { days } }).then(r => r.data);

export const getPrescriptions = (params) => api.get('/retail/prescriptions/', { params }).then(r => r.data);
export const createPrescription = (data) => api.post('/retail/prescriptions/', data).then(r => r.data);
export const updatePrescription = (id, data) => api.patch(`/retail/prescriptions/${id}/`, data).then(r => r.data);
export const dispensePrescription = (id, data) => api.post(`/retail/prescriptions/${id}/dispense/`, data || {}).then(r => r.data);

export const getControlledLog = (params) => api.get('/retail/controlled-log/', { params }).then(r => r.data);
export const createControlledLog = (data) => api.post('/retail/controlled-log/', data).then(r => r.data);

// ── Restaurant: tables / modifiers / kitchen orders (Phase 2) ──
export const getRestaurantTables = () => api.get('/retail/restaurant-tables/').then(r => r.data);
export const createRestaurantTable = (data) => api.post('/retail/restaurant-tables/', data).then(r => r.data);
export const updateRestaurantTable = (id, data) => api.patch(`/retail/restaurant-tables/${id}/`, data).then(r => r.data);
export const deleteRestaurantTable = (id) => api.delete(`/retail/restaurant-tables/${id}/`);
export const setTableStatus = (id, status) => api.post(`/retail/restaurant-tables/${id}/set-status/`, { status }).then(r => r.data);

export const getModifierGroups = () => api.get('/retail/modifier-groups/').then(r => r.data);
export const createModifierGroup = (data) => api.post('/retail/modifier-groups/', data).then(r => r.data);
export const updateModifierGroup = (id, data) => api.patch(`/retail/modifier-groups/${id}/`, data).then(r => r.data);
export const deleteModifierGroup = (id) => api.delete(`/retail/modifier-groups/${id}/`);
export const createModifierOption = (data) => api.post('/retail/modifier-options/', data).then(r => r.data);
export const deleteModifierOption = (id) => api.delete(`/retail/modifier-options/${id}/`);

export const getKitchenOrders = (params) => api.get('/retail/kitchen-orders/', { params }).then(r => r.data);
export const createKitchenOrder = (data) => api.post('/retail/kitchen-orders/', data).then(r => r.data);
export const transitionKitchenOrder = (id, status) => api.post(`/retail/kitchen-orders/${id}/transition/`, { status }).then(r => r.data);

// ── Hardware: quotations (Phase 3) ──
export const getQuotations = (params) => api.get('/retail/quotations/', { params }).then(r => r.data);
export const createQuotation = (data) => api.post('/retail/quotations/', data).then(r => r.data);
export const setQuotationStatus = (id, data) => api.post(`/retail/quotations/${id}/set-status/`, data).then(r => r.data);
export const deleteQuotation = (id) => api.delete(`/retail/quotations/${id}/`);

// ── Wholesale: price tiers (Phase 3) ──
export const getPriceTiers = (params) => api.get('/retail/price-tiers/', { params }).then(r => r.data);
export const createPriceTier = (data) => api.post('/retail/price-tiers/', data).then(r => r.data);
export const deletePriceTier = (id) => api.delete(`/retail/price-tiers/${id}/`);
export const getBestPrice = (product, qty) => api.get('/retail/price-tiers/best-price/', { params: { product, qty } }).then(r => r.data);

// ── Wholesale: credit accounts (Phase 3) ──
export const getCreditAccounts = () => api.get('/retail/credit-accounts/').then(r => r.data);
export const createCreditAccount = (data) => api.post('/retail/credit-accounts/', data).then(r => r.data);
export const updateCreditAccount = (id, data) => api.patch(`/retail/credit-accounts/${id}/`, data).then(r => r.data);
export const chargeCreditAccount = (id, data) => api.post(`/retail/credit-accounts/${id}/charge/`, data).then(r => r.data);
export const payCreditAccount = (id, data) => api.post(`/retail/credit-accounts/${id}/payment/`, data).then(r => r.data);
export const getCreditStatement = (id) => api.get(`/retail/credit-accounts/${id}/statement/`).then(r => r.data);

// ── Electronics: serials + warranties (Phase 3) ──
export const getProductSerials = (params) => api.get('/retail/product-serials/', { params }).then(r => r.data);
export const createProductSerial = (data) => api.post('/retail/product-serials/', data).then(r => r.data);
export const markSerialSold = (id, data) => api.post(`/retail/product-serials/${id}/mark-sold/`, data || {}).then(r => r.data);
export const deleteProductSerial = (id) => api.delete(`/retail/product-serials/${id}/`);

export const getWarranties = (params) => api.get('/retail/warranties/', { params }).then(r => r.data);
export const createWarranty = (data) => api.post('/retail/warranties/', data).then(r => r.data);
export const deleteWarranty = (id) => api.delete(`/retail/warranties/${id}/`);

// ── Liquor: excise returns (Phase 3) ──
export const getExciseReturns = () => api.get('/retail/excise-returns/').then(r => r.data);
export const generateExciseReturn = (data) => api.post('/retail/excise-returns/generate/', data).then(r => r.data);
export const markExciseSubmitted = (id, data) => api.post(`/retail/excise-returns/${id}/mark-submitted/`, data || {}).then(r => r.data);

// ── Products ──
export const getProducts = () => api.get('/retail/products/').then(r => r.data);
export const createProduct = (data) => api.post('/retail/products/', data).then(r => r.data);
export const updateProduct = (id, data) => api.patch(`/retail/products/${id}/`, data).then(r => r.data);
export const deleteProduct = (id) => api.delete(`/retail/products/${id}/`);
export const getLowStockProducts = () => api.get('/retail/products/low_stock/').then(r => r.data);
export const getExpiringProducts = () => api.get('/retail/products/expiring_soon/').then(r => r.data);
export const barcodeLookup = (barcode) => api.get('/retail/products/barcode_lookup/', { params: { barcode } }).then(r => r.data);

// ── Stock Adjustments ──
export const getStockAdjustments = () => api.get('/retail/stock-adjustments/').then(r => r.data);
export const createStockAdjustment = (data) => api.post('/retail/stock-adjustments/', data).then(r => r.data);

// ── Cashier Sessions ──
export const getCashierSessions = () => api.get('/retail/cashier-sessions/').then(r => r.data);
export const createCashierSession = (data) => api.post('/retail/cashier-sessions/', data).then(r => r.data);
export const closeCashierSession = (id, data) => api.post(`/retail/cashier-sessions/${id}/close/`, data).then(r => r.data);

// ── Sales ──
export const getSales = () => api.get('/retail/sales/').then(r => r.data);
export const createSale = (data) => api.post('/retail/sales/', data).then(r => r.data);
export const getDailySummary = () => api.get('/retail/sales/daily_summary/').then(r => r.data);
export const getReceipt = (id) => api.get(`/retail/sales/${id}/receipt/`).then(r => r.data);
export const getRetailReport = (params) => api.get('/retail/sales/retail_report/', { params }).then(r => r.data);

// ── Customers ──
export const getCustomers = (search) => api.get('/retail/customers/', { params: search ? { search } : {} }).then(r => r.data);
export const createCustomer = (data) => api.post('/retail/customers/', data).then(r => r.data);
export const updateCustomer = (id, data) => api.patch(`/retail/customers/${id}/`, data).then(r => r.data);
export const deleteCustomer = (id) => api.delete(`/retail/customers/${id}/`);
export const getTopCustomers = () => api.get('/retail/customers/top_customers/').then(r => r.data);
export const getCustomerHistory = (id) => api.get(`/retail/customers/${id}/purchase_history/`).then(r => r.data);

// ── Returns & Refunds ──
export const getReturns = () => api.get('/retail/returns/').then(r => r.data);
export const createReturn = (data) => api.post('/retail/returns/', data).then(r => r.data);
export const approveReturn = (id) => api.post(`/retail/returns/${id}/approve/`).then(r => r.data);
export const completeReturn = (id) => api.post(`/retail/returns/${id}/complete/`).then(r => r.data);
export const getReturnsSummary = () => api.get('/retail/returns/summary/').then(r => r.data);

// ── Suppliers ──
export const getSuppliers = () => api.get('/retail/suppliers/').then(r => r.data);
export const createSupplier = (data) => api.post('/retail/suppliers/', data).then(r => r.data);
export const updateSupplier = (id, data) => api.patch(`/retail/suppliers/${id}/`, data).then(r => r.data);
export const deleteSupplier = (id) => api.delete(`/retail/suppliers/${id}/`);

// ── Purchase Orders ──
export const getPurchaseOrders = (params) => api.get('/retail/purchase-orders/', { params }).then(r => r.data);
export const createPurchaseOrder = (data) => api.post('/retail/purchase-orders/', data).then(r => r.data);
export const updatePurchaseOrder = (id, data) => api.patch(`/retail/purchase-orders/${id}/`, data).then(r => r.data);
export const receivePurchaseOrder = (id) => api.post(`/retail/purchase-orders/${id}/receive/`).then(r => r.data);

// ── Discounts & Promotions ──
export const getDiscounts = (params) => api.get('/retail/discounts/', { params }).then(r => r.data);
export const createDiscount = (data) => api.post('/retail/discounts/', data).then(r => r.data);
export const updateDiscount = (id, data) => api.patch(`/retail/discounts/${id}/`, data).then(r => r.data);
export const deleteDiscount = (id) => api.delete(`/retail/discounts/${id}/`);
export const validateDiscountCode = (code) => api.get('/retail/discounts/validate_code/', { params: { code } }).then(r => r.data);

// ── Journal Entries ──
export const getJournalEntries = (params) => api.get('/retail/journal-entries/', { params }).then(r => r.data);
export const createJournalEntry = (data) => api.post('/retail/journal-entries/', data).then(r => r.data);
export const getTrialBalance = () => api.get('/retail/journal-entries/trial_balance/').then(r => r.data);

// ── Payroll ──
export const getPayrollRuns = () => api.get('/retail/payroll-runs/').then(r => r.data);
export const getPayrollRun = (id) => api.get(`/retail/payroll-runs/${id}/`).then(r => r.data);
export const createPayrollRun = (data) => api.post('/retail/payroll-runs/', data).then(r => r.data);
export const deletePayrollRun = (id) => api.delete(`/retail/payroll-runs/${id}/`);
export const generatePayrollLines = (id, body = {}) =>
  api.post(`/retail/payroll-runs/${id}/generate_lines/`, body).then(r => r.data);
export const recalculatePayrollRun = (id) =>
  api.post(`/retail/payroll-runs/${id}/recalculate/`).then(r => r.data);
export const approvePayrollRun = (id) => api.post(`/retail/payroll-runs/${id}/approve/`).then(r => r.data);
export const markPayrollPaid = (id) => api.post(`/retail/payroll-runs/${id}/mark_paid/`).then(r => r.data);
export const getPayslip = (runId, lineId) =>
  api.get(`/retail/payroll-runs/${runId}/payslip/`, { params: { line: lineId } }).then(r => r.data);
export const getPayrollLines = (runId) => api.get('/retail/payroll-lines/', { params: runId ? { run: runId } : {} }).then(r => r.data);
export const createPayrollLine = (data) => api.post('/retail/payroll-lines/', data).then(r => r.data);
export const updatePayrollLine = (id, data) => api.patch(`/retail/payroll-lines/${id}/`, data).then(r => r.data);
export const deletePayrollLine = (id) => api.delete(`/retail/payroll-lines/${id}/`);

// ── Zimbabwe Tax Config ──
export const getTaxConfig = () => api.get('/retail/tax-config/current/').then(r => r.data);
export const updateTaxConfig = (data) => api.patch('/retail/tax-config/current/', data).then(r => r.data);

// ── Currency Rates ──
export const getCurrencyRates = () => api.get('/retail/currency-rates/').then(r => r.data);
export const createCurrencyRate = (data) => api.post('/retail/currency-rates/', data).then(r => r.data);
export const getLatestRates = () => api.get('/retail/currency-rates/latest/').then(r => r.data);

// ── Loyalty Program ──
export const getLoyaltyMembers = (params) => api.get('/retail/loyalty-members/', { params }).then(r => r.data);
export const createLoyaltyMember = (data) => api.post('/retail/loyalty-members/', data).then(r => r.data);
export const getLoyaltyStats = () => api.get('/retail/loyalty-members/stats/').then(r => r.data);
export const getLoyaltyTransactions = (params) => api.get('/retail/loyalty-transactions/', { params }).then(r => r.data);
export const createLoyaltyTransaction = (data) => api.post('/retail/loyalty-transactions/', data).then(r => r.data);

// ── Receipt Templates ──
export const getReceiptTemplates = () => api.get('/retail/receipt-templates/').then(r => r.data);
export const createReceiptTemplate = (data) => api.post('/retail/receipt-templates/', data).then(r => r.data);
export const updateReceiptTemplate = (id, data) => api.patch(`/retail/receipt-templates/${id}/`, data).then(r => r.data);

// ── Device Profiles ──
export const getDeviceProfiles = (deviceType) => api.get('/retail/device-profiles/', { params: deviceType ? { device_type: deviceType } : {} }).then(r => r.data);
export const createDeviceProfile = (data) => api.post('/retail/device-profiles/', data).then(r => r.data);
export const updateDeviceProfile = (id, data) => api.patch(`/retail/device-profiles/${id}/`, data).then(r => r.data);
export const deleteDeviceProfile = (id) => api.delete(`/retail/device-profiles/${id}/`);
export const testDevice = (id) => api.post(`/retail/device-profiles/${id}/test_device/`).then(r => r.data);
export const setDefaultDevice = (id) => api.post(`/retail/device-profiles/${id}/set_default/`).then(r => r.data);
export const getDeviceSummary = () => api.get('/retail/device-profiles/summary/').then(r => r.data);

// ── Print Bridge ──
export const getPrintBridgeStatus = () => api.get('/retail/print-bridge/status/').then(r => r.data);
export const sendPrintBridgeHeartbeat = (data) => api.post('/retail/print-bridge/heartbeat/', data).then(r => r.data);

// ── ZIMRA Fiscal ──
export const getZimraDevices = () => api.get('/retail/zimra-devices/').then(r => r.data);
export const createZimraDevice = (data) => api.post('/retail/zimra-devices/', data).then(r => r.data);
export const updateZimraDevice = (id, data) => api.patch(`/retail/zimra-devices/${id}/`, data).then(r => r.data);
export const getZReports = () => api.get('/retail/z-reports/').then(r => r.data);
export const generateZReport = () => api.post('/retail/z-reports/generate/').then(r => r.data);

// ── Fiscal Queue ──
export const getFiscalQueue = (queueStatus) => api.get('/retail/fiscal-queue/', { params: queueStatus ? { status: queueStatus } : {} }).then(r => r.data);
export const retryFiscalItem = (id) => api.post(`/retail/fiscal-queue/${id}/retry/`).then(r => r.data);
export const getFiscalQueueStats = () => api.get('/retail/fiscal-queue/stats/').then(r => r.data);

// ── Analytics ──
export const getRetailDashboard = () => api.get('/retail/analytics/dashboard/').then(r => r.data);
export const getEndOfDayReport = (date) => api.get('/retail/analytics/end_of_day/', { params: date ? { date } : {} }).then(r => r.data);
export const getCashierPerformance = (days) => api.get('/retail/analytics/cashier_performance/', { params: days ? { days } : {} }).then(r => r.data);
export const getProfitMargins = () => api.get('/retail/analytics/profit_margins/').then(r => r.data);

// ── POS Settings (singleton per tenant) ──
export const getPOSSettings = () => api.get('/retail/pos-settings/').then(r => r.data);
export const updatePOSSettings = (data) => api.put('/retail/pos-settings/', data).then(r => r.data);

// ── Cashier session advanced controls (Batch 5/6) ──
export const getSessionXReport = (id) =>
  api.get(`/retail/cashier-sessions/${id}/x-report/`).then(r => r.data);

export const closeCashierSessionAdvanced = (id, body, approvalToken) =>
  api.post(`/retail/cashier-sessions/${id}/close/`, body, {
    headers: approvalToken ? { 'X-Manager-Approval': approvalToken } : {},
  }).then(r => r.data);

// ── Cash drops ──
export const listCashDrops = (sessionId) =>
  api.get('/retail/cash-drops/', { params: sessionId ? { session: sessionId } : {} })
    .then(r => r.data);

export const createCashDrop = (body, approvalToken) =>
  api.post('/retail/cash-drops/', body, {
    headers: approvalToken ? { 'X-Manager-Approval': approvalToken } : {},
  }).then(r => r.data);

// ── Manager approval (PIN-based sign-off returning a one-shot token) ──
export const managerApprove = (body) =>
  api.post('/retail/manager-approval/approve/', body).then(r => r.data);

// ── Manager PIN self-service (managers set/rotate their own PIN) ──
export const getManagerPinStatus = () =>
  api.get('/retail/manager-pin/status/').then(r => r.data);

export const setManagerPin = (pin) =>
  api.post('/retail/manager-pin/set/', { pin }).then(r => r.data);

export const getManagerApprovalCapabilities = () =>
  api.get('/retail/manager-approval/capabilities/').then(r => r.data);

// ── Sprint 1: Loss Prevention ──

// CCTV events (auto-logged + manually reviewable)
export const getCCTVEvents = (params) =>
  api.get('/retail/cctv-events/', { params }).then(r => r.data);
export const updateCCTVEvent = (id, data) =>
  api.patch(`/retail/cctv-events/${id}/`, data).then(r => r.data);

// Sweethearting flags (cashier+customer collusion patterns)
export const getSweetheartingFlags = (params) =>
  api.get('/retail/sweethearting-flags/', { params }).then(r => r.data);
export const updateSweetheartingFlag = (id, data) =>
  api.patch(`/retail/sweethearting-flags/${id}/`, data).then(r => r.data);

// Cashier trust scores (owner/manager only)
export const getCashierTrustScores = () =>
  api.get('/retail/cashier-trust/').then(r => r.data);
export const getCashierTrustLeaderboard = () =>
  api.get('/retail/cashier-trust/leaderboard/').then(r => r.data);
export const recomputeCashierTrustScores = () =>
  api.post('/retail/cashier-trust/recompute/').then(r => r.data);

// Shrinkage counts (stock-take vs system)
export const getShrinkageCounts = () =>
  api.get('/retail/shrinkage-counts/').then(r => r.data);
export const getShrinkageCount = (id) =>
  api.get(`/retail/shrinkage-counts/${id}/`).then(r => r.data);
export const createShrinkageCount = (data) =>
  api.post('/retail/shrinkage-counts/', data).then(r => r.data);
export const updateShrinkageCount = (id, data) =>
  api.patch(`/retail/shrinkage-counts/${id}/`, data).then(r => r.data);
export const recordShrinkageLine = (id, data) =>
  api.post(`/retail/shrinkage-counts/${id}/record_line/`, data).then(r => r.data);
export const finalizeShrinkageCount = (id) =>
  api.post(`/retail/shrinkage-counts/${id}/finalize/`).then(r => r.data);

// After-hours alerts
export const getAfterHoursAlerts = (params) =>
  api.get('/retail/after-hours-alerts/', { params }).then(r => r.data);
export const updateAfterHoursAlert = (id, data) =>
  api.patch(`/retail/after-hours-alerts/${id}/`, data).then(r => r.data);

// Till tamper events
export const getTillTamperEvents = (params) =>
  api.get('/retail/till-tamper/', { params }).then(r => r.data);
export const updateTillTamperEvent = (id, data) =>
  api.patch(`/retail/till-tamper/${id}/`, data).then(r => r.data);

// Loss Prevention dashboard summary + run-detectors
export const getLossPreventionSummary = () =>
  api.get('/retail/loss-prevention/').then(r => r.data);
export const runLossPreventionDetectors = () =>
  api.post('/retail/loss-prevention/run-detectors/').then(r => r.data);

// ── Multi-country fiscal credentials (May 2026) ──
// One row per (tenant, adapter). Operators paste the credentials they
// got from their country's tax authority. The /adapters/ endpoint
// returns every adapter Pewil supports so the UI can show a grid
// even before the operator has configured any country.
export const getFiscalAdapters = () =>
  api.get('/retail/fiscal-credentials/adapters/').then(r => r.data);
export const listFiscalCredentials = () =>
  api.get('/retail/fiscal-credentials/').then(r => r.data);
export const createFiscalCredentials = (data) =>
  api.post('/retail/fiscal-credentials/', data).then(r => r.data);
export const updateFiscalCredentials = (id, data) =>
  api.patch(`/retail/fiscal-credentials/${id}/`, data).then(r => r.data);
export const deleteFiscalCredentials = (id) =>
  api.delete(`/retail/fiscal-credentials/${id}/`);

// ── Multi-branch retail (May 2026) ──
// Every tenant has >=1 Branch (HQ auto-created at signup). Enterprise
// chains add more; Growth gets up to 3; Starter is single-branch.
export const listBranches = () =>
  api.get('/retail/branches/').then(r => r.data);
export const createBranch = (data) =>
  api.post('/retail/branches/', data).then(r => r.data);
export const updateBranch = (id, data) =>
  api.patch(`/retail/branches/${id}/`, data).then(r => r.data);
export const deleteBranch = (id) =>
  api.delete(`/retail/branches/${id}/`);
export const setBranchAsHQ = (id) =>
  api.post(`/retail/branches/${id}/set-hq/`).then(r => r.data);

// Branch transfer orders — cross-branch inventory movement
export const listBranchTransfers = (params) =>
  api.get('/retail/branch-transfers/', { params }).then(r => r.data);
export const createBranchTransfer = (data) =>
  api.post('/retail/branch-transfers/', data).then(r => r.data);
export const shipBranchTransfer = (id, approvalToken) =>
  api.post(`/retail/branch-transfers/${id}/ship/`, {}, {
    headers: approvalToken ? { 'X-Manager-Approval': approvalToken } : {},
  }).then(r => r.data);
export const receiveBranchTransfer = (id, items_received) =>
  api.post(`/retail/branch-transfers/${id}/receive/`, { items_received })
    .then(r => r.data);
export const cancelBranchTransfer = (id, reason) =>
  api.post(`/retail/branch-transfers/${id}/cancel/`, { cancellation_reason: reason || '' })
    .then(r => r.data);

// HQ chain rollup — all branches side-by-side + chain totals
export const getChainRollup = () =>
  api.get('/retail/analytics/chain-rollup/').then(r => r.data);

// ─── FORECOURT (May 2026) ─────────────────────────────────────
// Fuel + service-station endpoints. Activated by creating at least one
// FuelTank on the tenant — sidebar reveals the Forecourt section then.

export const listFuelGrades = () =>
  api.get('/retail/fuel-grades/').then(r => r.data);
export const createFuelGrade = (data) =>
  api.post('/retail/fuel-grades/', data).then(r => r.data);
export const updateFuelGrade = (id, data) =>
  api.patch(`/retail/fuel-grades/${id}/`, data).then(r => r.data);
export const deleteFuelGrade = (id) =>
  api.delete(`/retail/fuel-grades/${id}/`);

export const listFuelTanks = (params) =>
  api.get('/retail/fuel-tanks/', { params }).then(r => r.data);
export const createFuelTank = (data) =>
  api.post('/retail/fuel-tanks/', data).then(r => r.data);
export const updateFuelTank = (id, data) =>
  api.patch(`/retail/fuel-tanks/${id}/`, data).then(r => r.data);
export const deleteFuelTank = (id) =>
  api.delete(`/retail/fuel-tanks/${id}/`);
export const getFuelDashboard = () =>
  api.get('/retail/fuel-tanks/dashboard/').then(r => r.data);

export const listFuelDeliveries = (params) =>
  api.get('/retail/fuel-deliveries/', { params }).then(r => r.data);
export const createFuelDelivery = (data) =>
  api.post('/retail/fuel-deliveries/', data).then(r => r.data);
export const updateFuelDelivery = (id, data) =>
  api.patch(`/retail/fuel-deliveries/${id}/`, data).then(r => r.data);
export const deleteFuelDelivery = (id) =>
  api.delete(`/retail/fuel-deliveries/${id}/`);

export const listFuelDipReadings = (params) =>
  api.get('/retail/fuel-dip-readings/', { params }).then(r => r.data);
export const createFuelDipReading = (data) =>
  api.post('/retail/fuel-dip-readings/', data).then(r => r.data);
export const getDipVarianceReport = () =>
  api.get('/retail/fuel-dip-readings/variance-report/').then(r => r.data);

export const listFleetCardProviders = () =>
  api.get('/retail/fleet-card-providers/').then(r => r.data);
export const createFleetCardProvider = (data) =>
  api.post('/retail/fleet-card-providers/', data).then(r => r.data);
export const updateFleetCardProvider = (id, data) =>
  api.patch(`/retail/fleet-card-providers/${id}/`, data).then(r => r.data);
export const deleteFleetCardProvider = (id) =>
  api.delete(`/retail/fleet-card-providers/${id}/`);

export const listFleetCardAccounts = (params) =>
  api.get('/retail/fleet-card-accounts/', { params }).then(r => r.data);
export const createFleetCardAccount = (data) =>
  api.post('/retail/fleet-card-accounts/', data).then(r => r.data);
export const updateFleetCardAccount = (id, data) =>
  api.patch(`/retail/fleet-card-accounts/${id}/`, data).then(r => r.data);
export const deleteFleetCardAccount = (id) =>
  api.delete(`/retail/fleet-card-accounts/${id}/`);

export const listFleetCardTransactions = (params) =>
  api.get('/retail/fleet-card-transactions/', { params }).then(r => r.data);
export const createFleetCardTransaction = (data) =>
  api.post('/retail/fleet-card-transactions/', data).then(r => r.data);
export const settleFleetCardTransaction = (id, reference) =>
  api.post(`/retail/fleet-card-transactions/${id}/settle/`, { reference })
    .then(r => r.data);

export const listRegulatorReturns = (params) =>
  api.get('/retail/regulator-returns/', { params }).then(r => r.data);
export const generateRegulatorReturn = (data) =>
  api.post('/retail/regulator-returns/generate/', data).then(r => r.data);
export const markRegulatorReturnSubmitted = (id, reference) =>
  api.post(`/retail/regulator-returns/${id}/mark-submitted/`, { reference })
    .then(r => r.data);
