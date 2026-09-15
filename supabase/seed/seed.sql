-- =====================================================================
-- LuxuryLoop — Seed Data
-- Run AFTER the migration: 0001_init.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- BRANCHES
-- ---------------------------------------------------------------------
insert into public.branches (id, name, address, city, phone, email) values
  ('b0000000-0000-0000-0000-000000000001', 'Beirut Main',   'Hamra St, Beirut',       'Beirut',  '+961-1-123456', 'beirut@luxuryloop.com'),
  ('b0000000-0000-0000-0000-000000000002', 'Jounieh Branch', 'Kfarhabida, Jounieh',    'Jounieh', '+961-9-654321', 'jounieh@luxuryloop.com'),
  ('b0000000-0000-0000-0000-000000000003', 'Tripoli Branch',  'Tripoli Souk, Tripoli',  'Tripoli', '+961-6-111222', 'tripoli@luxuryloop.com');

-- ---------------------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------------------
insert into public.categories (id, name, description) values
  ('c0000000-0000-0000-0000-000000000001', 'Watches',   'Luxury timepieces'),
  ('c0000000-0000-0000-0000-000000000002', 'Handbags',  'Designer handbags and purses'),
  ('c0000000-0000-0000-0000-000000000003', 'Jewelry',   'Fine jewelry and accessories'),
  ('c0000000-0000-0000-0000-000000000004', 'Shoes',     'Designer footwear'),
  ('c0000000-0000-0000-0000-000000000005', 'Sunglasses','Designer eyewear'),
  ('c0000000-0000-0000-0000-000000000006', 'Accessories','Belts, scarves, small leather goods');

-- ---------------------------------------------------------------------
-- BRANDS
-- ---------------------------------------------------------------------
insert into public.brands (id, name, description) values
  ('d0000000-0000-0000-0000-000000000001', 'Rolex',          'Swiss luxury watches'),
  ('d0000000-0000-0000-0000-000000000002', 'Chanel',         'French luxury fashion house'),
  ('d0000000-0000-0000-0000-000000000003', 'Louis Vuitton',  'French luxury brand'),
  ('d0000000-0000-0000-0000-000000000004', 'Gucci',          'Italian luxury fashion'),
  ('d0000000-0000-0000-0000-000000000005', 'Hermès',         'French luxury goods'),
  ('d0000000-0000-0000-0000-000000000006', 'Cartier',        'French luxury jewelry and watches'),
  ('d0000000-0000-0000-0000-000000000007', 'Prada',          'Italian luxury fashion'),
  ('d0000000-0000-0000-0000-000000000008', 'Dior',           'French luxury fashion house'),
  ('d0000000-0000-0000-0000-000000000009', 'Burberry',       'British luxury fashion'),
  ('d0000000-0000-0000-0000-000000000010', 'Tiffany & Co.',  'American luxury jewelry');

-- ---------------------------------------------------------------------
-- SAMPLE ITEMS (store-owned demo stock)
-- ---------------------------------------------------------------------
insert into public.items (id, item_code, category_id, brand_id, branch_id, title, model, description, condition, ownership_type, cost, selling_price, discount, status) values
  ('a0000000-0000-0000-0000-000000000001', 'LL-001', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Rolex Submariner Date',        '126610LN', 'Black dial, Oystersteel, 41mm. Complete box and papers.', 'Excellent', 'store_owned', 8500.00,  12900.00, 0, 'available'),
  ('a0000000-0000-0000-0000-000000000002', 'LL-002', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Hermès Birkin 30',             'Togo Leather', 'Gold hardware, noir black, with dust bag and receipt.', 'Excellent', 'store_owned', 9200.00, 14500.00, 0, 'available'),
  ('a0000000-0000-0000-0000-000000000003', 'LL-003', 'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'Cartier Love Bracelet',        '18K Rose Gold', 'Size 17, classic model with screwdriver.', 'Good', 'store_owned', 4800.00,  6900.00, 0, 'available'),
  ('a0000000-0000-0000-0000-000000000004', 'LL-004', 'c0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'Gucci Ace Sneakers',           'White/Green',  'Size 42, embroidered bee, new with box.', 'New', 'store_owned', 420.00,    680.00,  0, 'available'),
  ('a0000000-0000-0000-0000-000000000005', 'LL-005', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'Louis Vuitton Neverfull MM',   'Monogram',    'Classic monogram, pink interior, with receipt.', 'Good', 'store_owned', 1100.00,  1850.00, 0, 'available'),
  ('a0000000-0000-0000-0000-000000000006', 'LL-006', 'c0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Chanel Classic Sunglasses',    'Black',        'Gradient lenses, with case and authenticity card.', 'Excellent', 'store_owned', 380.00,   590.00,  0, 'available'),
  ('a0000000-0000-0000-0000-000000000007', 'LL-007', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'Rolex Daytona',                '116500LN',    'Ceramic bezel, white dial, Oysterflex bracelet.', 'Excellent', 'store_owned', 18000.00, 27500.00, 0, 'available'),
  ('a0000000-0000-0000-0000-000000000008', 'LL-008', 'c0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Louis Vuitton Belt',           'Monogram Eclipse', 'Size 90, reversible buckle.', 'Good', 'store_owned', 350.00, 590.00, 0, 'available'),
  ('a0000000-0000-0000-0000-000000000009', 'LL-009', 'c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000003', 'Tiffany T Wire Bracelet',      'Sterling Silver', 'Medium gauge, size medium.', 'New', 'store_owned', 320.00, 495.00, 0, 'available'),
  ('a0000000-0000-0000-0000-000000000010', 'LL-010', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001', 'Dior Book Tote',              'Toile de Jouy', 'Medium size, blue jungle motif.', 'Excellent', 'store_owned', 1600.00, 2400.00, 0, 'available');

-- ---------------------------------------------------------------------
-- ITEM IMAGES (placeholder URLs — replace with Supabase Storage paths)
-- ---------------------------------------------------------------------
insert into public.item_images (item_id, file_url, sort_order) values
  ('a0000000-0000-0000-0000-000000000001', '/images/placeholder-watch.jpg', 0),
  ('a0000000-0000-0000-0000-000000000002', '/images/placeholder-bag.jpg', 0),
  ('a0000000-0000-0000-0000-000000000003', '/images/placeholder-bracelet.jpg', 0),
  ('a0000000-0000-0000-0000-000000000004', '/images/placeholder-shoes.jpg', 0),
  ('a0000000-0000-0000-0000-000000000005', '/images/placeholder-tote.jpg', 0),
  ('a0000000-0000-0000-0000-000000000006', '/images/placeholder-sunglasses.jpg', 0),
  ('a0000000-0000-0000-0000-000000000007', '/images/placeholder-daytona.jpg', 0),
  ('a0000000-0000-0000-0000-000000000008', '/images/placeholder-belt.jpg', 0),
  ('a0000000-0000-0000-0000-000000000009', '/images/placeholder-wire.jpg', 0),
  ('a0000000-0000-0000-0000-000000000010', '/images/placeholder-booktote.jpg', 0);
