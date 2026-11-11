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
  Printer,
  Banknote,
  CreditCard,
  CalendarClock,
  CheckCircle2,
  Zap
} from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useSalesStore } from '../stores/salesStore';
import { useCatalogStore } from '../stores/catalogStore';
import { saveOrderToFirebase } from '../services/firebaseSync';
import { sanitizeNote, generateVerificationChecksum } from '../lib/security';
import { generateInvoicePDF } from '../lib/pdfGenerator';
import { tryAutoPrintPlastikReceipt } from '../lib/bluetoothPrinter';
import { ThermalReceiptModal } from './ThermalReceiptModal';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQR: () => void;
}

function getQuickCashPresets(subtotal: number): number[] {
  if (subtotal <= 0) return [];
  const candidates = [
    subtotal,
    Math.ceil(subtotal / 10000) * 10000,
    Math.ceil(subtotal / 50000) * 50000,
    Math.ceil(subtotal / 100000) * 100000,
    20000,
    50000,
    100000,
    200000,
    500000
  ];
  const unique = Array.from(new Set(candidates.filter((v) => v >= subtotal))).sort((a, b) => a - b);
  return unique.slice(0, 4);
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
  const recordCheckoutOrder = useSalesStore((state) => state.recordCheckoutOrder);

  // Mode Transaksi: Pesan Online / Kirim vs Beli Langsung di Toko (Walk-In Orang Lewat)
  const [checkoutMode, setCheckoutMode] = useState<'online' | 'walkin'>('online');

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestAddress, setGuestAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Walk-In Kasir Cepat States
  const [walkInLabel, setWalkInLabel] = useState('');
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('');
  const [walkInError, setWalkInError] = useState<string | null>(null);
  const [walkInSuccessBanner, setWalkInSuccessBanner] = useState<string | null>(null);

  // Payment Method & Tempo States
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'tempo'>('cash');
  const [tempoDays, setTempoDays] = useState<number>(7);

  // Thermal 58mm Receipt Modal State
  const [isThermalOpen, setIsThermalOpen] = useState(false);
  const [thermalReceiptData, setThermalReceiptData] = useState<any>(null);

  if (!isOpen) return null;

  const subtotal = getSubtotal();
  const totalQty = getTotalQty();
  const totalWeightKg = getTotalWeightKg();
  const quickCashPresets = getQuickCashPresets(subtotal);

  const cashReceivedNum = cashReceivedInput !== '' ? Math.max(0, Number(cashReceivedInput) || 0) : 0;
  const cashChangeNum = cashReceivedInput !== '' ? Math.max(0, cashReceivedNum - subtotal) : 0;
  const isCashShort =
    checkoutMode === 'walkin' &&
    paymentMethod === 'cash' &&
    cashReceivedInput !== '' &&
    cashReceivedNum < subtotal;

  let logisticsRecommendation = '🛵 Muat Kurir Motor (Gojek / Grab / Maxim)';
  const hasDus = items.some((i) => i.unit_code === 'DUS');
  const dusCount = items.filter((i) => i.unit_code === 'DUS').reduce((acc, curr) => acc + curr.qty, 0);

  if (totalWeightKg > 20 || dusCount >= 3) {
    logisticsRecommendation = '🚐 Rekomendasi: Lalamove Van / Pick-up / Kargo Dakota (Muatan Bal/Dus Besar)';
  } else if (totalWeightKg > 7 || hasDus) {
    logisticsRecommendation = '🛺 Rekomendasi: GrabExpress Car / Motor Tossa Roda Tiga (Barang Sedang)';
  }

  const handleSwitchMode = (mode: 'online' | 'walkin') => {
    setCheckoutMode(mode);
    setWalkInError(null);
    setWalkInSuccessBanner(null);
    if (mode === 'walkin') {
      setDeliveryMethod('pickup');
      if (paymentMethod === 'tempo') {
        setPaymentMethod('cash');
      }
    }
  };

  const handleSendToWhatsApp = async () => {
    if (items.length === 0) return;
    setIsSubmitting(true);

    try {
      const sanitizedNote = sanitizeNote(customerNote);
      const customerName = customer?.business_name || guestName || 'Pelanggan Toko Plastik';
      const customerPhone = customer?.phone_number || guestPhone || '-';
      const customerAddress = customer?.delivery_address || guestAddress || '-';

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
        pickup: `Ambil Sendiri di Toko (${storeSettings.address})`,
        instant: 'Kurir Instan (Gojek / Grab / Lalamove)',
        kargo: 'Ekspedisi Kargo (Dakota / Baraka / Bal-balan)'
      };

      const isTempo = paymentMethod === 'tempo';
      const paymentLabels: Record<string, string> = {
        cash: 'Tunai / Cash (Lunas)',
        transfer: 'Transfer Bank (Lunas)',
        tempo: `Tempo ${tempoDays} Hari (Belum Lunas)`
      };

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
      text += `🚚 *PENGIRIMAN:* ${deliveryLabels[deliveryMethod]}\n`;
      text += `💳 *METODE BAYAR:* ${paymentLabels[paymentMethod]}\n`;
      if (isTempo) {
        const dueDateObj = new Date(Date.now() + tempoDays * 24 * 60 * 60 * 1000);
        text += `⏳ *JATUH TEMPO:* ${dueDateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}\n`;
      }
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
      text += `_Mohon info ketersediaan stok & konfirmasi pesanan. Terima kasih!_`;

      useCatalogStore.getState().deductStock(items, orderNumber);

      const dueDateIso = isTempo ? new Date(Date.now() + tempoDays * 24 * 60 * 60 * 1000).toISOString() : undefined;
      try {
        const recordedOrder = recordCheckoutOrder({
          orderNumber,
          items,
          customerName,
          customerPhone,
          customerId: customer?.id,
          deliveryMethod: deliveryLabels[deliveryMethod] || 'Kurir Toko',
          source: customer?.qr_token ? 'qr_reorder' : 'whatsapp_checkout',
          paymentMethod,
          dueDate: dueDateIso
        });
        saveOrderToFirebase(recordedOrder).catch((e) => console.warn('Sync order to Firebase error:', e));
      } catch (recErr) {
        console.warn('Gagal record sales order:', recErr);
      }

      const encodedUrl = `https://wa.me/${storeSettings.phone}?text=${encodeURIComponent(text)}`;
      window.open(encodedUrl, '_blank');
    } catch (err) {
      console.error('Gagal memproses pesanan:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Memproses transaksi POS / Struk Kasir (baik mode Walk-In maupun Online).
   * Di mode Walk-In: menghitung kembalian tunai dan otomatis mengosongkan keranjang setelah selesai.
   */
  const handlePosCheckout = async (withReceiptModal: boolean) => {
    if (items.length === 0) return;
    setWalkInError(null);

    if (checkoutMode === 'walkin' && paymentMethod === 'cash' && cashReceivedInput !== '' && cashReceivedNum < subtotal) {
      setWalkInError(
        `Uang tunai kurang Rp ${(subtotal - cashReceivedNum).toLocaleString('id-ID')}! Klik "Uang Pas" atau masukkan nominal yang cukup.`
      );
      return;
    }

    const itemsSnapshot = items.map((i) => ({ ...i }));
    const subtotalSnapshot = subtotal;
    const weightSnapshot = totalWeightKg;

    const orderNumber = `TP-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const checksumData = {
      order_number: orderNumber,
      items: itemsSnapshot.map((i) => ({ sku: i.sku, qty: i.qty, price: i.price })),
      subtotal: subtotalSnapshot,
      deliveryMethod: checkoutMode === 'walkin' ? 'pickup' : deliveryMethod,
      token: customer?.qr_token || (checkoutMode === 'walkin' ? 'walkin' : 'guest')
    };
    const { code } = await generateVerificationChecksum(checksumData);

    const deliveryLabels: Record<string, string> = {
      pickup: checkoutMode === 'walkin' ? 'Beli Langsung di Toko' : 'Ambil di Toko Fisik',
      instant: 'Kurir Instan Lokal',
      kargo: 'Ekspedisi Kargo Bal'
    };

    const effectiveDeliveryKey = checkoutMode === 'walkin' ? 'pickup' : deliveryMethod;
    const finalDeliveryName = deliveryLabels[effectiveDeliveryKey] || 'Beli Langsung di Toko';

    const finalCustomerName =
      checkoutMode === 'walkin'
        ? walkInLabel.trim() || customer?.business_name || 'Pembeli Langsung (Walk-In)'
        : customer?.business_name || guestName.trim() || 'Pelanggan Toko Fisik';

    const isTempo = paymentMethod === 'tempo';
    const dueDateIso = isTempo ? new Date(Date.now() + tempoDays * 24 * 60 * 60 * 1000).toISOString() : undefined;

    const finalCashReceived =
      paymentMethod === 'cash'
        ? cashReceivedInput !== ''
          ? cashReceivedNum
          : subtotalSnapshot
        : undefined;
    const finalCashChange =
      paymentMethod === 'cash' && finalCashReceived !== undefined
        ? Math.max(0, finalCashReceived - subtotalSnapshot)
        : undefined;

    // 1. Potong Stok Real-Time
    useCatalogStore.getState().deductStock(itemsSnapshot, orderNumber);

    // 2. Catat Transaksi ke Sales Store & Cloud Firebase
    try {
      const recordedOrder = recordCheckoutOrder({
        orderNumber,
        items: itemsSnapshot,
        customerName: finalCustomerName,
        customerPhone: checkoutMode === 'walkin' ? '-' : customer?.phone_number || guestPhone || '-',
        customerId: checkoutMode === 'walkin' ? undefined : customer?.id,
        deliveryMethod: finalDeliveryName,
        source: 'pos_thermal',
        paymentMethod,
        dueDate: dueDateIso,
        cashReceived: finalCashReceived,
        cashChange: finalCashChange
      });
      saveOrderToFirebase(recordedOrder).catch((e) => console.warn('Sync thermal order error:', e));
    } catch (recErr) {
      console.warn('Gagal record thermal order:', recErr);
    }

    if (withReceiptModal) {
      setThermalReceiptData({
        orderNumber,
        customerName: finalCustomerName,
        customerPhone: customer?.phone_number || guestPhone || '-',
        customerAddress: customer?.delivery_address || guestAddress || '-',
        deliveryMethodName: finalDeliveryName,
        items: itemsSnapshot,
        subtotal: subtotalSnapshot,
        totalWeightKg: weightSnapshot,
        verificationCode: code,
        paymentMethod,
        dueDate: dueDateIso,
        cashReceived: finalCashReceived,
        cashChange: finalCashChange
      });

      if (storeSettings.autoPrintBluetooth && !isTempo) {
        tryAutoPrintPlastikReceipt(
          {
            orderNumber,
            customerName: finalCustomerName,
            deliveryMethodName: finalDeliveryName,
            items: itemsSnapshot,
            subtotal: subtotalSnapshot,
            totalWeightKg: weightSnapshot,
            verificationCode: code,
            paymentMethod,
            paymentStatus: 'paid',
            cashReceived: finalCashReceived,
            cashChange: finalCashChange
          },
          storeSettings
        ).catch(() => {});
      }

      setIsThermalOpen(true);
    } else {
      setWalkInSuccessBanner(
        `✅ Transaksi ${orderNumber} (Rp ${subtotalSnapshot.toLocaleString('id-ID')}) LUNAS${
          finalCashChange && finalCashChange > 0
            ? ` • Kembalian: Rp ${finalCashChange.toLocaleString('id-ID')}`
            : ''
        }! Stok terpotong & keranjang siap untuk pembeli berikutnya.`
      );
      setTimeout(() => setWalkInSuccessBanner(null), 6000);
    }

    // Jika mode kasir walk-in: otomatis bersihkan keranjang & input agar siap melayani orang berikutnya
    if (checkoutMode === 'walkin') {
      clearCart();
      setCashReceivedInput('');
      setWalkInLabel('');
      setCustomerNote('');
    }
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
      pickup: checkoutMode === 'walkin' ? 'Beli Langsung di Toko' : 'Ambil di Toko Fisik',
      instant: 'Kurir Instan Lokal',
      kargo: 'Ekspedisi Kargo Bal'
    };

    generateInvoicePDF({
      orderNumber,
      customerName:
        checkoutMode === 'walkin'
          ? walkInLabel.trim() || 'Pembeli Langsung (Walk-In)'
          : customer?.business_name || guestName || 'Pelanggan Toko Plastik',
      customerPhone: checkoutMode === 'walkin' ? '-' : customer?.phone_number || guestPhone || '-',
      deliveryMethod: deliveryLabels[checkoutMode === 'walkin' ? 'pickup' : deliveryMethod] || 'Kurir Toko',
      deliveryAddress: checkoutMode === 'walkin' ? storeSettings.address : customer?.delivery_address || guestAddress || '-',
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
                {checkoutMode === 'walkin' ? <Store className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-display font-black text-lg text-ink">
                  {checkoutMode === 'walkin' ? 'Kasir Toko (Walk-In)' : 'Keranjang Belanja'}
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

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Mode Switcher: Online Order vs Beli Langsung di Toko */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-300">
              <button
                type="button"
                onClick={() => handleSwitchMode('online')}
                className={`py-2 px-2.5 rounded-xl font-black text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all ${
                  checkoutMode === 'online'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 hover:text-ink'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Pesan / Kirim WA</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchMode('walkin')}
                className={`py-2 px-2.5 rounded-xl font-black text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all ${
                  checkoutMode === 'walkin'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-ink'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Beli Langsung (Kasir)</span>
              </button>
            </div>

            {/* Banner sukses setelah transaksi walk-in selesai */}
            {walkInSuccessBanner && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-900 text-xs font-extrabold flex items-start gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{walkInSuccessBanner}</span>
              </div>
            )}

            {/* Mode Info Banner */}
            {checkoutMode === 'walkin' ? (
              <div className="p-3 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-xs text-emerald-950 space-y-0.5">
                <div className="font-black flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mode Pembeli Langsung (Orang Lewat / Walk-In)</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Tidak perlu daftar mitra atau isi nomor WA/alamat. Langsung hitung kembalian, potong stok & catat ke laci kasir.
                </p>
              </div>
            ) : customer ? (
              <div className="p-3 rounded-xl bg-emerald-50 border-2 border-eco flex items-start justify-between">
                <div className="flex items-start gap-2.5">
                  <UserCheck className="w-5 h-5 text-eco shrink-0 mt-0.5" />
                  <div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-eco text-white">
                      Mitra Langganan Terverifikasi
                    </span>
                    <h4 className="font-extrabold text-sm text-ink mt-1">{customer.business_name}</h4>
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
                <span className="text-xs font-black text-primary underline">Scan QR</span>
              </div>
            )}

            {/* Smart Logistics Suggestion Card (hanya mode kirim online) */}
            {items.length > 0 && checkoutMode === 'online' && (
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
                <p className="text-xs text-slate-400 mt-1">
                  Pilih produk plastik dari katalog untuk pembeli berikutnya.
                </p>
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQty(item.unit_id, item.qty - 1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-ink flex items-center justify-center font-bold text-sm"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center font-black text-sm text-ink">{item.qty}</span>
                          <button
                            onClick={() => updateQty(item.unit_id, item.qty + 1)}
                            className="w-7 h-7 rounded-lg bg-primary hover:bg-primary-dark text-white flex items-center justify-center font-bold text-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

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

            {/* Delivery Method Selection (Hanya di Mode Online) */}
            {items.length > 0 && checkoutMode === 'online' && (
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

            {/* Payment Method & Cash Calculator */}
            {items.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-slate-200">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  Metode Pembayaran:
                </label>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('cash');
                      setWalkInError(null);
                    }}
                    className={`p-2 rounded-xl border-2 font-extrabold flex flex-col items-center gap-1 transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Tunai (Lunas)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('transfer');
                      setWalkInError(null);
                    }}
                    className={`p-2 rounded-xl border-2 font-extrabold flex flex-col items-center gap-1 transition-all ${
                      paymentMethod === 'transfer'
                        ? 'border-primary bg-primary-light text-primary-dark shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-primary" />
                    <span>Transfer / QRIS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('tempo');
                      setWalkInError(null);
                    }}
                    className={`p-2 rounded-xl border-2 font-extrabold flex flex-col items-center gap-1 transition-all ${
                      paymentMethod === 'tempo'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <CalendarClock className="w-4 h-4 text-amber-600" />
                    <span>Tempo (Piutang)</span>
                  </button>
                </div>

                {/* Kalkulator Kembalian Tunai untuk Walk-In */}
                {checkoutMode === 'walkin' && paymentMethod === 'cash' && (
                  <div className="p-3.5 bg-emerald-50/70 rounded-2xl border-2 border-emerald-300 space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-emerald-950">
                        Uang Tunai Diterima (Rp):
                      </label>
                      {cashReceivedInput !== '' && (
                        <button
                          type="button"
                          onClick={() => {
                            setCashReceivedInput('');
                            setWalkInError(null);
                          }}
                          className="text-[11px] font-bold text-slate-500 hover:text-ink underline"
                        >
                          Reset Uang Pas
                        </button>
                      )}
                    </div>

                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={cashReceivedInput}
                      onChange={(e) => {
                        setCashReceivedInput(e.target.value);
                        setWalkInError(null);
                      }}
                      placeholder={`Uang Pas: Rp ${subtotal.toLocaleString('id-ID')}`}
                      className="w-full h-11 px-3.5 font-mono font-black text-base text-ink bg-white border-2 border-emerald-300 rounded-xl focus:border-emerald-600 outline-none"
                    />

                    {/* Smart Quick Cash Denominations */}
                    <div className="flex flex-wrap gap-1.5">
                      {quickCashPresets.map((nominal) => (
                        <button
                          key={nominal}
                          type="button"
                          onClick={() => {
                            setCashReceivedInput(String(nominal));
                            setWalkInError(null);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all ${
                            cashReceivedNum === nominal && cashReceivedInput !== ''
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          {nominal === subtotal
                            ? `⚡ Pas (${nominal.toLocaleString('id-ID')})`
                            : `Rp ${nominal.toLocaleString('id-ID')}`}
                        </button>
                      ))}
                    </div>

                    {/* Display Kembalian / Kurang */}
                    <div
                      className={`p-2.5 rounded-xl flex items-center justify-between text-xs font-black ${
                        isCashShort
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : 'bg-white text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      <span>{isCashShort ? '⚠️ Uang Kurang:' : '💵 Kembalian:'}</span>
                      <span className="font-mono text-sm">
                        {isCashShort
                          ? `-Rp ${(subtotal - cashReceivedNum).toLocaleString('id-ID')}`
                          : `Rp ${cashChangeNum.toLocaleString('id-ID')}`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Opsi Jatuh Tempo */}
                {paymentMethod === 'tempo' && (
                  <div className="p-3 bg-amber-50/90 rounded-2xl border border-amber-300 space-y-2 animate-fadeIn text-left">
                    <div className="flex items-center justify-between text-xs font-black text-amber-950">
                      <span>Jatuh Tempo:</span>
                      <span className="font-mono text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-200">
                        {new Date(Date.now() + tempoDays * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      {[7, 14, 30].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setTempoDays(days)}
                          className={`py-1 px-2 rounded-lg font-black border transition-all text-xs ${
                            tempoDays === days
                              ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          {days} Hari
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-amber-900 font-medium leading-tight">
                      * Dicatat ke <strong>Buku Piutang Mitra</strong> sebagai tagihan belum lunas.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Label / Nama Pembeli Singkat (Walk-In) ATAU Form Lengkap (Online) */}
            {items.length > 0 && checkoutMode === 'walkin' && (
              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
                  Nama / Ciri Pembeli (Opsional):
                </label>
                <input
                  type="text"
                  placeholder='Boleh dikosongkan (otomatis: "Pembeli Langsung")'
                  value={walkInLabel}
                  onChange={(e) => setWalkInLabel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-300 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            )}

            {items.length > 0 && checkoutMode === 'online' && !customer && (
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

            {items.length > 0 && checkoutMode === 'online' && (
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

          {/* Drawer Footer */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t-2 border-ink bg-slate-50 space-y-3">
              {walkInError && (
                <div className="p-2.5 bg-red-100 border border-red-300 text-red-700 rounded-xl text-xs font-bold">
                  {walkInError}
                </div>
              )}

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Estimasi Berat Barang:</span>
                  <span className="font-bold text-ink">± {totalWeightKg} Kg</span>
                </div>
                <div className="flex items-center justify-between text-base">
                  <span className="font-extrabold text-ink">Total Tagihan:</span>
                  <span className="font-display font-black text-2xl text-accent">
                    Rp {subtotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <span>Terverifikasi Kriptografis &amp; Potong Stok Otomatis</span>
              </div>

              {checkoutMode === 'walkin' ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={isCashShort}
                    onClick={() => handlePosCheckout(true)}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm sm:text-base neo-border-thick neo-shadow flex items-center justify-center gap-2 transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
                  >
                    <Printer className="w-5 h-5" />
                    <span>Bayar &amp; Cetak Struk Kasir</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isCashShort}
                      onClick={() => handlePosCheckout(false)}
                      className="py-2.5 px-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-black text-xs neo-border shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Lunas (Tanpa Struk)</span>
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
              ) : (
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
                      onClick={() => handlePosCheckout(true)}
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
              )}
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
          paymentMethod={thermalReceiptData.paymentMethod}
          dueDate={thermalReceiptData.dueDate}
          cashReceived={thermalReceiptData.cashReceived}
          cashChange={thermalReceiptData.cashChange}
        />
      )}
    </div>
  );
};
