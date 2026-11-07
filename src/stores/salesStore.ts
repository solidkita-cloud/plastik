import { create } from 'zustand';
import { SalesOrder, OrderItemRecord, CartItem } from '../types';

interface SalesState {
  orders: SalesOrder[];
  addOrder: (order: SalesOrder) => void;
  recordCheckoutOrder: (params: {
    items: CartItem[];
    customerName: string;
    customerPhone: string;
    customerId?: string;
    deliveryMethod: string;
    source: 'whatsapp_checkout' | 'pos_thermal' | 'qr_reorder';
  }) => SalesOrder;
  deleteOrder: (id: string) => void;
  clearAllOrders: () => void;
  resetToDemoOrders: () => void;
}

const STORAGE_KEY = 'plastipro_sales_orders_v1';

// Generator data order realistis relatif terhadap waktu sekarang
function generateInitialDemoOrders(): SalesOrder[] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;

  return [
    // 1. Hari Ini (2 jam lalu) - Warung Geprek Bu Siti
    {
      id: 'ord_demo_1',
      order_number: 'TP-2026-1081',
      created_at: new Date(now - 2 * hourMs).toISOString(),
      customer_name: 'Warung Geprek Barokah Bu Siti',
      customer_phone: '0812-3456-7890',
      customer_id: 'cust_warung_barokah',
      delivery_method: 'Kurir Instan Toko',
      items: [
        {
          product_id: 'prod_box_750',
          product_name: 'Box Thinwall 750 ml Bulat (Bowl)',
          category_id: 'cat_thinwall',
          variant_id: 'var_box750_std',
          variant_name: '750 ml Bowl',
          unit_code: 'DUS',
          unit_name: 'Dus (Isi 500 pcs)',
          qty: 2,
          sell_price: 450000,
          cogs_price: 330000,
          subtotal: 900000,
          profit: 240000
        },
        {
          product_id: 'prod_kresek_hdpe',
          product_name: 'Kantong Kresek Bening HDPE',
          category_id: 'cat_kresek',
          variant_id: 'var_kresek_24',
          variant_name: 'Ukuran 24 (Sedang)',
          unit_code: 'IKAT',
          unit_name: 'Ikat (Isi 5 Pak)',
          qty: 4,
          sell_price: 42000,
          cogs_price: 30000,
          subtotal: 168000,
          profit: 48000
        }
      ],
      total_qty: 6,
      total_omzet: 1068000,
      total_cogs: 780000,
      total_profit: 288000,
      profit_margin_pct: 27.0,
      status: 'completed',
      source: 'qr_reorder'
    },

    // 2. Hari Ini (4 jam lalu) - Kopi Janji Manis
    {
      id: 'ord_demo_2',
      order_number: 'TP-2026-1082',
      created_at: new Date(now - 4 * hourMs).toISOString(),
      customer_name: 'Kopi Janji Manis (Sedati)',
      customer_phone: '0857-9876-5432',
      customer_id: 'cust_kopi_janji',
      delivery_method: 'Ambil di Gudang Fisik',
      items: [
        {
          product_id: 'prod_cup_16',
          product_name: 'Cup Plastik 16 oz (Transparan)',
          category_id: 'cat_cup',
          variant_id: 'var_cup16_std',
          variant_name: '16 oz (500 ml) - Datar',
          unit_code: 'DUS',
          unit_name: 'Dus (Isi 1.000 pcs)',
          qty: 3,
          sell_price: 620000,
          cogs_price: 450000,
          subtotal: 1860000,
          profit: 510000
        },
        {
          product_id: 'prod_seal_film',
          product_name: 'Sealing Film Cup Sealer Roll',
          category_id: 'cat_sealer',
          variant_id: 'var_seal_std',
          variant_name: 'Motif Kartun Teh & Kopi',
          unit_code: 'ROLL',
          unit_name: 'Roll (1.200 Cup)',
          qty: 2,
          sell_price: 85000,
          cogs_price: 58000,
          subtotal: 170000,
          profit: 54000
        }
      ],
      total_qty: 5,
      total_omzet: 2030000,
      total_cogs: 1466000,
      total_profit: 564000,
      profit_margin_pct: 27.8,
      status: 'completed',
      source: 'whatsapp_checkout'
    },

    // 3. Kemarin (1 hari lalu) - Bento Box Sedati
    {
      id: 'ord_demo_3',
      order_number: 'TP-2026-1079',
      created_at: new Date(now - 1 * dayMs).toISOString(),
      customer_name: 'Bento Express & Catering Sedati',
      customer_phone: '0813-2233-4455',
      customer_id: 'cust_bento_express',
      delivery_method: 'Kurir Instan Toko',
      items: [
        {
          product_id: 'prod_mika_bento',
          product_name: 'Mika Bento 4 Sekat + Tutup Bening',
          category_id: 'cat_bento',
          variant_id: 'var_bento_4sekat',
          variant_name: '4 Sekat Standar',
          unit_code: 'DUS',
          unit_name: 'Dus (Isi 400 pcs)',
          qty: 2,
          sell_price: 520000,
          cogs_price: 375000,
          subtotal: 1040000,
          profit: 290000
        },
        {
          product_id: 'prod_paper_lunch',
          product_name: 'Paper Lunch Box M (Laminasi)',
          category_id: 'cat_paper',
          variant_id: 'var_paper_m',
          variant_name: 'Ukuran M (16x9x5 cm)',
          unit_code: 'DUS',
          unit_name: 'Dus (Isi 600 pcs)',
          qty: 1,
          sell_price: 490000,
          cogs_price: 360000,
          subtotal: 490000,
          profit: 130000
        }
      ],
      total_qty: 3,
      total_omzet: 1530000,
      total_cogs: 1110000,
      total_profit: 420000,
      profit_margin_pct: 27.5,
      status: 'completed',
      source: 'pos_thermal'
    },

    // 4. 2 Hari Lalu - Resto Sambal Bakar Juanda
    {
      id: 'ord_demo_4',
      order_number: 'TP-2026-1075',
      created_at: new Date(now - 2 * dayMs).toISOString(),
      customer_name: 'Resto Sambal Bakar Juanda',
      customer_phone: '0878-5544-3322',
      customer_id: 'cust_sambal_juanda',
      delivery_method: 'Kargo / Ekspedisi Truk',
      items: [
        {
          product_id: 'prod_box_750',
          product_name: 'Box Thinwall 750 ml Bulat (Bowl)',
          category_id: 'cat_thinwall',
          variant_id: 'var_box750_std',
          variant_name: '750 ml Bowl',
          unit_code: 'DUS',
          unit_name: 'Dus (Isi 500 pcs)',
          qty: 4,
          sell_price: 450000,
          cogs_price: 330000,
          subtotal: 1800000,
          profit: 480000
        },
        {
          product_id: 'prod_cup_16',
          product_name: 'Cup Plastik 16 oz (Transparan)',
          category_id: 'cat_cup',
          variant_id: 'var_cup16_std',
          variant_name: '16 oz (500 ml) - Datar',
          unit_code: 'DUS',
          unit_name: 'Dus (Isi 1.000 pcs)',
          qty: 2,
          sell_price: 620000,
          cogs_price: 450000,
          subtotal: 1240000,
          profit: 340000
        }
      ],
      total_qty: 6,
      total_omzet: 3040000,
      total_cogs: 2220000,
      total_profit: 820000,
      profit_margin_pct: 27.0,
      status: 'completed',
      source: 'whatsapp_checkout'
    },

    // 5. 3 Hari Lalu - Warung Geprek Bu Siti (Repeat Order)
    {
      id: 'ord_demo_5',
      order_number: 'TP-2026-1071',
      created_at: new Date(now - 3 * dayMs).toISOString(),
      customer_name: 'Warung Geprek Barokah Bu Siti',
      customer_phone: '0812-3456-7890',
      customer_id: 'cust_warung_barokah',
      delivery_method: 'Kurir Instan Toko',
      items: [
        {
          product_id: 'prod_box_750',
          product_name: 'Box Thinwall 750 ml Bulat (Bowl)',
          category_id: 'cat_thinwall',
          variant_id: 'var_box750_std',
          variant_name: '750 ml Bowl',
          unit_code: 'DUS',
          unit_name: 'Dus (Isi 500 pcs)',
          qty: 2,
          sell_price: 450000,
          cogs_price: 330000,
          subtotal: 900000,
          profit: 240000
        }
      ],
      total_qty: 2,
      total_omzet: 900000,
      total_cogs: 660000,
      total_profit: 240000,
      profit_margin_pct: 26.7,
      status: 'completed',
      source: 'qr_reorder'
    },

    // 6. 5 Hari Lalu - Toko Snack Renyah (Standing Pouch)
    {
      id: 'ord_demo_6',
      order_number: 'TP-2026-1065',
      created_at: new Date(now - 5 * dayMs).toISOString(),
      customer_name: 'Toko Snack Renyah & Keripik',
      customer_phone: '0819-8765-4321',
      customer_id: 'cust_snack_renyah',
      delivery_method: 'Ambil di Gudang Fisik',
      items: [
        {
          product_id: 'prod_pouch_zipper',
          product_name: 'Standing Pouch Bening Zipper Lock',
          category_id: 'cat_pouch',
          variant_id: 'var_pouch_500g',
          variant_name: 'Ukuran 16x24 cm (500g)',
          unit_code: 'DUS',
          unit_name: 'Dus (Isi 500 pcs)',
          qty: 3,
          sell_price: 380000,
          cogs_price: 265000,
          subtotal: 1140000,
          profit: 345000
        },
        {
          product_id: 'prod_bubble_wrap',
          product_name: 'Bubble Wrap Hitam Premium Roll Tebal',
          category_id: 'cat_bubble',
          variant_id: 'var_bubble_roll',
          variant_name: 'Roll 1.25m x 50m',
          unit_code: 'ROLL',
          unit_name: 'Roll 50m',
          qty: 2,
          sell_price: 135000,
          cogs_price: 98000,
          subtotal: 270000,
          profit: 74000
        }
      ],
      total_qty: 5,
      total_omzet: 1410000,
      total_cogs: 991000,
      total_profit: 419000,
      profit_margin_pct: 29.7,
      status: 'completed',
      source: 'pos_thermal'
    },

    // 7. 6 Hari Lalu - Kopi Janji Manis (Repeat)
    {
      id: 'ord_demo_7',
      order_number: 'TP-2026-1060',
      created_at: new Date(now - 6 * dayMs).toISOString(),
      customer_name: 'Kopi Janji Manis (Sedati)',
      customer_phone: '0857-9876-5432',
      customer_id: 'cust_kopi_janji',
      delivery_method: 'Kurir Instan Toko',
      items: [
        {
          product_id: 'prod_cup_16',
          product_name: 'Cup Plastik 16 oz (Transparan)',
          category_id: 'cat_cup',
          variant_id: 'var_cup16_std',
          variant_name: '16 oz (500 ml) - Datar',
          unit_code: 'DUS',
          unit_name: 'Dus (Isi 1.000 pcs)',
          qty: 3,
          sell_price: 620000,
          cogs_price: 450000,
          subtotal: 1860000,
          profit: 510000
        }
      ],
      total_qty: 3,
      total_omzet: 1860000,
      total_cogs: 1350000,
      total_profit: 510000,
      profit_margin_pct: 27.4,
      status: 'completed',
      source: 'qr_reorder'
    },

    // 8. 12 Hari Lalu (Bulan Ini) - Katering Ibu Hj. Maryam
    {
      id: 'ord_demo_8',
      order_number: 'TP-2026-1045',
      created_at: new Date(now - 12 * dayMs).toISOString(),
      customer_name: 'Katering Ibu Hj. Maryam',
      customer_phone: '0812-7788-9900',
      customer_id: 'cust_katering_maryam',
      delivery_method: 'Kargo / Ekspedisi Truk',
      items: [
        {
          product_id: 'prod_paper_lunch',
          product_name: 'Paper Lunch Box M (Laminasi)',
          category_id: 'cat_paper',
          variant_id: 'var_paper_m',
          variant_name: 'Ukuran M (16x9x5 cm)',
          unit_code: 'DUS',
          unit_name: 'Dus (Isi 600 pcs)',
          qty: 5,
          sell_price: 490000,
          cogs_price: 360000,
          subtotal: 2450000,
          profit: 650000
        },
        {
          product_id: 'prod_mika_bento',
          product_name: 'Mika Bento 4 Sekat + Tutup Bening',
          category_id: 'cat_bento',
          variant_id: 'var_bento_4sekat',
          variant_name: '4 Sekat Standar',
          unit_code: 'DUS',
          unit_name: 'Dus (Isi 400 pcs)',
          qty: 3,
          sell_price: 520000,
          cogs_price: 375000,
          subtotal: 1560000,
          profit: 435000
        }
      ],
      total_qty: 8,
      total_omzet: 4010000,
      total_cogs: 2925000,
      total_profit: 1085000,
      profit_margin_pct: 27.1,
      status: 'completed',
      source: 'whatsapp_checkout'
    },

    // 9. 18 Hari Lalu (Bulan Ini) - Warung Geprek Bu Siti
    {
      id: 'ord_demo_9',
      order_number: 'TP-2026-1030',
      created_at: new Date(now - 18 * dayMs).toISOString(),
      customer_name: 'Warung Geprek Barokah Bu Siti',
      customer_phone: '0812-3456-7890',
      customer_id: 'cust_warung_barokah',
      delivery_method: 'Kurir Instan Toko',
      items: [
        {
          product_id: 'prod_box_750',
          product_name: 'Box Thinwall 750 ml Bulat (Bowl)',
          category_id: 'cat_thinwall',
          variant_id: 'var_box750_std',
          variant_name: '750 ml Bowl',
          unit_code: 'DUS',
          unit_name: 'Dus (Isi 500 pcs)',
          qty: 3,
          sell_price: 450000,
          cogs_price: 330000,
          subtotal: 1350000,
          profit: 360000
        },
        {
          product_id: 'prod_kresek_hdpe',
          product_name: 'Kantong Kresek Bening HDPE',
          category_id: 'cat_kresek',
          variant_id: 'var_kresek_24',
          variant_name: 'Ukuran 24 (Sedang)',
          unit_code: 'IKAT',
          unit_name: 'Ikat (Isi 5 Pak)',
          qty: 5,
          sell_price: 42000,
          cogs_price: 30000,
          subtotal: 210000,
          profit: 60000
        }
      ],
      total_qty: 8,
      total_omzet: 1560000,
      total_cogs: 1140000,
      total_profit: 420000,
      profit_margin_pct: 26.9,
      status: 'completed',
      source: 'qr_reorder'
    },

    // 10. 25 Hari Lalu (Bulan Ini) - Resto Sambal Bakar Juanda
    {
      id: 'ord_demo_10',
      order_number: 'TP-2026-1015',
      created_at: new Date(now - 25 * dayMs).toISOString(),
      customer_name: 'Resto Sambal Bakar Juanda',
      customer_phone: '0878-5544-3322',
      customer_id: 'cust_sambal_juanda',
      delivery_method: 'Kargo / Ekspedisi Truk',
      items: [
        {
          product_id: 'prod_box_750',
          product_name: 'Box Thinwall 750 ml Bulat (Bowl)',
          category_id: 'cat_thinwall',
          variant_id: 'var_box750_std',
          variant_name: '750 ml Bowl',
          unit_code: 'DUS',
          unit_name: 'Dus (Isi 500 pcs)',
          qty: 5,
          sell_price: 450000,
          cogs_price: 330000,
          subtotal: 2250000,
          profit: 600000
        },
        {
          product_id: 'prod_cup_16',
          product_name: 'Cup Plastik 16 oz (Transparan)',
          category_id: 'cat_cup',
          variant_id: 'var_cup16_std',
          variant_name: '16 oz (500 ml) - Datar',
          unit_code: 'DUS',
          unit_name: 'Dus (Isi 1.000 pcs)',
          qty: 3,
          sell_price: 620000,
          cogs_price: 450000,
          subtotal: 1860000,
          profit: 510000
        }
      ],
      total_qty: 8,
      total_omzet: 4110000,
      total_cogs: 3000000,
      total_profit: 1110000,
      profit_margin_pct: 27.0,
      status: 'completed',
      source: 'whatsapp_checkout'
    }
  ];
}

function loadInitialOrders(): SalesOrder[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Gagal membaca data pesanan dari localStorage:', err);
  }
  return generateInitialDemoOrders();
}

function saveOrders(orders: SalesOrder[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (err) {
    console.warn('Gagal menyimpan data pesanan ke localStorage:', err);
  }
}

export const useSalesStore = create<SalesState>((set, get) => {
  const initial = loadInitialOrders();

  return {
    orders: initial,

    addOrder: (order) => {
      set((state) => {
        const updated = [order, ...state.orders];
        saveOrders(updated);
        return { orders: updated };
      });
    },

    recordCheckoutOrder: ({ items, customerName, customerPhone, customerId, deliveryMethod, source }) => {
      const orderItems: OrderItemRecord[] = items.map((item) => {
        const cogs = item.cogs_price ?? Math.round(item.price * 0.72);
        const subtotal = item.price * item.qty;
        const profit = (item.price - cogs) * item.qty;
        return {
          product_id: item.product_id,
          product_name: item.product_name,
          category_id: 'cat_all',
          variant_id: item.variant_id,
          variant_name: item.variant_name,
          unit_code: item.unit_code,
          unit_name: item.unit_name,
          qty: item.qty,
          sell_price: item.price,
          cogs_price: cogs,
          subtotal,
          profit
        };
      });

      const totalOmzet = orderItems.reduce((acc, it) => acc + it.subtotal, 0);
      const totalCogs = orderItems.reduce((acc, it) => acc + (it.cogs_price * it.qty), 0);
      const totalProfit = totalOmzet - totalCogs;
      const profitMarginPct = totalOmzet > 0 ? Number(((totalProfit / totalOmzet) * 100).toFixed(1)) : 0;
      const totalQty = orderItems.reduce((acc, it) => acc + it.qty, 0);

      const newOrder: SalesOrder = {
        id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        order_number: `TP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        created_at: new Date().toISOString(),
        customer_name: customerName.trim() || 'Pelanggan Umum',
        customer_phone: customerPhone.trim() || '-',
        customer_id: customerId,
        delivery_method: deliveryMethod,
        items: orderItems,
        total_qty: totalQty,
        total_omzet: totalOmzet,
        total_cogs: totalCogs,
        total_profit: totalProfit,
        profit_margin_pct: profitMarginPct,
        status: 'completed',
        source
      };

      get().addOrder(newOrder);
      return newOrder;
    },

    deleteOrder: (id) => {
      set((state) => {
        const updated = state.orders.filter((o) => o.id !== id);
        saveOrders(updated);
        return { orders: updated };
      });
    },

    clearAllOrders: () => {
      saveOrders([]);
      set({ orders: [] });
    },

    resetToDemoOrders: () => {
      const demo = generateInitialDemoOrders();
      saveOrders(demo);
      set({ orders: demo });
    }
  };
});
