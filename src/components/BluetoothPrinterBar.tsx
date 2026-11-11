import React, { useState, useEffect } from 'react';
import { Bluetooth, Printer, RefreshCw, Unlink } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import {
  PRINTER_STATUS_EVENT,
  ThermalPaperWidth,
  isBluetoothSupported,
  isPrinterConnected,
  getConnectedDeviceName,
  getLastConnectedPrinterName,
  switchBluetoothPrinter,
  disconnectBluetoothPrinter,
  printTestPageViaBluetooth,
  formatBluetoothErrorAlert
} from '../lib/bluetoothPrinter';

interface BluetoothPrinterBarProps {
  paperWidth?: ThermalPaperWidth;
  onNotice?: (msg: string) => void;
  compact?: boolean;
  showAutoPrintToggle?: boolean;
}

export const BluetoothPrinterBar: React.FC<BluetoothPrinterBarProps> = ({
  paperWidth,
  onNotice,
  compact = false,
  showAutoPrintToggle = true
}) => {
  const storeSettings = useSettingsStore();
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const [connectedName, setConnectedName] = useState<string | null>(() =>
    isPrinterConnected() ? getConnectedDeviceName() : null
  );
  const [lastName, setLastName] = useState<string | null>(() => getLastConnectedPrinterName());
  const [isBusy, setIsBusy] = useState<'switch' | 'test' | null>(null);

  const btSupported = isBluetoothSupported();
  const autoPrintEnabled = Boolean(storeSettings.autoPrintBluetooth);

  const refreshStatus = () => {
    setConnectedName(isPrinterConnected() ? getConnectedDeviceName() : null);
    setLastName(getLastConnectedPrinterName());
  };

  useEffect(() => {
    refreshStatus();
    window.addEventListener(PRINTER_STATUS_EVENT, refreshStatus);
    return () => {
      window.removeEventListener(PRINTER_STATUS_EVENT, refreshStatus);
    };
  }, []);

  const handleSwitchOrConnect = async () => {
    if (!btSupported) {
      alert(
        'Browser ini belum mendukung Web Bluetooth.\n\n' +
          'Gunakan Google Chrome di HP Android atau Windows untuk cetak langsung via Bluetooth, atau gunakan tombol Unduh PDF 58mm.'
      );
      return;
    }

    setIsBusy('switch');
    try {
      const res = await switchBluetoothPrinter();
      refreshStatus();
      onNotice?.(`Terhubung ke printer "${res.deviceName}"! Siap cetak struk kasir.`);
    } catch (err: any) {
      const info = formatBluetoothErrorAlert(err);
      if (info.isCancelled) {
        onNotice?.('Pemilihan printer Bluetooth dibatalkan.');
      } else {
        alert(info.message);
      }
    } finally {
      setIsBusy(null);
    }
  };

  const handleTestPrint = async () => {
    if (!btSupported) {
      alert('Test Print Bluetooth langsung memerlukan Chrome di Android / Desktop dengan Bluetooth aktif.');
      return;
    }

    setIsBusy('test');
    try {
      const res = await printTestPageViaBluetooth(storeSettings, paperWidth);
      refreshStatus();
      onNotice?.(`Tes print berhasil dikirim ke "${res.deviceName}"!`);
    } catch (err: any) {
      const info = formatBluetoothErrorAlert(err);
      if (info.isCancelled) {
        onNotice?.('Tes print dibatalkan.');
      } else {
        alert(info.message);
      }
    } finally {
      setIsBusy(null);
    }
  };

  const handleDisconnect = () => {
    disconnectBluetoothPrinter();
    refreshStatus();
    onNotice?.('Koneksi printer Bluetooth diputus.');
  };

  if (!btSupported) {
    return (
      <div
        className={`rounded-xl border border-amber-300 bg-amber-50 text-amber-900 font-medium ${
          compact ? 'px-3 py-2 text-[11px]' : 'p-3.5 text-xs'
        }`}
      >
        📱 Fitur cetak Bluetooth langsung tersedia di Chrome Android / Laptop. Pada browser ini tetap bisa cetak normal atau unduh PDF 58mm.
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border-2 border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2.5 ${
        compact ? 'px-3.5 py-2.5 text-[11px]' : 'p-4 text-xs'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            connectedName ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
          }`}
        />
        <Bluetooth className={`w-4 h-4 shrink-0 ${connectedName ? 'text-primary' : 'text-slate-400'}`} />
        <div className="min-w-0">
          {connectedName ? (
            <div className="font-extrabold text-emerald-900 truncate">
              Tersambung: <span className="text-ink">{connectedName}</span>
            </div>
          ) : (
            <div className="text-slate-600 truncate font-medium">
              Printer Bluetooth: <span className="font-bold text-ink">Belum tersambung</span>
              {lastName && (
                <span className="text-[10px] text-slate-400 ml-1.5">(Terakhir: {lastName})</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        {showAutoPrintToggle && (
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-300 cursor-pointer text-[11px] font-bold text-slate-700 mr-1">
            <input
              type="checkbox"
              checked={autoPrintEnabled}
              onChange={(e) => updateSettings({ autoPrintBluetooth: e.target.checked })}
              className="rounded text-primary focus:ring-primary"
            />
            <span>Auto-Print Lunas</span>
          </label>
        )}

        <button
          type="button"
          disabled={isBusy !== null}
          onClick={handleSwitchOrConnect}
          className="px-3 py-1.5 bg-white hover:bg-sky-50 text-primary border border-primary/40 rounded-xl font-black text-[11px] flex items-center gap-1 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isBusy === 'switch' ? 'animate-spin' : ''}`} />
          <span>{isBusy === 'switch' ? 'Memilih...' : connectedName ? 'Ganti Printer' : 'Hubungkan Printer'}</span>
        </button>

        <button
          type="button"
          disabled={isBusy !== null}
          onClick={handleTestPrint}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[11px] flex items-center gap-1 transition-all disabled:opacity-50"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>{isBusy === 'test' ? 'Mencetak...' : 'Tes Print'}</span>
        </button>

        {connectedName && (
          <button
            type="button"
            onClick={handleDisconnect}
            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            title="Putus koneksi printer"
          >
            <Unlink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
