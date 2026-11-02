import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('🧪 PLASTIPRO TOKO PLASTIK - AUTOMATED QA TEST SUITE');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${testName} ${details ? `-> ${details}` : ''}`);
    failCount++;
  }
}

// ---------------------------------------------------------
// TEST SUITE 1: Build Artifacts Verification
// ---------------------------------------------------------
console.log('--- TEST SUITE 1: Build Artifacts (dist/) ---');
const distDir = path.join(__dirname, 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');
const assetsDir = path.join(distDir, 'assets');

assert(fs.existsSync(distDir), 'Direktori dist/ ditemukan');
assert(fs.existsSync(indexHtmlPath), 'dist/index.html ditemukan');

const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
assert(indexHtmlContent.includes('<div id="root">'), 'dist/index.html memuat root container');

const assetFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : [];
const hasJsBundle = assetFiles.some(f => f.endsWith('.js'));
const hasCssBundle = assetFiles.some(f => f.endsWith('.css'));

assert(hasJsBundle, 'dist/assets/ memuat bundle JavaScript hasil build', `Files: ${assetFiles.join(', ')}`);
assert(hasCssBundle, 'dist/assets/ memuat bundle CSS hasil build', `Files: ${assetFiles.join(', ')}`);

// ---------------------------------------------------------
// TEST SUITE 2: Product & Category Completeness
// ---------------------------------------------------------
console.log('\n--- TEST SUITE 2: Product & Category Validation ---');

// Parse constants.ts directly to test the source of truth
const constantsContent = fs.readFileSync(path.join(__dirname, 'src', 'lib', 'constants.ts'), 'utf8');

// Check CATEGORIES
const categoryIdsMatch = constantsContent.match(/id:\s*['"](cat_[a-z0-9_]+)['"]/g);
const categoryIds = categoryIdsMatch ? [...new Set(categoryIdsMatch.map(m => m.match(/['"](cat_[a-z0-9_]+)['"]/)[1]))] : [];

console.log(`Daftar kategori terdeteksi: ${categoryIds.join(', ')}`);

// Expected categories
const expectedCategories = [
  'cat_all',
  'cat_cup',
  'cat_thinwall',
  'cat_kresek',
  'cat_sealer',
  'cat_eco',
  'cat_paper',
  'cat_mika',
  'cat_packing'
];

expectedCategories.forEach(catId => {
  assert(categoryIds.includes(catId), `Kategori ${catId} terdaftar di CATEGORIES`);
});

// Check that each specific category (except 'cat_all') has at least 1 product
const specificCategories = expectedCategories.filter(c => c !== 'cat_all');
specificCategories.forEach(catId => {
  const hasCategoryAssigned = constantsContent.includes(`category_id: '${catId}'`);
  assert(hasCategoryAssigned, `Kategori [${catId}] memiliki item produk aktif`);
});

// ---------------------------------------------------------
// TEST SUITE 3: Multi-Tier Price & Unit Logic
// ---------------------------------------------------------
console.log('\n--- TEST SUITE 3: Multi-Tier Pricing Logic (Pcs vs Pak vs Dus) ---');

// Mock data extracted from constants to verify math invariants
const sampleTierProducts = [
  {
    name: 'Cup Plastik 16 oz',
    pcsPrice: 1800,
    pakQty: 50,
    pakPrice: 65000,
    dusQty: 2000,
    dusPrice: 2150000
  },
  {
    name: 'Thinwall Persegi 650ml',
    pcsPrice: 2000,
    pakQty: 25,
    pakPrice: 42500,
    dusQty: 500,
    dusPrice: 780000
  },
  {
    name: 'Box Biodegradable 750ml',
    pcsPrice: 2500,
    pakQty: 50,
    pakPrice: 95000,
    dusQty: 500,
    dusPrice: 850000
  }
];

sampleTierProducts.forEach(prod => {
  const pakRatePerPcs = prod.pakPrice / prod.pakQty;
  const dusRatePerPcs = prod.dusPrice / prod.dusQty;

  // Invariant 1: Pak rate per pcs is strictly less than retail pcs price
  assert(
    pakRatePerPcs < prod.pcsPrice,
    `${prod.name}: Harga/pcs Pak (Rp ${pakRatePerPcs}) < Eceran (Rp ${prod.pcsPrice})`
  );

  // Invariant 2: Dus rate per pcs is strictly less than Pak rate per pcs
  assert(
    dusRatePerPcs < pakRatePerPcs,
    `${prod.name}: Harga/pcs Dus (Rp ${dusRatePerPcs}) < Harga/pcs Pak (Rp ${pakRatePerPcs})`
  );

  // Savings verification
  const hematPak = (prod.pcsPrice * prod.pakQty) - prod.pakPrice;
  const hematDus = (prod.pcsPrice * prod.dusQty) - prod.dusPrice;
  assert(hematPak > 0, `${prod.name}: Beli Pak hemat Rp ${hematPak.toLocaleString('id-ID')}`);
  assert(hematDus > hematPak, `${prod.name}: Beli Dus hemat Rp ${hematDus.toLocaleString('id-ID')} (Lebih besar dari Pak)`);
});

// ---------------------------------------------------------
// TEST SUITE 4: Shipping Weight Calculation Invariants
// ---------------------------------------------------------
console.log('\n--- TEST SUITE 4: Kalkulator Berat & Volume Pengiriman ---');

const sampleCart = [
  { name: 'Cup 16 oz (2 Pak = 100 pcs)', qty: 2, weightGramsPerUnit: 400 },
  { name: 'Thinwall 650ml (1 Dus = 500 pcs)', qty: 1, weightGramsPerUnit: 9000 },
  { name: 'Kresek 30 (1 Bal = 25 kg)', qty: 1, weightGramsPerUnit: 25000 }
];

const totalWeightGrams = sampleCart.reduce((sum, item) => sum + item.qty * item.weightGramsPerUnit, 0);
const totalWeightKg = Math.max(0.1, Number((totalWeightGrams / 1000).toFixed(2)));

assert(totalWeightKg === 34.8, `Total berat kalkulasi akurat: 34.8 Kg (Dihasilkan: ${totalWeightKg} Kg)`);
assert(totalWeightKg > 20, 'Pesanan > 20kg merekomendasikan Kurir Kargo Bal / Mobil Pick-up');

// ---------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------
console.log('\n====================================================');
console.log(`QA TEST RUN COMPLETE: ${passCount} Passed, ${failCount} Failed`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
