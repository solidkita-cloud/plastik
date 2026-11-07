import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Download, 
  BarChart3,
  Flame,
  Gem
} from 'lucide-react';
import { useSalesStore } from '../stores/salesStore';
import { SalesOrder } from '../types';

type TimeFilter = 'today' | 'week' | 'month' | 'all';
type ProductRankTab = 'profit' | 'volume' | 'omzet';

export const AnalyticsDashboard: React.FC = () => {
  const orders = useSalesStore((state) => state.orders);
  const resetToDemoOrders = useSalesStore((state) => state.resetToDemoOrders);

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [productTab, setProductTab] = useState<ProductRankTab>('profit');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Filter orders by time range
  const filteredOrders = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    return orders.filter((ord) => {
      const ordTime = new Date(ord.created_at).getTime();
      const diffMs = now - ordTime;

      if (timeFilter === 'today') {
        // Same calendar day or < 24 hours
        return diffMs <= dayMs;
      }
      if (timeFilter === 'week') {
        return diffMs <= 7 * dayMs;
      }
      if (timeFilter === 'month') {
        return diffMs <= 30 * dayMs;
      }
      return true; // 'all'
    });
  }, [orders, timeFilter]);

  // Aggregate Top-Level KPIs
  const kpis = useMemo(() => {
    const totalOmzet = filteredOrders.reduce((sum, o) => sum + o.total_omzet, 0);
    const totalProfit = filteredOrders.reduce((sum, o) => sum + o.total_profit, 0);
    const totalQty = filteredOrders.reduce((sum, o) => sum + o.total_qty, 0);
    const totalOrders = filteredOrders.length;
    const profitMargin = totalOmzet > 0 ? ((totalProfit / totalOmzet) * 100).toFixed(1) : '0';
    const aov = totalOrders > 0 ? Math.round(totalOmzet / totalOrders) : 0;

    // Unique customers
    const uniqueCustomers = new Set(filteredOrders.map((o) => o.customer_name)).size;

    return {
      totalOmzet,
      totalProfit,
      totalQty,
      totalOrders,
      profitMargin,
      aov,
      uniqueCustomers
    };
  }, [filteredOrders]);

  // Group by Product for Leaderboard
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

  // Group by Customer for Customer Intelligence
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
      // Find top item
      const topItemEntry = Object.entries(c.favoriteItems).sort((a, b) => b[1] - a[1])[0];
      return {
        ...c,
        aov: c.orderCount > 0 ? Math.round(c.totalSpend / c.orderCount) : 0,
        marginPct: c.totalSpend > 0 ? Number(((c.totalProfit / c.totalSpend) * 100).toFixed(1)) : 0,
        topItem: topItemEntry ? `${topItemEntry[0]} (${topItemEntry[1]}x)` : '-'
      };
    }).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [filteredOrders]);

  // Daily Trend for the Bar Chart
  const dailyTrend = useMemo(() => {
    // Group orders by day
    const dayMap: Record<string, { label: string; dateStr: string; omzet: number; profit: number; count: number }> = {};

    // Determine days count
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

    const entries = Object.values(dayMap);
    const maxVal = Math.max(...entries.map((e) => Math.max(e.omzet, e.profit)), 100000);

    return { entries, maxVal };
  }, [filteredOrders, timeFilter]);

  // Export report to CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      alert('Tidak ada data transaksi pada periode ini.');
      return;
    }

    let csv = 'No. Pesanan,Tanggal,Customer,No. HP,Metode Kirim,Total Qty,Omzet (Rp),Modal HPP (Rp),Laba Bersih (Rp),Margin (%),Sumber\n';
    filteredOrders.forEach((o) => {
      const date = new Date(o.created_at).toLocaleString('id-ID');
      csv += `"${o.order_number}","${date}","${o.customer_name}","${o.customer_phone}","${o.delivery_method}",${o.total_qty},${o.total_omzet},${o.total_cogs},${o.total_profit},${o.profit_margin_pct}%,"${o.source}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Penjualan_PlastiPro_${timeFilter}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      
      {/* 1. TOP HEADER & TIME FILTER BAR */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl neo-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center neo-border shadow-sm">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-xl sm:text-2xl text-ink">
                Laporan Penjualan & Analisis Keuntungan
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Pantau omzet, laba kotor, produk terlaris, dan performa belanja mitra secara real-time
              </p>
            </div>
          </div>
        </div>

        {/* Filter Periode & Export */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setTimeFilter('today')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                timeFilter === 'today'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-ink'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('week')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                timeFilter === 'week'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-ink'
              }`}
            >
              Minggu Ini (7 Hari)
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('month')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                timeFilter === 'month'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-ink'
              }`}
            >
              Bulan Ini (30 Hari)
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                timeFilter === 'all'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-ink'
              }`}
            >
              Semua Waktu
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-ink text-xs font-black rounded-xl border border-slate-300 shadow-sm flex items-center gap-1.5 transition-all"
            title="Download Spreadsheet CSV"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. 4 HERO KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: TOTAL OMZET */}
        <div className="bg-white p-6 rounded-3xl neo-border shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
              Total Omzet Kotor
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-primary flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block mb-0.5">Penjualan:</span>
            <h4 className="font-display font-black text-2xl lg:text-3xl text-ink">
              Rp {kpis.totalOmzet.toLocaleString('id-ID')}
            </h4>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Rata-rata Order (AOV):</span>
            <span className="text-ink font-mono font-black">
              Rp {kpis.aov.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* KPI 2: TOTAL LABA BERSIH */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-3xl neo-border shadow-hard flex flex-col justify-between space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-emerald-100 tracking-wider">
              Total Keuntungan (Laba)
            </span>
            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-xs text-emerald-100 font-bold block mb-0.5">Laba Kotor Real:</span>
            <h4 className="font-display font-black text-2xl lg:text-3xl text-white">
              Rp {kpis.totalProfit.toLocaleString('id-ID')}
            </h4>
          </div>
          <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs font-bold text-emerald-100">
            <span>Margin Keuntungan:</span>
            <span className="bg-white text-emerald-700 px-2.5 py-0.5 rounded-full font-black text-xs">
              {kpis.profitMargin}% Margin
            </span>
          </div>
        </div>

        {/* KPI 3: TOTAL TRANSAKSI */}
        <div className="bg-white p-6 rounded-3xl neo-border shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
              Volume Transaksi
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block mb-0.5">Pesanan Selesai:</span>
            <h4 className="font-display font-black text-2xl lg:text-3xl text-ink">
              {kpis.totalOrders} <span className="text-base font-bold text-slate-500">Order</span>
            </h4>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Barang Terkirim:</span>
            <span className="text-ink font-mono font-black">{kpis.totalQty} Karton/Pak</span>
          </div>
        </div>

        {/* KPI 4: MITRA AKTIF */}
        <div className="bg-white p-6 rounded-3xl neo-border shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
              Mitra Belanja Aktif
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block mb-0.5">Customer Unik:</span>
            <h4 className="font-display font-black text-2xl lg:text-3xl text-ink">
              {kpis.uniqueCustomers} <span className="text-base font-bold text-slate-500">Mitra</span>
            </h4>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Repeat Order Rate:</span>
            <span className="text-eco-dark font-black">
              {kpis.totalOrders > 0 ? Math.round((kpis.totalOrders / Math.max(kpis.uniqueCustomers, 1)) * 10) / 10 : 0}x / Mitra
            </span>
          </div>
        </div>

      </div>

      {/* 3. GRAFIK TREN PENJUALAN & LABA (RESPONSIVE VISUAL BARS) */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl neo-border shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-display font-black text-lg sm:text-xl text-ink">
                Grafik Tren Omzet vs Keuntungan
              </h4>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                {timeFilter === 'today' ? 'Hari Ini' : timeFilter === 'week' ? '7 Hari Terakhir' : timeFilter === 'month' ? '14 Hari Terakhir' : '30 Hari Terakhir'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Batang Biru menunjukkan Omzet Penjualan • Batang Hijau menunjukkan Laba Kotor Bersih
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-black">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-primary inline-block"></span>
              <span className="text-slate-700">Omzet (Rp)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-eco inline-block"></span>
              <span className="text-slate-700">Keuntungan (Rp)</span>
            </div>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="pt-4">
          <div className="grid grid-flow-col auto-cols-fr gap-2 sm:gap-4 items-end h-56 pt-6 pb-2 border-b-2 border-slate-200 px-2">
            {dailyTrend.entries.map((day, idx) => {
              const omzetHeight = Math.max(Math.round((day.omzet / dailyTrend.maxVal) * 100), 4);
              const profitHeight = Math.max(Math.round((day.profit / dailyTrend.maxVal) * 100), 4);

              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end group relative">
                  
                  {/* Tooltip on Hover */}
                  <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[11px] rounded-xl p-2.5 shadow-xl pointer-events-none z-20 whitespace-nowrap min-w-[130px] border border-slate-700">
                    <strong className="block text-amber-300 font-extrabold">{day.label}</strong>
                    <div>Omzet: <strong>Rp {day.omzet.toLocaleString('id-ID')}</strong></div>
                    <div>Laba: <strong className="text-emerald-400">Rp {day.profit.toLocaleString('id-ID')}</strong></div>
                    <div className="text-[10px] text-slate-400">{day.count} pesanan</div>
                  </div>

                  {/* Dual Bars Container */}
                  <div className="flex items-end gap-1 sm:gap-2 w-full justify-center h-full">
                    {/* Omzet Bar */}
                    <div 
                      style={{ height: `${omzetHeight}%` }}
                      className="w-full max-w-[18px] bg-primary rounded-t-lg transition-all duration-300 group-hover:bg-primary-dark group-hover:scale-y-105 origin-bottom"
                      title={`Omzet: Rp ${day.omzet.toLocaleString('id-ID')}`}
                    />

                    {/* Profit Bar */}
                    <div 
                      style={{ height: `${profitHeight}%` }}
                      className="w-full max-w-[18px] bg-eco rounded-t-lg transition-all duration-300 group-hover:bg-eco-dark group-hover:scale-y-105 origin-bottom"
                      title={`Laba: Rp ${day.profit.toLocaleString('id-ID')}`}
                    />
                  </div>

                  {/* X-Axis Date Label */}
                  <span className="text-[10px] sm:text-xs font-bold text-slate-500 mt-2 truncate max-w-full text-center">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. DUA KOLOM: LEADERBOARD PRODUK & DATA PENJUALAN PER CUSTOMER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* KOLOM KIRI: PRODUK TERLARIS & PALING MENGUNTUNGKAN (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-3xl neo-border shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h4 className="font-display font-black text-lg sm:text-xl text-ink">
                Leaderboard Produk
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                Peringkat produk berdasarkan keuntungan dan volume penjualan
              </p>
            </div>

            {/* Tab Filter Produk */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setProductTab('profit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                  productTab === 'profit'
                    ? 'bg-eco text-white shadow-sm'
                    : 'text-slate-600 hover:text-ink'
                }`}
              >
                <Gem className="w-3.5 h-3.5" />
                <span>Paling Menguntungkan</span>
              </button>
              <button
                type="button"
                onClick={() => setProductTab('volume')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                  productTab === 'volume'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 hover:text-ink'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Paling Laku</span>
              </button>
            </div>
          </div>

          {/* Product Items List */}
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {productPerformance.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-semibold text-xs">
                Belum ada transaksi pada periode ini.
              </div>
            ) : (
              productPerformance.map((prod, rank) => (
                <div 
                  key={prod.id || prod.name}
                  className="p-4 bg-slate-50 hover:bg-sky-50/50 rounded-2xl border border-slate-200 hover:border-primary/40 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Rank Badge */}
                    <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center neo-border shrink-0 ${
                      rank === 0 ? 'bg-amber-400 text-slate-900' :
                      rank === 1 ? 'bg-slate-300 text-slate-800' :
                      rank === 2 ? 'bg-amber-600 text-white' :
                      'bg-white text-slate-600'
                    }`}>
                      #{rank + 1}
                    </div>

                    <div className="min-w-0">
                      <h5 className="font-extrabold text-sm text-ink truncate group-hover:text-primary transition-colors">
                        {prod.name}
                      </h5>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span>Terjual: <strong className="text-ink font-mono font-bold">{prod.qtySold} {prod.unitCode}</strong></span>
                        <span>•</span>
                        <span>Omzet: <strong className="text-ink font-mono font-bold">Rp {prod.totalOmzet.toLocaleString('id-ID')}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Profit Value & Margin */}
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-black text-slate-400 block">
                      Keuntungan Bersih:
                    </span>
                    <span className="font-display font-black text-base text-eco-dark block">
                      +Rp {prod.totalProfit.toLocaleString('id-ID')}
                    </span>
                    <span className="inline-block text-[10px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full mt-0.5">
                      Margin {prod.marginPct}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* KOLOM KANAN: DATA PENJUALAN PER CUSTOMER (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl neo-border shadow-sm space-y-5">
          <div className="pb-4 border-b border-slate-200">
            <h4 className="font-display font-black text-lg sm:text-xl text-ink">
              Data Penjualan Per Customer (Mitra)
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              Riwayat belanja total & produk langganan per mitra
            </p>
          </div>

          <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-1">
            {customerPerformance.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-semibold text-xs">
                Belum ada data pelanggan pada periode ini.
              </div>
            ) : (
              customerPerformance.map((cust, idx) => {
                const isExpanded = selectedCustomerId === cust.name;

                return (
                  <div 
                    key={idx}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 cursor-pointer hover:border-primary/50 transition-all"
                    onClick={() => setSelectedCustomerId(isExpanded ? null : cust.name)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <h5 className="font-display font-black text-sm text-ink">
                            {cust.name}
                          </h5>
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          📱 {cust.phone}
                        </p>
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
                      <span className="text-slate-500 font-medium">Laba dari Mitra Ini:</span>
                      <strong className="text-eco-dark font-mono font-black">
                        +Rp {cust.totalProfit.toLocaleString('id-ID')} ({cust.marginPct}%)
                      </strong>
                    </div>

                    <div className="text-xs text-slate-600 truncate">
                      <span className="text-slate-400 font-semibold">Favorit:</span> {cust.topItem}
                    </div>

                    {/* Expandable Order History */}
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
                                {new Date(ord.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-ink block">Rp {ord.total_omzet.toLocaleString('id-ID')}</span>
                              <span className="text-[10px] text-eco-dark font-extrabold">Untung: +Rp {ord.total_profit.toLocaleString('id-ID')}</span>
                            </div>
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

      {/* 5. RESET DEMO DATA HELPER (FOR OWNER TESTING) */}
      <div className="flex items-center justify-between p-4 bg-slate-100 rounded-2xl border border-slate-200 text-xs text-slate-500">
        <div>
          <strong className="text-ink">Uji Coba Data Pembukuan:</strong> Transaksi otomatis tercatat saat pembeli checkout WhatsApp atau kasir mencetak struk thermal 58mm.
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm('Muat ulang data simulasi penjualan 30 hari terakhir?')) {
              resetToDemoOrders();
            }
          }}
          className="text-xs font-bold text-primary hover:underline shrink-0"
        >
          Reset Data Simulasi
        </button>
      </div>

    </div>
  );
};
