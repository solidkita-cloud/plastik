import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  CheckCircle, 
  Printer, 
  Sparkles,
  Camera,
  VideoOff,
  Plus
} from 'lucide-react';
import QRCode from 'qrcode';
import { useCartStore } from '../stores/cartStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useCustomerStore } from '../stores/customerStore';
import { useCatalogStore } from '../stores/catalogStore';
import { saveCustomerToFirebase } from '../services/firebaseSync';
import { CustomerProfile, CartItem } from '../types';

interface QRReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCart: () => void;
}

export const QRReorderModal: React.FC<QRReorderModalProps> = ({ isOpen, onClose, onOpenCart }) => {
  const storeSettings = useSettingsStore();
  const customers = useCustomerStore((state) => state.customers);
  const addCustomer = useCustomerStore((state) => state.addCustomer);
  const findByToken = useCustomerStore((state) => state.findByToken);
  const catalogProducts = useCatalogStore((state) => state.products);

  const [activeTab, setActiveTab] = useState<'camera' | 'sticker' | 'new_customer'>('camera');
  const [tokenInput, setTokenInput] = useState('WARUNG-BAROKAH-2026');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile>(customers[0] || null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // New Customer Form State (Spacious & Clean)
  const [newBizName, setNewBizName] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newSelectedProdId, setNewSelectedProdId] = useState(catalogProducts[0]?.id || '');
  const [newSelectedUnitCode, setNewSelectedUnitCode] = useState('PAK');
  const [newOrderQty, setNewOrderQty] = useState(2);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const setCustomer = useCartStore((state) => state.setCustomer);
  const addItem = useCartStore((state) => state.addItem);
  const clearCart = useCartStore((state) => state.clearCart);

  // Generate real QR code image whenever selectedCustomer changes
  useEffect(() => {
    if (selectedCustomer) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://plastik-kan.vercel.app';
      const reorderUrl = `${origin}/?token=${encodeURIComponent(selectedCustomer.qr_token)}`;

      QRCode.toDataURL(reorderUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF'
        }
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Gagal generate QR Code:', err));
    }
  }, [selectedCustomer]);

  // Stop camera on tab change or close
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera') {
      stopCamera();
    }
  }, [isOpen, activeTab]);

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch {
      setCameraError('Kamera tidak dapat diakses atau izin ditolak. Anda tetap dapat memasukkan token di bawah.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  if (!isOpen) return null;

  const handleResolveQR = (tokenToUse?: string) => {
    const val = (tokenToUse || tokenInput).trim();
    const found = findByToken(val);
    if (found) {
      setSelectedCustomer(found);
      setCustomer(found);
      stopCamera();
    } else {
      alert(`Token "${val}" tidak ditemukan. Silakan daftarkan pelanggan baru di tab "Daftar Mitra Baru"`);
    }
  };

  const handle1ClickReorder = () => {
    if (!selectedCustomer || !selectedCustomer.last_order) return;

    clearCart();
    setCustomer(selectedCustomer);
    selectedCustomer.last_order.items.forEach((item) => {
      addItem(item);
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
      onOpenCart();
    }, 600);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim()) {
      alert('Nama usaha pelanggan wajib diisi');
      return;
    }

    const token = `QR-${newBizName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 10)}-${Math.floor(100 + Math.random() * 900)}`;
    const custId = `cust_${Date.now()}`;

    // Find selected product
    const targetProd = catalogProducts.find((p) => p.id === newSelectedProdId) || catalogProducts[0];
    const targetVar = targetProd?.variants[0];
    const targetUnit = targetVar?.units.find((u) => u.unit_code === newSelectedUnitCode) || targetVar?.units[0];

    const recurringItem: CartItem = {
      product_id: targetProd.id,
      product_name: targetProd.name,
      variant_id: targetVar.id,
      variant_name: targetVar.name,
      unit_id: targetUnit.id,
      unit_name: targetUnit.unit_name,
      unit_code: targetUnit.unit_code,
      base_multiplier: targetUnit.base_multiplier,
      sku: targetVar.sku,
      price: targetUnit.price,
      qty: newOrderQty,
      weight_grams: (targetVar.base_pcs_weight_grams || 10) * targetUnit.base_multiplier
    };

    const newCustomerProfile: CustomerProfile = {
      id: custId,
      qr_token: token,
      business_name: newBizName.trim(),
      contact_person: newContact.trim() || 'Pemilik Usaha',
      phone_number: newPhone.trim() || '081234567890',
      delivery_address: newAddress.trim() || storeSettings.city,
      district_area: storeSettings.city,
      tier: 'langganan_warung',
      total_orders_count: 1,
      last_order: {
        order_number: `TP-${new Date().getFullYear()}-INIT`,
        items_summary: `${recurringItem.product_name} (${recurringItem.qty} ${recurringItem.unit_code})`,
        items: [recurringItem]
      }
    };

    addCustomer(newCustomerProfile);
    saveCustomerToFirebase(newCustomerProfile).catch((err) => {
      console.warn('Gagal sync mitra ke Firebase:', err);
    });
    setSelectedCustomer(newCustomerProfile);
    setActiveTab('sticker');
    alert(`Mitra ${newCustomerProfile.business_name} berhasil didaftarkan! Stiker QR siap dicetak.`);
  };

  const handlePrintSticker = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      {/* Spacious Container (max-w-4xl, breathable, comfortable) */}
      <div 
        className="bg-white w-full max-w-4xl rounded-3xl neo-border-thick shadow-hard-lg overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 sm:px-8 border-b-2 border-ink bg-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center neo-border shadow-sm">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-black text-xl sm:text-2xl text-ink">
                Sistem Smart QR Re-Order Kardus
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Scan stiker kardus fisik untuk repeat order otomatis atau buat QR baru untuk mitra
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl text-slate-500 hover:text-ink hover:bg-slate-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation (Spacious Chips) */}
        <div className="flex items-center gap-2 px-6 sm:px-8 py-3.5 bg-slate-50 border-b border-slate-200 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('camera')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${
              activeTab === 'camera'
                ? 'bg-primary text-white neo-border shadow-sm'
                : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>📷 Kamera Scanner & Token</span>
          </button>

          <button
            onClick={() => setActiveTab('sticker')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${
              activeTab === 'sticker'
                ? 'bg-primary text-white neo-border shadow-sm'
                : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>🏷️ Cetak Stiker Kardus (58mm)</span>
          </button>

          <button
            onClick={() => setActiveTab('new_customer')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all ${
              activeTab === 'new_customer'
                ? 'bg-primary text-white neo-border shadow-sm'
                : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>➕ Daftarkan Mitra Baru & Buat QR</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto max-h-[75vh] space-y-6 bg-slate-50/50">
          
          {/* TAB 1: KAMERA SCANNER & TOKEN INPUT */}
          {activeTab === 'camera' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              
              {/* Camera Frame */}
              <div className="bg-black rounded-3xl overflow-hidden relative aspect-video flex items-center justify-center border-4 border-slate-900 shadow-hard">
                {isCameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 border-2 border-emerald-400/80 m-8 rounded-2xl pointer-events-none flex flex-col items-center justify-between p-3">
                      <span className="text-[11px] font-black bg-emerald-500 text-white px-3 py-1 rounded-full shadow-sm animate-pulse">
                        Arahkan Kamera ke QR Kardus
                      </span>
                      <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-bounce" />
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="pointer-events-auto px-4 py-1.5 rounded-xl bg-black/60 text-white text-xs font-bold hover:bg-black/80"
                      >
                        Matikan Kamera
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6 text-white space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center mx-auto text-primary-light">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base text-white">Kamera Belum Aktif</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Scan QR langsung dari stiker kardus fisik pengiriman pelanggan
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="py-3 px-6 bg-primary hover:bg-primary-dark text-white rounded-2xl text-sm font-black neo-border shadow-sm inline-flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Aktifkan Kamera Perangkat</span>
                    </button>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 text-xs text-amber-900 font-semibold flex items-center gap-2">
                  <VideoOff className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Manual Token Input (Lapang & Lega) */}
              <div className="bg-white p-6 rounded-3xl neo-border shadow-sm space-y-4">
                <label className="block text-sm font-extrabold text-slate-800">
                  Atau Masukkan Kode Token Pelanggan:
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Contoh: WARUNG-BAROKAH-2026"
                    className="flex-1 h-13 px-4 text-base font-mono uppercase font-bold rounded-2xl border-2 border-slate-300 focus:border-primary outline-none bg-slate-50 focus:bg-white"
                  />
                  <button
                    onClick={() => handleResolveQR()}
                    className="px-6 bg-primary hover:bg-primary-dark text-white rounded-2xl text-sm font-black neo-border shadow-sm transition-all"
                  >
                    Verifikasi Token
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="p-5 bg-sky-50 rounded-3xl border border-sky-200 space-y-3">
                <span className="text-xs font-black uppercase text-primary tracking-wider block">
                  Simulasi 1-Klik Mitra Terdaftar:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {customers.slice(0, 4).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleResolveQR(c.qr_token)}
                      className="p-3 bg-white hover:bg-sky-100 text-ink rounded-xl border border-slate-200 text-left flex items-center justify-between text-xs font-bold transition-all shadow-sm"
                    >
                      <span className="truncate pr-2">📦 {c.business_name}</span>
                      <span className="font-mono text-[10px] text-primary shrink-0">{c.qr_token.substring(0, 10)}...</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Verification Card */}
              {selectedCustomer && (
                <div className="p-6 rounded-3xl border-2 border-emerald-400 bg-emerald-50/80 space-y-4 shadow-sm animate-fadeIn">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-3 py-1 rounded-full bg-eco text-white text-[10px] font-black uppercase tracking-wider">
                        Mitra Langganan Ditemukan
                      </span>
                      <h4 className="font-display font-black text-xl text-ink mt-2">
                        {selectedCustomer.business_name}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        Kontak: {selectedCustomer.contact_person} • {selectedCustomer.phone_number}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        📍 {selectedCustomer.delivery_address}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-500 block">Token QR:</span>
                      <span className="font-mono font-black text-sm text-primary">{selectedCustomer.qr_token}</span>
                    </div>
                  </div>

                  {selectedCustomer.last_order && (
                    <div className="p-4 bg-white rounded-2xl border border-emerald-200 text-xs text-slate-700">
                      <strong className="block text-ink font-bold mb-1">Paket Repeat Order Terjadwal:</strong>
                      <p className="text-slate-600 leading-relaxed">{selectedCustomer.last_order.items_summary}</p>
                    </div>
                  )}

                  <button
                    onClick={handle1ClickReorder}
                    disabled={isSuccess}
                    className="w-full py-4 bg-accent hover:bg-accent-dark text-white rounded-2xl font-black text-base neo-border-thick neo-shadow-accent flex items-center justify-center gap-2 transition-all active:translate-x-0.5 active:translate-y-0.5"
                  >
                    {isSuccess ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-white" />
                        <span>Pesanan Masuk ke Keranjang!</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>1-Klik Muat Semua Barang ke Keranjang →</span>
                      </>
                    )}
                  </button>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: CETAK STIKER KARDUS 58MM (REAL QR) */}
          {activeTab === 'sticker' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500">Pilih Mitra untuk Dicetak:</span>
                  <select
                    value={selectedCustomer?.id || ''}
                    onChange={(e) => {
                      const found = customers.find((c) => c.id === e.target.value);
                      if (found) setSelectedCustomer(found);
                    }}
                    className="block font-black text-base text-ink mt-1 outline-none bg-transparent cursor-pointer"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.business_name} ({c.qr_token})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handlePrintSticker}
                  className="px-5 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-black text-sm neo-border flex items-center gap-2 shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Stiker (58mm)</span>
                </button>
              </div>

              {/* Real Box Sticker Physical Preview (58mm Thermal Sticker Format) */}
              <div 
                id="thermal-sticker-printable-area"
                className="w-[320px] mx-auto bg-white border-2 border-slate-900 rounded-2xl shadow-hard p-5 text-center space-y-3 font-sans select-none"
              >
                {/* Store Header */}
                <div className="border-b-2 border-dashed border-slate-400 pb-2.5">
                  <div className="font-display font-black text-base uppercase text-primary tracking-tight">
                    {storeSettings.storeName}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    Pusat Grosir Plastik & Kemasan • WA: {storeSettings.phoneDisplay}
                  </div>
                </div>

                {/* Stiker Notice */}
                <div className="text-[11px] font-black uppercase text-slate-800 bg-amber-100 py-1 px-2 rounded-lg border border-amber-300">
                  📦 STIKER RE-ORDER KARDUS PENGIRIMAN
                </div>

                {/* REAL DYNAMIC QR CODE */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto shadow-inner">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR Re-Order Real"
                      className="w-48 h-48 mx-auto object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                      Membuat QR Asli...
                    </div>
                  )}
                </div>

                {/* Customer Details */}
                <div className="space-y-1 text-xs">
                  <div className="font-black text-base text-slate-950">
                    {selectedCustomer?.business_name}
                  </div>
                  <div className="font-mono text-[11px] font-bold text-primary">
                    Token: {selectedCustomer?.qr_token}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {selectedCustomer?.delivery_address}
                  </div>
                </div>

                {/* Instruction */}
                <div className="border-t-2 border-dashed border-slate-400 pt-2 text-[10px] font-bold text-slate-600 leading-tight">
                  Arahkan kamera HP ke QR ini saat kemasan habis untuk repeat order instan ke WhatsApp!
                </div>
              </div>

              <div className="text-center text-xs text-slate-500">
                💡 Stiker ini dapat langsung dicetak ke printer label stiker thermal 58mm atau kertas HVS stiker untuk ditempelkan di kardus.
              </div>
            </div>
          )}

          {/* TAB 3: DAFTARKAN PELANGGAN BARU & BUAT QR (SPACIOUS FORM) */}
          {activeTab === 'new_customer' && (
            <form onSubmit={handleCreateCustomer} className="space-y-6 max-w-2xl mx-auto bg-white p-7 rounded-3xl neo-border shadow-sm">
              <div className="border-b border-slate-200 pb-3">
                <h4 className="font-display font-black text-lg sm:text-xl text-ink">
                  Daftarkan Pelanggan Baru & Buat Token QR
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Sistem akan otomatis menghasilkan Token QR unik dan menyimpannya di database pelanggan.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-extrabold text-slate-800 mb-1.5">
                    Nama Usaha / Warung Pelanggan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kopi Kenangan Mantan / Warung Ayam Geprek"
                    value={newBizName}
                    onChange={(e) => setNewBizName(e.target.value)}
                    className="w-full h-13 px-4 text-sm sm:text-base font-semibold rounded-2xl border-2 border-slate-300 focus:border-primary outline-none bg-slate-50 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-extrabold text-slate-800 mb-1.5">
                      Nama Kontak Pemilik:
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Bu Siti"
                      value={newContact}
                      onChange={(e) => setNewContact(e.target.value)}
                      className="w-full h-12 px-4 text-sm font-semibold rounded-xl border border-slate-300 focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-extrabold text-slate-800 mb-1.5">
                      Nomor WhatsApp Pelanggan:
                    </label>
                    <input
                      type="text"
                      placeholder="081234567890"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full h-12 px-4 text-sm font-mono font-bold rounded-xl border border-slate-300 focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-extrabold text-slate-800 mb-1.5">
                    Alamat Pengiriman Rutin:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Jl. Ahmad Yani No. 12, Sedati - Sidoarjo"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full p-3 text-sm font-medium rounded-xl border border-slate-300 focus:border-primary outline-none"
                  />
                </div>

                {/* Recurring item assignment */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-xs font-black uppercase text-slate-700 block">
                    Barang Langganan Rutin (Otomatis Masuk Keranjang saat QR di-scan):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-6">
                      <select
                        value={newSelectedProdId}
                        onChange={(e) => setNewSelectedProdId(e.target.value)}
                        className="w-full h-11 px-3 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                      >
                        {catalogProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <select
                        value={newSelectedUnitCode}
                        onChange={(e) => setNewSelectedUnitCode(e.target.value)}
                        className="w-full h-11 px-3 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                      >
                        <option value="PAK">PAK (Bungkus)</option>
                        <option value="DUS">DUS (Karton)</option>
                        <option value="IKAT">IKAT (Bal)</option>
                        <option value="PCS">PCS (Ecer)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <input
                        type="number"
                        min={1}
                        value={newOrderQty}
                        onChange={(e) => setNewOrderQty(Number(e.target.value) || 1)}
                        className="w-full h-11 px-3 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                        placeholder="Jumlah"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-black text-base rounded-2xl neo-border-thick neo-shadow transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Simpan & Buat Stiker QR Sekarang</span>
                </button>
              </div>
            </form>
          )}

        </div>

      </div>

      {/* CSS for Sticker Printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-sticker-printable-area, #thermal-sticker-printable-area * {
            visibility: visible !important;
          }
          #thermal-sticker-printable-area {
            position: fixed !important;
            left: 50% !important;
            top: 10mm !important;
            transform: translateX(-50%) !important;
            width: 58mm !important;
            padding: 3mm !important;
            box-shadow: none !important;
            border: 1px dashed black !important;
          }
        }
      `}</style>
    </div>
  );
};
