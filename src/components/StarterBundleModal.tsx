import React from 'react';
import { 
  X, 
  Sparkles, 
  Coffee, 
  UtensilsCrossed, 
  Croissant, 
  CheckCircle2, 
  ShoppingBag,
  ArrowRight
} from 'lucide-react';
import { useCartStore } from '../stores/cartStore';

interface StarterBundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCart: () => void;
  onShowToast: (msg: string) => void;
}

export const StarterBundleModal: React.FC<StarterBundleModalProps> = ({
  isOpen,
  onClose,
  onOpenCart,
  onShowToast
}) => {
  const addItem = useCartStore((state) => state.addItem);

  if (!isOpen) return null;

  const bundles = [
    {
      id: 'bundle_coffee',
      title: 'Paket Kedai Kopi & Es Teh Jumbo',
      category: 'Minuman Kekinian',
      badge: 'Paling Laris',
      badgeColor: 'bg-accent',
      icon: Coffee,
      iconColor: 'text-primary',
      desc: 'Solusi lengkap siap jualan es kopi susu, es teh viral, dan boba.',
      items: [
        '2 Pack Cup Plastik 16 oz Datar (100 pcs)',
        '1 Roll Cup Seal Film Polos (1.200 cup)',
        '1 Pack Sedotan Steril Runcing (100 pcs)',
        '1 Ikat Kantong Kresek Bening T (100 lembar)'
      ],
      normalPrice: 225000,
      bundlePrice: 198000,
      savings: 27000,
      cartPayload: [
        {
          product_id: 'prod_cup_16',
          product_name: 'Cup Plastik 16 oz (Transparan)',
          variant_id: 'var_cup16_std',
          variant_name: '16 oz (500 ml) - Datar',
          unit_id: 'u_cup16_pak',
          unit_name: 'Pack (Isi 50 pcs) [Paket Kopi]',
          unit_code: 'PAK',
          base_multiplier: 50,
          sku: 'CUP-16-PP-FLAT',
          price: 55000, // discounted bundle rate
          qty: 2,
          weight_grams: 800
        },
        {
          product_id: 'prod_seal_film',
          product_name: 'Cup Seal Film (Top Seal)',
          variant_id: 'var_seal_clear',
          variant_name: 'Polos Bening Transparan (1.200 Cup)',
          unit_id: 'u_seal_roll',
          unit_name: 'Per 1 Roll [Paket Kopi]',
          unit_code: 'ROLL',
          base_multiplier: 1,
          sku: 'SEAL-1200-CLEAR',
          price: 88000, // discounted bundle rate
          qty: 1,
          weight_grams: 800
        }
      ]
    },
    {
      id: 'bundle_resto',
      title: 'Paket Ayam Geprek & Rice Bowl',
      category: 'Makanan Siap Saji',
      badge: 'Best Value',
      badgeColor: 'bg-eco',
      icon: UtensilsCrossed,
      iconColor: 'text-eco',
      desc: 'Wadah higienis microwave-safe anti tumpah standar resto.',
      items: [
        '2 Pack Box Makanan 750ml Biodegradable (100 pcs)',
        '1 Pack Sendok Makan Bebek Steril (100 pcs)',
        '1 Kg Kantong Kresek Putih Susu 30x40 (± 80 lembar)'
      ],
      normalPrice: 245000,
      bundlePrice: 215000,
      savings: 30000,
      cartPayload: [
        {
          product_id: 'prod_box_750',
          product_name: 'Box Makanan 750 ml (Biodegradable)',
          variant_id: 'var_box_750_std',
          variant_name: '750 ml Persegi Panjang',
          unit_id: 'u_box750_pak',
          unit_name: 'Pack (Isi 50 pcs) [Paket Rice Bowl]',
          unit_code: 'PAK',
          base_multiplier: 50,
          sku: 'BOX-750-BIO-RECT',
          price: 90000,
          qty: 2,
          weight_grams: 1100
        },
        {
          product_id: 'prod_kresek_30',
          product_name: 'Plastik HDPE 30x40 (1 kg)',
          variant_id: 'var_kresek_30_putih',
          variant_name: 'Ukuran 30 x 40 cm (Putih Susu)',
          unit_id: 'u_kresek30_kg',
          unit_name: 'Per 1 Kilogram [Paket Rice Bowl]',
          unit_code: 'KG',
          base_multiplier: 1,
          sku: 'KRS-HD-30-W',
          price: 35000,
          qty: 1,
          weight_grams: 1000
        }
      ]
    },
    {
      id: 'bundle_bakery',
      title: 'Paket Bakery, Donat & Pastry',
      category: 'Kue & Roti',
      badge: 'Kraft Cantik',
      badgeColor: 'bg-amber-600',
      icon: Croissant,
      iconColor: 'text-amber-600',
      desc: 'Kemasan kertas kraft estetik ramah lingkungan untuk toko roti modern.',
      items: [
        '2 Pack Paper Lunch Box Kraft Size L (100 pcs)',
        '1 Pack Kertas Roti Baking Paper Anti-Minyak (100 lbr)',
        '1 Pack Sarung Tangan Plastik HDPE Higienis (100 pcs)'
      ],
      normalPrice: 185000,
      bundlePrice: 165000,
      savings: 20000,
      cartPayload: [
        {
          product_id: 'prod_paper_lunch',
          product_name: 'Paper Lunch Box Kraft (Size L)',
          variant_id: 'var_paper_l',
          variant_name: 'Size L (18 x 11 x 5 cm)',
          unit_id: 'u_paper_pak',
          unit_name: 'Pack (Isi 50 pcs) [Paket Bakery]',
          unit_code: 'PAK',
          base_multiplier: 50,
          sku: 'PLB-KRAFT-L',
          price: 65000,
          qty: 2,
          weight_grams: 1400
        },
        {
          product_id: 'prod_bubble_wrap',
          product_name: 'Bubble Wrap Hitam & Bening',
          variant_id: 'var_bw_125',
          variant_name: 'Roll 1.25m x 50m',
          unit_id: 'u_bw_roll',
          unit_name: 'Roll Packing [Paket Bakery]',
          unit_code: 'ROLL',
          base_multiplier: 1,
          sku: 'BW-125-50-CLEAR',
          price: 35000,
          qty: 1,
          weight_grams: 800
        }
      ]
    }
  ];

  const handleClaimBundle = (bundle: typeof bundles[0]) => {
    bundle.cartPayload.forEach((item) => {
      addItem(item);
    });

    onShowToast(`${bundle.title} berhasil dimasukkan ke keranjang!`);
    onClose();
    setTimeout(() => {
      onOpenCart();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white w-full max-w-3xl rounded-2xl neo-border-thick neo-shadow-lg overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b-2 border-ink bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center neo-border">
              <Sparkles className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg sm:text-xl text-ink">
                Paket Starter Usaha Kuliner (Bundling Wizard)
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">
                Paket kemasan terpadu sekali klik dengan diskon bundling khusus UMKM
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-ink hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Cards */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-300 text-xs text-amber-900 flex items-center gap-2 font-semibold">
            <span className="text-base">💡</span>
            <span>
              Pemula kuliner tidak perlu bingung memilih plastik satu per satu. Paket di bawah sudah mencakup semua wadah dan pelengkap yang Anda butuhkan!
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bundles.map((bundle) => {
              const Icon = bundle.icon;
              return (
                <div
                  key={bundle.id}
                  className="bg-surface rounded-2xl neo-border shadow-hard flex flex-col justify-between p-4 relative hover:-translate-y-0.5 transition-all"
                >
                  <div>
                    {/* Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase text-white ${bundle.badgeColor}`}>
                        {bundle.badge}
                      </span>
                      <Icon className={`w-6 h-6 ${bundle.iconColor}`} />
                    </div>

                    <h4 className="font-display font-black text-base text-ink leading-tight mb-1">
                      {bundle.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-snug mb-3">
                      {bundle.desc}
                    </p>

                    {/* Items Included */}
                    <div className="space-y-1.5 py-2.5 border-y border-slate-100 text-xs">
                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Isi Paket:
                      </span>
                      {bundle.items.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-eco shrink-0 mt-0.5" />
                          <span className="text-[11px] font-medium leading-tight">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing and Button */}
                  <div className="pt-3 mt-3">
                    <div className="flex items-baseline justify-between mb-2">
                      <div>
                        <span className="text-[10px] text-slate-400 line-through block">
                          Rp {bundle.normalPrice.toLocaleString('id-ID')}
                        </span>
                        <span className="font-display font-black text-lg text-accent">
                          Rp {bundle.bundlePrice.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded">
                        Hemat Rp {bundle.savings.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <button
                      onClick={() => handleClaimBundle(bundle)}
                      className="w-full py-2.5 px-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-black neo-border flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Ambil Paket Ini</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t-2 border-ink bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 bg-white hover:bg-slate-100 text-ink rounded-xl text-xs font-bold neo-border"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
