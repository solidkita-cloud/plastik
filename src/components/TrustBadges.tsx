import React from 'react';
import { 
  CheckCircle, 
  Tag, 
  Truck, 
  Headphones, 
  Store 
} from 'lucide-react';

export const TrustBadges: React.FC = () => {
  const badges = [
    {
      title: 'Produk Berkualitas',
      desc: 'Food grade & standar pabrik',
      icon: CheckCircle,
      iconColor: 'text-eco',
      bgColor: 'bg-emerald-50/80',
      borderColor: 'border-emerald-200'
    },
    {
      title: 'Harga Terbaik',
      desc: 'Langsung tangan pertama',
      icon: Tag,
      iconColor: 'text-primary',
      bgColor: 'bg-sky-50/80',
      borderColor: 'border-sky-200'
    },
    {
      title: 'Pengiriman Cepat',
      desc: 'Instan Gojek / Kargo luas',
      icon: Truck,
      iconColor: 'text-primary',
      bgColor: 'bg-sky-50/80',
      borderColor: 'border-sky-200'
    },
    {
      title: 'Layanan Responsif',
      desc: 'Konsultasi ukuran gratis',
      icon: Headphones,
      iconColor: 'text-primary',
      bgColor: 'bg-sky-50/80',
      borderColor: 'border-sky-200'
    },
    {
      title: 'Beli Mudah via WhatsApp',
      desc: 'Pesan tanpa ribet login',
      icon: Store,
      iconColor: 'text-eco',
      bgColor: 'bg-emerald-50/80',
      borderColor: 'border-emerald-200'
    }
  ];

  return (
    <div className="py-4 border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {badges.map((badge, idx) => {
            const Icon = badge.icon;
            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border ${badge.borderColor} ${badge.bgColor} flex items-center gap-3 transition-all hover:shadow-sm`}
              >
                <div className={`p-2 rounded-lg bg-white shadow-sm shrink-0 ${badge.iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-extrabold text-ink leading-tight truncate">
                    {badge.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                    {badge.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
