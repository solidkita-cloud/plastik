import { create } from 'zustand';
import { ExpenseRecord, ExpenseCategory } from '../types';

export const EXPENSE_CATEGORIES: { id: ExpenseCategory; name: string }[] = [
  { id: 'operasional', name: 'Operasional & Perlengkapan' },
  { id: 'transport', name: 'Transport & Bensin Kurir' },
  { id: 'gaji', name: 'Gaji & Uang Makan Karyawan' },
  { id: 'utilitas', name: 'Listrik, Air & Wifi Toko' },
  { id: 'pembelian_stok', name: 'Ongkir / Bongkar Muat Stok' },
  { id: 'lainnya', name: 'Biaya Tak Terduga / Lainnya' }
];

const STORAGE_KEY = 'plastipro_expenses_v1';

function generateDemoExpenses(): ExpenseRecord[] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  return [
    {
      id: 'exp_1',
      created_at: new Date(now - 1 * dayMs).toISOString(),
      category: 'transport',
      category_name: 'Transport & Bensin Kurir',
      title: 'Bensin Motor Kurir Kirim Sidoarjo',
      amount: 35000,
      notes: 'Kirim pesanan Warung Geprek Bu Siti'
    },
    {
      id: 'exp_2',
      created_at: new Date(now - 2 * dayMs).toISOString(),
      category: 'operasional',
      category_name: 'Operasional & Perlengkapan',
      title: 'Lakban Bening 2 Inci & Tali Rafia',
      amount: 48000,
      notes: 'Packing bal dan kardus pengiriman'
    },
    {
      id: 'exp_3',
      created_at: new Date(now - 4 * dayMs).toISOString(),
      category: 'utilitas',
      category_name: 'Listrik, Air & Wifi Toko',
      title: 'Token Listrik Gudang & Toko',
      amount: 150000,
      notes: 'Listrik operasional toko 1 bulan'
    },
    {
      id: 'exp_4',
      created_at: new Date(now - 6 * dayMs).toISOString(),
      category: 'operasional',
      category_name: 'Operasional & Perlengkapan',
      title: 'Kertas Thermal Struk 58mm (10 Roll)',
      amount: 45000,
      notes: 'Isi ulang kertas printer kasir POS-58'
    }
  ];
}

function loadInitialExpenses(): ExpenseRecord[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Gagal membaca data pengeluaran kas:', err);
  }
  return generateDemoExpenses();
}

function saveExpenses(expenses: ExpenseRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (err) {
    console.warn('Gagal menyimpan pengeluaran kas ke localStorage:', err);
  }
}

interface ExpenseState {
  expenses: ExpenseRecord[];
  addExpense: (data: { category: ExpenseCategory; title: string; amount: number; notes?: string }) => ExpenseRecord;
  deleteExpense: (id: string) => void;
  clearAllExpenses: () => void;
  resetDemoExpenses: () => void;
}

export const useExpenseStore = create<ExpenseState>((set) => {
  const initial = loadInitialExpenses();

  return {
    expenses: initial,

    addExpense: ({ category, title, amount, notes }) => {
      const catObj = EXPENSE_CATEGORIES.find((c) => c.id === category);
      const newExpense: ExpenseRecord = {
        id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        created_at: new Date().toISOString(),
        category,
        category_name: catObj?.name || 'Operasional',
        title: title.trim(),
        amount: Math.round(Number(amount) || 0),
        notes: notes?.trim()
      };

      set((state) => {
        const updated = [newExpense, ...state.expenses];
        saveExpenses(updated);
        return { expenses: updated };
      });

      return newExpense;
    },

    deleteExpense: (id) => {
      set((state) => {
        const updated = state.expenses.filter((e) => e.id !== id);
        saveExpenses(updated);
        return { expenses: updated };
      });
    },

    clearAllExpenses: () => {
      saveExpenses([]);
      set({ expenses: [] });
    },

    resetDemoExpenses: () => {
      const demo = generateDemoExpenses();
      saveExpenses(demo);
      set({ expenses: demo });
    }
  };
});
