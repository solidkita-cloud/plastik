import { create } from 'zustand';
import { CashierClosingRecap } from '../types';

const RECAPS_STORAGE_KEY = 'plastipro_closing_recaps_v1';
const CASH_FLOAT_KEY = 'plastipro_cash_float_v1';

function loadInitialRecaps(): CashierClosingRecap[] {
  try {
    const raw = localStorage.getItem(RECAPS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function loadSavedCashFloat(): number {
  try {
    const raw = localStorage.getItem(CASH_FLOAT_KEY);
    if (raw !== null && !isNaN(Number(raw))) {
      return Math.max(0, Number(raw));
    }
  } catch {}
  return 100000;
}

interface ClosingState {
  recaps: CashierClosingRecap[];
  defaultOpeningFloat: number;
  addRecap: (recap: CashierClosingRecap) => void;
  setDefaultOpeningFloat: (amount: number) => void;
}

export const useClosingStore = create<ClosingState>((set) => ({
  recaps: loadInitialRecaps(),
  defaultOpeningFloat: loadSavedCashFloat(),

  addRecap: (recap) => {
    set((state) => {
      const updated = [recap, ...state.recaps].slice(0, 90);
      try {
        localStorage.setItem(RECAPS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return { recaps: updated };
    });
  },

  setDefaultOpeningFloat: (amount) => {
    const clean = Math.max(0, Math.round(amount));
    try {
      localStorage.setItem(CASH_FLOAT_KEY, String(clean));
    } catch {}
    set({ defaultOpeningFloat: clean });
  }
}));
