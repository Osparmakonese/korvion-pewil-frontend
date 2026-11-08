/**
 * packs.js — selling the same product as a single or as a pack.
 *
 * A shop buys eggs by the carton of 18 and sells both: one egg over the
 * counter, and a whole carton to the customer who wants one. It is the same
 * stock — a carton sold is eighteen eggs off the shelf — but it is NOT
 * eighteen times the price, which is the whole reason a customer buys the
 * carton. So a pack carries a price of its own, and only falls back to
 * "single price x pack size" when the shop has not set one (2026-11-09).
 *
 * Everything here reads the SHOP's figures first (branch_pack_price,
 * branch_price) and the chain's only as a fallback, like branchStock.js.
 */
import { shopPrice, shopStock } from './branchStock';

/** How many singles are in a pack. 1 means this product has no pack. */
export function packSize(product) {
  const per = Number(product?.units_per_purchase);
  return Number.isFinite(per) && per > 1 ? per : 1;
}

export function hasPack(product) {
  return packSize(product) > 1;
}

/**
 * Does this shop actually SELL this product as a pack?
 *
 * A pack size alone is not enough. Plenty of products are BOUGHT by the
 * box and only ever sold singly — the pack size is there so receiving a
 * delivery expands to singles — and if a pack size alone opened the
 * single-or-pack dialog, every one of those products would start asking
 * the cashier a question mid-queue for no reason (2026-11-09).
 *
 * The shop opts in by giving the pack a price of its own. Until it does,
 * the till behaves exactly as it does today.
 */
export function sellsPacks(product) {
  if (!hasPack(product)) return false;
  const own = product?.branch_pack_price ?? product?.pack_price;
  const n = Number(own);
  return own != null && own !== '' && Number.isFinite(n) && n > 0;
}

/** 'carton', 'box', 'case' — what the shop calls a pack of this product. */
export function packNoun(product) {
  const n = (product?.purchase_unit || '').toString().trim();
  return n || 'pack';
}

/** "Carton of 18" — for a button, a cart line and the receipt. */
export function packLabel(product) {
  const noun = packNoun(product);
  return `${noun.charAt(0).toUpperCase()}${noun.slice(1)} of ${packSize(product)}`;
}

/**
 * What a whole pack costs the customer.
 *
 * The shop's own pack price, else the chain's, else the single price times
 * the pack size — which is what the till charged before pack prices
 * existed, so a shop that sets nothing sees no change.
 */
export function packPrice(product) {
  const own = product?.branch_pack_price ?? product?.pack_price;
  const n = Number(own);
  if (own != null && own !== '' && Number.isFinite(n) && n > 0) return n;
  return shopPrice(product) * packSize(product);
}

/** How many whole packs this shop can sell from what is on the shelf. */
export function packsOnHand(product) {
  const per = packSize(product);
  if (per <= 1) return shopStock(product);
  return Math.floor((Number(shopStock(product)) || 0) / per);
}

/** What one pack saves the customer against buying them one at a time. */
export function packSaving(product) {
  const singles = shopPrice(product) * packSize(product);
  const pack = packPrice(product);
  return Math.round((singles - pack) * 100) / 100;
}
