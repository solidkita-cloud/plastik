import { Category, Product, CustomerProfile } from '../types';

export const STORE_INFO = {
  name: 'PlastiPro',
  tagline: 'Plastik & Kemasan Berkualitas',
  phone: '6281234567890',
  phoneDisplay: '0812-3456-7890',
  address: 'Jl. Raya Industri Kemasan No. 88, Sidoarjo - Jawa Timur',
  operationalHours: 'Senin - Sabtu: 07.30 - 17.00 WIB (Minggu Libur)',
  instagram: '@plastipro.id',
  email: 'halo@plastipro.co.id'
};

export const CATEGORIES: Category[] = [
  { id: 'cat_all', name: 'Semua Kategori', slug: 'all', icon_name: 'Grid', sort_order: 1 },
  { id: 'cat_cup', name: 'Cup Minuman', slug: 'cup', icon_name: 'Coffee', sort_order: 2 },
  { id: 'cat_thinwall', name: 'Kotak Makanan & Thinwall', slug: 'thinwall', icon_name: 'Box', sort_order: 3 },
  { id: 'cat_kresek', name: 'Kantong Plastik & Kresek', slug: 'kresek', icon_name: 'ShoppingBag', sort_order: 4 },
  { id: 'cat_sealer', name: 'Sealer Film & Roll', slug: 'sealer', icon_name: 'Layers', sort_order: 5 },
  { id: 'cat_eco', name: 'Kemasan Ramah Lingkungan', slug: 'eco', icon_name: 'Leaf', sort_order: 6 },
  { id: 'cat_paper', name: 'Paper & Dus Snack', slug: 'paper', icon_name: 'FileText', sort_order: 7 },
  { id: 'cat_mika', name: 'Mika Kue & Bento', slug: 'mika', icon_name: 'Grid', sort_order: 8 },
  { id: 'cat_packing', name: 'Wrapping & Packing', slug: 'packing', icon_name: 'Package', sort_order: 9 }
];

export const PRODUCT_IMAGES = {
  cup16: '/products/cup-16oz.jpg',
  box750: '/products/box-750ml.jpg',
  kresek30: '/products/kresek-hdpe.jpg',
  sealFilm: '/products/seal-film.jpg',
  thinwallRect: '/products/thinwall-rect.jpg',
  standingPouch: '/products/standing-pouch.jpg',
  paperBox: '/products/paper-box.jpg',
  mikaBento: '/products/mika-bento.jpg',
  bubbleWrap: '/products/bubble-wrap.jpg',
  heroGroup: '/products/hero-packaging-group.jpg',
  ecoBag: '/products/eco-bag.jpg'
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_cup_16',
    name: 'Cup Plastik 16 oz (Transparan)',
    category_id: 'cat_cup',
    material: 'PP',
    food_grade: true,
    microwave_safe: false,
    freezer_safe: true,
    description: 'Cup plastik PP bening tebal 16 oz, cocok untuk usaha es teh jumbo, kopi susu, boba, dan aneka minuman dingin kekinian. Tahan sealer mesin roll press.',
    image_url: PRODUCT_IMAGES.cup16,
    tags: ['Best Seller', 'Bisa Sealer', 'Minuman', 'Grosir'],
    is_featured: true,
    badge: 'Best Seller',
    variants: [
      {
        id: 'var_cup16_std',
        product_id: 'prod_cup_16',
        name: '16 oz (500 ml) - Datar',
        sku: 'CUP-16-PP-FLAT',
        dimension_detail: 'Diameter 9.2 cm x Tinggi 12 cm',
        thickness_micron: 7,
        color: 'Bening Transparan',
        stock_status: 'ready',
        base_pcs_weight_grams: 8,
        units: [
          {
            id: 'u_cup16_pcs',
            variant_id: 'var_cup16_std',
            unit_code: 'PCS',
            unit_name: 'Pcs (Ecer)',
            base_multiplier: 1,
            price: 1800,
            min_order_qty: 1,
            step_qty: 1,
            is_default: false
          },
          {
            id: 'u_cup16_pak',
            variant_id: 'var_cup16_std',
            unit_code: 'PAK',
            unit_name: 'Pack (Isi 50 pcs)',
            base_multiplier: 50,
            price: 65000,
            wholesale_price: 60000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: true,
            badge_label: 'Paling Laris'
          },
          {
            id: 'u_cup16_dus',
            variant_id: 'var_cup16_std',
            unit_code: 'DUS',
            unit_name: 'Dus / Karton (Isi 2.000 pcs / 40 Pack)',
            base_multiplier: 2000,
            price: 2150000,
            wholesale_price: 2100000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: false,
            badge_label: 'Hemat Rp 450.000!'
          }
        ]
      },
      {
        id: 'var_cup16_oval',
        product_id: 'prod_cup_16',
        name: '16 oz (500 ml) - Oval U-Cup',
        sku: 'CUP-16-PP-OVAL',
        dimension_detail: 'Diameter 9.2 cm (Bawah Melengkung)',
        thickness_micron: 8,
        color: 'Bening Kristal',
        stock_status: 'ready',
        base_pcs_weight_grams: 9,
        units: [
          {
            id: 'u_cup16_ov_pak',
            variant_id: 'var_cup16_oval',
            unit_code: 'PAK',
            unit_name: 'Pack (Isi 50 pcs)',
            base_multiplier: 50,
            price: 72000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: true,
            badge_label: 'Kekinian'
          },
          {
            id: 'u_cup16_ov_dus',
            variant_id: 'var_cup16_oval',
            unit_code: 'DUS',
            unit_name: 'Dus / Karton (Isi 1.000 pcs / 20 Pack)',
            base_multiplier: 1000,
            price: 1300000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: false,
            badge_label: 'Grosir Cafe'
          }
        ]
      }
    ]
  },
  {
    id: 'prod_thinwall_rect',
    name: 'Thinwall Persegi Panjang (PP Food Grade)',
    category_id: 'cat_thinwall',
    material: 'PP',
    food_grade: true,
    microwave_safe: true,
    freezer_safe: true,
    description: 'Kotak makan plastik PP bening tebal transparan. Microwave safe hingga 100°C, freezer safe, tutup rapat klip anti tumpah. Standar katering, resto, dan rice bowl.',
    image_url: PRODUCT_IMAGES.thinwallRect,
    tags: ['Best Seller', 'Microwave Safe', 'Anti Tumpah', 'Grosir', 'Thinwall'],
    is_featured: true,
    badge: 'Best Seller',
    variants: [
      {
        id: 'var_tw_650',
        product_id: 'prod_thinwall_rect',
        name: '650 ml Persegi Panjang',
        sku: 'TW-650-PP-RECT',
        dimension_detail: '17.5 x 12 x 4.8 cm',
        thickness_micron: 18,
        color: 'Bening Transparan Higienis',
        stock_status: 'ready',
        base_pcs_weight_grams: 18,
        units: [
          {
            id: 'u_tw650_pcs',
            variant_id: 'var_tw_650',
            unit_code: 'PCS',
            unit_name: 'Pcs (Ecer)',
            base_multiplier: 1,
            price: 2000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: false
          },
          {
            id: 'u_tw650_pak',
            variant_id: 'var_tw_650',
            unit_code: 'PAK',
            unit_name: 'Pack (Isi 25 pcs + Tutup)',
            base_multiplier: 25,
            price: 42500,
            wholesale_price: 40000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: true,
            badge_label: 'Best Seller'
          },
          {
            id: 'u_tw650_dus',
            variant_id: 'var_tw_650',
            unit_code: 'DUS',
            unit_name: 'Dus / Karton (Isi 500 pcs / 20 Pack)',
            base_multiplier: 500,
            price: 780000,
            wholesale_price: 750000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: false,
            badge_label: 'Hemat Rp 220.000!'
          }
        ]
      },
      {
        id: 'var_tw_1000',
        product_id: 'prod_thinwall_rect',
        name: '1000 ml Persegi Panjang',
        sku: 'TW-1000-PP-RECT',
        dimension_detail: '17.5 x 12 x 7 cm',
        thickness_micron: 20,
        color: 'Bening Transparan Higienis',
        stock_status: 'ready',
        base_pcs_weight_grams: 24,
        units: [
          {
            id: 'u_tw1000_pak',
            variant_id: 'var_tw_1000',
            unit_code: 'PAK',
            unit_name: 'Pack (Isi 25 pcs + Tutup)',
            base_multiplier: 25,
            price: 52000,
            wholesale_price: 49000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: true
          },
          {
            id: 'u_tw1000_dus',
            variant_id: 'var_tw_1000',
            unit_code: 'DUS',
            unit_name: 'Dus / Karton (Isi 500 pcs / 20 Pack)',
            base_multiplier: 500,
            price: 950000,
            wholesale_price: 920000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: false,
            badge_label: 'Grosir Katering'
          }
        ]
      }
    ]
  },
  {
    id: 'prod_box_750',
    name: 'Box Makanan 750 ml (Biodegradable)',
    category_id: 'cat_eco',
    material: 'Biodegradable',
    food_grade: true,
    microwave_safe: true,
    freezer_safe: true,
    description: 'Kotak makanan higienis ramah lingkungan 750ml. Tahan microwave hingga 120°C, tutup rapat klip anti tumpah. Pilihan utama katering & rice bowl.',
    image_url: PRODUCT_IMAGES.box750,
    tags: ['Eco Friendly', 'Microwave Safe', 'Anti Tumpah', 'Grosir'],
    is_featured: true,
    badge: 'Eco Friendly',
    variants: [
      {
        id: 'var_box_750_std',
        product_id: 'prod_box_750',
        name: '750 ml Persegi Panjang',
        sku: 'BOX-750-BIO-RECT',
        dimension_detail: '17.5 x 12 x 5.5 cm',
        thickness_micron: 15,
        color: 'Semi Transparan Higienis',
        stock_status: 'ready',
        base_pcs_weight_grams: 22,
        units: [
          {
            id: 'u_box750_pcs',
            variant_id: 'var_box_750_std',
            unit_code: 'PCS',
            unit_name: 'Pcs (Ecer)',
            base_multiplier: 1,
            price: 2500,
            min_order_qty: 1,
            step_qty: 1,
            is_default: false
          },
          {
            id: 'u_box750_pak',
            variant_id: 'var_box_750_std',
            unit_code: 'PAK',
            unit_name: 'Pack (Isi 50 pcs + Tutup)',
            base_multiplier: 50,
            price: 95000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: true,
            badge_label: 'Best Seller'
          },
          {
            id: 'u_box750_dus',
            variant_id: 'var_box_750_std',
            unit_code: 'DUS',
            unit_name: 'Dus / Karton (Isi 500 pcs / 10 Pack)',
            base_multiplier: 500,
            price: 850000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: false,
            badge_label: 'Hemat Rp 100.000!'
          }
        ]
      },
      {
        id: 'var_box_650_std',
        product_id: 'prod_box_750',
        name: '650 ml Persegi Panjang',
        sku: 'BOX-650-BIO-RECT',
        dimension_detail: '17.5 x 12 x 4.8 cm',
        thickness_micron: 15,
        color: 'Semi Transparan Higienis',
        stock_status: 'ready',
        base_pcs_weight_grams: 20,
        units: [
          {
            id: 'u_box650_pak',
            variant_id: 'var_box_650_std',
            unit_code: 'PAK',
            unit_name: 'Pack (Isi 50 pcs)',
            base_multiplier: 50,
            price: 88000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: true
          },
          {
            id: 'u_box650_dus',
            variant_id: 'var_box_650_std',
            unit_code: 'DUS',
            unit_name: 'Dus / Karton (Isi 500 pcs)',
            base_multiplier: 500,
            price: 790000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: false,
            badge_label: 'Grosir Resto'
          }
        ]
      }
    ]
  },
  {
    id: 'prod_kresek_30',
    name: 'Plastik HDPE 30x40 (1 kg)',
    category_id: 'cat_kresek',
    material: 'HDPE',
    food_grade: false,
    microwave_safe: false,
    freezer_safe: false,
    description: 'Kantong kresek putih tebal HDPE ukuran 30x40 cm. Kuat menampung beban hingga 6 kg tanpa mudah sobek.',
    image_url: PRODUCT_IMAGES.kresek30,
    tags: ['Promo', 'Kuat', 'Tebal', 'Grosir'],
    is_featured: true,
    badge: 'Promo',
    variants: [
      {
        id: 'var_kresek_30_putih',
        product_id: 'prod_kresek_30',
        name: 'Ukuran 30 x 40 cm (Putih Susu)',
        sku: 'KRS-HD-30-W',
        dimension_detail: 'Lebar 30 cm x Tinggi 40 cm',
        thickness_micron: 25,
        color: 'Putih Susu Halus',
        stock_status: 'ready',
        base_pcs_weight_grams: 12,
        units: [
          {
            id: 'u_kresek30_kg',
            variant_id: 'var_kresek_30_putih',
            unit_code: 'KG',
            unit_name: 'Per 1 Kilogram (± 80 lembar)',
            base_multiplier: 1,
            price: 28000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: true,
            badge_label: 'Harga Ecer Kilogram'
          },
          {
            id: 'u_kresek30_karung',
            variant_id: 'var_kresek_30_putih',
            unit_code: 'IKAT',
            unit_name: 'Karung / Bal (Isi 25 Kg)',
            base_multiplier: 25,
            price: 650000,
            wholesale_price: 625000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: false,
            badge_label: 'Harga Grosir Pabrik'
          }
        ]
      }
    ]
  },
  {
    id: 'prod_seal_film',
    name: 'Cup Seal Film (Top Seal)',
    category_id: 'cat_sealer',
    material: 'PP',
    food_grade: true,
    microwave_safe: false,
    freezer_safe: true,
    description: 'Roll plastik penutup cup minuman otomatis / manual. Hasil seal rekat kuat anti bocor walau digoyang kurir motor.',
    image_url: PRODUCT_IMAGES.sealFilm,
    tags: ['Universal Cup', 'Anti Bocor', '1200 Cup'],
    is_featured: true,
    variants: [
      {
        id: 'var_seal_clear',
        product_id: 'prod_seal_film',
        name: 'Polos Bening Transparan (1.200 Cup)',
        sku: 'SEAL-1200-CLEAR',
        dimension_detail: 'Lebar 13 cm, Panjang Roll ± 150m',
        stock_status: 'ready',
        base_pcs_weight_grams: 800,
        units: [
          {
            id: 'u_seal_roll',
            variant_id: 'var_seal_clear',
            unit_code: 'ROLL',
            unit_name: 'Per 1 Roll (1.200 Cup)',
            base_multiplier: 1,
            price: 120000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: true,
            badge_label: 'Universal'
          },
          {
            id: 'u_seal_dus',
            variant_id: 'var_seal_clear',
            unit_code: 'DUS',
            unit_name: 'Dus / Karton (Isi 12 Roll)',
            base_multiplier: 12,
            price: 1320000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: false,
            badge_label: 'Hemat Rp 120.000'
          }
        ]
      }
    ]
  },
  {
    id: 'prod_paper_lunch',
    name: 'Paper Lunch Box Kraft (Size L)',
    category_id: 'cat_paper',
    material: 'Kraft',
    food_grade: true,
    microwave_safe: true,
    freezer_safe: false,
    description: 'Kotak makan kertas kraft coklat tebal berlapis PE anti minyak dan anti bocor. Siap pakai tanpa lem.',
    image_url: PRODUCT_IMAGES.paperBox,
    tags: ['Paper Box', 'Anti Minyak', 'Eco Friendly'],
    is_featured: false,
    variants: [
      {
        id: 'var_paper_l',
        product_id: 'prod_paper_lunch',
        name: 'Size L (18 x 11 x 5 cm)',
        sku: 'PLB-KRAFT-L',
        dimension_detail: '18 x 11 x 5 cm (Lipat Kait)',
        stock_status: 'ready',
        base_pcs_weight_grams: 28,
        units: [
          {
            id: 'u_paper_pak',
            variant_id: 'var_paper_l',
            unit_code: 'PAK',
            unit_name: 'Pack (Isi 50 pcs)',
            base_multiplier: 50,
            price: 68000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: true,
            badge_label: 'Best Seller Kraft'
          },
          {
            id: 'u_paper_dus',
            variant_id: 'var_paper_l',
            unit_code: 'DUS',
            unit_name: 'Dus (Isi 600 pcs / 12 Pack)',
            base_multiplier: 600,
            price: 750000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: false,
            badge_label: 'Grosir Bal'
          }
        ]
      }
    ]
  },
  {
    id: 'prod_mika_bento',
    name: 'Mika Bento Sekat 4 (Bintang)',
    category_id: 'cat_mika',
    material: 'PET',
    food_grade: true,
    microwave_safe: false,
    freezer_safe: false,
    description: 'Mika plastik sekat 4 bening tebal untuk nasi kuning, tumpeng mini, catering pesta, dan bento anak.',
    image_url: PRODUCT_IMAGES.mikaBento,
    tags: ['Bento Sekat', 'Katering', 'Mika'],
    is_featured: false,
    variants: [
      {
        id: 'var_mika_4',
        product_id: 'prod_mika_bento',
        name: 'Sekat 4 Bintang + Tutup Bening',
        sku: 'MIKA-BENTO-4',
        dimension_detail: '23 x 17 x 4 cm',
        stock_status: 'ready',
        base_pcs_weight_grams: 25,
        units: [
          {
            id: 'u_mika_pak',
            variant_id: 'var_mika_4',
            unit_code: 'PAK',
            unit_name: 'Pack (Isi 50 set + Tutup)',
            base_multiplier: 50,
            price: 75000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: true
          },
          {
            id: 'u_mika_dus',
            variant_id: 'var_mika_4',
            unit_code: 'DUS',
            unit_name: 'Dus (Isi 400 set / 8 Pack)',
            base_multiplier: 400,
            price: 560000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: false,
            badge_label: 'Hemat Rp 40.000'
          }
        ]
      }
    ]
  },
  {
    id: 'prod_bubble_wrap',
    name: 'Bubble Wrap Hitam & Bening (Roll 50m)',
    category_id: 'cat_packing',
    material: 'PE',
    food_grade: false,
    microwave_safe: false,
    freezer_safe: false,
    description: 'Plastik gelembung tebal proteksi pengiriman ekspedisi, anti pecah dan anti benturan.',
    image_url: PRODUCT_IMAGES.bubbleWrap,
    tags: ['Packing', 'Anti Pecah', 'Roll'],
    is_featured: false,
    variants: [
      {
        id: 'var_bw_125',
        product_id: 'prod_bubble_wrap',
        name: 'Roll 1.25 meter x 50 meter (Bening)',
        sku: 'BW-125-50-CLEAR',
        dimension_detail: 'Lebar 1.25m, Panjang 50m',
        stock_status: 'ready',
        base_pcs_weight_grams: 2800,
        units: [
          {
            id: 'u_bw_roll',
            variant_id: 'var_bw_125',
            unit_code: 'ROLL',
            unit_name: 'Per 1 Roll Utuh (50 Meter)',
            base_multiplier: 1,
            price: 135000,
            min_order_qty: 1,
            step_qty: 1,
            is_default: true,
            badge_label: 'Paling Tebal'
          }
        ]
      }
    ]
  }
];

export const DEMO_CUSTOMERS: CustomerProfile[] = [
  {
    id: 'cust_warung_barokah',
    qr_token: 'WARUNG-BAROKAH-2026',
    business_name: 'Warung Geprek Barokah Bu Siti',
    contact_person: 'Bu Siti Rahayu',
    phone_number: '081298765432',
    delivery_address: 'Jl. Ahmad Yani No. 45 (Dekat Lapangan), Sedati, Sidoarjo',
    district_area: 'Sedati, Sidoarjo',
    tier: 'langganan_warung',
    total_orders_count: 14,
    last_order: {
      order_number: 'TP-2026-0891',
      items_summary: '2 Dus Box 750ml, 3 Pack Cup 16oz',
      items: [
        {
          product_id: 'prod_box_750',
          product_name: 'Box Makanan 750 ml (Biodegradable)',
          variant_id: 'var_box_750_std',
          variant_name: '750 ml Persegi Panjang',
          unit_id: 'u_box750_dus',
          unit_name: 'Dus / Karton (Isi 500 pcs)',
          unit_code: 'DUS',
          base_multiplier: 500,
          sku: 'BOX-750-BIO-RECT',
          price: 850000,
          qty: 2,
          weight_grams: 22000
        },
        {
          product_id: 'prod_cup_16',
          product_name: 'Cup Plastik 16 oz (Transparan)',
          variant_id: 'var_cup16_std',
          variant_name: '16 oz (500 ml) - Datar',
          unit_id: 'u_cup16_pak',
          unit_name: 'Pack (Isi 50 pcs)',
          unit_code: 'PAK',
          base_multiplier: 50,
          sku: 'CUP-16-PP-FLAT',
          price: 65000,
          qty: 3,
          weight_grams: 1200
        }
      ]
    }
  }
];
