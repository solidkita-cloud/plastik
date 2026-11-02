import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  MapPin, 
  Phone, 
  Clock, 
  Instagram, 
  Package, 
  Search,
  RotateCcw
} from 'lucide-react';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { TrustBadges } from './components/TrustBadges';
import { ProductCard } from './components/ProductCard';
import { VariantModal } from './components/VariantModal';
import { EcoBanner } from './components/EcoBanner';
import { BottomBanner } from './components/BottomBanner';
import { CartDrawer } from './components/CartDrawer';
import { QRReorderModal } from './components/QRReorderModal';
import { OwnerDashboard } from './components/OwnerDashboard';
import { MobileNav } from './components/MobileNav';
import { InfoModal } from './components/InfoModal';
import { Toast } from './components/Toast';

import { INITIAL_PRODUCTS, CATEGORIES, STORE_INFO } from './lib/constants';
import { initCatalogIndex } from './lib/catalogDb';
import { Product } from './types';
import { useCartStore } from './stores/cartStore';

export const App: React.FC = () => {
  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
  const [activeCategory, setActiveCategory] = useState('cat_all');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [infoModalType, setInfoModalType] = useState<'about' | 'help' | 'promo' | null>(null);
  const [mobileTab, setMobileTab] = useState('beranda');

  // Toast notification state
  const [toast, setToast] = useState<{ isOpen: boolean; message: string }>({
    isOpen: false,
    message: ''
  });

  const isCartOpen = useCartStore((state) => state.isCartOpen);
  const setIsCartOpen = useCartStore((state) => state.setIsCartOpen);

  // Initialize IndexedDB fast search index on mount
  useEffect(() => {
    initCatalogIndex(INITIAL_PRODUCTS);
  }, []);

  // Filter products by category AND search query
  const filteredProducts = products.filter((p) => {
    const matchesCategory = activeCategory === 'cat_all' || p.category_id === activeCategory;
    if (!matchesCategory) return false;

    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase().trim();
    const searchString = `${p.name} ${p.material} ${p.tags.join(' ')} ${p.variants.map(v => v.name + ' ' + v.sku).join(' ')}`.toLowerCase();
    return searchString.includes(q);
  });

  const openWhatsApp = () => {
    const text = encodeURIComponent(
      `Halo Admin ${STORE_INFO.name}! Saya ingin bertanya tentang produk kemasan & harga grosir.`
    );
    window.open(`https://wa.me/${STORE_INFO.phone}?text=${text}`, '_blank');
  };

  const showToastNotification = (msg: string) => {
    setToast({ isOpen: true, message: msg });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, isOpen: false }));
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between selection:bg-primary-light selection:text-primary-dark pb-16 sm:pb-0">
      
      {/* 1. Header (Navbar, Logo, Instant Search, Quick Actions) */}
      <Header
        activeCategory={activeCategory}
        onSelectCategory={(catId) => {
          setActiveCategory(catId);
          setSearchFilter('');
        }}
        onOpenQR={() => setIsQRModalOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenOwner={() => setIsOwnerModalOpen(true)}
        onOpenInfo={(type) => setInfoModalType(type)}
        onSearchSubmit={(q) => setSearchFilter(q)}
        onSelectProductItem={(prodId) => {
          const found = products.find((p) => p.id === prodId);
          if (found) setSelectedProduct(found);
        }}
      />

      {/* Main Content */}
      <main className="flex-1">
        {/* 2. Hero Banner (Solusi Lengkap Plastik & Kemasan untuk Bisnis Anda) */}
        <HeroBanner 
          onOrderClick={() => {
            const el = document.getElementById('katalog-section');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* 3. Trust Badges Row (Produk Berkualitas, Harga Terbaik, Pengiriman Cepat, dll) */}
        <TrustBadges />

        {/* 4. Section Produk Unggulan & Katalog */}
        <section id="katalog-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          
          {/* Section Header with Category Tabs */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-accent font-extrabold text-xs uppercase tracking-wide mb-2">
                <Flame className="w-4 h-4 text-accent fill-accent" />
                <span>Paling Banyak Dipesan Mitra</span>
              </div>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-ink tracking-tight flex items-center gap-2">
                <span>🔥 Produk Unggulan</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Katalog varian kemasan makanan & minuman standar resto, kedai boba, dan katering.
              </p>
            </div>

            {/* Quick Filter Info & Reset Button */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">
                Menampilkan <strong className="text-primary font-black">{filteredProducts.length}</strong> produk
              </span>
              {(activeCategory !== 'cat_all' || searchFilter) && (
                <button
                  onClick={() => {
                    setActiveCategory('cat_all');
                    setSearchFilter('');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-ink text-xs font-bold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Search Filter Banner */}
          {searchFilter && (
            <div className="mb-4 p-3 bg-sky-50 rounded-xl neo-border border-sky-300 text-xs font-bold text-sky-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                <span>Menampilkan hasil pencarian untuk: &quot;{searchFilter}&quot;</span>
              </div>
              <button
                onClick={() => setSearchFilter('')}
                className="text-primary hover:underline font-extrabold"
              >
                Hapus Pencarian
              </button>
            </div>
          )}

          {/* Horisontal Scrollable Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-6">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSearchFilter('');
                  }}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? 'bg-primary text-white neo-border neo-shadow-sm'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Products Grid (Matching Mockup with Eco Banner card integrated) */}
          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl neo-border p-6">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h4 className="font-extrabold text-base text-ink">Tidak ada produk yang cocok</h4>
              <p className="text-xs text-slate-500 mt-1">Coba gunakan kata kunci lain atau reset filter kategori.</p>
              <button
                onClick={() => {
                  setActiveCategory('cat_all');
                  setSearchFilter('');
                }}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold"
              >
                Tampilkan Semua Produk
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpenModal={setSelectedProduct}
                  onShowToast={showToastNotification}
                />
              ))}

              {/* Eco Banner Card (Promotional highlight matching mockup) */}
              <EcoBanner onFilterEco={() => {
                setActiveCategory('cat_eco');
                setSearchFilter('');
              }} />
            </div>
          )}

        </section>

        {/* 5. Bottom Banner (Scan QR untuk Re-Order Cepat & Cara Order Mudah) */}
        <BottomBanner onOpenQR={() => setIsQRModalOpen(true)} />

      </main>

      {/* 6. Footer Toko */}
      <footer className="bg-slate-900 text-slate-300 border-t-4 border-ink pt-10 pb-16 sm:pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-slate-800">
            
            {/* Brand column */}
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center neo-border">
                  <Package className="w-5 h-5" />
                </div>
                <span className="font-display font-black text-2xl text-white">
                  Plasti<span className="text-primary-light">Pro</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
                Pusat grosir dan eceran aneka plastik kemasan, thinwall kotak makan, cup minuman, kantong kresek, paper bag, dan perlengkapan packing terlengkap untuk UMKM kuliner.
              </p>
              <div className="flex items-center gap-3 pt-2 text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Instagram className="w-4 h-4 text-pink-400" />
                  {STORE_INFO.instagram}
                </span>
              </div>
            </div>

            {/* Address & Hours */}
            <div className="md:col-span-4 space-y-2.5 text-xs">
              <h4 className="font-black text-sm uppercase tracking-wider text-white">
                Lokasi & Jam Buka Toko
              </h4>
              <p className="flex items-start gap-2 text-slate-400">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>{STORE_INFO.address}</span>
              </p>
              <p className="flex items-center gap-2 text-slate-400">
                <Clock className="w-4 h-4 text-eco shrink-0" />
                <span>{STORE_INFO.operationalHours}</span>
              </p>
              <p className="flex items-center gap-2 text-slate-400">
                <Phone className="w-4 h-4 text-accent shrink-0" />
                <span>WhatsApp: {STORE_INFO.phoneDisplay}</span>
              </p>
            </div>

            {/* Quick Links / Owner Login */}
            <div className="md:col-span-3 space-y-2.5 text-xs">
              <h4 className="font-black text-sm uppercase tracking-wider text-white">
                Layanan Khusus & Konsol
              </h4>
              <ul className="space-y-2 text-slate-400 font-semibold">
                <li>
                  <button 
                    onClick={() => setIsQRModalOpen(true)}
                    className="hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <span>Smart QR Re-Order Kardus</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setInfoModalType('promo')}
                    className="hover:text-primary transition-colors"
                  >
                    Harga Grosir Dus / Bal Pabrik
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setInfoModalType('about')}
                    className="hover:text-primary transition-colors"
                  >
                    Profil Toko Fisik Sidoarjo
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setIsOwnerModalOpen(true)}
                    className="hover:text-amber-400 transition-colors text-slate-400 flex items-center gap-1"
                  >
                    <span>🔒 Mode Pemilik & Konsol Multi-Agen</span>
                  </button>
                </li>
              </ul>
            </div>

          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <p>© {new Date().getFullYear()} {STORE_INFO.name} ({STORE_INFO.tagline}). Hak Cipta Dilindungi.</p>
            <p className="font-semibold text-slate-400">
              Dual-Engine Offline-First • Multi-Agent Coordinated (Manager, Desain, Tester)
            </p>
          </div>
        </div>
      </footer>

      {/* 7. Interactive Modals, Drawers & Toast */}
      {/* Toast Notification */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
        onViewCart={() => {
          setToast((prev) => ({ ...prev, isOpen: false }));
          setIsCartOpen(true);
        }}
      />

      {/* Variant & Unit Selector Modal */}
      <VariantModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onShowToast={showToastNotification}
      />

      {/* Cart Drawer (WhatsApp Checkout) */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOpenQR={() => {
          setIsCartOpen(false);
          setIsQRModalOpen(true);
        }}
      />

      {/* Smart QR Re-Order Modal */}
      <QRReorderModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Owner / Kasir & Agent Console Dashboard */}
      <OwnerDashboard
        isOpen={isOwnerModalOpen}
        onClose={() => setIsOwnerModalOpen(false)}
      />

      {/* Info Modal (About / Help / Promo) */}
      <InfoModal
        type={infoModalType}
        onClose={() => setInfoModalType(null)}
        onOpenWA={openWhatsApp}
      />

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav
        activeTab={mobileTab}
        onSelectTab={(tab) => {
          setMobileTab(tab);
          if (tab === 'kategori') {
            const el = document.getElementById('katalog-section');
            el?.scrollIntoView({ behavior: 'smooth' });
          }
        }}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenQR={() => setIsQRModalOpen(true)}
      />

    </div>
  );
};

export default App;
