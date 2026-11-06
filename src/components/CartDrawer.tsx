import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  Truck, 
  Store, 
  Send, 
  ShieldCheck, 
  UserCheck,
  Scale,
  FileDown,
  Printer
} from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { useSettingsStore } from '../stores/settingsStore';
import { sanitizeNote, generateVerificationChecksum } from '../lib/security';
import { generateInvoicePDF } from '../lib/pdfGenerator';
import { ThermalReceiptModal } from './ThermalReceiptModal';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQR: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, onOpenQR }) => {
  const storeSettings = useSettingsStore();

  const items = useCartStore((state) => state.items);
  const updateQty = useCartStore((state) => state.updateQty);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  
  const customer = useCartStore((state) => state.customer);
  const deliveryMethod = useCartStore((state) => state.deliveryMethod);
  const setDeliveryMethod = useCartStore((state) => state.setDeliveryMethod);
  const customerNote = useCartStore((state) => state.customerNote);
  const setCustomerNote = useCartStore((state) => state.setCustomerNote);

  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const getTotalQty = useCartStore((state) => state.getTotalQty);
  const getTotalWeightKg = useCartStore((state) => state.getTotalWeightKg);

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestAddress, setGuestAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Thermal 58mm Receipt Modal State
  const [isThermalOpen, setIsThermalOpen] = useState(false);
  const [thermalReceiptData, setThermalReceiptData] = useState<any>(null);

  if (!isOpen) return null;

  const subtotal = getSubtotal();
  const totalQty = getTotalQty();
  const totalWeightKg = getTotalWeightKg();

  // Smart Logistics Calculation (Motor vs Mobil MPV vs Lalamove / Kargo)
  let logisticsRecommendation = '🛵 Muat Kurir Motor (Gojek / Grab / Maxim)';
  const hasDus = items.some((i) => i.unit_code === 'DUS');
  const dusCount = items.filter((i) => i.unit_code === 'DUS').reduce((acc, curr) => acc + curr.qty, 0);

  if (totalWeightKg > 20 || dusCount >= 3) {
    logisticsRecommendation = '🚐 Rekomendasi: Lalamove Van / Pick-up / Kargo Dakota (Muatan Bal/Dus Besar)';
  } else if (totalWeightKg > 7 || hasDus) {
    logisticsRecommendation = '🛺 Rekomendasi: GrabExpress Car / Motor Tossa Roda Tiga (Barang Sedang)';
  }

  const handleSendToWhatsApp = async () => {
    if (items.length === 0) return;
    setIsSubmitting(true);

    try {
      const sanitizedNote = sanitizeNote(customerNote);
      const customerName = customer?.business_name || guestName || 'Pelanggan Toko Plastik';
      const customerPhone = customer?.phone_number || guestPhone || '-';
      const customerAddress = customer?.delivery_address || guestAddress || '-';

      // 1. Generate Order Number & Security Checksum
      const orderNumber = `TP-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const checksumData = {
        order_number: orderNumber,
        items: items.map((i) => ({ sku: i.sku, qty: i.qty, price: i.price })),
        subtotal,
        deliveryMethod,
        token: customer?.qr_token || 'guest'
      };

      const { code } = await generateVerificationChecksum(checksumData);

      // 2. Format Delivery Label
      const deliveryLabels: Record<string, string> = {
        pickup: `Ambil Sendiri di Toko (${storeSettings.address})`,
        instant: 'Kurir Instan (Gojek / Grab / Lalamove)',
        kargo: 'Ekspedisi Kargo (Dakota / Baraka / Bal-balan)'
      };

      // 3. Format WhatsApp Text (Clean, Professional, Indented)
      let text = `Halo Admin *${storeSettings.storeName}*!\n`;
      text += `Saya ingin melakukan pemesanan plastik & kemasan:\n\n`;
      text += `📄 *NOMOR PESANAN:* ${orderNumber}\n`;
      text += `👤 *PEMESAN:* ${customerName}\n`;
      text += `📱 *NO. HP:* ${customerPhone}\n`;
      if (deliveryMethod !== 'pickup') {
        text += `📍 *ALAMAT KIRIM:* ${customerAddress}\n`;
      } else {
        text += `📍 *LOKASI PICKUP:* ${storeSettings.address}\n`;
      }
      text += `🚚 *METODE:* ${deliveryLabels[deliveryMethod]}\n`;
      text += `⚖️ *ESTIMASI BERAT:* ${totalWeightKg} Kg\n\n`;

      text += `📋 *RINCIAN DAFTAR BARANG:*\n`;
      items.forEach((item, idx) => {
        const lineTotal = item.price * item.qty;
        text += `${idx + 1}. *${item.product_name}*\n`;
        text += `   • Varian: ${item.variant_name}\n`;
        text += `   • Satuan: ${item.unit_name}\n`;
        text += `   • Qty: ${item.qty} ${item.unit_code} x Rp ${item.price.toLocaleString('id-ID')} = *Rp ${lineTotal.toLocaleString('id-ID')}*\n`;
      });

      text += `\n💰 *TOTAL PEMBAYARAN:* Rp ${subtotal.toLocaleString('id-ID')}\n`;

      if (sanitizedNote) {
        text += `\n📝 *CATATAN KHUSUS:* ${sanitizedNote}\n`;
      }

      text += `\n🔒 *KODE INTEGRITAS:* [VERIF: ${code}]\n`;
      text += `_Mohon info ketersediaan stok & nomor rekening pembayaran. Terima kasih!_`;

      const encodedUrl = `https://wa.me/${storeSettings.phone}?text=${encodeURIComponent(text)}`;
      window.open(encodedUrl, '_blank');
    } catch (err) {
      console.error('Gagal memproses pesanan:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenThermalReceipt = async () => {
    if (items.length === 0) return;
    const orderNumber = `TP-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const checksumData = {
      order_number: orderNumber,
      items: items.map((i) => ({ sku: i.sku, qty: i.qty, price: i.price })),
      subtotal,
      deliveryMethod,
      token: customer?.qr_token || 'guest'
    };
    const { code } = await generateVerificationChecksum(checksumData);

    const deliveryLabels: Record<string, string> = {
      pickup: 'Ambil di Toko Fisik',
      instant: 'Kurir Instan Lokal',
      kargo: 'Ekspedisi Kargo Bal'
    };

    setThermalReceiptData({
      orderNumber,
      customerName: customer?.business_name || guestName || 'Pelanggan Umum',
      customerPhone: customer?.phone_number || guestPhone || '-',
      customerAddress: customer?.delivery_address || guestAddress || '-',
      deliveryMethodName: deliveryLabels[deliveryMethod] || 'Kurir Toko',
      items,
      subtotal,
      totalWeightKg,
      verificationCode: code
    });

    setIsThermalOpen(true);
  };

  const handleDownloadInvoice = async () => {
    if (items.length === 0) return;
    const orderNumber = `TP-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const checksumData = {
      order_number: orderNumber,
      items: items.map((i) => ({ sku: i.sku, qty: i.qty, price: i.price })),
      subtotal,
      deliveryMethod,
      token: customer?.qr_token || 'guest'
    };
    const { code } = await generateVerificationChecksum(checksumData);

    const deliveryLabels: Record<string, string> = {
      pickup: 'Ambil di Toko Fisik',
      instant: 'Kurir Instan Lokal',
      kargo: 'Ekspedisi Kargo Bal'
    };

    generateInvoicePDF({
      orderNumber,
      customerName: customer?.business_name || guestName || 'Pelanggan Toko Plastik',
      customerPhone: customer?.phone_number || guestPhone || '-',
      deliveryMethod: deliveryLabels[deliveryMethod] || 'Kurir Toko',
      deliveryAddress: customer?.delivery_address || guestAddress || '-',
      items,
      subtotal,
      totalWeightKg,
      verificationCode: code
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-ink/70 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l-2 border-ink neo-shadow-lg flex flex-col justify-between">
          
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b-2 border-ink bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center neo-border shadow-sm">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-black text-lg text-ink">
                  Keranjang Belanja
                </h3>
                <span className="text-xs font-semibold text-slate-500">
                  {totalQty} item pesanan dipilih
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-ink hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            
            {/* Customer Status Banner */}
            {customer ? (
              <div className="p-3 rounded-xl bg-emerald-50 border-2 border-eco flex items-start justify-between">
                <div className="flex items-start gap-2.5">
                  <UserCheck className="w-5 h-5 text-eco shrink-0 mt-0.5" />
                  <div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-eco text-white">
                      Mitra Langganan Terverifikasi
                    </span>
                    <h4 className="font-extrabold text-sm text-ink mt-1">
                      {customer.business_name}
                    </h4>
                    <p className="text-xs text-slate-600">
                      {customer.contact_person} • {customer.district_area}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                onClick={onOpenQR}
                className="p-3 rounded-xl bg-sky-50 border-2 border-primary/40 cursor-pointer hover:bg-sky-100 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🏷️</span>
                  <div>
                    <h5 className="font-extrabold text-xs text-primary-dark">
                      Punya Stiker QR di Kardus Kemasan?
                    </h5>
                    <p className="text-[11px] text-slate-600">
                      Scan QR untuk auto-fill nama & alamat mitra
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-primary underline">
                  Scan QR
                </span>
              </div>
            )}

            {/* Smart Logistics Suggestion Card */}
            {items.length > 0 && (
              <div className="p-2.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-300 text-xs font-bold text-amber-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-accent shrink-0" />
                <span className="leading-tight">{logisticsRecommendation}</span>
              </div>
            )}

            {/* List of Cart Items */}
            {items.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <ShoppingBag className="w-12 h-12 mx-auto stroke-1 mb-2 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">Keranjang Masih Kosong</p>
                <p className="text-xs text-slate-400 mt-1">Pilih produk plastik atau ukuran yang Anda butuhkan.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500">
                  <span>Daftar Item ({items.length})</span>
                  <button 
                    onClick={clearCart}
                    className="text-red-500 hover:underline text-[11px] flex items-center gap-1 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan</span>
                  </button>
                </div>

                {items.map((item) => {
                  const lineTotal = item.price * item.qty;
                  return (
                    <div
                      key={item.unit_id}
                      className="p-3 rounded-xl border-2 border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-extrabold text-xs sm:text-sm text-ink leading-tight">
                            {item.product_name}
                          </h4>
                          <p className="text-[11px] font-semibold text-primary mt-0.5">
                            {item.variant_name} • <span className="text-slate-600">{item.unit_name}</span>
                          </p>
                        </div>

                        <button
                          onClick={() => removeItem(item.unit_id)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        {/* Stepper buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQty(item.unit_id, item.qty - 1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-ink flex items-center justify-center font-bold text-sm"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center font-black text-sm text-ink">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => updateQty(item.unit_id, item.qty + 1)}
                            className="w-7 h-7 rounded-lg bg-primary hover:bg-primary-dark text-white flex items-center justify-center font-bold text-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Line Subtotal */}
                        <div className="text-right">
                          <span className="font-extrabold text-sm text-accent">
                            Rp {lineTotal.toLocaleString('id-ID')}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            @ Rp {item.price.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Delivery Method Selection */}
            {items.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  Pilih Pengiriman / Pengambilan:
                </label>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('instant')}
                    className={`p-2.5 rounded-xl border-2 font-extrabold flex flex-col items-center gap-1 transition-all ${
                      deliveryMethod === 'instant'
                        ? 'border-primary bg-primary-light text-primary-dark shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    <span>Instan Lokal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('pickup')}
                    className={`p-2.5 rounded-xl border-2 font-extrabold flex flex-col items-center gap-1 transition-all ${
                      deliveryMethod === 'pickup'
                        ? 'border-primary bg-primary-light text-primary-dark shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                    <span>Ambil di Toko</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('kargo')}
                    className={`p-2.5 rounded-xl border-2 font-extrabold flex flex-col items-center gap-1 transition-all ${
                      deliveryMethod === 'kargo'
                        ? 'border-primary bg-primary-light text-primary-dark shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <Scale className="w-4 h-4" />
                    <span>Kargo Bal</span>
                  </button>
                </div>
              </div>
            )}

            {/* Guest Info Form (if not logged in via QR) */}
            {items.length > 0 && !customer && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  Data Pemesan:
                </label>
                <input
                  type="text"
                  placeholder="Nama Usaha / Nama Anda (cth: Warung Barokah)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-300 focus:border-primary focus:outline-none"
                />
                <input
                  type="tel"
                  placeholder="Nomor WhatsApp aktif"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-300 focus:border-primary focus:outline-none"
                />
                {deliveryMethod !== 'pickup' && (
                  <textarea
                    placeholder="Alamat Pengiriman lengkap (Kelurahan/Kecamatan)"
                    value={guestAddress}
                    onChange={(e) => setGuestAddress(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-300 focus:border-primary focus:outline-none"
                  />
                )}
              </div>
            )}

            {/* Optional Order Note */}
            {items.length > 0 && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Catatan untuk Admin Toko (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Cth: Kirim sebelum jam 2 siang / minta nota fisik"
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-300 focus:border-primary focus:outline-none"
                />
              </div>
            )}

          </div>

          {/* Drawer Footer (Summary, WhatsApp & PDF Download) */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t-2 border-ink bg-slate-50 space-y-3">
              {/* Weight & Total Summary */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Estimasi Berat Barang:</span>
                  <span className="font-bold text-ink">± {totalWeightKg} Kg</span>
                </div>
                <div className="flex items-center justify-between text-base">
                  <span className="font-extrabold text-ink">Total Estimasi:</span>
                  <span className="font-display font-black text-2xl text-accent">
                    Rp {subtotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Security Integrity Notice */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span>Terverifikasi Kriptografis (Anti-Manipulasi Harga)</span>
              </div>

              {/* Action Buttons: WhatsApp, Thermal 58mm & PDF Invoice */}
              <div className="space-y-2">
                <button
                  onClick={handleSendToWhatsApp}
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 bg-accent hover:bg-accent-dark text-white rounded-xl font-extrabold text-sm sm:text-base neo-border-thick neo-shadow-accent flex items-center justify-center gap-2 transition-all active:translate-x-0.5 active:translate-y-0.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Pesanan ke WhatsApp</span>
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleOpenThermalReceipt}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs neo-border shadow-sm flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Struk 58mm</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadInvoice}
                    className="py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-800 rounded-xl font-bold text-xs neo-border flex items-center justify-center gap-1.5 transition-all"
                  >
                    <FileDown className="w-4 h-4 text-primary" />
                    <span>Faktur A4</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 58mm POS Thermal Receipt Preview & Direct Print Modal */}
      {thermalReceiptData && (
        <ThermalReceiptModal
          isOpen={isThermalOpen}
          onClose={() => setIsThermalOpen(false)}
          orderNumber={thermalReceiptData.orderNumber}
          customerName={thermalReceiptData.customerName}
          customerPhone={thermalReceiptData.customerPhone}
          customerAddress={thermalReceiptData.customerAddress}
          deliveryMethodName={thermalReceiptData.deliveryMethodName}
          items={thermalReceiptData.items}
          subtotal={thermalReceiptData.subtotal}
          totalWeightKg={thermalReceiptData.totalWeightKg}
          verificationCode={thermalReceiptData.verificationCode}
        />
      )}
    </div>
  );
};
