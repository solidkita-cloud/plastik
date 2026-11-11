import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Plus, 
  Trash2, 
  Check, 
  Package, 
  Layers,
  Image as ImageIcon,
  Pencil
} from 'lucide-react';
import { Product, ProductVariant, VariantUnit } from '../types';
import { CATEGORIES } from '../lib/constants';
import { useCatalogStore } from '../stores/catalogStore';
import { saveProductToFirebase } from '../services/firebaseSync';
import { logSecurityEvent } from '../lib/security';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (productName: string) => void;
  editingProduct?: Product | null;
}

function createDefaultVariants(): ProductVariant[] {
  const ts = Date.now();
  return [
    {
      id: `var_${ts}_1`,
      product_id: '',
      name: 'Ukuran Standar',
      sku: `SKU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      dimension_detail: 'Standar Pabrik',
      stock_status: 'ready',
      stock_qty: 1500,
      min_stock_alert: 200,
      base_pcs_weight_grams: 10,
      units: [
        {
          id: `u_${ts}_1`,
          variant_id: '',
          unit_code: 'PAK',
          unit_name: 'Pack (Isi 50 pcs)',
          base_multiplier: 50,
          price: 50000,
          cogs_price: 36000,
          min_order_qty: 1,
          step_qty: 1,
          is_default: true,
          badge_label: 'Paling Laris'
        },
        {
          id: `u_${ts}_2`,
          variant_id: '',
          unit_code: 'DUS',
          unit_name: 'Dus / Karton (Isi 1.000 pcs)',
          base_multiplier: 1000,
          price: 900000,
          cogs_price: 680000,
          min_order_qty: 1,
          step_qty: 1,
          is_default: false,
          badge_label: 'Hemat Grosir'
        }
      ]
    }
  ];
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingProduct
}) => {
  const addProduct = useCatalogStore((state) => state.addProduct);
  const updateProduct = useCatalogStore((state) => state.updateProduct);

  // Form Basic Info
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('cat_cup');
  const [material, setMaterial] = useState<'PP' | 'PE' | 'HDPE' | 'PET' | 'Paper' | 'Kraft' | 'Biodegradable' | 'Other'>('PP');
  const [foodGrade, setFoodGrade] = useState(true);
  const [microwaveSafe, setMicrowaveSafe] = useState(false);
  const [freezerSafe, setFreezerSafe] = useState(true);
  const [description, setDescription] = useState('');
  const [badge, setBadge] = useState<'Best Seller' | 'Eco Friendly' | 'Promo' | 'Baru' | ''>('Best Seller');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [tagsInput, setTagsInput] = useState('Grosir, Best Seller, Food Grade');
  const [variants, setVariants] = useState<ProductVariant[]>(createDefaultVariants);

  useEffect(() => {
    if (!isOpen) return;
    if (editingProduct) {
      setName(editingProduct.name);
      setCategoryId(editingProduct.category_id);
      setMaterial(editingProduct.material);
      setFoodGrade(editingProduct.food_grade);
      setMicrowaveSafe(editingProduct.microwave_safe);
      setFreezerSafe(editingProduct.freezer_safe);
      setDescription(editingProduct.description || '');
      setBadge(editingProduct.badge || '');
      setImageUrl(editingProduct.image_url || '');
      setImagePreview(editingProduct.image_url || '');
      setTagsInput((editingProduct.tags || []).join(', '));
      setVariants(JSON.parse(JSON.stringify(editingProduct.variants || createDefaultVariants())));
    } else {
      setName('');
      setCategoryId('cat_cup');
      setMaterial('PP');
      setFoodGrade(true);
      setMicrowaveSafe(false);
      setFreezerSafe(true);
      setDescription('');
      setBadge('Best Seller');
      setImageUrl('');
      setImagePreview('');
      setTagsInput('Grosir, Best Seller, Food Grade');
      setVariants(createDefaultVariants());
    }
  }, [isOpen, editingProduct]);

  if (!isOpen) return null;

  // Handle Image Upload from disk
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setImageUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add a new variant
  const handleAddVariant = () => {
    const newVariant: ProductVariant = {
      id: `var_${Date.now()}_${variants.length + 1}`,
      product_id: '',
      name: `Varian Ukuran ${variants.length + 1}`,
      sku: `SKU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      dimension_detail: '',
      stock_status: 'ready',
      base_pcs_weight_grams: 10,
      units: [
        {
          id: `u_${Date.now()}_pak`,
          variant_id: '',
          unit_code: 'PAK',
          unit_name: 'Pack (Isi 50)',
          base_multiplier: 50,
          price: 50000,
          min_order_qty: 1,
          step_qty: 1,
          is_default: true
        }
      ]
    };
    setVariants([...variants, newVariant]);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 1) {
      alert('Minimal harus ada 1 varian produk');
      return;
    }
    setVariants(variants.filter((_, i) => i !== index));
  };

  // Add unit tier to a variant
  const handleAddUnitToVariant = (variantIndex: number) => {
    const updated = [...variants];
    const targetVar = updated[variantIndex];
    const newUnit: VariantUnit = {
      id: `u_${Date.now()}_${targetVar.units.length + 1}`,
      variant_id: targetVar.id,
      unit_code: 'DUS',
      unit_name: 'Dus / Karton',
      base_multiplier: 500,
      price: 450000,
      min_order_qty: 1,
      step_qty: 1,
      is_default: false,
      badge_label: 'Hemat Dus'
    };
    targetVar.units.push(newUnit);
    setVariants(updated);
  };

  const handleRemoveUnitFromVariant = (variantIndex: number, unitIndex: number) => {
    const updated = [...variants];
    if (updated[variantIndex].units.length <= 1) {
      alert('Minimal harus ada 1 satuan harga');
      return;
    }
    updated[variantIndex].units = updated[variantIndex].units.filter((_, i) => i !== unitIndex);
    setVariants(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Nama produk wajib diisi');
      return;
    }

    const isEditing = Boolean(editingProduct);
    const productId = editingProduct ? editingProduct.id : `prod_${Date.now()}`;
    const cleanTags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);

    // Default clean packaging placeholder image if empty
    const finalImage = imageUrl.trim() || '/products/cup-16oz.jpg';

    // Format variants with product id & resolved HPP
    const finalVariants = variants.map((v) => ({
      ...v,
      product_id: productId,
      stock_qty: v.stock_qty ?? 1500,
      min_stock_alert: v.min_stock_alert ?? 200,
      units: v.units.map((u) => ({
        ...u,
        variant_id: v.id,
        cogs_price: u.cogs_price && u.cogs_price > 0 ? Math.round(u.cogs_price) : Math.round(u.price * 0.72)
      }))
    }));

    const productPayload: Product = {
      id: productId,
      name: name.trim(),
      category_id: categoryId,
      material,
      food_grade: foodGrade,
      microwave_safe: microwaveSafe,
      freezer_safe: freezerSafe,
      description: description.trim() || 'Produk kemasan berkualitas standar food grade pabrik.',
      image_url: finalImage,
      tags: cleanTags,
      is_featured: editingProduct ? editingProduct.is_featured : true,
      badge: badge ? badge : undefined,
      variants: finalVariants
    };

    if (isEditing) {
      updateProduct(productPayload);
      logSecurityEvent('HPP_UPDATED', `Produk "${productPayload.name}" & harga HPP/Jual diperbarui.`, 'INFO');
    } else {
      addProduct(productPayload);
    }

    saveProductToFirebase(productPayload).catch((err) => {
      console.warn('Gagal sync produk ke Firebase:', err);
    });
    onSuccess(productPayload.name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      {/* Spacious Modal Container (max-w-5xl, breathable, eye-friendly) */}
      <div 
        className="bg-white w-full max-w-5xl rounded-3xl neo-border-thick shadow-hard-lg overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Spacious with Clear Contrast */}
        <div className="px-6 py-5 sm:px-8 border-b-2 border-ink bg-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl text-white flex items-center justify-center neo-border shadow-sm ${
              editingProduct ? 'bg-amber-500' : 'bg-primary'
            }`}>
              {editingProduct ? <Pencil className="w-5 h-5" /> : <Plus className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-display font-black text-xl sm:text-2xl text-ink">
                {editingProduct ? `Edit Produk & HPP: ${editingProduct.name}` : 'Tambah Produk Baru ke Katalog'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Atur identitas, foto produk, varian stok, dan perbandingan HPP Beli vs Harga Jual per satuan (Pcs / Pak / Dus)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl text-slate-500 hover:text-ink hover:bg-slate-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body - Wide, Organized Cards, Generous Margins & 48px+ Input Heights */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 overflow-y-auto max-h-[80vh] space-y-8 bg-slate-50/50">
          
          {/* BAGIAN 1: Identitas & Informasi Utama */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl neo-border shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
              <Package className="w-5 h-5 text-primary" />
              <h4 className="font-display font-black text-base sm:text-lg text-ink">
                1. Informasi Dasar Produk
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Nama Produk */}
              <div className="md:col-span-2">
                <label className="block text-sm font-extrabold text-slate-800 mb-2">
                  Nama Produk <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Thinwall Kotak Bento Sekat 4 (1.000 ml)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-13 px-4 text-sm sm:text-base font-semibold rounded-2xl border-2 border-slate-300 focus:border-primary focus:ring-4 focus:ring-sky-100 transition-all outline-none bg-slate-50 focus:bg-white placeholder:text-slate-400"
                />
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-sm font-extrabold text-slate-800 mb-2">
                  Kategori Kemasan
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-13 px-4 text-sm sm:text-base font-semibold rounded-2xl border-2 border-slate-300 focus:border-primary focus:ring-4 focus:ring-sky-100 transition-all outline-none bg-slate-50 focus:bg-white cursor-pointer"
                >
                  {CATEGORIES.filter((c) => c.id !== 'cat_all').map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bahan / Material */}
              <div>
                <label className="block text-sm font-extrabold text-slate-800 mb-2">
                  Material Plastik / Kertas
                </label>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value as any)}
                  className="w-full h-13 px-4 text-sm sm:text-base font-semibold rounded-2xl border-2 border-slate-300 focus:border-primary focus:ring-4 focus:ring-sky-100 transition-all outline-none bg-slate-50 focus:bg-white cursor-pointer"
                >
                  <option value="PP">PP (Polypropylene - Tahan Panas & Sealer)</option>
                  <option value="PE">PE (Polyethylene - Fleksibel & Tahan Dingin)</option>
                  <option value="HDPE">HDPE (High Density - Kresek Kuat & Ulet)</option>
                  <option value="PET">PET (Polyethylene Terephthalate - Sangat Bening)</option>
                  <option value="Paper">Paper (Kertas Khusus Makanan)</option>
                  <option value="Kraft">Kraft Coklat (Eco Friendly Laminasi)</option>
                  <option value="Biodegradable">Biodegradable (Singkong / Jagung Alami)</option>
                  <option value="Other">Lainnya</option>
                </select>
              </div>

              {/* Badge Produk */}
              <div>
                <label className="block text-sm font-extrabold text-slate-800 mb-2">
                  Label / Badge Unggulan
                </label>
                <select
                  value={badge}
                  onChange={(e) => setBadge(e.target.value as any)}
                  className="w-full h-13 px-4 text-sm sm:text-base font-semibold rounded-2xl border-2 border-slate-300 focus:border-primary focus:ring-4 focus:ring-sky-100 transition-all outline-none bg-slate-50 focus:bg-white cursor-pointer"
                >
                  <option value="">(Tanpa Badge)</option>
                  <option value="Best Seller">🔥 Best Seller (Kuning)</option>
                  <option value="Eco Friendly">🌱 Eco Friendly (Hijau)</option>
                  <option value="Promo">🏷️ Promo (Merah)</option>
                  <option value="Baru">✨ Baru (Biru)</option>
                </select>
              </div>

              {/* Tags Pencarian */}
              <div>
                <label className="block text-sm font-extrabold text-slate-800 mb-2">
                  Tag Kata Kunci (Dipisah Koma)
                </label>
                <input
                  type="text"
                  placeholder="Grosir, Best Seller, Food Grade, Tahan Panas"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full h-13 px-4 text-sm sm:text-base font-semibold rounded-2xl border-2 border-slate-300 focus:border-primary focus:ring-4 focus:ring-sky-100 transition-all outline-none bg-slate-50 focus:bg-white placeholder:text-slate-400"
                />
              </div>

              {/* Deskripsi Produk */}
              <div className="md:col-span-2">
                <label className="block text-sm font-extrabold text-slate-800 mb-2">
                  Deskripsi Lengkap Produk
                </label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan spesifikasi, keunggulan, standar ketebalan, serta rekomendasi jenis makanan/minuman yang cocok..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 text-sm sm:text-base font-normal rounded-2xl border-2 border-slate-300 focus:border-primary focus:ring-4 focus:ring-sky-100 transition-all outline-none bg-slate-50 focus:bg-white placeholder:text-slate-400 leading-relaxed"
                />
              </div>

              {/* Sertifikasi Keamanan Makanan (Spacious Clickable Cards) */}
              <div className="md:col-span-2 pt-2">
                <label className="block text-sm font-extrabold text-slate-800 mb-3">
                  Sertifikasi & Ketahanan Suhu:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <label className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center gap-3 transition-all ${
                    foodGrade ? 'bg-sky-50 border-primary text-primary-dark font-extrabold shadow-sm' : 'bg-slate-50 border-slate-300 text-slate-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={foodGrade}
                      onChange={(e) => setFoodGrade(e.target.checked)}
                      className="w-5 h-5 rounded text-primary focus:ring-0 cursor-pointer"
                    />
                    <span className="text-sm">100% Food Grade</span>
                  </label>

                  <label className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center gap-3 transition-all ${
                    microwaveSafe ? 'bg-sky-50 border-primary text-primary-dark font-extrabold shadow-sm' : 'bg-slate-50 border-slate-300 text-slate-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={microwaveSafe}
                      onChange={(e) => setMicrowaveSafe(e.target.checked)}
                      className="w-5 h-5 rounded text-primary focus:ring-0 cursor-pointer"
                    />
                    <span className="text-sm">Microwave Safe (Tahan Panas)</span>
                  </label>

                  <label className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center gap-3 transition-all ${
                    freezerSafe ? 'bg-sky-50 border-primary text-primary-dark font-extrabold shadow-sm' : 'bg-slate-50 border-slate-300 text-slate-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={freezerSafe}
                      onChange={(e) => setFreezerSafe(e.target.checked)}
                      className="w-5 h-5 rounded text-primary focus:ring-0 cursor-pointer"
                    />
                    <span className="text-sm">Freezer Safe (Tahan Beku)</span>
                  </label>
                </div>
              </div>

            </div>
          </div>

          {/* BAGIAN 2: Foto & Visual Produk (Lapang & Jelas) */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl neo-border shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
              <ImageIcon className="w-5 h-5 text-primary" />
              <h4 className="font-display font-black text-base sm:text-lg text-ink">
                2. Foto Produk Kemasan
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Preview Box */}
              <div className="md:col-span-4 flex flex-col items-center justify-center">
                <div className="w-full aspect-square max-w-[220px] rounded-2xl neo-border bg-slate-100 flex items-center justify-center overflow-hidden p-3 shadow-inner relative">
                  {imagePreview || imageUrl ? (
                    <img
                      src={imagePreview || imageUrl}
                      alt="Preview Produk"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <span className="text-xs font-semibold text-slate-400">
                        Belum ada foto yang dipilih
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-xs font-bold text-slate-500 mt-2">Pratinjau Foto Produk</span>
              </div>

              {/* Upload Controls */}
              <div className="md:col-span-8 space-y-4">
                <div className="p-5 border-2 border-dashed border-slate-300 hover:border-primary rounded-2xl bg-slate-50 transition-colors text-center cursor-pointer relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <span className="font-extrabold text-sm text-ink block">
                    Pilih File Foto dari Perangkat (Galeri / Komputer)
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5 block">
                    Format JPG, PNG, atau WebP (Disarankan latar studio bersih)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Atau Masukkan URL Link Gambar:
                  </label>
                  <input
                    type="url"
                    placeholder="https://contoh-domain.com/gambar-kemasan.jpg"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setImagePreview(e.target.value);
                    }}
                    className="w-full h-12 px-4 text-sm font-mono rounded-xl border border-slate-300 focus:border-primary outline-none bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* BAGIAN 3: Varian Ukuran & Multi-Tier Satuan Harga (Lapang & Lega) */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl neo-border shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                <h4 className="font-display font-black text-base sm:text-lg text-ink">
                  3. Varian Ukuran & Multi-Tier Satuan (Pcs / Pak / Dus)
                </h4>
              </div>

              <button
                type="button"
                onClick={handleAddVariant}
                className="px-4 py-2 bg-sky-100 hover:bg-sky-200 text-primary-dark font-extrabold text-xs sm:text-sm rounded-xl border border-sky-300 flex items-center gap-1.5 transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Ukuran Baru</span>
              </button>
            </div>

            {/* Variants List */}
            <div className="space-y-6">
              {variants.map((v, vIdx) => (
                <div 
                  key={v.id} 
                  className="p-5 sm:p-6 bg-slate-50 rounded-2xl border-2 border-slate-300 space-y-5"
                >
                  {/* Variant Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-primary text-white font-black text-xs flex items-center justify-center">
                        {vIdx + 1}
                      </span>
                      <span className="font-extrabold text-sm sm:text-base text-ink">
                        Ukuran / Tipe Varian:
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(vIdx)}
                      className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1 border border-red-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Ukuran</span>
                    </button>
                  </div>

                  {/* Variant Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nama Ukuran (cth: 500 ml, 16 oz, 24x24)
                      </label>
                      <input
                        type="text"
                        required
                        value={v.name}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[vIdx].name = e.target.value;
                          setVariants(updated);
                        }}
                        className="w-full h-11 px-3.5 text-sm font-semibold rounded-xl border border-slate-300 focus:border-primary outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Kode SKU Gudang
                      </label>
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[vIdx].sku = e.target.value;
                          setVariants(updated);
                        }}
                        className="w-full h-11 px-3.5 text-sm font-mono uppercase rounded-xl border border-slate-300 focus:border-primary outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Dimensi Fisik (cm)
                      </label>
                      <input
                        type="text"
                        placeholder="Cth: 17 x 12 x 5 cm"
                        value={v.dimension_detail || ''}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[vIdx].dimension_detail = e.target.value;
                          setVariants(updated);
                        }}
                        className="w-full h-11 px-3.5 text-sm font-medium rounded-xl border border-slate-300 focus:border-primary outline-none bg-white"
                      />
                    </div>
                  </div>

                  {/* Stok & Minimum Alert Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Stok Fisik Saat Ini (Satuan Dasar / Pcs)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={v.stock_qty ?? 1500}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[vIdx].stock_qty = Math.max(0, Number(e.target.value) || 0);
                          setVariants(updated);
                        }}
                        className="w-full h-10 px-3 text-sm font-black font-mono rounded-lg border border-slate-300 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-amber-800 mb-1">
                        Batas Peringatan Stok Menipis (Pcs)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={v.min_stock_alert ?? 200}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[vIdx].min_stock_alert = Math.max(0, Number(e.target.value) || 0);
                          setVariants(updated);
                        }}
                        className="w-full h-10 px-3 text-sm font-black font-mono rounded-lg border border-amber-300 bg-amber-50/40 focus:border-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Units Table for this variant */}
                  <div className="pt-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                        HPP Beli vs Harga Jual per Satuan (Pcs / Pak / Dus):
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddUnitToVariant(vIdx)}
                        className="text-xs font-extrabold text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Tambah Tingkat Satuan</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {v.units.map((u, uIdx) => {
                        const effectiveCogs = u.cogs_price && u.cogs_price > 0 ? u.cogs_price : Math.round(u.price * 0.72);
                        const unitProfit = u.price - effectiveCogs;
                        const unitMarginPct = u.price > 0 ? ((unitProfit / u.price) * 100).toFixed(1) : '0';
                        const isLoss = u.cogs_price && u.cogs_price >= u.price;

                        return (
                        <div 
                          key={u.id}
                          className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-sm"
                        >
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-500 mb-0.5">
                              Satuan:
                            </label>
                            <select
                              value={u.unit_code}
                              onChange={(e) => {
                                const updated = [...variants];
                                updated[vIdx].units[uIdx].unit_code = e.target.value as any;
                                setVariants(updated);
                              }}
                              className="w-full h-10 px-2 text-xs font-bold rounded-lg border border-slate-300 bg-slate-50"
                            >
                              <option value="PCS">PCS (Ecer)</option>
                              <option value="PAK">PAK (Bungkus)</option>
                              <option value="DUS">DUS (Karton)</option>
                              <option value="IKAT">IKAT (Bal)</option>
                              <option value="ROLL">ROLL (Gulung)</option>
                              <option value="KG">KG (Kiloan)</option>
                            </select>
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[11px] font-bold text-slate-500 mb-0.5">
                              Nama Label Satuan:
                            </label>
                            <input
                              type="text"
                              value={u.unit_name}
                              onChange={(e) => {
                                const updated = [...variants];
                                updated[vIdx].units[uIdx].unit_name = e.target.value;
                                setVariants(updated);
                              }}
                              placeholder="Cth: Pack (Isi 50 pcs)"
                              className="w-full h-10 px-3 text-xs font-semibold rounded-lg border border-slate-300"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-500 mb-0.5">
                              Isi (Pcs):
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={u.base_multiplier}
                              onChange={(e) => {
                                const updated = [...variants];
                                updated[vIdx].units[uIdx].base_multiplier = Number(e.target.value) || 1;
                                setVariants(updated);
                              }}
                              className="w-full h-10 px-3 text-xs font-bold rounded-lg border border-slate-300"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-500 mb-0.5">
                              Harga Jual (Rp):
                            </label>
                            <input
                              type="number"
                              step={500}
                              min={0}
                              value={u.price}
                              onChange={(e) => {
                                const updated = [...variants];
                                updated[vIdx].units[uIdx].price = Number(e.target.value) || 0;
                                setVariants(updated);
                              }}
                              className="w-full h-10 px-3 text-xs font-extrabold text-accent rounded-lg border border-slate-300"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-emerald-700 mb-0.5" title="Harga Beli / Kulakan dari Pabrik">
                              HPP Beli (Rp):
                            </label>
                            <input
                              type="number"
                              step={500}
                              min={0}
                              placeholder="Otomatis ~72%"
                              value={u.cogs_price || ''}
                              onChange={(e) => {
                                const updated = [...variants];
                                updated[vIdx].units[uIdx].cogs_price = Number(e.target.value) || 0;
                                setVariants(updated);
                              }}
                              className="w-full h-10 px-2.5 text-xs font-bold text-emerald-700 rounded-lg border border-emerald-300 bg-emerald-50/40"
                            />
                          </div>

                          <div className="sm:col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveUnitFromVariant(vIdx, uIdx)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus Satuan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Live Margin & Profit Preview Bar */}
                        <div className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex flex-wrap items-center justify-between gap-2 ${
                          isLoss
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : Number(unitMarginPct) < 15
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          <span>
                            HPP Beli: <strong>Rp {effectiveCogs.toLocaleString('id-ID')}</strong> vs Jual: <strong>Rp {u.price.toLocaleString('id-ID')}</strong>
                          </span>
                          <span>
                            {isLoss
                              ? `⚠️ HPP >= Harga Jual (Selisih: Rp ${unitProfit.toLocaleString('id-ID')})`
                              : `Untung Bersih/Satuan: +Rp ${unitProfit.toLocaleString('id-ID')} (Margin ${unitMarginPct}%)`}
                          </span>
                        </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Form Actions Footer - Large Comfortable Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-3.5 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-7 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm sm:text-base rounded-2xl transition-all"
            >
              Batal
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto px-9 py-4 bg-primary hover:bg-primary-dark text-white font-black text-sm sm:text-base rounded-2xl neo-border-thick neo-shadow transition-all flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5"
            >
              <Check className="w-5 h-5" />
              <span>{editingProduct ? 'Simpan Perubahan Produk & HPP' : 'Simpan Produk ke Katalog'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
