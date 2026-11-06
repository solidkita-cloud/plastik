import { create } from 'zustand';
import { CustomerProfile } from '../types';
import { DEMO_CUSTOMERS } from '../lib/constants';

interface CustomerState {
  customers: CustomerProfile[];
  addCustomer: (customer: CustomerProfile) => void;
  updateCustomer: (customer: CustomerProfile) => void;
  deleteCustomer: (id: string) => void;
  findByToken: (token: string) => CustomerProfile | undefined;
  resetDefaultCustomers: () => void;
}

const STORAGE_KEY = 'plastipro_customers_list_v2';

function loadInitialCustomers(): CustomerProfile[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Gagal membaca customer profiles dari localStorage:', err);
  }
  return DEMO_CUSTOMERS;
}

function saveCustomers(customers: CustomerProfile[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  } catch (err) {
    console.warn('Gagal menyimpan customer profiles ke localStorage:', err);
  }
}

export const useCustomerStore = create<CustomerState>((set, get) => {
  const initial = loadInitialCustomers();

  return {
    customers: initial,

    addCustomer: (newCustomer) => {
      set((state) => {
        const updated = [newCustomer, ...state.customers];
        saveCustomers(updated);
        return { customers: updated };
      });
    },

    updateCustomer: (updatedCustomer) => {
      set((state) => {
        const updated = state.customers.map((c) =>
          c.id === updatedCustomer.id ? updatedCustomer : c
        );
        saveCustomers(updated);
        return { customers: updated };
      });
    },

    deleteCustomer: (id) => {
      set((state) => {
        const updated = state.customers.filter((c) => c.id !== id);
        saveCustomers(updated);
        return { customers: updated };
      });
    },

    findByToken: (token) => {
      const clean = token.trim().toUpperCase();
      return get().customers.find(
        (c) =>
          c.qr_token.toUpperCase() === clean ||
          c.id.toUpperCase() === clean ||
          c.phone_number.includes(clean)
      );
    },

    resetDefaultCustomers: () => {
      localStorage.removeItem(STORAGE_KEY);
      set({ customers: DEMO_CUSTOMERS });
    }
  };
});
