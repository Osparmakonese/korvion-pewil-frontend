import api, { VIEW_BRANCH_KEY } from './axios';

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

// ── Pharmacy Phase 3 (2026-08-31): patients, medical aid, expiry money ──
export const getPatients = (q) => api.get('/retail/patients/', { params: q ? { q } : {} }).then(r => r.data);
export const createPatient = (data) => api.post('/retail/patients/', data).then(r => r.data);
export const updatePatient = (id, data) => api.patch(`/retail/patients/${id}/`, data).then(r => r.data);
export const deletePatient = (id) => api.delete(`/retail/patients/${id}/`);

export const getMedicalAidProviders = () => api.get('/retail/medical-aid-providers/').then(r => r.data);
export const createMedicalAidProvider = (data) => api.post('/retail/medical-aid-providers/', data).then(r => r.data);
export const updateMedicalAidProvider = (id, data) => api.patch(`/retail/medical-aid-providers/${id}/`, data).then(r => r.data);

export const getMedicalAidClaims = (params) => api.get('/retail/medical-aid-claims/', { params }).then(r => r.data);
export const setClaimStatus = (id, data) => api.post(`/retail/medical-aid-claims/${id}/set-status/`, data).then(r => r.data);
export const getClaimsOutstanding = () => api.get('/retail/medical-aid-claims/outstanding/').then(r => r.data);
export const exportClaimsCsv = (params) => api.get('/retail/medical-aid-claims/export-csv/', { params, responseType: 'blob' }).then(r => r.data);

export const getExpirySummary = () => api.get('/retail/product-batches/expiry-summary/').then(r => r.data);
export const writeOffBatch = (id, data) => api.post(`/retail/product-batches/${id}/write-off/`, data).then(r => r.data);

// ── Phase 4 (2026-08-31): butchery, clothing variants, manufacturing ──
export const getCarcasses = (params) => api.get('/retail/carcasses/', { params }).then(r => r.data);
export const createCarcass = (data) => api.post('/retail/carcasses/', data).then(r => r.data);
export const completeCutting = (id, data) => api.post(`/retail/carcasses/${id}/complete-cutting/`, data).then(r => r.data);
export const getYieldReport = () => api.get('/retail/carcasses/yield-report/').then(r => r.data);

export const getProductStyles = () => api.get('/retail/product-styles/').then(r => r.data);
export const createProductStyle = (data) => api.post('/retail/product-styles/', data).then(r => r.data);
export const generateVariants = (id) => api.post(`/retail/product-styles/${id}/generate-variants/`, {}).then(r => r.data);
export const markdownStyle = (id, data) => api.post(`/retail/product-styles/${id}/markdown/`, data).then(r => r.data);
export const getMarkdowns = () => api.get('/retail/markdowns/').then(r => r.data);
export const createSizeExchange = (data) => api.post('/retail/size-exchanges/', data).then(r => r.data);
export const getSizeExchanges = () => api.get('/retail/size-exchanges/').then(r => r.data);

export const getBoms = () => api.get('/retail/boms/').then(r => r.data);
export const createBom = (data) => api.post('/retail/boms/', data).then(r => r.data);
export const updateBom = (id, data) => api.patch(`/retail/boms/${id}/`, data).then(r => r.data);
export const getProductionOrders = (params) => api.get('/retail/production-orders/', { params }).then(r => r.data);
export const createProductionOrder = (data) => api.post('/retail/production-orders/', data).then(r => r.data);
export const completeProductionOrder = (id) => api.post(`/retail/production-orders/${id}/complete/`, {}).then(r => r.data);

// ── Phase 5 (2026-08-31): the books ──
export const getAccountingPnl = (params) => api.get('/retail/accounting/pnl/', { params }).then(r => r.data);
export const getAccountingVat7 = (params) => api.get('/retail/accounting/vat7/', { params }).then(r => r.data);
export const getAccountingTrialBalance = (params) => api.get('/retail/accounting/trial-balance/', { params }).then(r => r.data);
export const getDebtors = () => api.get('/retail/accounting/debtors/').then(r => r.data);
export const getCreditors = (params) => api.get('/retail/accounting/creditors/', { params }).then(r => r.data);
export const getZReconciliation = (params) => api.get('/retail/accounting/z-reconciliation/', { params }).then(r => r.data);
export const downloadSageCsv = (params) => api.get('/retail/accounting/sage-csv/', { params, responseType: 'blob' }).then(r => r.data);
export const downloadAccountantPack = (params) => api.get('/retail/accounting/accountant-pack/', { params, responseType: 'blob' }).then(r => r.data);

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

// ── Payments Phase 1: mobile money + change-as-credit wallet ──
// Merchant accounts (owner enters their OWN Paynow Integration ID + Key)
export const getPaymentCredentials = () => api.get('/retail/payment-credentials/').then(r => r.data);
export const createPaymentCredentials = (data) => api.post('/retail/payment-credentials/', data).then(r => r.data);
export const updatePaymentCredentials = (id, data) => api.patch(`/retail/payment-credentials/${id}/`, data).then(r => r.data);
export const deletePaymentCredentials = (id) => api.delete(`/retail/payment-credentials/${id}/`);
export const getPaymentProviders = () => api.get('/retail/payment-credentials/providers/').then(r => r.data);

// Mobile money collection (push-to-phone) + status polling
export const getPaymentTransactions = (params) => api.get('/retail/payments/', { params }).then(r => r.data);
export const collectPayment = (data) => api.post('/retail/payments/collect/', data).then(r => r.data);
export const getPaymentStatus = (id) => api.get(`/retail/payments/${id}/status/`).then(r => r.data);
// Direct EcoCash only: push money back to the number that paid (change / refund).
export const refundPayment = (id, data) => api.post(`/retail/payments/${id}/refund/`, data).then(r => r.data);
export const linkPaymentToSale = (id, sale) => api.post(`/retail/payments/${id}/link/`, { sale }).then(r => r.data);
export const getPaymentReconciliation = (params) => api.get('/retail/payments/reconciliation/', { params }).then(r => r.data);

// ── Vending: airtime / ZESA / water tokens (own BillPay float) ──
export const getVendingCredentials = () => api.get('/retail/vending-credentials/').then(r => r.data);
export const createVendingCredentials = (data) => api.post('/retail/vending-credentials/', data).then(r => r.data);
export const updateVendingCredentials = (id, data) => api.patch(`/retail/vending-credentials/${id}/`, data).then(r => r.data);
export const deleteVendingCredentials = (id) => api.delete(`/retail/vending-credentials/${id}/`);
export const getVendingBillers = (params) => api.get('/retail/vending/billers/', { params }).then(r => r.data);
export const vend = (data) => api.post('/retail/vending/sell/', data).then(r => r.data);
export const getVendStatus = (id) => api.get(`/retail/vending/${id}/status/`).then(r => r.data);
export const getVendingTransactions = (params) => api.get('/retail/vending/', { params }).then(r => r.data);

// Change-as-credit wallet
export const getWallets = (params) => api.get('/retail/wallets/', { params }).then(r => r.data);
export const lookupWallet = (data) => api.post('/retail/wallets/lookup/', data).then(r => r.data);
export const creditWallet = (id, data) => api.post(`/retail/wallets/${id}/credit/`, data).then(r => r.data);
export const redeemWallet = (id, data) => api.post(`/retail/wallets/${id}/redeem/`, data).then(r => r.data);
export const topupWallet = (id, data) => api.post(`/retail/wallets/${id}/topup/`, data).then(r => r.data);
export const getWalletStatement = (id) => api.get(`/retail/wallets/${id}/statement/`).then(r => r.data);

// ── Products ──
// The till calls this bare, so it gets exactly what this shop sells: the
// backend hides lines the branch has turned off (ProductBranchStock
// .is_available = false). Catalogue-management screens pass
// { include_unavailable: 1 } — otherwise a de-selected product vanishes from
// the list and there is no way back in to switch it on again.
export const getProducts = (opts) => {
  // Fifteen screens pass this bare as `queryFn: getProducts`, and React Query
  // invokes queryFn with ITS OWN context object ({ queryKey, signal, meta }).
  // Accepting that blindly as params would serialise a queryKey array and an
  // AbortSignal into the query string on every one of those screens. So only
  // honour something that is clearly a deliberate options object.
  const params =
    opts && typeof opts === 'object' && !Array.isArray(opts) && !('queryKey' in opts)
      ? opts
      : undefined;
  return api.get('/retail/products/', params ? { params } : undefined).then(r => r.data);
};
// Name the shop on a WRITE.
//
// The axios interceptor deliberately adds ?branch= to reads only — a write
// must never be silently retargeted at another shop by a leftover setting.
// But a write that MOVES REAL STOCK still has to say where, or the server
// falls back to head office and the goods land in the wrong building. So the
// handful of writes that move stock opt in here, explicitly.
const viewBranchParams = () => {
  let branch = null;
  try { branch = localStorage.getItem(VIEW_BRANCH_KEY); } catch (_) { branch = null; }
  return branch ? { params: { branch } } : undefined;
};

// The opening stock on a new product has to land SOMEWHERE, and the server
// picks the shop from ?branch= (falling back to head office). The axios
// interceptor only adds that to reads, so name the shop explicitly here —
// otherwise an owner stepped into their second shop adds a product with 40
// units and all 40 appear at head office (2026-08-14).
export const createProduct = (data) =>
  api.post('/retail/products/', data, viewBranchParams()).then(r => r.data);
export const updateProduct = (id, data) => api.patch(`/retail/products/${id}/`, data).then(r => r.data);
export const deleteProduct = (id) => api.delete(`/retail/products/${id}/`);
export const getLowStockProducts = () => api.get('/retail/products/low_stock/').then(r => r.data);
export const getExpiringProducts = () => api.get('/retail/products/expiring_soon/').then(r => r.data);
// `branch` is optional and the till passes its OPEN SESSION's shop, so a
// scan is resolved against the shop the sale will actually land in — and a
// line that shop has switched off is refused at the scan rather than at
// payment, four items later.
export const barcodeLookup = (barcode, branch) =>
  api.get('/retail/products/barcode_lookup/', {
    params: branch ? { barcode, branch } : { barcode },
  }).then(r => r.data);

// ── Stock Adjustments ──
export const getStockAdjustments = () => api.get('/retail/stock-adjustments/').then(r => r.data);

// A stock adjustment MOVES REAL STOCK at one shop, so it has to name the
// shop. The axios interceptor deliberately only adds ?branch= to reads —
// a write must never be silently retargeted — so this one write says which
// shop it is about explicitly, in the body.
//
// Without it the server had nothing to go on and fell back to head office:
// an owner viewing "Avenu" who wrote off six broken bottles took them off
// HQ's shelf instead, and both shops' stock was then wrong (2026-08-14). A
// caller that passes `branch` itself always wins; a cashier pinned to a
// shop is re-pinned server-side regardless of what is sent.
export const createStockAdjustment = (data) => {
  let branch = null;
  try { branch = localStorage.getItem(VIEW_BRANCH_KEY); } catch (_) { branch = null; }
  const body = (branch && !(data && data.branch))
    ? { ...data, branch: parseInt(branch, 10) || undefined }
    : data;
  return api.post('/retail/stock-adjustments/', body).then(r => r.data);
};

// ── Cashier Sessions ──
export const getCashierSessions = () => api.get('/retail/cashier-sessions/').then(r => r.data);
// The till's question is "which tills are open right now?" - a few rows, not
// the business's whole history (84 KB and growing, which is what used to
// time out on a shop phone and hand the POS a stale saved copy). The result
// carries `fromSavedCopy` when the offline layer answered instead of the
// server, so the caller can say so rather than refuse a sale on old news.
export const getOpenCashierSessions = () =>
  api.get('/retail/cashier-sessions/', { params: { status: 'open' } })
    .then((r) => {
      const data = Array.isArray(r.data) ? r.data : (r.data?.results || []);
      return { sessions: data, fromSavedCopy: !!r.__fromOfflineCache, savedAt: r.__cachedAt || null };
    });
export const createCashierSession = (data) => api.post('/retail/cashier-sessions/', data).then(r => r.data);
export const closeCashierSession = (id, data) => api.post(`/retail/cashier-sessions/${id}/close/`, data).then(r => r.data);

// ── Sales ──
// The sales list is BOUNDED server-side (retail/views.py SaleViewSet) — it
// used to hand back every sale the shop had ever made, which on a real till
// exceeded the 15s axios timeout and left Sales History blank. Pass
// { days, limit } or { start, end } to choose the window.
export const getSales = (params) =>
  api.get('/retail/sales/', { params: params || undefined }).then(r => r.data);
export const getSale = (id) => api.get(`/retail/sales/${id}/`).then(r => r.data);
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
// Receiving a PO puts real goods on a real shelf. `received_at_branch` has
// driven that restock since branches shipped, but nothing ever set it, so the
// model's `or hq_branch_for(tenant)` fallback meant EVERY delivery on a chain
// was booked into head office — the shop that signed for the pallet showed
// none of it. Both the raise and the receive now name the shop.
export const getPurchaseOrders = (params) => api.get('/retail/purchase-orders/', { params }).then(r => r.data);
export const createPurchaseOrder = (data) =>
  api.post('/retail/purchase-orders/', data, viewBranchParams()).then(r => r.data);
export const updatePurchaseOrder = (id, data) => api.patch(`/retail/purchase-orders/${id}/`, data).then(r => r.data);
export const receivePurchaseOrder = (id) =>
  api.post(`/retail/purchase-orders/${id}/receive/`, {}, viewBranchParams()).then(r => r.data);

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

// ── ZIMRA FDMS device lifecycle + compliance ──
export const registerZimraDevice = (id) => api.post(`/retail/zimra-devices/${id}/register/`).then(r => r.data);
export const syncZimraDevice = (id) => api.post(`/retail/zimra-devices/${id}/sync/`).then(r => r.data);
export const openFiscalDay = (id) => api.post(`/retail/zimra-devices/${id}/open-day/`).then(r => r.data);
export const closeFiscalDay = (id) => api.post(`/retail/zimra-devices/${id}/close-day/`).then(r => r.data);
export const getFiscalCompliance = () => api.get('/retail/zimra-devices/compliance/').then(r => r.data);
export const flushFiscalQueue = () => api.post('/retail/zimra-devices/flush-queue/').then(r => r.data);

// ── Fiscal Queue ──
export const getFiscalQueue = (queueStatus) => api.get('/retail/fiscal-queue/', { params: queueStatus ? { status: queueStatus } : {} }).then(r => r.data);
export const retryFiscalItem = (id) => api.post(`/retail/fiscal-queue/${id}/retry/`).then(r => r.data);
export const getFiscalQueueStats = () => api.get('/retail/fiscal-queue/stats/').then(r => r.data);
export const fiscaliseReturn = (id) => api.post(`/retail/returns/${id}/fiscalise/`).then(r => r.data);
export const emailReceipt = (saleId, data) => api.post(`/retail/sales/${saleId}/email-receipt/`, data).then(r => r.data);
export const exportSalesExcel = (params) => api.get('/retail/sales/export-excel/', { params, responseType: 'blob' }).then(r => r.data);
export const exportFinancialsExcel = (params) => api.get('/retail/financials/export-excel/', { params, responseType: 'blob' }).then(r => r.data);
export const importProducts = (formData) => api.post('/retail/products-import/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
export const downloadProductTemplate = () => api.get('/retail/products-import/', { responseType: 'blob' }).then(r => r.data);
export const getOnboardingStatus = () => api.get('/retail/onboarding-status/').then(r => r.data);

// ── Stocktake ──
export const getStocktakes = () => api.get('/retail/stocktakes/').then(r => r.data);
export const getStocktake = (id) => api.get(`/retail/stocktakes/${id}/`).then(r => r.data);
// A stocktake counts one building's shelves, so it has to name the building.
// Without this the server had nothing to go on: the count sheet was filled
// with the CHAIN's quantities and finalising it measured a shop's shelf
// against the whole business's stock.
export const startStocktake = (data) =>
  api.post('/retail/stocktakes/', data || {}, viewBranchParams()).then(r => r.data);
export const saveStocktakeCounts = (id, counts) => api.post(`/retail/stocktakes/${id}/save-counts/`, { counts }).then(r => r.data);
export const finalizeStocktake = (id) => api.post(`/retail/stocktakes/${id}/finalize/`).then(r => r.data);

// ── Phase 2/3: Layby ──
export const getLaybys = (st) => api.get('/retail/laybys/', { params: st ? { status: st } : {} }).then(r => r.data);
export const createLayby = (data) => api.post('/retail/laybys/', data).then(r => r.data);
export const updateLayby = (id, data) => api.patch(`/retail/laybys/${id}/`, data).then(r => r.data);
export const addLaybyPayment = (id, data) => api.post(`/retail/laybys/${id}/add-payment/`, data).then(r => r.data);
export const collectLayby = (id) => api.post(`/retail/laybys/${id}/collect/`).then(r => r.data);
export const cancelLayby = (id) => api.post(`/retail/laybys/${id}/cancel/`).then(r => r.data);
export const getLaybySummary = () => api.get('/retail/laybys/summary/').then(r => r.data);

// ── Phase 2/3: Goods-Received Vouchers ──
export const getGRVs = () => api.get('/retail/grvs/').then(r => r.data);

// ── Phase 2/3: Recurring invoices ──
export const getRecurringInvoices = () => api.get('/retail/recurring-invoices/').then(r => r.data);
export const createRecurringInvoice = (data) => api.post('/retail/recurring-invoices/', data).then(r => r.data);
export const updateRecurringInvoice = (id, data) => api.patch(`/retail/recurring-invoices/${id}/`, data).then(r => r.data);
export const generateRecurringInvoice = (id) => api.post(`/retail/recurring-invoices/${id}/generate/`).then(r => r.data);
export const runDueRecurring = () => api.post('/retail/recurring-invoices/run-due/').then(r => r.data);

// ── Phase 3: Financial & tax reports ──
export const getVatReturn = (params) => api.get('/retail/financials/vat-return/', { params }).then(r => r.data);
export const getStockValuation = () => api.get('/retail/financials/stock-valuation/').then(r => r.data);
export const getProfitLoss = (params) => api.get('/retail/financials/profit-loss/', { params }).then(r => r.data);
export const getBalanceSheet = () => api.get('/retail/financials/balance-sheet/').then(r => r.data);
export const getDebtorsCreditors = () => api.get('/retail/financials/debtors-creditors/').then(r => r.data);

// ── Analytics ──
export const getRetailDashboard = () => api.get('/retail/analytics/dashboard/').then(r => r.data);
export const getEndOfDayReport = (date) => api.get('/retail/analytics/end_of_day/', { params: date ? { date } : {} }).then(r => r.data);
export const getCashierPerformance = (days) => api.get('/retail/analytics/cashier_performance/', { params: days ? { days } : {} }).then(r => r.data);
export const getProfitMargins = () => api.get('/retail/analytics/profit_margins/').then(r => r.data);

// ── POS Settings (singleton per tenant) ──
export const getPOSSettings = () => api.get('/retail/pos-settings/').then(r => r.data);
// Tenant-wide retail settings (vat_rate lives here). The till reads the
// SERVER's VAT rate so every device charges the same books, whether or not
// anyone ever opened the Settings page on it (2026-08-31).
export const getRetailTenantSettings = () => api.get('/retail/tenant-settings/').then(r => r.data);
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
export const getChainRollup = (days) =>
  api.get('/retail/analytics/chain-rollup/', days ? { params: { days } } : undefined)
     .then(r => r.data);

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

// ── Per-shop pricing ────────────────────────────────────────────────
// Product identity is chain-wide; only the price and whether a shop
// carries the line can differ. `selling_price: null` means "inherit the
// chain price", which is where most products should stay.
export const getShopPricing = (productId) =>
  api.get(`/retail/products/${productId}/shop-pricing/`).then(r => r.data);
export const setShopPricing = (productId, branches) =>
  api.post(`/retail/products/${productId}/shop-pricing/`, { branches }).then(r => r.data);

// Realised profit — built from actual sales at the cost captured when each
// sale happened, so re-pricing later cannot rewrite history.
export const getMarginAnalysis = (params) =>
  api.get('/retail/analytics/margin-analysis/', { params }).then(r => r.data);
