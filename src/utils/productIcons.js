/**
 * Product icon helper — gives every product a visual identity.
 *
 * Why this exists
 * ---------------
 * Before this, products in POS / mobile catalogue / dashboard activity
 * fell back to either the generic box emoji 📦 (POS getCategoryEmoji)
 * or the first letter of the name (MobileProducts list). Investor demos
 * looked like a catalogue of identical brown squares with one capital
 * letter — it didn't read as a real shop.
 *
 * What this returns
 * -----------------
 *   getProductIcon(product) → { emoji, bg, fg }
 *
 * The lookup walks three layers in order:
 *   1. Direct name match — if the product name contains a recognised
 *      keyword (e.g. "Coca Cola" → 🥤), use that.
 *   2. Category match — fall back to the product's category name (e.g.
 *      category "Beverages" → 🥤).
 *   3. Default — a soft-bordered shopping bag tile so it's visually
 *      distinct from the literal box-with-tape default Slack uses.
 *
 * Colour pairs are picked from the Pewil palette so every tile reads
 * cleanly on the light POS background. The fg/bg pair gives a tinted
 * circular badge — same look retailers see on Square / Shopify POS.
 */

/* ── Palette pairs — tinted bg + readable fg ── */
const PAL = {
  green:  { bg: '#e8f5ee', fg: '#1a6b3a' },
  amber:  { bg: '#fdeedd', fg: '#c77700' },
  blue:   { bg: '#dbeafe', fg: '#1d4ed8' },
  purple: { bg: '#f3e8ff', fg: '#6b21a8' },
  red:    { bg: '#fde8e8', fg: '#c0392b' },
  pink:   { bg: '#fce7f3', fg: '#be185d' },
  teal:   { bg: '#ccfbf1', fg: '#0f766e' },
  yellow: { bg: '#fef9c3', fg: '#a16207' },
  brown:  { bg: '#fef3c7', fg: '#854d0e' },
  ink:    { bg: '#f3f4f6', fg: '#374151' },
};

/* ── Name-keyword lookup. Order matters: specific words come first.
   Each entry is [substring, emoji, palette]. Substrings are matched
   case-insensitively as a fragment of the product name. ── */
const NAME_RULES = [
  // Beverages
  ['coca cola', '🥤', PAL.red],
  ['coke', '🥤', PAL.red],
  ['pepsi', '🥤', PAL.blue],
  ['fanta', '🥤', PAL.amber],
  ['sprite', '🥤', PAL.green],
  ['mineral water', '💧', PAL.blue],
  ['water', '💧', PAL.blue],
  ['juice', '🧃', PAL.amber],
  ['mazoe', '🧃', PAL.amber],
  ['milk', '🥛', PAL.ink],
  ['yoghurt', '🥛', PAL.pink],
  ['yogurt', '🥛', PAL.pink],
  ['cheese', '🧀', PAL.yellow],
  ['butter', '🧈', PAL.yellow],
  ['cremora', '🥛', PAL.brown],
  ['tea', '🍵', PAL.green],
  ['coffee', '☕', PAL.brown],
  ['beer', '🍺', PAL.amber],
  ['wine', '🍷', PAL.purple],
  ['whisky', '🥃', PAL.brown],
  ['whiskey', '🥃', PAL.brown],
  ['gin', '🥃', PAL.teal],
  ['vodka', '🥃', PAL.ink],
  ['castle', '🍺', PAL.amber],
  ['bohlinger', '🍺', PAL.amber],
  ['lyons', '🍵', PAL.green],
  ['energy drink', '⚡', PAL.amber],
  ['red bull', '⚡', PAL.red],

  // Bread & bakery
  ['bread loaf', '🍞', PAL.brown],
  ['bread', '🍞', PAL.brown],
  ['loaf', '🍞', PAL.brown],
  ['cake', '🍰', PAL.pink],
  ['biscuit', '🍪', PAL.brown],
  ['cookie', '🍪', PAL.brown],
  ['croissant', '🥐', PAL.amber],
  ['donut', '🍩', PAL.pink],
  ['doughnut', '🍩', PAL.pink],
  ['pie', '🥧', PAL.amber],
  ['scone', '🧁', PAL.amber],
  ['muffin', '🧁', PAL.brown],

  // Staples & dry goods
  ['rice', '🍚', PAL.yellow],
  ['mealie meal', '🌽', PAL.amber],
  ['mealie-meal', '🌽', PAL.amber],
  ['mealie', '🌽', PAL.amber],
  ['maize meal', '🌽', PAL.amber],
  ['maize', '🌽', PAL.amber],
  ['samp', '🌾', PAL.brown],
  ['sugar', '🧂', PAL.ink],
  ['salt', '🧂', PAL.ink],
  ['flour', '🌾', PAL.brown],
  ['oats', '🌾', PAL.brown],
  ['pasta', '🍝', PAL.amber],
  ['spaghetti', '🍝', PAL.amber],
  ['noodles', '🍜', PAL.amber],
  ['cooking oil', '🫒', PAL.green],
  ['oil', '🫒', PAL.green],
  ['margarine', '🧈', PAL.yellow],
  ['peanut butter', '🥜', PAL.brown],
  ['jam', '🍓', PAL.red],
  ['honey', '🍯', PAL.amber],
  ['vinegar', '🧴', PAL.amber],
  ['baking powder', '🥄', PAL.ink],

  // Meat & protein
  ['beef', '🥩', PAL.red],
  ['steak', '🥩', PAL.red],
  ['pork', '🥩', PAL.pink],
  ['chicken', '🍗', PAL.amber],
  ['drumstick', '🍗', PAL.amber],
  ['sausage', '🌭', PAL.red],
  ['bacon', '🥓', PAL.red],
  ['fish', '🐟', PAL.blue],
  ['kapenta', '🐟', PAL.blue],
  ['mince', '🥩', PAL.red],
  ['eggs', '🥚', PAL.yellow],
  ['egg', '🥚', PAL.yellow],

  // Produce
  ['tomato', '🍅', PAL.red],
  ['tomatoes', '🍅', PAL.red],
  ['onion', '🧅', PAL.amber],
  ['potato', '🥔', PAL.brown],
  ['carrot', '🥕', PAL.amber],
  ['cabbage', '🥬', PAL.green],
  ['spinach', '🥬', PAL.green],
  ['rape', '🥬', PAL.green],
  ['covo', '🥬', PAL.green],
  ['lettuce', '🥬', PAL.green],
  ['cucumber', '🥒', PAL.green],
  ['banana', '🍌', PAL.yellow],
  ['apple', '🍎', PAL.red],
  ['orange', '🍊', PAL.amber],
  ['mango', '🥭', PAL.amber],
  ['avocado', '🥑', PAL.green],
  ['pepper', '🌶️', PAL.red],
  ['chilli', '🌶️', PAL.red],
  ['garlic', '🧄', PAL.brown],
  ['ginger', '🫚', PAL.amber],

  // Household / cleaning
  ['soap', '🧼', PAL.blue],
  ['detergent', '🧴', PAL.blue],
  ['bleach', '🧴', PAL.teal],
  ['toilet paper', '🧻', PAL.ink],
  ['tissue', '🧻', PAL.ink],
  ['mop', '🧽', PAL.teal],
  ['broom', '🧹', PAL.amber],
  ['candle', '🕯️', PAL.amber],
  ['matches', '🪵', PAL.brown],

  // Personal care
  ['toothpaste', '🦷', PAL.blue],
  ['toothbrush', '🪥', PAL.blue],
  ['shampoo', '🧴', PAL.purple],
  ['conditioner', '🧴', PAL.pink],
  ['lotion', '🧴', PAL.pink],
  ['vaseline', '🧴', PAL.amber],
  ['deodorant', '🧴', PAL.blue],
  ['razor', '🪒', PAL.ink],
  ['pads', '🌸', PAL.pink],
  ['tampon', '🌸', PAL.pink],
  ['diaper', '👶', PAL.pink],
  ['diapers', '👶', PAL.pink],
  ['nappy', '👶', PAL.pink],
  ['nappies', '👶', PAL.pink],
  ['huggies', '👶', PAL.pink],
  ['pampers', '👶', PAL.pink],

  // Vouchers / airtime / data
  ['airtime', '📱', PAL.green],
  ['voucher', '🎫', PAL.purple],
  ['ecocash', '📱', PAL.amber],
  ['onemoney', '📱', PAL.green],
  ['netone', '📱', PAL.green],
  ['econet', '📱', PAL.amber],
  ['telecel', '📱', PAL.red],
  ['data bundle', '📡', PAL.blue],
  ['data', '📡', PAL.blue],
  ['wifi', '📶', PAL.blue],
  ['minutes', '📞', PAL.green],
  ['sms bundle', '💬', PAL.blue],

  // Confectionery & snacks
  ['chocolate', '🍫', PAL.brown],
  ['sweet', '🍬', PAL.pink],
  ['sweets', '🍬', PAL.pink],
  ['candy', '🍬', PAL.pink],
  ['lollipop', '🍭', PAL.pink],
  ['gum', '🍬', PAL.pink],
  ['chips', '🍟', PAL.amber],
  ['crisps', '🍟', PAL.amber],
  ['popcorn', '🍿', PAL.amber],
  ['nuts', '🥜', PAL.brown],
  ['peanuts', '🥜', PAL.brown],
  ['ice cream', '🍦', PAL.pink],

  // Tobacco & related
  ['cigarette', '🚬', PAL.ink],
  ['snuff', '🚬', PAL.ink],
  ['lighter', '🔥', PAL.red],

  // Stationery
  ['pen', '🖊️', PAL.blue],
  ['pencil', '✏️', PAL.amber],
  ['exercise book', '📓', PAL.amber],
  ['notebook', '📓', PAL.amber],
  ['paper', '📄', PAL.ink],
  ['envelope', '✉️', PAL.amber],
  ['stapler', '📎', PAL.ink],

  // Hardware
  ['nails', '🔩', PAL.ink],
  ['hammer', '🔨', PAL.brown],
  ['screw', '🔩', PAL.ink],
  ['paint', '🎨', PAL.purple],
  ['brush', '🖌️', PAL.brown],
  ['cement', '🧱', PAL.ink],
  ['bricks', '🧱', PAL.red],
  ['wire', '🧵', PAL.ink],
  ['rope', '🪢', PAL.brown],
  ['battery', '🔋', PAL.green],
  ['bulb', '💡', PAL.amber],
  ['light bulb', '💡', PAL.amber],

  // Pharmacy
  ['paracetamol', '💊', PAL.green],
  ['panado', '💊', PAL.green],
  ['ibuprofen', '💊', PAL.green],
  ['aspirin', '💊', PAL.amber],
  ['cough syrup', '🥄', PAL.purple],
  ['plaster', '🩹', PAL.amber],
  ['bandage', '🩹', PAL.amber],
  ['pill', '💊', PAL.green],
  ['tablet', '💊', PAL.green],
  ['vitamin', '💊', PAL.amber],

  // Farm & feed
  ['feed', '🌾', PAL.brown],
  ['fertilizer', '🌱', PAL.green],
  ['fertiliser', '🌱', PAL.green],
  ['seed', '🌱', PAL.green],
  ['seedling', '🌱', PAL.green],
  ['compound d', '🌱', PAL.green],
  ['ammonium', '🌱', PAL.green],
  ['pesticide', '🚿', PAL.amber],
];

/* ── Category-name fallback (case-insensitive substring) ── */
const CATEGORY_RULES = [
  ['beverage', '🥤', PAL.red],
  ['drink',    '🥤', PAL.red],
  ['bakery',   '🍞', PAL.brown],
  ['bread',    '🍞', PAL.brown],
  ['dairy',    '🥛', PAL.ink],
  ['meat',     '🥩', PAL.red],
  ['butcher',  '🥩', PAL.red],
  ['fish',     '🐟', PAL.blue],
  ['produce',  '🥬', PAL.green],
  ['vegetable','🥕', PAL.amber],
  ['fruit',    '🍎', PAL.red],
  ['grocery',  '🛒', PAL.green],
  ['staple',   '🌾', PAL.brown],
  ['snack',    '🍿', PAL.amber],
  ['confectionery', '🍬', PAL.pink],
  ['sweets',   '🍬', PAL.pink],
  ['frozen',   '🧊', PAL.blue],
  ['canned',   '🥫', PAL.amber],
  ['household','🧹', PAL.amber],
  ['cleaning', '🧴', PAL.teal],
  ['personal', '🧴', PAL.purple],
  ['hygiene',  '🧼', PAL.blue],
  ['baby',     '👶', PAL.pink],
  ['airtime',  '📱', PAL.green],
  ['voucher',  '🎫', PAL.purple],
  ['data',     '📡', PAL.blue],
  ['mobile',   '📱', PAL.amber],
  ['telecom',  '📱', PAL.amber],
  ['stationery','📓', PAL.amber],
  ['hardware', '🔨', PAL.brown],
  ['paint',    '🎨', PAL.purple],
  ['electric', '💡', PAL.amber],
  ['pharmacy', '💊', PAL.green],
  ['medicine', '💊', PAL.green],
  ['health',   '💊', PAL.green],
  ['feed',     '🌾', PAL.brown],
  ['fertili',  '🌱', PAL.green],
  ['seed',     '🌱', PAL.green],
  ['tobacco',  '🚬', PAL.ink],
  ['alcohol',  '🍺', PAL.amber],
];

const DEFAULT_ICON = { emoji: '🛍️', bg: PAL.green.bg, fg: PAL.green.fg };

/**
 * Pick a stable colour pair from the palette using a simple hash of the
 * input string. So a product "Foo" without a keyword match still gets a
 * consistent (and recognisable) tile, not a random one each render.
 */
function paletteFromString(s) {
  const list = Object.values(PAL);
  if (!s) return list[0];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  return list[h % list.length];
}

/**
 * Resolve an icon for a product. Accepts the product object (with
 * `name` and either `category_name` or a `category` already-resolved).
 * Returns { emoji, bg, fg }.
 *
 * Pass `categoryFallback` (the resolved category name string) if the
 * caller has it — Products list passes category id only, so category
 * lookup at the row level needs the id→name resolution to be done
 * upstream.
 */
export function getProductIcon(product, categoryFallback) {
  if (!product) return DEFAULT_ICON;
  const name = String(product.name || '').toLowerCase();
  const cat  = String(
    product.category_name || product.categoryName || categoryFallback || ''
  ).toLowerCase();

  // 1. Name-keyword match (most specific)
  if (name) {
    for (const [needle, emoji, pal] of NAME_RULES) {
      if (name.includes(needle)) return { emoji, bg: pal.bg, fg: pal.fg };
    }
  }
  // 2. Category-name fallback
  if (cat) {
    for (const [needle, emoji, pal] of CATEGORY_RULES) {
      if (cat.includes(needle)) return { emoji, bg: pal.bg, fg: pal.fg };
    }
  }
  // 3. Default — but with a hash-stable colour so the user sees variety
  // even on a brand-new tenant without categories yet.
  const pal = paletteFromString(name || String(product.id || ''));
  return { emoji: '🛍️', bg: pal.bg, fg: pal.fg };
}

export const PRODUCT_ICON_DEFAULT = DEFAULT_ICON;
