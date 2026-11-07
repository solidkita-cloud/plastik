import { 
  doc, 
  setDoc, 
  deleteDoc, 
  collection, 
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useSettingsStore, StoreSettings } from '../stores/settingsStore';
import { useCatalogStore } from '../stores/catalogStore';
import { useCustomerStore } from '../stores/customerStore';
import { useSalesStore } from '../stores/salesStore';
import { Product, CustomerProfile, SalesOrder } from '../types';

let isListening = false;
let unsubscribeSettings: (() => void) | null = null;
let unsubscribeProducts: (() => void) | null = null;
let unsubscribeCustomers: (() => void) | null = null;
let unsubscribeOrders: (() => void) | null = null;

/**
 * Memulai sinkronisasi realtime dari Firebase Firestore ke local store.
 */
export function startFirebaseRealtimeSync(onStatusChange?: (status: {
  connected: boolean;
  message: string;
  lastSync?: Date;
}) => void) {
  if (isListening) return;
  isListening = true;

  try {
    // 1. Listen ke Settings Toko
    const settingsRef = doc(db, 'settings', 'general');
    unsubscribeSettings = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const cloudData = snapshot.data() as Partial<StoreSettings>;
        useSettingsStore.getState().updateSettings(cloudData);
        onStatusChange?.({
          connected: true,
          message: 'Pengaturan toko sinkron dari Cloud',
          lastSync: new Date()
        });
      }
    }, (error) => {
      console.warn('Firebase Settings snapshot error:', error);
      onStatusChange?.({
        connected: false,
        message: 'Koneksi Firestore belum siap: ' + error.message
      });
    });

    // 2. Listen ke Katalog Produk
    const productsRef = collection(db, 'products');
    unsubscribeProducts = onSnapshot(productsRef, (snapshot) => {
      if (!snapshot.empty) {
        const cloudProducts: Product[] = [];
        snapshot.forEach((docSnap) => {
          cloudProducts.push(docSnap.data() as Product);
        });

        if (cloudProducts.length > 0) {
          useCatalogStore.setState({ products: cloudProducts });
          localStorage.setItem('plastipro_custom_catalog_v2', JSON.stringify(cloudProducts));
        }
      }
    }, (error) => {
      console.warn('Firebase Products snapshot error:', error);
    });

    // 3. Listen ke Mitra & QR Pelanggan
    const customersRef = collection(db, 'customers');
    unsubscribeCustomers = onSnapshot(customersRef, (snapshot) => {
      if (!snapshot.empty) {
        const cloudCustomers: CustomerProfile[] = [];
        snapshot.forEach((docSnap) => {
          cloudCustomers.push(docSnap.data() as CustomerProfile);
        });

        if (cloudCustomers.length > 0) {
          useCustomerStore.setState({ customers: cloudCustomers });
          localStorage.setItem('plastipro_customers_list_v2', JSON.stringify(cloudCustomers));
        }
      }
    }, (error) => {
      console.warn('Firebase Customers snapshot error:', error);
    });

    // 4. Listen ke Data Transaksi Penjualan (Orders)
    const ordersRef = collection(db, 'orders');
    unsubscribeOrders = onSnapshot(ordersRef, (snapshot) => {
      if (!snapshot.empty) {
        const cloudOrders: SalesOrder[] = [];
        snapshot.forEach((docSnap) => {
          cloudOrders.push(docSnap.data() as SalesOrder);
        });

        if (cloudOrders.length > 0) {
          useSalesStore.setState({ orders: cloudOrders });
          localStorage.setItem('plastipro_sales_orders_v1', JSON.stringify(cloudOrders));
        }
      }
    }, (error) => {
      console.warn('Firebase Orders snapshot error:', error);
    });

    onStatusChange?.({
      connected: true,
      message: 'Sinkronisasi Realtime Aktif',
      lastSync: new Date()
    });
  } catch (err: any) {
    console.error('Gagal mengaktifkan Firebase sync:', err);
    onStatusChange?.({
      connected: false,
      message: err?.message || 'Gagal tersambung ke Firebase'
    });
  }
}

/**
 * Hentikan listener realtime
 */
export function stopFirebaseRealtimeSync() {
  if (unsubscribeSettings) unsubscribeSettings();
  if (unsubscribeProducts) unsubscribeProducts();
  if (unsubscribeCustomers) unsubscribeCustomers();
  if (unsubscribeOrders) unsubscribeOrders();
  isListening = false;
}

/**
 * Simpan pengaturan toko ke Firebase Firestore
 */
export async function saveSettingsToFirebase(settings: Partial<StoreSettings>): Promise<boolean> {
  try {
    const settingsRef = doc(db, 'settings', 'general');
    // Bersihkan nilai undefined jika ada
    const cleanData = JSON.parse(JSON.stringify(settings));
    await setDoc(settingsRef, cleanData, { merge: true });
    return true;
  } catch (error) {
    console.error('Gagal menyimpan settings ke Firebase:', error);
    return false;
  }
}

/**
 * Simpan satu produk ke Firebase
 */
export async function saveProductToFirebase(product: Product): Promise<boolean> {
  try {
    const productRef = doc(db, 'products', product.id);
    await setDoc(productRef, product);
    return true;
  } catch (error) {
    console.error('Gagal menyimpan produk ke Firebase:', error);
    return false;
  }
}

/**
 * Hapus produk dari Firebase
 */
export async function deleteProductFromFirebase(productId: string): Promise<boolean> {
  try {
    const productRef = doc(db, 'products', productId);
    await deleteDoc(productRef);
    return true;
  } catch (error) {
    console.error('Gagal menghapus produk dari Firebase:', error);
    return false;
  }
}

/**
 * Simpan satu mitra/pelanggan ke Firebase
 */
export async function saveCustomerToFirebase(customer: CustomerProfile): Promise<boolean> {
  try {
    const customerRef = doc(db, 'customers', customer.id);
    await setDoc(customerRef, customer);
    return true;
  } catch (error) {
    console.error('Gagal menyimpan customer ke Firebase:', error);
    return false;
  }
}

/**
 * Hapus mitra dari Firebase
 */
export async function deleteCustomerFromFirebase(customerId: string): Promise<boolean> {
  try {
    const customerRef = doc(db, 'customers', customerId);
    await deleteDoc(customerRef);
    return true;
  } catch (error) {
    console.error('Gagal menghapus customer dari Firebase:', error);
    return false;
  }
}

/**
 * Simpan data transaksi penjualan ke Firebase
 */
export async function saveOrderToFirebase(order: SalesOrder): Promise<boolean> {
  try {
    const orderRef = doc(db, 'orders', order.id);
    const cleanData = JSON.parse(JSON.stringify(order));
    await setDoc(orderRef, cleanData);
    return true;
  } catch (error) {
    console.error('Gagal menyimpan order ke Firebase:', error);
    return false;
  }
}

/**
 * Upload seluruh data lokal saat ini (Pengaturan, Katalog, Mitra, Penjualan) ke Cloud Firebase sekaligus
 */
export async function uploadAllLocalDataToFirebase(): Promise<{
  success: boolean;
  message: string;
  counts: { products: number; customers: number; orders: number };
}> {
  try {
    const currentSettings = useSettingsStore.getState();
    const currentProducts = useCatalogStore.getState().products;
    const currentCustomers = useCustomerStore.getState().customers;
    const currentOrders = useSalesStore.getState().orders;

    // 1. Upload settings
    const settingsRef = doc(db, 'settings', 'general');
    const settingsPayload: StoreSettings = {
      storeName: currentSettings.storeName,
      tagline: currentSettings.tagline,
      phone: currentSettings.phone,
      phoneDisplay: currentSettings.phoneDisplay,
      address: currentSettings.address,
      city: currentSettings.city,
      landmark: currentSettings.landmark,
      operationalHours: currentSettings.operationalHours,
      instagram: currentSettings.instagram,
      email: currentSettings.email,
      logoUrl: currentSettings.logoUrl,
      thermalFooterNote: currentSettings.thermalFooterNote,
      ownerPin: currentSettings.ownerPin || '1234',
      isPinChanged: Boolean(currentSettings.isPinChanged)
    };
    await setDoc(settingsRef, JSON.parse(JSON.stringify(settingsPayload)), { merge: true });

    // 2. Upload products in batch
    const batch = writeBatch(db);
    currentProducts.forEach((p) => {
      const pRef = doc(db, 'products', p.id);
      batch.set(pRef, p);
    });

    // 3. Upload customers
    currentCustomers.forEach((c) => {
      const cRef = doc(db, 'customers', c.id);
      batch.set(cRef, c);
    });

    // 4. Upload orders (up to 500 limit for a batch)
    currentOrders.slice(0, 50).forEach((ord) => {
      const ordRef = doc(db, 'orders', ord.id);
      batch.set(ordRef, JSON.parse(JSON.stringify(ord)));
    });

    await batch.commit();

    return {
      success: true,
      message: 'Berhasil mengunggah seluruh data toko, produk, mitra, dan riwayat penjualan ke Cloud Firebase!',
      counts: {
        products: currentProducts.length,
        customers: currentCustomers.length,
        orders: currentOrders.length
      }
    };
  } catch (error: any) {
    console.error('Gagal upload data ke Firebase:', error);
    return {
      success: false,
      message: error?.message || 'Gagal mengunggah data ke Cloud Firebase.',
      counts: { products: 0, customers: 0, orders: 0 }
    };
  }
}
