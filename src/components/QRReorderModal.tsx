import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  RotateCcw, 
  CheckCircle, 
  ArrowRight, 
  Printer, 
  Sparkles,
  Camera,
  VideoOff
} from 'lucide-react';
import { DEMO_CUSTOMERS } from '../lib/constants';
import { useCartStore } from '../stores/cartStore';

interface QRReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCart: () => void;
}

export const QRReorderModal: React.FC<QRReorderModalProps> = ({ isOpen, onClose, onOpenCart }) => {
  const [tokenInput, setTokenInput] = useState('WARUNG-BAROKAH-2026');
  const [activeTab, setActiveTab] = useState<'camera' | 'token' | 'sticker'>('camera');
  const [scannedCustomer, setScannedCustomer] = useState(DEMO_CUSTOMERS[0]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const setCustomer = useCartStore((state) => state.setCustomer);
  const addItem = useCartStore((state) => state.addItem);
  const clearCart = useCartStore((state) => state.clearCart);

  // Stop camera when modal closes or changes tab
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
    const val = (tokenToUse || tokenInput).trim().toUpperCase();
    const found = DEMO_CUSTOMERS.find((c) => c.qr_token.toUpperCase() === val);
    if (found) {
      setScannedCustomer(found);
      setCustomer(found);
      stopCamera();
    } else {
      alert('Token QR tidak ditemukan. Gunakan token demo: WARUNG-BAROKAH-2026');
    }
  };

  const handle1ClickReorder = () => {
    if (!scannedCustomer || !scannedCustomer.last_order) return;

    // Clear and fill with last order items
    clearCart();
    setCustomer(scannedCustomer);
    scannedCustomer.last_order.items.forEach((item) => {
      addItem(item);
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
      onOpenCart();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl neo-border-thick neo-shadow-lg overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b-2 border-ink bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center neo-border">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base sm:text-lg text-ink">
                Smart QR Re-Order System
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">
                Scan stiker kardus untuk repeat order dalam 15 detik
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-ink hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-100 text-xs font-bold">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2.5 text-center transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'camera' ? 'bg-white text-primary border-b-2 border-primary font-black' : 'text-slate-600 hover:text-ink'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Kamera Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab('token')}
            className={`flex-1 py-2.5 text-center transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'token' ? 'bg-white text-primary border-b-2 border-primary font-black' : 'text-slate-600 hover:text-ink'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Ketik Token Manual</span>
          </button>

          <button
            onClick={() => setActiveTab('sticker')}
            className={`flex-1 py-2.5 text-center transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'sticker' ? 'bg-white text-primary border-b-2 border-primary font-black' : 'text-slate-600 hover:text-ink'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Stiker Dus Fisik</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          
          {/* TAB 1: Live Camera Scanner */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
              <div className="relative bg-slate-900 rounded-2xl neo-border overflow-hidden h-60 flex flex-col items-center justify-center text-white">
                {isCameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    {/* Viewfinder Bounding Frame */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-44 h-44 border-2 border-primary rounded-2xl relative shadow-lg">
                        <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-accent rounded-tl" />
                        <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-accent rounded-tr" />
                        <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-accent rounded-bl" />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-accent rounded-br" />
                        {/* Scanning Laser Line */}
                        <div className="w-full h-0.5 bg-accent shadow-[0_0_8px_#EA580C] animate-pulse mt-20" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-center space-y-3">
                    <Camera className="w-12 h-12 mx-auto text-slate-400 stroke-1" />
                    <p className="text-xs text-slate-300 max-w-xs mx-auto">
                      Arahkan kamera ke stiker QR yang tertempel di kardus kemasan pesanan Anda.
                    </p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="py-2.5 px-5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-black neo-border shadow-sm inline-flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Aktifkan Kamera HP</span>
                    </button>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-300 text-[11px] text-amber-900 font-semibold flex items-center gap-1.5">
                  <VideoOff className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Simulation Quick Trigger */}
              <div className="p-3 bg-sky-50 rounded-xl neo-border border-sky-300 space-y-1.5">
                <span className="text-[10px] font-black uppercase text-primary tracking-wider block">
                  Simulasi Cepat (1-Klik Deteksi):
                </span>
                <button
                  type="button"
                  onClick={() => handleResolveQR('WARUNG-BAROKAH-2026')}
                  className="w-full py-2 px-3 bg-white hover:bg-sky-100 text-ink rounded-lg text-xs font-extrabold neo-border flex items-center justify-between"
                >
                  <span>📦 Scan Stiker Dus &quot;Warung Geprek Bu Siti&quot;</span>
                  <span className="text-primary font-mono text-[10px]">WARUNG-BAROKAH-2026</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Token Input */}
          {activeTab === 'token' && (
            <div className="space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                Masukkan Kode Token Pelanggan:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Contoh: WARUNG-BAROKAH-2026"
                  className="flex-1 px-3 py-2 text-xs sm:text-sm font-mono uppercase rounded-xl border-2 border-slate-300 focus:border-primary focus:outline-none"
                />
                <button
                  onClick={() => handleResolveQR()}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold neo-border shadow-sm"
                >
                  Verifikasi
                </button>
              </div>
            </div>
          )}

          {/* Customer Result Snapshot */}
          {scannedCustomer && activeTab !== 'sticker' && (
            <div className="p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/70 space-y-3 animate-fadeIn">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded bg-eco text-white text-[10px] font-black uppercase">
                    Mitra Terverifikasi
                  </span>
                  <h4 className="font-display font-black text-base text-ink mt-1">
                    {scannedCustomer.business_name}
                  </h4>
                  <p className="text-xs text-slate-600">
                    {scannedCustomer.contact_person} • {scannedCustomer.phone_number}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    📍 {scannedCustomer.delivery_address}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-500">Total Order</span>
                  <p className="font-extrabold text-base text-eco-dark">
                    {scannedCustomer.total_orders_count}x Transaksi
                  </p>
                </div>
              </div>

              {/* Last Order Snapshot */}
              {scannedCustomer.last_order && (
                <div className="p-3 bg-white rounded-xl neo-border border-emerald-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
                    <span>Riwayat Pesanan Terakhir:</span>
                    <span className="text-primary font-mono">{scannedCustomer.last_order.order_number}</span>
                  </div>
                  <p className="text-xs font-semibold text-ink">
                    {scannedCustomer.last_order.items_summary}
                  </p>
                </div>
              )}

              {/* 1-Click Reorder Button */}
              <button
                onClick={handle1ClickReorder}
                disabled={isSuccess}
                className="w-full py-3 px-4 bg-accent hover:bg-accent-dark text-white rounded-xl font-extrabold text-sm neo-border neo-shadow-accent flex items-center justify-center gap-2 transition-all active:translate-x-0.5 active:translate-y-0.5"
              >
                {isSuccess ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-white" />
                    <span>Pesanan Siap! Membuka Keranjang...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-200" />
                    <span>Ulangi Pesanan Terakhir (1-Click Re-Order)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 3: Desain Stiker Kardus Fisik */}
          {activeTab === 'sticker' && (
            <div className="flex flex-col items-center justify-center p-3">
              <div className="w-64 bg-white rounded-2xl border-2 border-ink shadow-hard-lg overflow-hidden text-center relative">
                {/* Sticker Header */}
                <div className="p-3 bg-gradient-to-r from-sky-50 to-blue-50 border-b border-slate-200">
                  <div className="flex items-center justify-center gap-1.5 text-primary">
                    <RotateCcw className="w-4 h-4 stroke-[3]" />
                    <span className="font-display font-black text-sm uppercase tracking-tight">
                      QR Re-Order
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-600 mt-0.5">
                    Pesan Lagi, Lebih Cepat!
                  </p>
                </div>

                {/* QR Code Illustration */}
                <div className="p-4 flex flex-col items-center justify-center bg-white">
                  <div className="p-2 border-2 border-ink rounded-xl bg-white shadow-sm inline-block">
                    {/* SVG Vector QR Code */}
                    <svg className="w-32 h-32" viewBox="0 0 100 100" fill="currentColor">
                      <path d="M0,0 h30 v30 h-30 z M6,6 v18 h18 v-18 z M10,10 h10 v10 h-10 z" />
                      <path d="M70,0 h30 v30 h-30 z M76,6 v18 h18 v-18 z M80,10 h10 v10 h-10 z" />
                      <path d="M0,70 h30 v30 h-30 z M6,76 v18 h18 v-18 z M10,80 h10 v10 h-10 z" />
                      <rect x="36" y="10" width="8" height="8" />
                      <rect x="48" y="10" width="14" height="8" />
                      <rect x="36" y="24" width="10" height="10" />
                      <rect x="52" y="24" width="8" height="8" />
                      <rect x="10" y="36" width="14" height="8" />
                      <rect x="28" y="40" width="8" height="14" />
                      <rect x="40" y="40" width="20" height="20" />
                      <rect x="68" y="36" width="10" height="12" />
                      <rect x="84" y="40" width="8" height="18" />
                      <rect x="36" y="68" width="12" height="12" />
                      <rect x="54" y="68" width="8" height="8" />
                      <rect x="68" y="68" width="14" height="8" />
                      <rect x="50" y="82" width="16" height="10" />
                      <rect x="74" y="82" width="18" height="10" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 mt-1">
                    ID: WARUNG-BAROKAH-2026
                  </span>
                </div>

                {/* 3 Checklist points */}
                <div className="px-4 py-2 text-left space-y-1.5 text-xs font-bold text-slate-700 bg-slate-50 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-eco" />
                    <span>Scan QR</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-eco" />
                    <span>Lihat Riwayat Pesanan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-eco" />
                    <span>Pesan Ulang Dalam 1 Klik</span>
                  </div>
                </div>

                {/* Bottom stripes */}
                <div className="h-2 bg-accent" />
                <div className="h-3 bg-primary" />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 border-t-2 border-ink bg-slate-50 flex justify-end">
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="py-2 px-5 bg-white hover:bg-slate-100 text-ink rounded-xl text-xs font-bold neo-border"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
