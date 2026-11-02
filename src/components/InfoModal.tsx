import React from 'react';
import { X, Store, HelpCircle, Tag, Phone, MapPin, Clock, MessageCircle } from 'lucide-react';
import { STORE_INFO } from '../lib/constants';

interface InfoModalProps {
  type: 'about' | 'help' | 'promo' | null;
  onClose: () => void;
  onOpenWA: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ type, onClose, onOpenWA }) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl neo-border-thick neo-shadow-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b-2 border-ink bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white neo-border ${
              type === 'about' ? 'bg-primary' : type === 'help' ? 'bg-eco' : 'bg-accent'
            }`}>
              {type === 'about' && <Store className="w-5 h-5" />}
              {type === 'help' && <HelpCircle className="w-5 h-5" />}
              {type === 'promo' && <Tag className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-display font-black text-base sm:text-lg text-ink">
                {type === 'about' && 'Tentang Toko PlastiPro'}
                {type === 'help' && 'Pusat Bantuan & Customer Service'}
                {type === 'promo' && 'Program Promo & Diskon Grosir'}
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">
                Plastik & Kemasan Berkualitas Jawa Timur
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700">
          {type === 'about' && (
            <div className="space-y-3">
              <p className="leading-relaxed">
                <strong>PlastiPro</strong> adalah distributor utama dan mitra terpercaya untuk kebutuhan kemasan makanan & minuman UMKM kuliner di Sidoarjo, Surabaya, dan seluruh Indonesia.
              </p>
              
              <div className="p-3 bg-sky-50 rounded-xl neo-border border-sky-300 space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span><strong>Alamat Fisik:</strong> {STORE_INFO.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-eco shrink-0" />
                  <span><strong>Operasional:</strong> {STORE_INFO.operationalHours}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-accent shrink-0" />
                  <span><strong>Hotline:</strong> {STORE_INFO.phoneDisplay}</span>
                </div>
              </div>

              <div className="pt-2">
                <h4 className="font-bold text-ink mb-1">Standar Kualitas Kami:</h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Bahan murni 100% Food Grade (aman untuk makanan panas & berminyak).</li>
                  <li>Tersedia varian ramah lingkungan (Biodegradable & Paper Kraft).</li>
                  <li>Garansi barang rusak / cacat pabrik bisa ditukar di toko.</li>
                </ul>
              </div>
            </div>
          )}

          {type === 'help' && (
            <div className="space-y-3">
              <p className="leading-relaxed">
                Butuh konsultasi ukuran kemasan yang pas untuk menu jualan Anda? Admin kami siap membantu menghitung kebutuhan cup, thinwall, dan kardus usaha Anda.
              </p>

              <div className="space-y-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <strong className="block text-ink font-bold mb-1">Cara Pemesanan:</strong>
                  <ol className="list-decimal pl-5 space-y-1 text-slate-600 text-xs">
                    <li>Pilih produk & varian ukuran yang diinginkan.</li>
                    <li>Tentukan satuan (Ecer/Pcs, Pack, atau Dus Pabrik).</li>
                    <li>Klik <em>Kirim Pesanan ke WhatsApp</em> untuk konfirmasi otomatis.</li>
                  </ol>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <strong className="block text-ink font-bold mb-1">Jalur Pengiriman:</strong>
                  <p className="text-slate-600 text-xs">
                    • Pengiriman instan: Gojek / Grab / Lalamove (wilayah Sidoarjo & Surabaya).<br />
                    • Pengiriman kargo bal: Dakota, Baraka, Indah Cargo (seluruh pulau Jawa & luar pulau).
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onOpenWA();
                }}
                className="w-full py-3 bg-eco hover:bg-eco-dark text-white rounded-xl font-bold flex items-center justify-center gap-2 neo-border transition-all mt-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Hubungi CS via WhatsApp Sekarang</span>
              </button>
            </div>
          )}

          {type === 'promo' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-xl border-2 border-amber-300">
                <span className="px-2 py-0.5 rounded bg-accent text-white font-black text-[10px] uppercase">
                  Promo Spesial Grosir
                </span>
                <h4 className="font-extrabold text-sm text-ink mt-1">
                  Beli Per Dus / Karung Lebih Hemat Hingga 35%!
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Dapatkan potongan harga pabrik langsung untuk pembelian minimal 1 karton thinwall atau 1 karung kantong kresek.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-200">
                  <span>Thinwall Box 750ml (Dus 500 pcs)</span>
                  <strong className="text-accent font-extrabold">Hemat Rp 100.000</strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-200">
                  <span>Cup Plastik 16 oz (Dus 2.000 pcs)</span>
                  <strong className="text-accent font-extrabold">Hemat Rp 450.000</strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-200">
                  <span>Cup Sealer Film (Dus 12 Roll)</span>
                  <strong className="text-accent font-extrabold">Hemat Rp 120.000</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t-2 border-ink bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-white hover:bg-slate-100 text-ink rounded-xl text-xs font-bold neo-border"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
