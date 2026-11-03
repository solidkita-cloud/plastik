import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  QrCode, 
  MessageCircle, 
  ShoppingBag, 
  User, 
  Home, 
  ChevronDown, 
  Truck, 
  Package, 
  X,
  Sparkles,
  HelpCircle,
  Info
} from 'lucide-react';
import { STORE_INFO, CATEGORIES } from '../lib/constants';
import { useCartStore } from '../stores/cartStore';
import { searchFlatCatalog, FlatCatalogItem } from '../lib/catalogDb';

interface HeaderProps {
  onOpenQR: () => void;
  onOpenCart: () => void;
  onOpenOwner: () => void;
  onOpenBundle?: () => void;
  onSelectCategory: (categoryId: string) => void;
  activeCategory: string;
  onSelectProductItem?: (productId: string) => void;
  onOpenInfo: (type: 'about' | 'help' | 'promo') => void;
  onSearchSubmit: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenQR,
  onOpenCart,
  onOpenOwner,
  onOpenBundle,
  onSelectCategory,
  activeCategory,
  onSelectProductItem,
  onOpenInfo,
  onSearchSubmit
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FlatCatalogItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  const totalQty = useCartStore((state) => state.getTotalQty());

  // Instant search lookup
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchFlatCatalog(searchQuery, 8);
      setSearchResults(results);
      setIsSearching(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit(searchQuery);
    setSearchResults([]);
  };

  const openWhatsAppDirect = () => {
    const text = encodeURIComponent(
      `Halo Admin ${STORE_INFO.name}! Saya ingin konsultasi ketersediaan stok kemasan & harga grosir.`
    );
    window.open(`https://wa.me/${STORE_INFO.phone}?text=${text}`, '_blank');
  };

  return (
    <header className="sticky top-0 z-40 bg-surface shadow-sm border-b border-slate-200">
      {/* Top Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-3 md:gap-6">
          
          {/* Logo & Brand */}
          <div 
            onClick={() => {
              onSelectCategory('cat_all');
              onSearchSubmit('');
            }}
            className="flex items-center gap-2.5 cursor-pointer shrink-0 select-none group"
          >
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-primary flex items-center justify-center text-white shadow-hard-sm neo-border group-hover:bg-primary-dark transition-all">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-extrabold text-2xl md:text-3xl tracking-tight text-primary">
                  Plasti<span className="text-ink">Pro</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-eco-light text-eco-dark rounded border border-eco">
                  Grosir
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 hidden sm:block tracking-wide">
                {STORE_INFO.tagline}
              </p>
            </div>
          </div>

          {/* Instant Search Bar */}
          <div className="relative flex-1 max-w-xl mx-auto" ref={searchDropdownRef}>
            <form onSubmit={handleSearchSubmitForm} className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari produk... (cth: cup 16 oz, box 750, hdpe)"
                className="w-full pl-4 pr-11 py-2.5 text-sm rounded-xl border-2 border-slate-300 focus:border-primary focus:ring-0 focus:outline-none transition-all placeholder:text-slate-400 bg-slate-50 focus:bg-white"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    onSearchSubmit('');
                  }}
                  className="absolute right-12 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
              <button 
                type="submit"
                className="absolute right-1 top-1 bottom-1 px-3.5 bg-primary hover:bg-primary-dark text-white rounded-lg flex items-center justify-center transition-colors shadow-sm"
                title="Cari"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Instant Search Results Dropdown */}
            {(searchResults.length > 0 || isSearching) && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl neo-border border-2 border-ink overflow-hidden z-50 max-h-96 overflow-y-auto">
                <div className="p-2 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-600 flex justify-between items-center">
                  <span>Hasil Pencarian Instan (&lt;50ms)</span>
                  <span className="text-[10px] text-primary">{searchResults.length} varian ditemukan</span>
                </div>
                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (onSelectProductItem) {
                        onSelectProductItem(item.product_id);
                      }
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="p-3 hover:bg-primary-light/30 border-b border-slate-100 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-bold text-sm text-ink">{item.product_name}</div>
                      <div className="text-xs text-slate-500">
                        {item.variant_name} • <span className="font-semibold text-primary">{item.unit_name}</span> ({item.material})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-sm text-accent">
                        Rp {item.price.toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Rp {item.price_per_pcs.toLocaleString('id-ID')}/pcs
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons (QR, WA, Cart, Account) */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* QR Re-Order Button */}
            <button
              onClick={onOpenQR}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-primary hover:bg-primary-light/40 border border-transparent hover:border-primary/30 transition-all font-semibold text-xs sm:text-sm"
              title="Smart QR Re-Order"
            >
              <QrCode className="w-5 h-5 text-primary" />
              <span className="hidden md:inline font-bold">QR Re-Order</span>
            </button>

            {/* Chat WhatsApp Button */}
            <button
              onClick={openWhatsAppDirect}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-eco hover:bg-eco-light/40 border border-transparent hover:border-eco/30 transition-all font-semibold text-xs sm:text-sm"
              title="Chat WhatsApp Toko"
            >
              <MessageCircle className="w-5 h-5 text-eco fill-eco/20" />
              <span className="hidden md:inline font-bold">Chat WA</span>
            </button>

            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-primary-light text-ink hover:text-primary transition-all border border-slate-200"
              title="Keranjang Belanja"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalQty > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-accent text-white text-[11px] font-extrabold rounded-full flex items-center justify-center neo-border-thick shadow-sm animate-pulse">
                  {totalQty}
                </span>
              )}
            </button>

            {/* User / Owner Dashboard */}
            <button
              onClick={onOpenOwner}
              className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-ink transition-all border border-transparent"
              title="Mode Pemilik & Konsol Agen"
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Navbar (Blue Ribbon #0284C7) */}
      <div className="bg-primary text-white border-t border-primary-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-xs sm:text-sm font-semibold h-10 overflow-x-auto no-scrollbar">
            
            {/* Left Nav Links */}
            <div className="flex items-center gap-1 sm:gap-4 shrink-0">
              <button
                onClick={() => {
                  onSelectCategory('cat_all');
                  onSearchSubmit('');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  activeCategory === 'cat_all' ? 'bg-primary-dark text-white font-bold' : 'hover:bg-primary-dark/60 text-white/95'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Beranda</span>
              </button>

              {/* Kategori Dropdown Toggle */}
              <div className="relative">
                <button
                  onClick={() => setShowCategoryMenu(!showCategoryMenu)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-primary-dark/60 text-white/95 transition-colors"
                >
                  <span>Kategori</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {showCategoryMenu && (
                  <div className="absolute left-0 top-full mt-1 w-64 bg-white text-ink rounded-xl shadow-xl neo-border py-2 z-50">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          onSelectCategory(cat.id);
                          setShowCategoryMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-primary-light transition-colors flex items-center justify-between ${
                          activeCategory === cat.id ? 'text-primary font-bold bg-primary-light/50' : 'text-slate-700'
                        }`}
                      >
                        <span>{cat.name}</span>
                        {cat.id === 'cat_eco' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-eco text-white">Eco</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => onOpenInfo('promo')}
                className="px-3 py-1.5 rounded-lg hover:bg-primary-dark/60 text-white/95 transition-colors"
              >
                Promo Grosir
              </button>
              
              <button
                onClick={() => onOpenInfo('about')}
                className="px-3 py-1.5 rounded-lg hover:bg-primary-dark/60 text-white/95 transition-colors hidden sm:inline-flex items-center gap-1"
              >
                <Info className="w-3 h-3 text-sky-200" />
                <span>Tentang Kami</span>
              </button>

              <button
                onClick={onOpenQR}
                className="px-3 py-1.5 rounded-lg hover:bg-primary-dark/60 text-white/95 transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Smart Re-Order</span>
              </button>

              {onOpenBundle && (
                <button
                  onClick={onOpenBundle}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold transition-colors flex items-center gap-1 shadow-sm"
                >
                  <span>🎁 Paket Usaha</span>
                </button>
              )}

              <button
                onClick={() => onOpenInfo('help')}
                className="px-3 py-1.5 rounded-lg hover:bg-primary-dark/60 text-white/95 transition-colors flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Bantuan & CS</span>
              </button>
            </div>

            {/* Right Badge: Pengiriman Seluruh Indonesia */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-dark/80 text-sky-100 text-[11px] font-bold border border-sky-400/40 shrink-0">
              <Truck className="w-3.5 h-3.5 text-sky-300" />
              <span>Pengiriman Seluruh Indonesia</span>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
