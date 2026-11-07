// Starting data for the pretend shop the Store Admin tutorial is filmed in (capture/shop-tutorial.cjs).
// Products are the shop's own (names, prices and photos from the live storefront); stock levels
// are made up. Every customer and order is invented: names, emails and phone numbers alike.
const path = require('path');
const crypto = require('crypto');
const photo = (f) => path.join(__dirname, 'shop-photos', f);

const files = [];
function img(base, productId, file) {
  const p = `products/${productId}/${file}`;
  files.push({ bucket: 'product-images', path: p, file: photo(file) });
  return { url: `${base}/storage/v1/object/public/product-images/${p}`, path: p, alt: '' };
}

const ADULT = ['S', 'M', 'L', 'XL', '2XL'];
function clothing(productId, colours, stock) {
  const out = [];
  let i = 0;
  for (const [color, color_hex] of colours) for (const size of ADULT) out.push({ product_id: productId, color, color_hex, size, stock: stock(color, size), sort_order: i++, sku: null });
  return out;
}
const daysAgo = (d, h = 11) => new Date(Date.UTC(2026, 10, 5 - d, h, 14)).toISOString();

module.exports = ({ base }) => {
  files.length = 0;
  const ids = Object.fromEntries(['overflow', 'river', 'tent', 'deep', 'yes', 'bible'].map((k) => [k, crypto.randomUUID()]));
  const products = [
    { id: ids.overflow, name: 'I Am Living in the Overflow Tee', slug: 'overflow-tee', category: 'T-Shirts', base_price_pennies: 1800, is_published: true, is_featured: true, sort_order: 1, fit: 'unisex', product_type: 'clothing', description: '<p>Our vision statement for 2025, on a heavyweight organic cotton tee.</p>', images: [img(base, ids.overflow, 'overflow-tee-1.webp'), img(base, ids.overflow, 'overflow-tee-2.webp')], created_at: daysAgo(60) },
    { id: ids.river, name: 'Wherever the River Flows Tee', slug: 'wherever-the-river-flows-tee', category: 'T-Shirts', base_price_pennies: 1800, is_published: true, sort_order: 2, fit: 'unisex', product_type: 'clothing', description: '<p>Ezekiel 47:9. Transformation follows.</p>', images: [img(base, ids.river, 'river-tee-black.webp'), img(base, ids.river, 'river-tee-white.webp')], created_at: daysAgo(50) },
    { id: ids.tent, name: 'Enlarge the Place of Your Tent Hoodie', slug: 'enlarge-your-tent-hoodie', category: 'Jumper', base_price_pennies: 3200, is_published: true, sort_order: 3, fit: 'unisex', product_type: 'clothing', description: '<p>Isaiah 54:2-3, on a soft brushed-back hoodie.</p>', images: [img(base, ids.tent, 'tent-hoodie.webp')], created_at: daysAgo(40) },
    { id: ids.deep, name: 'Deep Strokes, Wide Reach Tee', slug: 'deep-strokes-tee', category: 'T-Shirts', base_price_pennies: 1600, is_published: false, sort_order: 4, fit: 'unisex', product_type: 'clothing', description: null, images: [img(base, ids.deep, 'deep-strokes-tee.webp')], created_at: daysAgo(10) },
    { id: ids.yes, name: 'You Said Yes', slug: 'you-said-yes', category: 'Books', base_price_pennies: 800, is_published: true, sort_order: 5, fit: 'unisex', product_type: 'books', description: '<p>How do I start my new life with Jesus? A short guide for the first few weeks.</p>', images: [img(base, ids.yes, 'you-said-yes-1.webp'), img(base, ids.yes, 'you-said-yes-2.webp')], created_at: daysAgo(80) },
    { id: ids.bible, name: 'The Life Recovery Bible', slug: 'life-recovery-bible', category: 'Books', base_price_pennies: 2200, is_published: true, sort_order: 6, fit: 'unisex', product_type: 'books', description: '<p>NLT, personal size. The Bible for people in 12-step recovery.</p>', images: [img(base, ids.bible, 'recovery-bible.webp')], created_at: daysAgo(90) },
  ];
  const product_variants = [
    ...clothing(ids.overflow, [['White', '#ffffff']], (c, s) => ({ S: 6, M: 9, L: 8, XL: 5, '2XL': 3 })[s]),
    ...clothing(ids.river, [['Black', '#111111'], ['White', '#ffffff']], (c, s) => (c === 'Black' ? { S: 4, M: 7, L: 6, XL: 4, '2XL': 2 } : { S: 3, M: 5, L: 5, XL: 2, '2XL': 1 })[s]),
    ...clothing(ids.tent, [['Black', '#111111']], (c, s) => ({ S: 0, M: 1, L: 1, XL: 0, '2XL': 0 })[s]),
    ...clothing(ids.deep, [['Lilac', '#d9c2ee']], () => 0),
    { product_id: ids.yes, size: 'Paperback', color: '', stock: 24, sort_order: 0 },
    { product_id: ids.bible, size: 'Paperback', color: '', stock: 6, sort_order: 0 },
    { product_id: ids.bible, size: 'Hardcover', color: '', stock: 2, sort_order: 1 },
  ];

  const people = [
    ['Amara Okafor', 'amara.okafor@example.com', '07700 900123', 'paid', 1, [[ids.river, 'Wherever the River Flows Tee', 'Black', 'M', 1800, 2]], 'Can I collect after the 10:30 service?'],
    ['Ben Hughes', 'ben.hughes@example.com', null, 'paid', 1, [[ids.overflow, 'I Am Living in the Overflow Tee', 'White', 'L', 1800, 1]], null],
    ['Chloe Martin', 'chloe.martin@example.com', '07700 900456', 'paid', 2, [[ids.tent, 'Enlarge the Place of Your Tent Hoodie', 'Black', 'M', 3200, 1], [ids.yes, 'You Said Yes', '', 'Paperback', 800, 1]], null],
    ['Daniel Reid', 'daniel.reid@example.com', null, 'pending', 0, [[ids.bible, 'The Life Recovery Bible', '', 'Paperback', 2200, 1]], null],
    ['Esther Mensah', 'esther.mensah@example.com', '07700 900789', 'fulfilled', 6, [[ids.overflow, 'I Am Living in the Overflow Tee', 'White', 'M', 1800, 1], [ids.river, 'Wherever the River Flows Tee', 'White', 'S', 1800, 1]], null],
    ['Femi Adeyemi', 'femi.adeyemi@example.com', null, 'fulfilled', 9, [[ids.yes, 'You Said Yes', '', 'Paperback', 800, 3]], 'For the Alpha team'],
    ['Grace Wilson', 'grace.wilson@example.com', null, 'fulfilled', 14, [[ids.river, 'Wherever the River Flows Tee', 'Black', 'XL', 1800, 1]], null],
    ['Harry Collins', 'harry.collins@example.com', null, 'refunded', 18, [[ids.tent, 'Enlarge the Place of Your Tent Hoodie', 'Black', 'L', 3200, 1]], null],
    ['Isla Thompson', 'isla.thompson@example.com', null, 'cancelled', 21, [[ids.overflow, 'I Am Living in the Overflow Tee', 'White', 'S', 1800, 1]], null],
  ];
  const codes = ['K7PQ3MRA', 'H2VXN8TC', 'W9DLE4QS', 'P3ZRJ6UF', 'M8TGC2XN', 'Q4HWA7KE', 'R6NUS3DV', 'T2YFL9GM', 'V5CKP8HJ'];
  const orders = [];
  const order_items = [];
  people.forEach(([customer_name, customer_email, customer_phone, status, ago, items, notes], i) => {
    const id = crypto.randomUUID();
    const subtotal = items.reduce((n, it) => n + it[4] * it[5], 0);
    const at = daysAgo(ago, 9 + (i % 8));
    orders.push({ id, order_number: `DT-${codes[i]}`, customer_name, customer_email, customer_phone, notes, status, fulfillment_method: 'collection', subtotal_pennies: subtotal, total_pennies: subtotal, currency: 'gbp', paid_at: status === 'pending' ? null : at, created_at: at });
    items.forEach(([product_id, product_name, color, size, unit_price_pennies, quantity]) => order_items.push({ order_id: id, product_id, variant_id: null, product_name, color: color || null, size, unit_price_pennies, quantity, created_at: at }));
  });

  const shop_hero_slides = [
    { active: true, heading: 'Living in the Overflow', subheading: 'Our vision statement for 2025, take it wherever you go.', cta_text: 'Shop the drop', cta_link: '/shop/overflow-tee', ...heroImg(base, 'hero-overflow.webp'), sort_order: 0, created_at: daysAgo(60) },
  ];
  // The tutorial isn't about the onboarding tour, so it has been seen and the checklist hidden.
  const admin_onboarding = [{ auth_user_id: 'u-admin', completed_steps: [], gate_seen: true, dismissed: true }];
  return { products, product_variants, orders, order_items, shop_hero_slides, admin_onboarding };
};

function heroImg(base, file) {
  const p = `slides/${file}`;
  files.push({ bucket: 'shop-hero-images', path: p, file: photo(file) });
  return { image_url: `${base}/storage/v1/object/public/shop-hero-images/${p}`, image_path: p };
}

Object.defineProperty(module.exports, 'files', { get: () => files });
