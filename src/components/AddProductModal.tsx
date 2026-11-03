import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  Plus, 
  Trash2, 
  Check, 
  Package, 
  Layers
} from 'lucide-react';
import { Product, ProductVariant, VariantUnit } from '../types';
import { CATEGORIES } from '../lib/constants';
import { useCatalogStore } from '../stores/catalogStore';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (productName: string) => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const addProduct = useCatalogStore((state) => state.addProduct);

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

  // Dynamic Variants
  const [variants, setVariants] = useState<ProductVariant[]>([
    {
      id: `var_${Date.now()}_1`,
      product_id: '',
      name: 'Ukuran Standar',
      sku: `SKU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      dimension_detail: 'Standar Pabrik',
      stock_status: 'ready',
      base_pcs_weight_grams: 10,
      units: [
        {
          id: `u_${Date.now()}_1`,
          variant_id: '',
          unit_code: 'PAK',
          unit_name: 'Pack (Isi 50 pcs)',
          base_multiplier: 50,
          price: 50000,
          min_order_qty: 1,
          step_qty: 1,
          is_default: true,
          badge_label: 'Paling Laris'
        },
        {
          id: `u_${Date.now()}_2`,
          variant_id: '',
          unit_code: 'DUS',
          unit_name: 'Dus / Karton (Isi 1.000 pcs)',
          base_multiplier: 1000,
          price: 900000,
          min_order_qty: 1,
          step_qty: 1,
          is_default: false,
          badge_label: 'Hemat Grosir'
        }
      ]
    }
  ]);

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

    const productId = `prod_${Date.now()}`;
    const cleanTags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);

    // Default placeholder SVG if no image uploaded
    const finalImage = imageUrl.trim() || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%"><rect width="400" height="400" fill="%23F1F5F9"/><circle cx="200" cy="180" r="80" fill="%230284C7" opacity="0.2"/><text x="200" y="190" font-family="Arial,sans-serif" font-size="24" font-weight="bold" fill="%230284C7" text-anchor="middle">${encodeURIComponent(name.substring(0, 15))}</text><text x="200" y="220" font-family="Arial,sans-serif" font-size="16" fill="%23475569" text-anchor="middle">Kemasan Berkualitas</text></svg>`;

    // Format variants with product id
    const finalVariants = variants.map((v) => ({
      ...v,
      product_id: productId,
      units: v.units.map((u) => ({ ...u, variant_id: v.id }))
    }));

    const newProduct: Product = {
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
      is_featured: true,
      badge: badge ? badge : undefined,
      variants: finalVariants
    };

    addProduct(newProduct);
    onSuccess(newProduct.name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl neo-border-thick neo-shadow-lg overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b-2 border-ink bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center neo-border">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base sm:text-lg text-ink">
                Tambah Produk Baru ke Katalog
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold">
                Formulir lengkap nama, deskripsi, gambar, varian & multi-satuan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-ink hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-6">
          
          {/* 1. Informasi Utama Produk */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-primary" />
              <span>1. Identitas Produk:</span>
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Produk *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Thinwall Kotak Bento Sekat 3 (1000 ml)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border-2 border-slate-300 focus:border-primary focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori Produk
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-300 focus:border-primary focus:outline-none bg-white font-semibold"
                >
                  {CATEGORIES.filter((c) => c.id !== 'cat_all').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bahan / Material
                </label>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-300 focus:border-primary focus:outline-none bg-white font-semibold"
                >
                  <option value="PP">PP (Polypropylene - Tahan Panas)</option>
                  <option value="HDPE">HDPE (Kresek Tebal)</option>
                  <option value="PE">PE (Plastik Bening)</option>
                  <option value="PET">PET (Mika / Cup Bening Kristal)</option>
                  <option value="Kraft">Paper Kraft Coklat</option>
                  <option value="Biodegradable">Biodegradable (Ramah Lingkungan)</option>
                  <option value="Paper">Paper / Kertas</option>
                  <option value="Other">Lainnya</option>
                </select>
              </div>
            </div>

            {/* Checkbox Attributes */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={foodGrade}
                  onChange={(e) => setFoodGrade(e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span>Food Grade</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={microwaveSafe}
                  onChange={(e) => setMicrowaveSafe(e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span>Microwave Safe (Tahan Panas)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={freezerSafe}
                  onChange={(e) => setFreezerSafe(e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span>Freezer Safe (Tahan Beku)</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deskripsi Lengkap Produk
              </label>
              <textarea
                rows={2}
                placeholder="Jelaskan keunggulan, ketebalan, peruntukan makanan/minuman, dan standar tutup klip..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-300 focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* 2. Gambar & Badge */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-primary" />
              <span>2. Foto Produk & Label Badge:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Upload Foto dari Perangkat:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-primary file:text-white hover:file:bg-primary-dark cursor-pointer"
                />

                <div className="mt-2">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">Atau gunakan URL Gambar:</span>
                  <input
                    type="url"
                    placeholder="https://.../foto-produk.png"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setImagePreview(e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Preview image */}
              <div className="p-3 bg-slate-50 rounded-xl neo-border flex items-center justify-center h-28">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                ) : (
                  <span className="text-xs font-bold text-slate-400">
                    Preview Foto Produk
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Badge Khusus (Opsional)
                </label>
                <select
                  value={badge}
                  onChange={(e) => setBadge(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-300 focus:border-primary focus:outline-none bg-white font-semibold"
                >
                  <option value="">Tanpa Badge</option>
                  <option value="Best Seller">Best Seller (Paling Laris)</option>
                  <option value="Eco Friendly">Eco Friendly (Ramah Lingkungan)</option>
                  <option value="Promo">Promo Diskon</option>
                  <option value="Baru">Baru Masuk</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tag Pencarian (Dipisah koma)
                </label>
                <input
                  type="text"
                  placeholder="Grosir, Anti Bocor, Bento, Boba"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-300 focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. Varian Ukuran & Multi-Satuan Grosir */}
          <div className="space-y-4 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-accent" />
                <span>3. Varian Ukuran & Multi-Satuan Grosir:</span>
              </h4>

              <button
                type="button"
                onClick={handleAddVariant}
                className="py-1 px-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Ukuran</span>
              </button>
            </div>

            {/* List of Variants */}
            <div className="space-y-4">
              {variants.map((variant, vIdx) => (
                <div
                  key={variant.id}
                  className="p-4 bg-slate-50 rounded-xl neo-border space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-primary-dark uppercase">
                      Varian #{vIdx + 1}
                    </span>
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(vIdx)}
                        className="text-red-500 hover:text-red-700 p-1 text-xs flex items-center gap-1 font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Ukuran</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Nama Varian/Ukuran</label>
                      <input
                        type="text"
                        placeholder="Cth: 650 ml / 16 oz"
                        value={variant.name}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[vIdx].name = e.target.value;
                          setVariants(updated);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Kode SKU</label>
                      <input
                        type="text"
                        value={variant.sku}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[vIdx].sku = e.target.value;
                          setVariants(updated);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Detail Dimensi</label>
                      <input
                        type="text"
                        placeholder="17 x 12 x 5 cm"
                        value={variant.dimension_detail || ''}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[vIdx].dimension_detail = e.target.value;
                          setVariants(updated);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>

                  {/* Multi-tier Units for this variant */}
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-600 uppercase">
                        Tingkatan Satuan & Harga (Ecer, Pak, Dus):
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddUnitToVariant(vIdx)}
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Tambah Satuan</span>
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {variant.units.map((unit, uIdx) => (
                        <div
                          key={unit.id}
                          className="grid grid-cols-12 gap-1.5 items-center bg-white p-2 rounded-lg border border-slate-200 text-xs"
                        >
                          <div className="col-span-3">
                            <select
                              value={unit.unit_code}
                              onChange={(e) => {
                                const updated = [...variants];
                                updated[vIdx].units[uIdx].unit_code = e.target.value as any;
                                setVariants(updated);
                              }}
                              className="w-full p-1 border rounded text-[11px] font-bold"
                            >
                              <option value="PCS">PCS (Ecer)</option>
                              <option value="PAK">PAK (Pack)</option>
                              <option value="IKAT">IKAT / BAL</option>
                              <option value="DUS">DUS (Karton)</option>
                              <option value="ROLL">ROLL</option>
                              <option value="RIM">RIM</option>
                              <option value="KG">KG (Kiloan)</option>
                            </select>
                          </div>

                          <div className="col-span-3">
                            <input
                              type="text"
                              placeholder="Nama Satuan (cth: Pack 50)"
                              value={unit.unit_name}
                              onChange={(e) => {
                                const updated = [...variants];
                                updated[vIdx].units[uIdx].unit_name = e.target.value;
                                setVariants(updated);
                              }}
                              className="w-full p-1 border rounded text-[11px]"
                            />
                          </div>

                          <div className="col-span-2">
                            <input
                              type="number"
                              title="Isi per satuan dasar (pcs)"
                              placeholder="Isi pcs"
                              value={unit.base_multiplier}
                              onChange={(e) => {
                                const updated = [...variants];
                                updated[vIdx].units[uIdx].base_multiplier = Number(e.target.value) || 1;
                                setVariants(updated);
                              }}
                              className="w-full p-1 border rounded text-[11px] font-bold text-center"
                            />
                          </div>

                          <div className="col-span-3">
                            <input
                              type="number"
                              placeholder="Harga (Rp)"
                              value={unit.price}
                              onChange={(e) => {
                                const updated = [...variants];
                                updated[vIdx].units[uIdx].price = Number(e.target.value) || 0;
                                setVariants(updated);
                              }}
                              className="w-full p-1 border rounded text-[11px] font-extrabold text-accent"
                            />
                          </div>

                          <div className="col-span-1 text-center">
                            {variant.units.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveUnitFromVariant(vIdx, uIdx)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="w-3.5 h-3.5 mx-auto" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t-2 border-ink flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
            >
              Batal
            </button>

            <button
              type="submit"
              className="py-2.5 px-6 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs sm:text-sm font-extrabold neo-border neo-shadow-accent flex items-center gap-2 transition-all active:translate-x-0.5 active:translate-y-0.5"
            >
              <Check className="w-4 h-4" />
              <span>Simpan & Tayangkan ke Katalog</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
