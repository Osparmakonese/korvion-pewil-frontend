/**
 * priceTiers.js — the volume price a line qualifies for.
 *
 * WHY THIS EXISTS (2026-11-08)
 *
 * Volume pricing had a screen, a model and a `best-price` endpoint, and the
 * till never called any of it: a shop could set "6 or more, $0.22 each" and
 * the POS charged the shelf price anyway. The feature looked finished from
 * the outside and did nothing where the money changes hands.
 *
 * The tiers are resolved HERE, on the device, against a list loaded once
 * with the catalogue, for two reasons: a till that is offline must still
 * honour the shop's own prices, and asking the server on every quantity
 * change would put a request between the cashier and the + button.
 *
 * The rule, matching the server's best-price action: among the tiers for
 * this product whose min_qty the line reaches, take the lowest unit price —
 * and use it only when it beats what the shop would otherwise charge. A
 * tier is a discount for taking more; it can never quietly raise a price.
 */

/** Index a flat tier list by product id, cheapest-qualifying lookup ready. */
export function indexTiers(tiers) {
  const byProduct = new Map();
  for (const t of tiers || []) {
    const pid = Number(t.product ?? t.product_id);
    const min = parseFloat(t.min_qty);
    const price = parseFloat(t.unit_price);
    if (!pid || !Number.isFinite(min) || !Number.isFinite(price)) continue;
    if (!byProduct.has(pid)) byProduct.set(pid, []);
    byProduct.get(pid).push({ min, price, label: t.label || '' });
  }
  // Biggest break first, so the first qualifying tier is the deepest one.
  for (const list of byProduct.values()) list.sort((a, b) => b.min - a.min);
  return byProduct;
}

/**
 * The price this line should carry.
 *
 * @param index     Map from indexTiers()
 * @param productId the product
 * @param quantity  how many are on the line
 * @param basePrice what this shop charges for one (shopPrice)
 * @returns { price, label } — label is '' when no tier applied
 */
export function tierPriceFor(index, productId, quantity, basePrice) {
  const base = parseFloat(basePrice) || 0;
  const qty = parseFloat(quantity) || 0;
  const list = (index && index.get(Number(productId))) || [];
  let best = null;
  for (const t of list) {
    if (qty + 1e-9 < t.min) continue;
    if (t.price >= base) continue;            // never a price rise
    if (!best || t.price < best.price) best = t;
  }
  if (!best) return { price: base, label: '' };
  const qtyLabel = Number.isInteger(best.min) ? best.min : best.min.toFixed(3);
  return { price: best.price, label: best.label || `${qtyLabel}+ price` };
}
