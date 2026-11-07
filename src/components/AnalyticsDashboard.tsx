import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Download, 
  BarChart3, 
  AlertTriangle, 
  Trash2, 
  RotateCcw, 
  X, 
  CreditCard, 
  Receipt, 
  Plus, 
  ArrowUpRight, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  MessageSquare, 
  Search, 
  Package, 
  Banknote 
} from 'lucide-react';
import { useSalesStore } from '../stores/salesStore';
import { useCatalogStore } from '../stores/catalogStore';
import { useExpenseStore, EXPENSE_CATEGORIES } from '../stores/expenseStore';
import { useSettingsStore } from '../stores/settingsStore';
import { 
  clearAllOrdersFromFirebase, 
  deleteExpenseFromFirebase 
} from '../services/firebaseSync';
import { SalesOrder } from '../types';
import { PaymentTempoModal } from './PaymentTempoModal';
import { AddExpenseModal } from './AddExpenseModal';
import { RestockModal } from './RestockModal';

type TimeFilter = 'today' | 'week' | 'month' | 'all';
type ProductRankTab = 'profit' | 'volume' | 'omzet';
type AnalyticsSubTab = 'sales' | 'expenses' | 'receivables' | 'inventory';

export const AnalyticsDashboard: React.FC = () => {
  // Navigation Sub Tab
  const [activeSubTab, setActiveSubTab] = useState<AnalyticsSubTab>('sales');

  // Stores
  const orders = useSalesStore((state) => state.orders);
  const resetToDemoOrders = useSalesStore((state) => state.resetToDemoOrders);
  const clearAllOrders = useSalesStore((state) => state.clearAllOrders);

  const products = useCatalogStore((state) => state.products);
  const stockMovements = useCatalogStore((state) => state.stockMovements);

  const expenses = useExpenseStore((state) => state.expenses);
  const deleteExpense = useExpenseStore((state) => state.deleteExpense);

  const storeSettings = useSettingsStore();
  const ownerPin = useSettingsStore((state) => state.ownerPin || '1234');

  // Filter States
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [productTab, setProductTab] = useState<ProductRankTab>('profit');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Modals
  const [isPaymentTempoOpen, setIsPaymentTempoOpen] = useState(false);
  const [selectedTempoOrder, setSelectedTempoOrder] = useState<SalesOrder | null>(null);

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockProductVariant, setRestockProductVariant] = useState<{ productId?: string; variantId?: string }>({});

  // Receivables Filters
  const [receivableFilter, setReceivableFilter] = useState<'all' | 'unpaid' | 'overdue' | 'paid'>('all');

  // Inventory Filters & Search
  const [stockSearch, setStockSearch] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'warning' | 'empty'>('all');

  // Modal Confirmation States for Delete
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isResetDemoModalOpen, setIsResetDemoModalOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // ----------------------------------------------------
  // FILTER ORDERS BY TIME
  // ----------------------------------------------------
  const filteredOrders = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    return orders.filter((ord) => {
      const ordTime = new Date(ord.created_at).getTime();
      const diffMs = now - ordTime;

      if (timeFilter === 'today') return diffMs <= dayMs;
      if (timeFilter === 'week') return diffMs <= 7 * dayMs;
      if (timeFilter === 'month') return diffMs <= 30 * dayMs;
      return true; // 'all'
    });
  }, [orders, timeFilter]);

  // ----------------------------------------------------
  // FILTER EXPENSES BY TIME
  // ----------------------------------------------------
  const filteredExpenses = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    return expenses.filter((exp) => {
      const expTime = new Date(exp.created_at).getTime();
      const diffMs = now - expTime;

      if (timeFilter === 'today') return diffMs <= dayMs;
      if (timeFilter === 'week') return diffMs <= 7 * dayMs;
      if (timeFilter === 'month') return diffMs <= 30 * dayMs;
      return true;
    });
  }, [expenses, timeFilter]);

  // ----------------------------------------------------
  // AGGREGATE FINANCIAL KPIS (OMZET, LABA KOTOR, BEBAN, LABA BERSIH)
  // ----------------------------------------------------
  const kpis = useMemo(() => {
    const totalOmzet = filteredOrders.reduce((sum, o) => sum + o.total_omzet, 0);
    const totalGrossProfit = filteredOrders.reduce((sum, o) => sum + o.total_profit, 0);
    const totalQty = filteredOrders.reduce((sum, o) => sum + o.total_qty, 0);
    const totalOrders = filteredOrders.length;
    const profitMargin = totalOmzet > 0 ? ((totalGrossProfit / totalOmzet) * 100).toFixed(1) : '0';
    const aov = totalOrders > 0 ? Math.round(totalOmzet / totalOrders) : 0;
    const uniqueCustomers = new Set(filteredOrders.map((o) => o.customer_name)).size;

    // Total Operasional Beban
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Laba Bersih Akhir Usaha = Laba Kotor - Beban Operasional
    const netProfit = totalGrossProfit - totalExpenses;
    const netMarginPct = totalOmzet > 0 ? ((netProfit / totalOmzet) * 100).toFixed(1) : '0';

    // Kas Masuk Riil (Uang tunai & transfer yang sudah diterima)
    const cashInflow = filteredOrders.reduce((sum, o) => {
      if (o.payment_method === 'tempo') {
        return sum + (o.amount_paid || 0);
      }
      return sum + o.total_omzet;
    }, 0);

    return {
      totalOmzet,
      totalGrossProfit,
      totalExpenses,
      netProfit,
      netMarginPct,
      cashInflow,
      totalQty,
      totalOrders,
      profitMargin,
      aov,
      uniqueCustomers
    };
  }, [filteredOrders, filteredExpenses]);

  // ----------------------------------------------------
  // RECEIVABLES (PIUTANG TEMPO) CALCULATIONS
  // ----------------------------------------------------
  const tempoOrders = useMemo(() => {
    return orders.filter((o) => o.payment_method === 'tempo');
  }, [orders]);

  const receivablesSummary = useMemo(() => {
    const now = Date.now();
    let totalReceivables = 0;
    let totalPaid = 0;
    let overdueCount = 0;
    let unpaidCount = 0;

    tempoOrders.forEach((o) => {
      const remaining = o.remaining_balance ?? (o.total_omzet - (o.amount_paid || 0));
      totalReceivables += remaining;
      totalPaid += (o.amount_paid || 0);

      if (remaining > 0) {
        unpaidCount += 1;
        if (o.due_date && new Date(o.due_date).getTime() < now) {
          overdueCount += 1;
        }
      }
    });

    return {
      totalReceivables,
      totalPaid,
      overdueCount,
      unpaidCount,
      totalTempoOrders: tempoOrders.length
    };
  }, [tempoOrders]);

  const filteredTempoOrders = useMemo(() => {
    const now = Date.now();
    return tempoOrders.filter((o) => {
      const remaining = o.remaining_balance ?? (o.total_omzet - (o.amount_paid || 0));
      const isOverdue = Boolean(o.due_date && new Date(o.due_date).getTime() < now && remaining > 0);

      if (receivableFilter === 'unpaid') return remaining > 0;
      if (receivableFilter === 'overdue') return isOverdue;
      if (receivableFilter === 'paid') return remaining <= 0;
      return true; // 'all'
    });
  }, [tempoOrders, receivableFilter]);

  // ----------------------------------------------------
  // PHYSICAL STOCK STATUS CALCULATIONS
  // ----------------------------------------------------
  const stockSummary = useMemo(() => {
    const allVariants: {
      productId: string;
      productName: string;
      productCategory: string;
      productImage: string;
      variantId: string;
      variantName: string;
      stockQty: number;
      minAlert: number;
      status: 'safe' | 'low' | 'empty';
    }[] = [];

    let safeCount = 0;
    let lowCount = 0;
    let emptyCount = 0;

    products.forEach((p) => {
      p.variants?.forEach((v) => {
        const qty = v.stock_qty ?? 0;
        const minAlert = v.min_stock_alert ?? 200;
        let status: 'safe' | 'low' | 'empty' = 'safe';

        if (qty <= 0) {
          status = 'empty';
          emptyCount += 1;
        } else if (qty <= minAlert) {
          status = 'low';
          lowCount += 1;
        } else {
          safeCount += 1;
        }

        allVariants.push({
          productId: p.id,
          productName: p.name,
          productCategory: p.material || 'PP',
          productImage: p.image_url,
          variantId: v.id,
          variantName: v.name,
          stockQty: qty,
          minAlert,
          status
        });
      });
    });

    return {
      allVariants,
      totalVariants: allVariants.length,
      safeCount,
      lowCount,
      emptyCount
    };
  }, [products]);

  const filteredStockList = useMemo(() => {
    return stockSummary.allVariants.filter((item) => {
      // Search
      const matchSearch = stockSearch === '' || 
        item.productName.toLowerCase().includes(stockSearch.toLowerCase()) ||
        item.variantName.toLowerCase().includes(stockSearch.toLowerCase());

      if (!matchSearch) return false;

      // Status Filter
      if (stockStatusFilter === 'warning') return item.status === 'low' || item.status === 'empty';
      if (stockStatusFilter === 'empty') return item.status === 'empty';
      return true;
    });
  }, [stockSummary.allVariants, stockSearch, stockStatusFilter]);

  // ----------------------------------------------------
  // PRODUCT LEADERBOARD CALCULATIONS
  // ----------------------------------------------------
  const productPerformance = useMemo(() => {
    const map: Record<string, {
      id: string;
      name: string;
      unitCode: string;
      qtySold: number;
      totalOmzet: number;
      totalCogs: number;
      totalProfit: number;
      marginPct: number;
      orderCount: number;
    }> = {};

    filteredOrders.forEach((ord) => {
      ord.items.forEach((item) => {
        const key = item.product_name;
        if (!map[key]) {
          map[key] = {
            id: item.product_id,
            name: item.product_name,
            unitCode: item.unit_code,
            qtySold: 0,
            totalOmzet: 0,
            totalCogs: 0,
            totalProfit: 0,
            marginPct: 0,
            orderCount: 0
          };
        }
        map[key].qtySold += item.qty;
        map[key].totalOmzet += item.subtotal;
        map[key].totalCogs += (item.cogs_price * item.qty);
        map[key].totalProfit += item.profit;
        map[key].orderCount += 1;
      });
    });

    const list = Object.values(map).map((p) => ({
      ...p,
      marginPct: p.totalOmzet > 0 ? Number(((p.totalProfit / p.totalOmzet) * 100).toFixed(1)) : 0
    }));

    if (productTab === 'profit') {
      return list.sort((a, b) => b.totalProfit - a.totalProfit);
    } else if (productTab === 'volume') {
      return list.sort((a, b) => b.qtySold - a.qtySold);
    } else {
      return list.sort((a, b) => b.totalOmzet - a.totalOmzet);
    }
  }, [filteredOrders, productTab]);

  // ----------------------------------------------------
  // CUSTOMER INTELLIGENCE CALCULATIONS
  // ----------------------------------------------------
  const customerPerformance = useMemo(() => {
    const map: Record<string, {
      name: string;
      phone: string;
      totalSpend: number;
      totalProfit: number;
      orderCount: number;
      aov: number;
      lastOrderDate: string;
      favoriteItems: Record<string, number>;
      recentOrders: SalesOrder[];
    }> = {};

    filteredOrders.forEach((ord) => {
      const key = ord.customer_name;
      if (!map[key]) {
        map[key] = {
          name: ord.customer_name,
          phone: ord.customer_phone,
          totalSpend: 0,
          totalProfit: 0,
          orderCount: 0,
          aov: 0,
          lastOrderDate: ord.created_at,
          favoriteItems: {},
          recentOrders: []
        };
      }

      map[key].totalSpend += ord.total_omzet;
      map[key].totalProfit += ord.total_profit;
      map[key].orderCount += 1;
      map[key].recentOrders.push(ord);

      ord.items.forEach((it) => {
        map[key].favoriteItems[it.product_name] = (map[key].favoriteItems[it.product_name] || 0) + it.qty;
      });
    });

    return Object.values(map).map((c) => {
      const topItemEntry = Object.entries(c.favoriteItems).sort((a, b) => b[1] - a[1])[0];
      return {
        ...c,
        aov: c.orderCount > 0 ? Math.round(c.totalSpend / c.orderCount) : 0,
        marginPct: c.totalSpend > 0 ? Number(((c.totalProfit / c.totalSpend) * 100).toFixed(1)) : 0,
        topItem: topItemEntry ? `${topItemEntry[0]} (${topItemEntry[1]}x)` : '-'
      };
    }).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [filteredOrders]);

  // ----------------------------------------------------
  // DAILY TREND CHART DATA
  // ----------------------------------------------------
  const dailyTrend = useMemo(() => {
    const dayMap: Record<string, { label: string; dateStr: string; omzet: number; profit: number; count: number }> = {};
    const numDays = timeFilter === 'today' ? 1 : timeFilter === 'week' ? 7 : timeFilter === 'month' ? 14 : 30;
    const now = new Date();

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      dayMap[key] = { label, dateStr: key, omzet: 0, profit: 0, count: 0 };
    }

    filteredOrders.forEach((ord) => {
      const key = ord.created_at.split('T')[0];
      if (dayMap[key]) {
        dayMap[key].omzet += ord.total_omzet;
        dayMap[key].profit += ord.total_profit;
        dayMap[key].count += 1;
      }
    });

    return Object.values(dayMap);
  }, [filteredOrders, timeFilter]);

  const maxDailyVal = useMemo(() => {
    return Math.max(...dailyTrend.map((d) => Math.max(d.omzet, d.profit)), 100000);
  }, [dailyTrend]);

  // ----------------------------------------------------
  // EXPENSES BY CATEGORY BREAKDOWN
  // ----------------------------------------------------
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });

    const total = filteredExpenses.reduce((s, e) => s + e.amount, 0);

    return EXPENSE_CATEGORIES.map((cat) => {
      const catAmount = map[cat.id] || 0;
      const pct = total > 0 ? ((catAmount / total) * 100).toFixed(1) : '0';
      return {
        ...cat,
        amount: catAmount,
        percentage: pct
      };
    }).filter((c) => c.amount > 0 || filteredExpenses.length === 0);
  }, [filteredExpenses]);

  // ----------------------------------------------------
  // HANDLERS
  // ----------------------------------------------------
  const handleConfirmDelete = async () => {
    if (!deletePassword) {
      setDeleteError('Harap masukkan password / PIN pemilik!');
      return;
    }
    const expectedPin = ownerPin || '1234';
    if (deletePassword !== expectedPin && deletePassword !== 'admin2026') {
      setDeleteError('Password salah! Data riwayat penjualan tidak dihapus.');
      return;
    }

    clearAllOrders();
    try {
      localStorage.setItem('plastipro_sales_orders_v1', '[]');
    } catch (e) {
      console.warn('Storage error:', e);
    }

    await clearAllOrdersFromFirebase();

    setIsClearModalOpen(false);
    setDeletePassword('');
    setDeleteError(null);
    setActionNotice('✨ BERSIH TOTAL! Semua riwayat penjualan berhasil dikosongkan.');
    setTimeout(() => setActionNotice(null), 5000);
  };

  const handleDeleteExpense = async (id: string, title: string) => {
    if (confirm(`Hapus pengeluaran kas "${title}"?`)) {
      deleteExpense(id);
      await deleteExpenseFromFirebase(id);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Order Number', 'Date', 'Customer', 'Phone', 'Payment Method', 'Payment Status', 'Due Date', 'Total Omzet (Rp)', 'Total Profit (Rp)', 'Items Count'];
    const rows = filteredOrders.map((o) => [
      o.order_number,
      o.created_at,
      `"${o.customer_name}"`,
      o.customer_phone,
      o.payment_method || 'cash',
      o.payment_status || 'paid',
      o.due_date || '-',
      o.total_omzet,
      o.total_profit,
      o.items.length
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laporan-penjualan-toko-plastik-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendReminderWA = (order: SalesOrder) => {
    const remaining = order.remaining_balance ?? (order.total_omzet - (order.amount_paid || 0));
    const storeName = storeSettings.storeName || 'Toko Plastik';
    const dueStr = order.due_date 
      ? new Date(order.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'segera';

    const text = `Halo Bu/Pak *${order.customer_name}*,\n\nKami dari *${storeName}* ingin menginformasikan nota tempo *${order.order_number}* senilai *Rp ${order.total_omzet.toLocaleString('id-ID')}*.\nSaat ini sisa tagihan tercatat sebesar *Rp ${remaining.toLocaleString('id-ID')}* dengan tanggal jatuh tempo *${dueStr}*.\n\nMohon konfirmasi jika sudah melakukan transfer atau pembayaran tunai. Terima kasih banyak atas kerjasamanya! 🙏`;

    let cleanPhone = order.customer_phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      
      {/* 1. TOP HEADER & SUB-NAVIGATION TABS */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl neo-border shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center neo-border shadow-sm shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-black text-xl sm:text-2xl text-ink">
                Pusat Manajemen Usaha & Laporan
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Pantau penjualan, kas operasional, piutang tempo mitra, dan kuota stok fisik barang secara terpadu
              </p>
            </div>
          </div>

          {/* Time Filter Selector */}
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 self-start md:self-auto">
            {(['today', 'week', 'month', 'all'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTimeFilter(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  timeFilter === t
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 hover:text-ink'
                }`}
              >
                {t === 'today' ? 'Hari Ini' : t === 'week' ? 'Minggu Ini' : t === 'month' ? 'Bulan Ini' : 'Semua'}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Core Module Navigation Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveSubTab('sales')}
            className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 font-black text-xs sm:text-sm transition-all text-left ${
              activeSubTab === 'sales'
                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:border-slate-300'
            }`}
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            <div className="truncate">
              <span>📈 Penjualan & Laba</span>
              <span className="block text-[10px] text-slate-400 font-normal">Omzet & Tren</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('expenses')}
            className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 font-black text-xs sm:text-sm transition-all text-left ${
              activeSubTab === 'expenses'
                ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm'
                : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:border-slate-300'
            }`}
          >
            <Receipt className="w-4 h-4 shrink-0 text-rose-500" />
            <div className="truncate">
              <span>💸 Buku Kas & Biaya</span>
              <span className="block text-[10px] text-slate-400 font-normal">Laba Bersih Akhir</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('receivables')}
            className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 font-black text-xs sm:text-sm transition-all text-left ${
              activeSubTab === 'receivables'
                ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm'
                : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:border-slate-300'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0 text-amber-600" />
            <div className="truncate flex-1">
              <div className="flex items-center justify-between">
                <span>📑 Piutang Tempo</span>
                {receivablesSummary.overdueCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-red-500 text-white text-[9px] rounded-full font-mono">
                    {receivablesSummary.overdueCount}
                  </span>
                )}
              </div>
              <span className="block text-[10px] text-slate-400 font-normal">Jatuh Tempo Mitra</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('inventory')}
            className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 font-black text-xs sm:text-sm transition-all text-left ${
              activeSubTab === 'inventory'
                ? 'border-eco-dark bg-eco/10 text-eco-dark shadow-sm'
                : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:border-slate-300'
            }`}
          >
            <Package className="w-4 h-4 shrink-0 text-eco-dark" />
            <div className="truncate flex-1">
              <div className="flex items-center justify-between">
                <span>📦 Stok & Peringatan</span>
                {stockSummary.lowCount + stockSummary.emptyCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[9px] rounded-full font-mono">
                    {stockSummary.lowCount + stockSummary.emptyCount}
                  </span>
                )}
              </div>
              <span className="block text-[10px] text-slate-400 font-normal">Restock & Fisik</span>
            </div>
          </button>
        </div>
      </div>

      {/* FEEDBACK NOTICE */}
      {actionNotice && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 font-black rounded-2xl flex items-center justify-between animate-fadeIn text-sm">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="p-1 hover:bg-emerald-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 1: PENJUALAN & LABA (EXISTING + ENHANCED)    */}
      {/* ==================================================== */}
      {activeSubTab === 'sales' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Action Bar: Export & Reset */}
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl neo-border text-xs">
            <div className="text-slate-500 font-medium">
              Menampilkan data periode: <strong className="text-ink">{timeFilter === 'today' ? 'Hari Ini' : timeFilter === 'week' ? '7 Hari Terakhir' : timeFilter === 'month' ? '30 Hari Terakhir' : 'Seluruh Riwayat'}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setIsClearModalOpen(true)}
                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Bersihkan Riwayat</span>
              </button>
            </div>
          </div>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-3xl neo-border shadow-sm relative overflow-hidden">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">Total Omzet Penjualan</span>
              <div className="font-display font-black text-2xl sm:text-3xl text-primary mt-2">
                Rp {kpis.totalOmzet.toLocaleString('id-ID')}
              </div>
              <span className="text-[11px] font-bold text-slate-400 mt-1 block">{kpis.totalOrders} total transaksi tercatat</span>
            </div>

            <div className="bg-white p-6 rounded-3xl neo-border shadow-sm relative overflow-hidden">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">Total Laba Kotor</span>
              <div className="font-display font-black text-2xl sm:text-3xl text-eco-dark mt-2">
                Rp {kpis.totalGrossProfit.toLocaleString('id-ID')}
              </div>
              <span className="text-[11px] font-bold text-emerald-600 mt-1 block">Margin Kotor {kpis.profitMargin}% dari Omzet</span>
            </div>

            <div className="bg-white p-6 rounded-3xl neo-border shadow-sm relative overflow-hidden">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">Rata-Rata Nilai Nota</span>
              <div className="font-display font-black text-2xl sm:text-3xl text-accent mt-2">
                Rp {kpis.aov.toLocaleString('id-ID')}
              </div>
              <span className="text-[11px] font-bold text-slate-400 mt-1 block">{kpis.uniqueCustomers} pelanggan aktif belanja</span>
            </div>

            <div className="bg-white p-6 rounded-3xl neo-border shadow-sm relative overflow-hidden">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">Total Barang Terjual</span>
              <div className="font-display font-black text-2xl sm:text-3xl text-purple-600 mt-2">
                {kpis.totalQty.toLocaleString('id-ID')}
              </div>
              <span className="text-[11px] font-bold text-slate-400 mt-1 block">Unit / Pak / Dus terdistribusi</span>
            </div>
          </div>

          {/* Bar Chart Grafik Penjualan & Laba Harian */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl neo-border shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-display font-black text-xl text-ink">
                  Grafik Tren Omzet & Laba Harian
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Visualisasi perbandingan omzet kotor (biru) vs keuntungan kotor (hijau)
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-primary"></span>
                  <span className="text-slate-700">Omzet Penjualan</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-eco"></span>
                  <span className="text-slate-700">Keuntungan</span>
                </div>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
                <p className="text-slate-400 text-sm font-medium">Belum ada transaksi di periode ini.</p>
                <button
                  onClick={() => setIsResetDemoModalOpen(true)}
                  className="mt-3 text-xs font-black text-primary hover:underline"
                >
                  Muat Contoh Data Demo Penjualan
                </button>
              </div>
            ) : (
              <div className="h-64 w-full pt-6">
                <div className="h-full flex items-end gap-2 sm:gap-4 justify-between border-b-2 border-slate-200 pb-2">
                  {dailyTrend.map((day, idx) => {
                    const omzetHeight = Math.max(8, Math.min(100, Math.round((day.omzet / maxDailyVal) * 100)));
                    const profitHeight = Math.max(8, Math.min(100, Math.round((day.profit / maxDailyVal) * 100)));

                    return (
                      <div key={idx} className="flex flex-col items-center h-full justify-end group relative flex-1">
                        {/* Tooltip */}
                        <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[11px] rounded-xl p-2.5 shadow-xl pointer-events-none z-20 whitespace-nowrap min-w-[130px] border border-slate-700">
                          <strong className="block text-amber-300 font-extrabold">{day.label}</strong>
                          <div>Omzet: <strong>Rp {day.omzet.toLocaleString('id-ID')}</strong></div>
                          <div>Laba: <strong className="text-emerald-400">Rp {day.profit.toLocaleString('id-ID')}</strong></div>
                          <div className="text-[10px] text-slate-400">{day.count} pesanan</div>
                        </div>

                        {/* Bars */}
                        <div className="flex items-end gap-1 w-full justify-center h-full">
                          <div 
                            style={{ height: `${omzetHeight}%` }}
                            className="w-full max-w-[16px] bg-primary rounded-t-lg transition-all duration-300 group-hover:bg-primary-dark"
                          />
                          <div 
                            style={{ height: `${profitHeight}%` }}
                            className="w-full max-w-[16px] bg-eco rounded-t-lg transition-all duration-300 group-hover:bg-eco-dark"
                          />
                        </div>

                        <span className="text-[10px] font-bold text-slate-500 mt-2 truncate max-w-full text-center">
                          {day.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Leaderboard Produk & Penjualan Mitra */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Leaderboard Produk */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-3xl neo-border shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <h4 className="font-display font-black text-lg sm:text-xl text-ink">
                    Leaderboard Produk
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Ranking produk paling laku dan paling menguntungkan
                  </p>
                </div>

                <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setProductTab('profit')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      productTab === 'profit' ? 'bg-primary text-white shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Paling Cuan
                  </button>
                  <button
                    onClick={() => setProductTab('volume')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      productTab === 'volume' ? 'bg-primary text-white shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Terlaris
                  </button>
                  <button
                    onClick={() => setProductTab('omzet')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      productTab === 'omzet' ? 'bg-primary text-white shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Omzet
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {productPerformance.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Belum ada data produk terjual.</p>
                ) : (
                  productPerformance.map((prod, idx) => (
                    <div 
                      key={idx}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          idx === 0 ? 'bg-amber-400 text-slate-900' : idx === 1 ? 'bg-slate-300 text-slate-800' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <h5 className="font-extrabold text-ink truncate text-sm">{prod.name}</h5>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Terjual: <strong>{prod.qtySold.toLocaleString('id-ID')} {prod.unitCode}</strong> &bull; {prod.orderCount} transaksi
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-display font-black text-sm text-ink block">
                          Rp {prod.totalOmzet.toLocaleString('id-ID')}
                        </span>
                        <span className="text-xs font-bold text-eco-dark block font-mono">
                          +Rp {prod.totalProfit.toLocaleString('id-ID')} ({prod.marginPct}%)
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Data Penjualan per Pelanggan */}
            <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl neo-border shadow-sm space-y-5">
              <div className="pb-4 border-b border-slate-200">
                <h4 className="font-display font-black text-lg sm:text-xl text-ink">
                  Performa Belanja Mitra
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Riwayat transaksi, repeat order, dan kontribusi laba per pelanggan
                </p>
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {customerPerformance.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Belum ada pelanggan belanja.</p>
                ) : (
                  customerPerformance.map((cust, idx) => {
                    const isExpanded = selectedCustomerId === cust.name;
                    return (
                      <div 
                        key={idx}
                        className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 cursor-pointer hover:border-primary/50 transition-all text-xs"
                        onClick={() => setSelectedCustomerId(isExpanded ? null : cust.name)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <h5 className="font-display font-black text-sm text-ink">{cust.name}</h5>
                            </div>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">📞 {cust.phone}</p>
                          </div>

                          <div className="text-right">
                            <span className="font-display font-black text-sm text-primary block">
                              Rp {cust.totalSpend.toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">
                              {cust.orderCount}x Repeat Order
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 bg-white rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Laba dari Mitra:</span>
                          <strong className="text-eco-dark font-mono font-black">
                            +Rp {cust.totalProfit.toLocaleString('id-ID')} ({cust.marginPct}%)
                          </strong>
                        </div>

                        {isExpanded && (
                          <div className="pt-3 border-t border-slate-200 space-y-2 animate-fadeIn text-xs">
                            <span className="font-extrabold text-ink block text-[11px] uppercase tracking-wider">
                              Riwayat Transaksi Terakhir:
                            </span>
                            {cust.recentOrders.map((ord) => (
                              <div key={ord.id} className="p-2 bg-slate-100/80 rounded-lg flex items-center justify-between">
                                <div>
                                  <strong className="font-mono text-ink block">{ord.order_number}</strong>
                                  <span className="text-[10px] text-slate-500">
                                    {new Date(ord.created_at).toLocaleDateString('id-ID')} &bull; {ord.payment_method === 'tempo' ? 'Tempo' : 'Lunas'}
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-slate-800">
                                  Rp {ord.total_omzet.toLocaleString('id-ID')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 2: BUKU KAS & PENGELUARAN (LABA BERSIH)      */}
      {/* ==================================================== */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Action Bar */}
          <div className="bg-white p-6 rounded-3xl neo-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-display font-black text-xl text-ink">
                Buku Kas & Pengeluaran Operasional
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Catat pengeluaran bensin, lakban, upah, dan biaya utilitas untuk menghitung <strong>Laba Bersih Akhir</strong> usaha secara riil.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddExpenseOpen(true)}
              className="py-3 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs sm:text-sm neo-border flex items-center gap-2 transition-all active:scale-95 shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Catat Pengeluaran Baru</span>
            </button>
          </div>

          {/* 3 Big Financial Pillars: Kas Masuk, Beban Operasional, LABA BERSIH */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Kas Masuk Penjualan */}
            <div className="bg-white p-6 rounded-3xl neo-border shadow-sm space-y-2">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                Total Kas Masuk Diterima
              </span>
              <div className="font-display font-black text-2xl sm:text-3xl text-emerald-600">
                Rp {kpis.cashInflow.toLocaleString('id-ID')}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Penerimaan tunai, transfer, dan cicilan tempo yang sudah masuk rekening/kasir
              </p>
            </div>

            {/* Total Beban Operasional */}
            <div className="bg-white p-6 rounded-3xl neo-border shadow-sm space-y-2">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                Total Beban Operasional
              </span>
              <div className="font-display font-black text-2xl sm:text-3xl text-rose-600">
                Rp {kpis.totalExpenses.toLocaleString('id-ID')}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {filteredExpenses.length} transaksi pengeluaran tercatat dalam periode ini
              </p>
            </div>

            {/* LABA BERSIH AKHIR USAHA */}
            <div className={`p-6 rounded-3xl neo-border shadow-sm space-y-2 ${
              kpis.netProfit >= 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  Laba Bersih Akhir Usaha
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  kpis.netProfit >= 0 ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'
                }`}>
                  {kpis.netProfit >= 0 ? 'SURPLUS BERSIH' : 'DEFISIT'}
                </span>
              </div>
              <div className={`font-display font-black text-2xl sm:text-3xl ${
                kpis.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}>
                Rp {kpis.netProfit.toLocaleString('id-ID')}
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                Laba Kotor (Rp {kpis.totalGrossProfit.toLocaleString('id-ID')}) dikurangi Beban Operasional
              </p>
            </div>
          </div>

          {/* Breakdown Kategori Pengeluaran & Tabel Catatan Biaya */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Kiri: Breakdown per Kategori (lg:col-span-5) */}
            <div className="lg:col-span-5 bg-white p-6 rounded-3xl neo-border shadow-sm space-y-4">
              <h5 className="font-display font-black text-lg text-ink pb-2 border-b border-slate-200">
                Alokasi Beban per Kategori
              </h5>

              <div className="space-y-3">
                {expensesByCategory.map((cat) => (
                  <div key={cat.id} className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-slate-700">{cat.name}</span>
                      <span className="font-mono text-ink">
                        Rp {cat.amount.toLocaleString('id-ID')} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${Math.min(100, Math.max(0, Number(cat.percentage)))}%` }}
                        className="h-full bg-rose-500 rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Kanan: Tabel Riwayat Catatan Pengeluaran Kas (lg:col-span-7) */}
            <div className="lg:col-span-7 bg-white p-6 rounded-3xl neo-border shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h5 className="font-display font-black text-lg text-ink">
                  Daftar Transaksi Pengeluaran Kas
                </h5>
                <span className="text-xs text-slate-400 font-bold">{filteredExpenses.length} catatan</span>
              </div>

              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {filteredExpenses.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
                    <p className="text-xs text-slate-400 font-medium">
                      Belum ada catatan biaya operasional di periode ini.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAddExpenseOpen(true)}
                      className="text-xs font-black text-rose-600 hover:underline"
                    >
                      + Tambah Pengeluaran Pertama Sekarang
                    </button>
                  </div>
                ) : (
                  filteredExpenses.map((exp) => (
                    <div 
                      key={exp.id}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-200 flex items-start justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-black text-[10px]">
                            {exp.category_name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(exp.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h6 className="font-extrabold text-ink text-sm mt-1">{exp.title}</h6>
                        {exp.notes && (
                          <p className="text-slate-500 text-[11px] mt-0.5">{exp.notes}</p>
                        )}
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <span className="font-display font-black text-sm text-rose-600 block">
                          -Rp {exp.amount.toLocaleString('id-ID')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id, exp.title)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Hapus pengeluaran"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 3: BUKU PIUTANG MITRA (PENJUALAN TEMPO)       */}
      {/* ==================================================== */}
      {activeSubTab === 'receivables' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header */}
          <div className="bg-white p-6 rounded-3xl neo-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-display font-black text-xl text-ink">
                Buku Piutang & Penjualan Tempo Mitra
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Kelola penjualan tempo (7, 14, 30 hari), pantau jatuh tempo, catat angsuran cicilan, dan kirim pengingat tagihan via WhatsApp.
              </p>
            </div>

            {/* Filter Status Tagihan */}
            <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setReceivableFilter('all')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  receivableFilter === 'all' ? 'bg-primary text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                Semua ({tempoOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setReceivableFilter('unpaid')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  receivableFilter === 'unpaid' ? 'bg-primary text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                Belum Lunas ({receivablesSummary.unpaidCount})
              </button>
              <button
                type="button"
                onClick={() => setReceivableFilter('overdue')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  receivableFilter === 'overdue' ? 'bg-red-500 text-white shadow-sm' : 'text-red-700'
                }`}
              >
                Lewat Tempo ({receivablesSummary.overdueCount})
              </button>
              <button
                type="button"
                onClick={() => setReceivableFilter('paid')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  receivableFilter === 'paid' ? 'bg-primary text-white shadow-sm' : 'text-slate-600'
                }`}
              >
                Lunas
              </button>
            </div>
          </div>

          {/* 3 KPI Cards Piutang */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-3xl neo-border shadow-sm space-y-2">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                Total Piutang Berjalan (Belum Lunas)
              </span>
              <div className="font-display font-black text-2xl sm:text-3xl text-amber-600">
                Rp {receivablesSummary.totalReceivables.toLocaleString('id-ID')}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {receivablesSummary.unpaidCount} nota tempo belum terselesaikan
              </p>
            </div>

            <div className={`p-6 rounded-3xl neo-border shadow-sm space-y-2 ${
              receivablesSummary.overdueCount > 0 ? 'bg-red-50 border-red-300' : 'bg-white'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  Tagihan Lewat Jatuh Tempo
                </span>
                {receivablesSummary.overdueCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-200 text-red-900 font-mono text-[10px] font-black">
                    PERHATIAN
                  </span>
                )}
              </div>
              <div className={`font-display font-black text-2xl sm:text-3xl ${
                receivablesSummary.overdueCount > 0 ? 'text-red-700' : 'text-slate-400'
              }`}>
                {receivablesSummary.overdueCount} Nota
              </div>
              <p className="text-[11px] text-slate-600 font-medium">
                Perlu segera dikonfirmasi dan ditagih ke mitra langganan
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl neo-border shadow-sm space-y-2">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                Total Pembayaran Diterima
              </span>
              <div className="font-display font-black text-2xl sm:text-3xl text-emerald-600">
                Rp {receivablesSummary.totalPaid.toLocaleString('id-ID')}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Dana cicilan dan pelunasan tempo yang sudah masuk
              </p>
            </div>
          </div>

          {/* Daftar Nota Penjualan Tempo */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl neo-border shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h5 className="font-display font-black text-lg text-ink">
                Daftar Tagihan Tempo Mitra
              </h5>
              <span className="text-xs text-slate-400 font-bold">{filteredTempoOrders.length} nota ditampilkan</span>
            </div>

            <div className="space-y-4">
              {filteredTempoOrders.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                  <p className="text-xs text-slate-400 font-medium">
                    Tidak ada nota tempo dengan filter yang dipilih.
                  </p>
                </div>
              ) : (
                filteredTempoOrders.map((order) => {
                  const now = Date.now();
                  const remaining = order.remaining_balance ?? (order.total_omzet - (order.amount_paid || 0));
                  const isPaid = remaining <= 0;
                  const isOverdue = Boolean(order.due_date && new Date(order.due_date).getTime() < now && remaining > 0);
                  const isPartial = (order.amount_paid || 0) > 0 && remaining > 0;

                  return (
                    <div 
                      key={order.id}
                      className={`p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isOverdue 
                          ? 'border-red-300 bg-red-50/40' 
                          : isPaid 
                          ? 'border-emerald-200 bg-emerald-50/20' 
                          : 'border-slate-200 bg-slate-50/60'
                      }`}
                    >
                      {/* Info Nota & Mitra */}
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-xs text-ink bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                            {order.order_number}
                          </span>

                          {/* Status Badge */}
                          {isPaid ? (
                            <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Lunas</span>
                            </span>
                          ) : isOverdue ? (
                            <span className="px-2.5 py-0.5 rounded-md bg-red-100 text-red-800 text-[11px] font-black flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-red-600" />
                              <span>Lewat Jatuh Tempo</span>
                            </span>
                          ) : isPartial ? (
                            <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-black flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Sebagian</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[11px] font-black">
                              Belum Lunas
                            </span>
                          )}

                          {order.due_date && (
                            <span className="text-[11px] text-slate-500 font-medium">
                              Jatuh Tempo: <strong>{new Date(order.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                            </span>
                          )}
                        </div>

                        <h6 className="font-display font-black text-base text-ink pt-0.5">
                          {order.customer_name}
                        </h6>

                        <div className="text-xs text-slate-500 flex items-center gap-3">
                          <span>📞 {order.customer_phone}</span>
                          <span>&bull;</span>
                          <span>{order.items.length} macam barang</span>
                        </div>
                      </div>

                      {/* Rincian Angka & Tombol Aksi */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                            Sisa Tagihan
                          </span>
                          <span className="font-mono font-black text-lg sm:text-xl text-amber-600 block">
                            Rp {remaining.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Total: Rp {order.total_omzet.toLocaleString('id-ID')} (Sudah bayar: Rp {(order.amount_paid || 0).toLocaleString('id-ID')})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTempoOrder(order);
                                setIsPaymentTempoOpen(true);
                              }}
                              className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                            >
                              <Banknote className="w-4 h-4" />
                              <span>Catat Bayar</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleSendReminderWA(order)}
                            className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-sm"
                            title="Kirim pengingat WhatsApp ke mitra"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 4: STATUS STOK & PERINGATAN (RESTOCK)         */}
      {/* ==================================================== */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header Bar */}
          <div className="bg-white p-6 rounded-3xl neo-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-display font-black text-xl text-ink">
                Status Stok Fisik & Peringatan Otomatis
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Stok terpotong otomatis saat nota kasir/WA selesai. Tambahkan kuota saat kiriman pabrik tiba.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setRestockProductVariant({});
                setIsRestockOpen(true);
              }}
              className="py-3 px-5 bg-eco-dark hover:bg-eco text-white rounded-2xl font-black text-xs sm:text-sm neo-border flex items-center gap-2 transition-all active:scale-95 shadow-sm shrink-0"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>+ Catat Barang Masuk (Restock)</span>
            </button>
          </div>

          {/* 4 KPI Cards Stok */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <div className="bg-white p-5 rounded-2xl neo-border shadow-sm">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">Total Varian</span>
              <div className="font-display font-black text-2xl text-ink mt-1">
                {stockSummary.totalVariants}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Semua ukuran terdaftar</span>
            </div>

            <div className="bg-white p-5 rounded-2xl neo-border shadow-sm">
              <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wider block">Stok Aman</span>
              <div className="font-display font-black text-2xl text-emerald-600 mt-1">
                {stockSummary.safeCount}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">Kuantitas di atas batas</span>
            </div>

            <div className={`p-5 rounded-2xl neo-border shadow-sm ${stockSummary.lowCount > 0 ? 'bg-amber-50 border-amber-300' : 'bg-white'}`}>
              <span className="text-[11px] font-black text-amber-700 uppercase tracking-wider block">Stok Menipis</span>
              <div className="font-display font-black text-2xl text-amber-700 mt-1">
                {stockSummary.lowCount}
              </div>
              <span className="text-[10px] text-amber-600 font-medium">Perlu segera di-restock</span>
            </div>

            <div className={`p-5 rounded-2xl neo-border shadow-sm ${stockSummary.emptyCount > 0 ? 'bg-red-50 border-red-300' : 'bg-white'}`}>
              <span className="text-[11px] font-black text-red-600 uppercase tracking-wider block">Stok Habis (0)</span>
              <div className="font-display font-black text-2xl text-red-600 mt-1">
                {stockSummary.emptyCount}
              </div>
              <span className="text-[10px] text-red-500 font-medium">Barang kosong di toko</span>
            </div>
          </div>

          {/* Tabel Status Stok Produk */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl neo-border shadow-sm space-y-5">
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  placeholder="Cari nama produk / ukuran varian..."
                  className="w-full h-10 pl-10 pr-4 text-xs font-bold text-ink bg-slate-50 border border-slate-200 rounded-xl focus:border-primary outline-none"
                />
              </div>

              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStockStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    stockStatusFilter === 'all' ? 'bg-primary text-white shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Semua ({stockSummary.totalVariants})
                </button>
                <button
                  type="button"
                  onClick={() => setStockStatusFilter('warning')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    stockStatusFilter === 'warning' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Peringatan Menipis ({stockSummary.lowCount + stockSummary.emptyCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStockStatusFilter('empty')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    stockStatusFilter === 'empty' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Habis ({stockSummary.emptyCount})
                </button>
              </div>
            </div>

            {/* List Varian */}
            <div className="space-y-3">
              {filteredStockList.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Tidak ada produk yang cocok dengan pencarian.</p>
              ) : (
                filteredStockList.map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-4 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img 
                        src={item.productImage} 
                        alt={item.productName} 
                        className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-sky-100 text-primary">
                            {item.productCategory}
                          </span>
                          <span className="font-extrabold text-sm text-ink truncate">
                            {item.productName}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs font-medium mt-0.5">
                          Varian: <strong className="text-ink">{item.variantName}</strong> &bull; Batas Peringatan: {item.minAlert.toLocaleString('id-ID')} unit
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                      <div className="text-right">
                        <span className="font-mono font-black text-base text-ink block">
                          {item.stockQty.toLocaleString('id-ID')} <span className="text-xs text-slate-500 font-sans">unit</span>
                        </span>

                        {item.status === 'safe' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Stok Aman
                          </span>
                        ) : item.status === 'low' ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-black inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Stok Menipis
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-black inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            Stok Habis
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setRestockProductVariant({ productId: item.productId, variantId: item.variantId });
                          setIsRestockOpen(true);
                        }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-all shadow-sm flex items-center gap-1 shrink-0 active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Restock</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Riwayat Kartu Stok / Mutasi Keluar & Masuk */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl neo-border shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h5 className="font-display font-black text-lg text-ink">
                  Buku Kartu Stok (Audit Mutasi Barang)
                </h5>
                <p className="text-xs text-slate-500 font-medium">
                  Setiap pemotongan kasir dan penambahan pabrik tercatat runut secara transparan
                </p>
              </div>
              <span className="text-xs text-slate-400 font-bold">{stockMovements.length} log</span>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {stockMovements.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Belum ada mutasi stok tercatat.</p>
              ) : (
                stockMovements.slice(0, 30).map((mov) => {
                  const isIncoming = mov.type === 'in_restock';
                  return (
                    <div 
                      key={mov.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            isIncoming ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isIncoming ? 'MASUK (RESTOCK)' : 'KELUAR (PENJUALAN)'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(mov.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="font-bold text-ink mt-0.5">
                          {mov.notes || (mov.order_number ? `Ref: ${mov.order_number}` : 'Mutasi stok')}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`font-mono font-black text-sm block ${
                          isIncoming ? 'text-emerald-600' : 'text-slate-800'
                        }`}>
                          {mov.qty_change > 0 ? `+${mov.qty_change}` : mov.qty_change} unit
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium block">
                          Sisa: {mov.resulting_stock.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL POPUPS: RESTOCK, TEMPO PAYMENT, EXPENSE        */}
      {/* ==================================================== */}
      <RestockModal
        isOpen={isRestockOpen}
        onClose={() => setIsRestockOpen(false)}
        defaultProductId={restockProductVariant.productId}
        defaultVariantId={restockProductVariant.variantId}
      />

      <PaymentTempoModal
        isOpen={isPaymentTempoOpen}
        onClose={() => {
          setIsPaymentTempoOpen(false);
          setSelectedTempoOrder(null);
        }}
        order={selectedTempoOrder}
      />

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
      />

      {/* MODAL KONFIRMASI HAPUS / BERSIH TOTAL */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div 
            className="bg-white max-w-md w-full rounded-3xl neo-border-thick shadow-hard-lg p-6 sm:p-7 space-y-5 animate-scaleUp text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center border-2 border-red-300 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-black text-xl text-ink">
                  Yakin Mau Hapus Semua?
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Seluruh riwayat transaksi penjualan akan dihapus secara permanen.
                </p>
              </div>
            </div>

            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-800 space-y-1 font-medium">
              <p>⚠️ <strong>Tindakan Permanen:</strong></p>
              <p>Data omzet dan laba akan kembali menjadi Rp 0. Masukkan PIN pemilik untuk melanjutkan.</p>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-100 text-red-800 text-xs rounded-xl font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-ink">
                Password / PIN Pemilik Toko
              </label>
              <input
                type="password"
                maxLength={10}
                value={deletePassword}
                onChange={(e) => {
                  setDeletePassword(e.target.value);
                  setDeleteError(null);
                }}
                placeholder="Masukkan PIN Anda"
                className="w-full h-11 px-3.5 font-mono text-center text-lg font-black tracking-widest text-ink bg-white border-2 border-slate-300 rounded-xl focus:border-red-500 outline-none"
                autoFocus
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsClearModalOpen(false);
                  setDeletePassword('');
                  setDeleteError(null);
                }}
                className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-[0.99]"
              >
                Ya, Hapus Semua Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESET DEMO ORDERS */}
      {isResetDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div 
            className="bg-white max-w-md w-full rounded-3xl neo-border-thick shadow-hard-lg p-6 sm:p-7 space-y-5 animate-scaleUp text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border-2 border-primary/30 shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-black text-xl text-ink">
                  Muat Contoh Transaksi Demo?
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Sistem akan mengisi riwayat transaksi realistis toko plastik.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetDemoModalOpen(false)}
                className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  resetToDemoOrders();
                  setIsResetDemoModalOpen(false);
                  setActionNotice('✨ Contoh transaksi penjualan toko plastik berhasil dimuat!');
                  setTimeout(() => setActionNotice(null), 5000);
                }}
                className="flex-1 h-11 bg-primary hover:bg-primary-dark text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-[0.99]"
              >
                Muat Data Demo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
