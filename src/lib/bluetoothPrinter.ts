import { SalesOrder, CashierClosingRecap } from '../types';
import { StoreSettings } from '../stores/settingsStore';

export interface BluetoothDeviceChar {
  properties: {
    write?: boolean;
    writeWithoutResponse?: boolean;
  };
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse?(value: BufferSource): Promise<void>;
}

export type ThermalPaperWidth = '58mm' | '80mm';

const LAST_PRINTER_STORAGE_KEY = 'plastipro_last_printer_name_v1';
export const PRINTER_STATUS_EVENT = 'plastipro_printer_status_changed';

let cachedDevice: any = null;
let cachedCharacteristic: BluetoothDeviceChar | null = null;

function notifyPrinterStatusChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PRINTER_STATUS_EVENT));
  }
}

export function getLastConnectedPrinterName(): string | null {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LAST_PRINTER_STORAGE_KEY);
      return saved && saved.trim() ? saved.trim() : null;
    }
  } catch {}
  return null;
}

function saveLastConnectedPrinterName(name?: string | null): void {
  try {
    if (typeof window !== 'undefined' && name && name.trim()) {
      localStorage.setItem(LAST_PRINTER_STORAGE_KEY, name.trim());
    }
  } catch {}
}

export function getReceiptColumnWidth(
  storeSettings?: Partial<StoreSettings>,
  overrideWidth?: ThermalPaperWidth
): number {
  const effective = overrideWidth || storeSettings?.printerPaperWidth || '58mm';
  return effective === '80mm' ? 48 : 32;
}

const KNOWN_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard 0x18f0 (POS printers)
  '0000ffe0-0000-1000-8000-00805f9b34fb', // 0xffe0 (RPP02N, MP-58A1, Goojprt, VSC)
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '0000af30-0000-1000-8000-00805f9b34fb'
];

export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator && !!(navigator as any).bluetooth;
}

export function isPrinterConnected(): boolean {
  return !!cachedDevice && !!cachedDevice.gatt && cachedDevice.gatt.connected && !!cachedCharacteristic;
}

export function getConnectedDeviceName(): string | null {
  if (cachedDevice && cachedDevice.name) return cachedDevice.name;
  return null;
}

export function disconnectBluetoothPrinter(): void {
  if (cachedDevice && cachedDevice.gatt && cachedDevice.gatt.connected) {
    try {
      cachedDevice.gatt.disconnect();
    } catch (e) {
      console.warn('Disconnect error:', e);
    }
  }
  cachedDevice = null;
  cachedCharacteristic = null;
  notifyPrinterStatusChanged();
}

async function resolveWritableCharacteristic(device: any): Promise<BluetoothDeviceChar> {
  if (!device || !device.gatt) {
    throw new Error('Tidak ada printer Bluetooth yang dipilih.');
  }

  const server = device.gatt.connected ? device.gatt : await device.gatt.connect();
  let writeChar: BluetoothDeviceChar | null = null;

  for (const uuid of KNOWN_PRINTER_SERVICES) {
    try {
      const service = await server.getPrimaryService(uuid);
      const chars = await service.getCharacteristics();
      for (const c of chars) {
        if (c.properties.write || c.properties.writeWithoutResponse) {
          writeChar = c;
          break;
        }
      }
    } catch {
      // Lanjut cek UUID service lain
    }
    if (writeChar) break;
  }

  if (!writeChar) {
    try {
      const services = await server.getPrimaryServices();
      for (const s of services) {
        const chars = await s.getCharacteristics();
        for (const c of chars) {
          if (c.properties.write || c.properties.writeWithoutResponse) {
            writeChar = c;
            break;
          }
        }
        if (writeChar) break;
      }
    } catch (err) {
      console.warn('Fallback primary service scan failed:', err);
    }
  }

  if (!writeChar) {
    throw new Error(
      `Printer "${device.name || 'Bluetooth'}" tersambung, tetapi channel cetak ESC/POS tidak merespons. Pastikan printer thermal menyala.`
    );
  }

  cachedDevice = device;
  cachedCharacteristic = writeChar;
  saveLastConnectedPrinterName(device.name || null);

  device.addEventListener(
    'gattserverdisconnected',
    () => {
      if (cachedDevice === device) {
        cachedDevice = null;
        cachedCharacteristic = null;
        notifyPrinterStatusChanged();
      }
    },
    { once: true }
  );

  notifyPrinterStatusChanged();
  return writeChar;
}

export async function trySilentReconnectPrinter(): Promise<BluetoothDeviceChar | null> {
  if (isPrinterConnected()) {
    return cachedCharacteristic!;
  }
  if (!isBluetoothSupported()) {
    return null;
  }

  const navBluetooth = (navigator as any).bluetooth;
  if (typeof navBluetooth.getDevices === 'function') {
    try {
      const permittedDevices: any[] = await navBluetooth.getDevices();
      if (Array.isArray(permittedDevices) && permittedDevices.length > 0) {
        const lastPrinterName = getLastConnectedPrinterName();
        const preferred =
          (lastPrinterName && permittedDevices.find((d) => d?.name === lastPrinterName)) ||
          permittedDevices[0];
        if (preferred?.gatt) {
          try {
            return await resolveWritableCharacteristic(preferred);
          } catch {
            // Printer di luar jangkauan atau mati
          }
        }
      }
    } catch {
      // Abaikan jika browser membatasi getDevices
    }
  }
  return null;
}

export async function getOrConnectPrinter(forceNew = false): Promise<BluetoothDeviceChar> {
  if (!forceNew && isPrinterConnected()) {
    return cachedCharacteristic!;
  }

  if (!isBluetoothSupported()) {
    throw new Error(
      'Web Bluetooth tidak didukung di browser ini. Gunakan Google Chrome di HP Android atau cetak PDF 58mm.'
    );
  }

  if (forceNew) {
    disconnectBluetoothPrinter();
  } else {
    const silentChar = await trySilentReconnectPrinter();
    if (silentChar) {
      return silentChar;
    }
  }

  const navBluetooth = (navigator as any).bluetooth;
  const device = await navBluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: KNOWN_PRINTER_SERVICES
  });

  return resolveWritableCharacteristic(device);
}

export async function switchBluetoothPrinter(): Promise<{ deviceName: string }> {
  await getOrConnectPrinter(true);
  return { deviceName: getConnectedDeviceName() || 'Printer Thermal' };
}

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

export function cleanTextForPrinter(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[^\x20-\x7E\r\n]/g, (char) => {
      if (char === '•') return '-';
      if (char === '↳') return '>';
      if (char === '✓') return 'OK';
      if (char === '±') return '~';
      return '';
    })
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function wordWrap(text: string, maxWidth = 32): string[] {
  if (!text) return [];
  const clean = cleanTextForPrinter(text);
  const words = clean.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!word) continue;
    if (!currentLine) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

export interface EscPosRasterBitmap {
  widthBytes: number;
  height: number;
  data: number[];
}

export async function imageToEscPosRaster(
  imageSrc?: string | null,
  paperWidth?: ThermalPaperWidth
): Promise<EscPosRasterBitmap | null> {
  if (!imageSrc || typeof document === 'undefined' || typeof Image === 'undefined') {
    return null;
  }

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      if (!imageSrc.startsWith('data:')) {
        el.crossOrigin = 'anonymous';
      }
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Gagal memuat gambar logo struk'));
      el.src = imageSrc;
    });

    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;
    if (naturalW <= 0 || naturalH <= 0) return null;

    const maxWidth = paperWidth === '80mm' ? 224 : 168;
    const maxHeight = paperWidth === '80mm' ? 112 : 96;
    const scale = Math.min(maxWidth / naturalW, maxHeight / naturalH, 1);

    const drawWidth = Math.max(8, Math.round(naturalW * scale));
    const drawHeight = Math.max(8, Math.round(naturalH * scale));
    const canvasWidth = Math.ceil(drawWidth / 8) * 8;
    const offsetX = Math.floor((canvasWidth - drawWidth) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = drawHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, drawHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, offsetX, 0, drawWidth, drawHeight);

    const { data: pixels } = ctx.getImageData(0, 0, canvasWidth, drawHeight);
    const widthBytes = canvasWidth / 8;
    const packed: number[] = new Array(widthBytes * drawHeight).fill(0);

    for (let y = 0; y < drawHeight; y++) {
      for (let byteX = 0; byteX < widthBytes; byteX++) {
        let byteVal = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = byteX * 8 + bit;
          const idx = (y * canvasWidth + x) * 4;
          const alpha = pixels[idx + 3] / 255;
          const luma =
            (0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]) * alpha +
            255 * (1 - alpha);
          if (luma < 145) {
            byteVal |= 1 << (7 - bit);
          }
        }
        packed[y * widthBytes + byteX] = byteVal;
      }
    }

    return { widthBytes, height: drawHeight, data: packed };
  } catch {
    return null;
  }
}

export class EscPosBuilder {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  init(): this {
    this.buffer.push(ESC, 0x40);
    return this;
  }

  alignCenter(): this {
    this.buffer.push(ESC, 0x61, 0x01);
    return this;
  }

  alignLeft(): this {
    this.buffer.push(ESC, 0x61, 0x00);
    return this;
  }

  bold(enable = true): this {
    this.buffer.push(ESC, 0x45, enable ? 0x01 : 0x00);
    return this;
  }

  sizeNormal(): this {
    this.buffer.push(GS, 0x21, 0x00);
    return this;
  }

  sizeDouble(): this {
    this.buffer.push(GS, 0x21, 0x11);
    return this;
  }

  sizeDoubleHeight(): this {
    this.buffer.push(GS, 0x21, 0x01);
    return this;
  }

  newLine(count = 1): this {
    for (let i = 0; i < count; i++) {
      this.buffer.push(LF);
    }
    return this;
  }

  text(str: string): this {
    const clean = cleanTextForPrinter(str);
    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i);
      this.buffer.push(code < 128 ? code : 0x20);
    }
    return this;
  }

  textLine(str: string): this {
    this.text(str);
    this.newLine();
    return this;
  }

  separator(char = '-', width = 32): this {
    this.textLine(char.repeat(width));
    return this;
  }

  twoColumns(left: string, right: string, width = 32): this {
    const cleanLeft = cleanTextForPrinter(left);
    const cleanRight = cleanTextForPrinter(right);
    const spaceNeeded = width - (cleanLeft.length + cleanRight.length);
    if (spaceNeeded >= 0) {
      this.textLine(cleanLeft + ' '.repeat(spaceNeeded) + cleanRight);
    } else {
      const maxLeft = width - cleanRight.length - 1;
      if (maxLeft > 8) {
        this.textLine(cleanLeft.substring(0, maxLeft) + ' ' + cleanRight);
      } else {
        this.textLine(cleanLeft);
        this.textLine(' '.repeat(Math.max(0, width - cleanRight.length)) + cleanRight);
      }
    }
    return this;
  }

  qrCode(data: string, size = 5): this {
    const cleanData = data.trim();
    const bytes: number[] = [];
    for (let i = 0; i < cleanData.length; i++) {
      const code = cleanData.charCodeAt(i);
      if (code < 128) bytes.push(code);
    }
    const len = bytes.length + 3;
    const pL = len % 256;
    const pH = Math.floor(len / 256);

    this.buffer.push(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    this.buffer.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, Math.min(16, Math.max(1, size)));
    this.buffer.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30);
    this.buffer.push(GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...bytes);
    this.buffer.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
    return this;
  }

  rasterBitmap(bitmap: EscPosRasterBitmap | null | undefined): this {
    if (!bitmap || bitmap.widthBytes <= 0 || bitmap.height <= 0 || bitmap.data.length === 0) {
      return this;
    }
    const xL = bitmap.widthBytes & 0xff;
    const xH = (bitmap.widthBytes >> 8) & 0xff;
    const yL = bitmap.height & 0xff;
    const yH = (bitmap.height >> 8) & 0xff;
    this.buffer.push(GS, 0x76, 0x30, 0x00, xL, xH, yL, yH, ...bitmap.data);
    this.newLine(1);
    return this;
  }

  feedAndCut(lines = 4): this {
    this.newLine(lines);
    this.buffer.push(GS, 0x56, 0x41, 0x00);
    return this;
  }

  getUint8Array(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

export async function sendRawEscPos(
  characteristic: BluetoothDeviceChar,
  bytes: Uint8Array
): Promise<void> {
  const CHUNK_SIZE = 64;
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.slice(i, i + CHUNK_SIZE);
    if (characteristic.properties.writeWithoutResponse && characteristic.writeValueWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValue(chunk);
    }
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}

async function sendPayloadWithRetry(
  initialChar: BluetoothDeviceChar,
  buildBytes: () => Uint8Array | Promise<Uint8Array>
): Promise<{ success: boolean; deviceName: string }> {
  const previousDevice = cachedDevice;
  let char = initialChar;
  const payload = await buildBytes();

  try {
    await sendRawEscPos(char, payload);
  } catch (err) {
    const targetDevice = cachedDevice || previousDevice;
    cachedDevice = null;
    cachedCharacteristic = null;
    notifyPrinterStatusChanged();

    if (targetDevice?.gatt) {
      try {
        char = await resolveWritableCharacteristic(targetDevice);
        await sendRawEscPos(char, payload);
        return { success: true, deviceName: getConnectedDeviceName() || 'Printer Thermal' };
      } catch {
        cachedDevice = null;
        cachedCharacteristic = null;
        notifyPrinterStatusChanged();
      }
    }
    throw err;
  }

  return { success: true, deviceName: getConnectedDeviceName() || 'Printer Thermal' };
}

async function sendEscPosJob(
  buildBytes: () => Uint8Array | Promise<Uint8Array>
): Promise<{ success: boolean; deviceName: string }> {
  const char = await getOrConnectPrinter();
  return sendPayloadWithRetry(char, buildBytes);
}

export interface PlastikReceiptPayload {
  orderNumber: string;
  customerName: string;
  deliveryMethodName: string;
  items: {
    product_name: string;
    variant_name: string;
    unit_code: string;
    qty: number;
    price: number;
  }[];
  subtotal: number;
  totalWeightKg?: number;
  verificationCode?: string;
  cashierName?: string;
  dateStr?: string;
  paymentMethod?: 'cash' | 'transfer' | 'tempo';
  paymentStatus?: 'paid' | 'unpaid' | 'partial';
  amountPaid?: number;
  remainingBalance?: number;
  dueDate?: string;
  printCount?: number;
  isVoided?: boolean;
  voidReason?: string;
}

export function buildPlastikReceiptBytes(
  data: PlastikReceiptPayload,
  storeSettings: StoreSettings,
  paperWidth?: ThermalPaperWidth,
  logoBitmap?: EscPosRasterBitmap | null
): Uint8Array {
  const b = new EscPosBuilder();
  const width = getReceiptColumnWidth(storeSettings, paperWidth);

  b.alignCenter();
  if (logoBitmap) {
    b.rasterBitmap(logoBitmap);
  }
  b.bold(true).sizeDouble();
  b.textLine((storeSettings.storeName || 'PLASTIPRO').toUpperCase());
  b.bold(false).sizeNormal();

  for (const line of wordWrap(storeSettings.tagline || 'Pusat Plastik & Kemasan', width)) {
    b.textLine(line);
  }
  for (const line of wordWrap(storeSettings.address || '', width)) {
    b.textLine(line);
  }
  b.textLine(`WA: ${storeSettings.phoneDisplay}`);
  b.separator('=', width);

  if (data.isVoided) {
    b.alignCenter().bold(true);
    b.textLine('*** NOTA DIBATALKAN (VOID) ***');
    if (data.voidReason) {
      for (const line of wordWrap(`Alasan: ${data.voidReason}`, width)) {
        b.textLine(line);
      }
    }
    b.bold(false);
    b.separator('-', width);
  }

  if (data.printCount && data.printCount >= 1) {
    b.alignCenter().bold(true);
    b.textLine(`*** SALINAN (CETAK KE-${data.printCount + 1}) ***`);
    b.bold(false);
    b.separator('-', width);
  }

  b.alignLeft();
  b.twoColumns('No. Struk:', data.orderNumber, width);
  b.twoColumns(
    'Waktu    :',
    data.dateStr ||
      new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
    width
  );
  b.twoColumns('Kasir    :', data.cashierName || 'Kasir Toko', width);
  b.twoColumns('Mitra    :', data.customerName || 'Pelanggan Umum', width);
  b.twoColumns('Kirim    :', data.deliveryMethodName || 'Toko', width);

  const payLabel =
    data.paymentMethod === 'tempo'
      ? 'TEMPO (PIUTANG)'
      : data.paymentMethod === 'transfer'
      ? 'TRANSFER BANK'
      : 'TUNAI (CASH)';
  b.twoColumns('Bayar    :', payLabel, width);

  if (data.paymentMethod === 'tempo' && data.dueDate) {
    const dueStr = new Date(data.dueDate).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    b.twoColumns('Jatuh Tmp:', dueStr, width);
  }

  b.separator('-', width);

  data.items.forEach((it) => {
    b.bold(true);
    for (const line of wordWrap(it.product_name, width)) {
      b.textLine(line);
    }
    b.bold(false);
    for (const line of wordWrap(` ${it.variant_name}`, width)) {
      b.textLine(line);
    }
    const left = ` ${it.qty} ${it.unit_code} x ${it.price.toLocaleString('id-ID')}`;
    const right = (it.qty * it.price).toLocaleString('id-ID');
    b.twoColumns(left, right, width);
  });

  b.separator('-', width);
  if (data.totalWeightKg) {
    b.twoColumns('Est. Berat:', `~ ${data.totalWeightKg} Kg`, width);
  }

  b.bold(true).sizeDoubleHeight();
  b.twoColumns('TOTAL:', `Rp ${data.subtotal.toLocaleString('id-ID')}`, width);
  b.sizeNormal().bold(false);

  if (data.paymentMethod === 'tempo') {
    const paid = data.amountPaid || 0;
    const remain = data.remainingBalance ?? Math.max(0, data.subtotal - paid);
    if (paid > 0) {
      b.twoColumns('Sudah Bayar:', `Rp ${paid.toLocaleString('id-ID')}`, width);
    }
    b.bold(true);
    b.twoColumns('Sisa Tempo :', `Rp ${remain.toLocaleString('id-ID')}`, width);
    b.bold(false);
  }

  b.separator('-', width);
  b.alignCenter().bold(true);
  if (data.paymentStatus === 'unpaid') {
    b.textLine('*** BELUM LUNAS (TEMPO) ***');
  } else if (data.paymentStatus === 'partial') {
    b.textLine('*** BAYAR SEBAGIAN ***');
  } else {
    b.textLine('*** LUNAS ***');
  }
  b.bold(false);

  if (data.verificationCode) {
    b.separator('-', width);
    b.alignCenter();
    b.bold(true).textLine(`[VERIF: ${data.verificationCode}]`).bold(false);
    b.qrCode(`${data.orderNumber}|${data.verificationCode}|${data.subtotal}`, 4);
  }

  b.separator('-', width);
  b.alignCenter();
  b.bold(true).textLine('TERIMA KASIH ATAS KUNJUNGANNYA!').bold(false);
  for (const line of wordWrap(storeSettings.thermalFooterNote || '', width)) {
    b.textLine(line);
  }
  b.feedAndCut(4);
  return b.getUint8Array();
}

export async function printPlastikReceiptViaBluetooth(
  data: PlastikReceiptPayload,
  storeSettings: StoreSettings,
  paperWidth?: ThermalPaperWidth
): Promise<{ success: boolean; deviceName: string }> {
  return sendEscPosJob(async () => {
    const logoBitmap = await imageToEscPosRaster(
      storeSettings.logoUrl,
      paperWidth || storeSettings.printerPaperWidth
    );
    return buildPlastikReceiptBytes(data, storeSettings, paperWidth, logoBitmap);
  });
}

export async function tryAutoPrintPlastikReceipt(
  data: PlastikReceiptPayload,
  storeSettings: StoreSettings,
  paperWidth?: ThermalPaperWidth
): Promise<{ printed: boolean; deviceName?: string }> {
  if (!isBluetoothSupported()) return { printed: false };
  const char = await trySilentReconnectPrinter();
  if (!char) return { printed: false };

  try {
    const logoBitmap = await imageToEscPosRaster(
      storeSettings.logoUrl,
      paperWidth || storeSettings.printerPaperWidth
    );
    const res = await sendPayloadWithRetry(char, () =>
      buildPlastikReceiptBytes(data, storeSettings, paperWidth, logoBitmap)
    );
    return { printed: true, deviceName: res.deviceName };
  } catch {
    return { printed: false };
  }
}

export function salesOrderToReceiptPayload(
  order: SalesOrder,
  verificationCode?: string
): PlastikReceiptPayload {
  return {
    orderNumber: order.order_number,
    customerName: order.customer_name,
    deliveryMethodName: order.delivery_method,
    items: order.items.map((it) => ({
      product_name: it.product_name,
      variant_name: it.variant_name,
      unit_code: it.unit_code,
      qty: it.qty,
      price: it.sell_price
    })),
    subtotal: order.total_omzet,
    verificationCode,
    dateStr: new Date(order.created_at).toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    amountPaid: order.amount_paid,
    remainingBalance: order.remaining_balance,
    dueDate: order.due_date,
    printCount: order.print_count,
    isVoided: order.status === 'cancelled',
    voidReason: order.void_reason
  };
}

export function buildCashierClosingReceipt(
  recap: CashierClosingRecap,
  storeSettings: StoreSettings,
  paperWidth?: ThermalPaperWidth
): Uint8Array {
  const b = new EscPosBuilder();
  const width = getReceiptColumnWidth(storeSettings, paperWidth);

  b.alignCenter().bold(true).sizeDouble();
  b.textLine((storeSettings.storeName || 'PLASTIPRO').toUpperCase());
  b.sizeNormal();
  b.textLine('REKAP TUTUP KASIR & LACI');
  b.bold(false);
  b.separator('=', width);

  b.alignLeft();
  b.twoColumns('Tanggal   :', recap.recapDate, width);
  b.twoColumns(
    'Jam Tutup :',
    new Date(recap.closedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    width
  );
  b.twoColumns('Kasir     :', recap.cashierName, width);
  b.twoColumns('Jml Nota  :', `${recap.totalOrders} Nota (${recap.totalItemsSold} item)`, width);
  b.separator('-', width);

  b.twoColumns('Jual Tunai:', `Rp ${recap.cashSalesRevenue.toLocaleString('id-ID')}`, width);
  b.twoColumns('Transfer  :', `Rp ${recap.transferSalesRevenue.toLocaleString('id-ID')}`, width);
  if (recap.tempoSalesRevenue > 0) {
    b.twoColumns('Nota Tempo:', `Rp ${recap.tempoSalesRevenue.toLocaleString('id-ID')}`, width);
  }
  if (recap.tempoCashCollected > 0) {
    b.twoColumns('Cicil Tni :', `Rp ${recap.tempoCashCollected.toLocaleString('id-ID')}`, width);
  }
  b.twoColumns('Kas Keluar:', `-Rp ${recap.totalExpenses.toLocaleString('id-ID')}`, width);
  b.separator('-', width);

  b.alignCenter().bold(true).textLine('REKONSILIASI LACI TUNAI').bold(false).alignLeft();
  b.twoColumns('Modal Awal:', `Rp ${recap.openingCashFloat.toLocaleString('id-ID')}`, width);
  b.twoColumns('Harus Ada :', `Rp ${recap.expectedDrawerCash.toLocaleString('id-ID')}`, width);
  b.bold(true);
  b.twoColumns('Fisik Laci:', `Rp ${recap.actualDrawerCash.toLocaleString('id-ID')}`, width);
  b.bold(false);

  const diff = recap.cashDifference;
  const diffLabel =
    diff === 0
      ? 'PAS (Rp 0)'
      : diff > 0
      ? `+Rp ${diff.toLocaleString('id-ID')}`
      : `-Rp ${Math.abs(diff).toLocaleString('id-ID')}`;
  b.twoColumns('Selisih   :', diffLabel, width);
  b.bold(true).twoColumns('Setoran   :', `Rp ${recap.depositToOwner.toLocaleString('id-ID')}`, width).bold(false);

  if (recap.notes) {
    b.separator('-', width);
    for (const line of wordWrap(`Catatan: ${recap.notes}`, width)) {
      b.textLine(line);
    }
  }

  b.separator('-', width);
  b.alignCenter().textLine('Terima kasih - Kerja Hebat Hari Ini!');
  b.feedAndCut(4);
  return b.getUint8Array();
}

export async function printCashierClosingViaBluetooth(
  recap: CashierClosingRecap,
  storeSettings: StoreSettings,
  paperWidth?: ThermalPaperWidth
): Promise<{ success: boolean; deviceName: string }> {
  return sendEscPosJob(() => buildCashierClosingReceipt(recap, storeSettings, paperWidth));
}

export async function printTestPageViaBluetooth(
  storeSettings: StoreSettings,
  paperWidth?: ThermalPaperWidth
): Promise<{ success: boolean; deviceName: string }> {
  const logoBitmap = await imageToEscPosRaster(
    storeSettings.logoUrl,
    paperWidth || storeSettings.printerPaperWidth
  );
  return sendEscPosJob(() => {
    const b = new EscPosBuilder();
    const width = getReceiptColumnWidth(storeSettings, paperWidth);
    const modeLabel = width >= 48 ? '80mm (48 Kolom)' : '58mm (32 Kolom)';
    const nowStr = new Date().toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    b.alignCenter();
    if (logoBitmap) b.rasterBitmap(logoBitmap);
    b.bold(true).sizeDouble();
    b.textLine((storeSettings.storeName || 'PLASTIPRO').toUpperCase());
    b.bold(false).sizeNormal();
    b.textLine('TES PRINT THERMAL BLUETOOTH');
    b.separator('-', width);
    b.alignLeft();
    b.twoColumns('Printer :', (getConnectedDeviceName() || 'Thermal BLE').slice(0, Math.max(16, width - 10)), width);
    b.twoColumns('Lebar   :', modeLabel, width);
    b.twoColumns('Waktu   :', nowStr, width);
    b.separator('-', width);
    b.bold(true).twoColumns('1 PAK Uji Cup 16oz', 'Rp 65.000', width).bold(false);
    b.textLine(' > Garis & spasi presisi OK');
    b.separator('-', width);
    b.alignCenter().bold(true).textLine('*** PRINTER SIAP DIPAKAI ***').bold(false);
    b.feedAndCut(3);
    return b.getUint8Array();
  });
}

export function formatBluetoothErrorAlert(err: any): { isCancelled: boolean; message: string } {
  const errorMsg = err?.message || 'Gagal tersambung ke printer Bluetooth.';
  const isCancelled =
    errorMsg.includes('cancelled') ||
    errorMsg.includes('User cancelled') ||
    err?.name === 'NotFoundError';
  return {
    isCancelled,
    message:
      `Gagal mencetak via Bluetooth:\n${errorMsg}\n\n` +
      'Langkah Pengecekan:\n' +
      '1. Pastikan Bluetooth di HP/PC sudah AKTIF.\n' +
      '2. Pastikan printer thermal (RPP02N / VSC / Iware / Goojprt) dalam posisi ON.\n' +
      '3. Bila diminta PIN pairing Bluetooth perangkat baru, masukkan 0000 atau 1234.\n' +
      '4. Tekan "Ganti Printer" untuk menyambung ulang jika printer habis mati.'
  };
}
