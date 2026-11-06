import { create } from 'zustand';

export interface StoreSettings {
  storeName: string;
  tagline: string;
  phone: string;
  phoneDisplay: string;
  address: string;
  city: string;
  landmark: string;
  operationalHours: string;
  instagram: string;
  email: string;
  logoUrl: string | null;
  thermalFooterNote: string;
}

interface SettingsState extends StoreSettings {
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  resetToDefault: () => void;
}

const STORAGE_KEY = 'plastipro_store_settings_v2';

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'PlastiPro',
  tagline: 'Plastik & Kemasan Berkualitas',
  phone: '6281234567890',
  phoneDisplay: '0812-3456-7890',
  address: 'Jl. Raya Industri Kemasan No. 88, Sidoarjo - Jawa Timur',
  city: 'Sidoarjo',
  landmark: 'Area Pergudangan Industri Sedati',
  operationalHours: 'Senin - Sabtu: 07.30 - 17.00 WIB (Minggu Libur)',
  instagram: '@plastipro.id',
  email: 'halo@plastipro.co.id',
  logoUrl: null,
  thermalFooterNote: 'Barang yang sudah dibeli dapat ditukar jika ada cacat pabrik maksimal 2 hari.'
};

export function cleanPhoneNumber(raw?: string | null): { international: string; display: string } {
  const safe = typeof raw === 'string' ? raw : (raw ? String(raw) : '');
  let cleaned = safe.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (!cleaned.startsWith('62') && cleaned.length > 0) {
    cleaned = '62' + cleaned;
  }
  if (!cleaned) cleaned = '6281234567890';

  // Format display 08xx-xxxx-xxxx
  let localNumber = cleaned.startsWith('62') ? '0' + cleaned.substring(2) : cleaned;
  let display = localNumber;
  if (localNumber.length >= 10) {
    display = `${localNumber.substring(0, 4)}-${localNumber.substring(4, 8)}-${localNumber.substring(8)}`;
  }

  return { international: cleaned, display };
}

function loadInitialSettings(): StoreSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.warn('Gagal membaca store settings dari localStorage:', err);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: StoreSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Gagal menyimpan store settings ke localStorage:', err);
  }
}

export const useSettingsStore = create<SettingsState>((set) => {
  const initial = loadInitialSettings();

  return {
    ...initial,

    updateSettings: (newSettings) => {
      set((state) => {
        let updatedPhone = state.phone;
        let updatedPhoneDisplay = state.phoneDisplay;

        if (newSettings.phone && newSettings.phone !== state.phone) {
          const { international, display } = cleanPhoneNumber(newSettings.phone);
          updatedPhone = international;
          updatedPhoneDisplay = newSettings.phoneDisplay || display;
        }

        const updated: StoreSettings = {
          ...state,
          ...newSettings,
          phone: updatedPhone,
          phoneDisplay: updatedPhoneDisplay
        };

        saveSettings(updated);
        return updated;
      });
    },

    resetToDefault: () => {
      localStorage.removeItem(STORAGE_KEY);
      set({ ...DEFAULT_SETTINGS });
    }
  };
});
