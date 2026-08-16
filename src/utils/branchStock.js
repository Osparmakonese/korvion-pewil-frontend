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

/**
 * Is this shop's figure impossible?
 *
 * A shop cannot hold minus four bottles, so a negative figure is never
 * stock — it is a book error, and always the same one: more was sold at
 * that shop than the shop was ever recorded as having. It happens when a
 * shop's opening count was never entered, so its row was created at zero by
 * the first sale and has been going down ever since.
 *
 * Deliberately NOT clamped to zero anywhere. Hiding it would turn a
 * visible, fixable mistake into a silently wrong stock figure, which is the
 * more expensive of the two. It is shown, in red, as an error state — never
 * as a normal quantity — and the fix (record what is on the shelf) is one
 * click away in the per-shop panel.
 */
export const shopStockIsError = (p) => shopStock(p) < 0;

/**
 * Does this shop carry the line at all?
 *
 * `branch_available` is false only when a shop has explicitly switched the
 * product off. Absent or null means nobody has decided, which counts as
 * carried — the same permissive rule the server uses, so the badge can
 * never contradict what the till will actually let a cashier sell.
 */
export const shopCarries = (p) => (p == null ? true : p.branch_available !== false);

/**
 * Can this shop sell this line right now, and what should the till say?
 *
 * Out of stock is SHOWN, never hidden. Filtering a finished product out of
 * the search results does not stop a cashier looking for it -- it stops them
 * finding out what happened. They search, get nothing, and conclude the till
 * is broken. That is exactly how a paying shop's POS came to look as though
 * it "refused" (2026-08-16): the product was there, the shelf was empty, and
 * the screen said neither.
 *
 * So the line stays on screen, greyed and unsellable, and says WHERE the
 * shelf is empty. `shopName` is blank on a single-shop business, and the copy
 * then reads exactly as it always has -- naming a shop only means something
 * once there are two.
 *
 * Every till surface (POS grid, quick tiles, mobile, dark supermarket) reads
 * this, so they cannot disagree with each other about what is sellable.
 *
 * Returns:
 *   sellable — may the cashier add it to the sale
 *   kind     — 'in_stock' | 'out_of_stock' | 'not_carried' | 'stock_error'
 *   label    — the full sentence for the tile
 *   short    — a button-sized version
 */
export const sellState = (p, shopName = '') => {
  const at = shopName ? ` at ${shopName}` : '';
  if (!shopCarries(p)) {
    return {
      sellable: false,
      kind: 'not_carried',
      short: 'Not sold here',
      label: `Not sold${at || ' at this shop'} \u2014 switch it on to sell`,
    };
  }
  const qty = shopStock(p);
  // Negative is never a shelf count -- it is the book error described above,
  // and calling it "out of stock" would hide a fixable mistake behind a
  // normal-looking state.
  if (shopStockIsError(p)) {
    return {
      sellable: false,
      kind: 'stock_error',
      short: 'Stock error',
      label: `Stock error${at}: ${qty} \u2014 count the shelf`,
    };
  }
  if (qty <= 0) {
    return {
      sellable: false,
      kind: 'out_of_stock',
      short: 'Out of stock',
      label: `Out of stock${at} \u2014 restock to sell`,
    };
  }
  return { sellable: true, kind: 'in_stock', short: 'Add', label: `${qty} in stock` };
};
