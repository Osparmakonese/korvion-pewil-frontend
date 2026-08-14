/**
 * What THIS shop charges and holds.
 *
 * A product row from /retail/products/ carries two levels of truth:
 *
 *   selling_price / quantity_in_stock  — the CHAIN. One price, and the sum
 *                                        of stock across every shop.
 *   branch_price   / branch_quantity   — what the shop currently in context
 *                                        actually charges and actually has
 *                                        on its shelf. Present only when the
 *                                        request carried a shop (the axios
 *                                        interceptor adds ?branch= from the
 *                                        branch switcher, and a pinned
 *                                        cashier always has one).
 *
 * Every till surface was reading the chain fields. Two consequences, both
 * live money problems the day a second shop opens (found 2026-08-14):
 *
 *   * Per-shop pricing never reached the customer. An owner could set a
 *     different price for a shop, the backend stored it and even stamped
 *     what the shop *should* have charged onto the sale line — and the till
 *     still rang up the chain price. The feature looked like it worked
 *     everywhere except at the one place it matters.
 *
 *   * A shop with an empty shelf showed the whole chain's stock. "12 in
 *     stock" on a tile at a branch holding none of them invites the cashier
 *     to sell goods sitting in another town.
 *
 * Both helpers fall back to the chain field, so a single-branch tenant —
 * and the "All shops" view — behave exactly as before. Use these instead of
 * reading the raw fields at any till surface.
 */

export const shopPrice = (p) => {
  const v = p == null ? null : (p.branch_price ?? p.selling_price);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const shopStock = (p) => {
  // `?? p.stock` keeps the dark-supermarket lane's older shape working.
  const v = p == null ? null : (p.branch_quantity ?? p.quantity_in_stock ?? p.stock);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
