import { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      // Clear corrupt store keys if needed
      this.setState({ hasError: false, error: null });
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  private handleHardReset = () => {
    try {
      localStorage.removeItem('plastipro_store_settings_v2');
      localStorage.removeItem('plastipro_custom_catalog_v2');
      localStorage.removeItem('plastipro_customers_list_v2');
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white font-sans">
          <div className="bg-slate-800 border-2 border-red-500 rounded-3xl p-8 max-w-lg w-full text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-9 h-9" />
            </div>

            <h2 className="text-2xl font-black text-white">
              Terjadi Kesalahan Tampilan
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              Sistem mendeteksi kendala pada data cache browser Anda:
            </p>

            <div className="p-3 bg-slate-950 rounded-xl font-mono text-xs text-red-300 text-left overflow-auto max-h-32">
              {this.state.error?.message || 'Unknown runtime error'}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Muat Ulang Halaman</span>
              </button>

              <button
                onClick={this.handleHardReset}
                className="py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-bold text-xs transition-all"
              >
                Reset Cache Toko
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
