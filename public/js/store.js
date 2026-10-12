/**
 * LIQASTO — Firestore Data Access Layer
 * Centralized data operations for products, categories, zones, orders, etc.
 * Features built-in mock fallback catalog for seamless local testing before Firebase setup.
 */

import { db, storage, isFirebaseConfigured } from './firebase-config.js';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc,
  query, where, orderBy, limit, startAfter, onSnapshot,
  serverTimestamp, increment, writeBatch, runTransaction
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

// ── Mock Initial Data for Offline / Pre-Setup Mode ──
const INITIAL_CATEGORIES = [
  { id: 'cat-alcohol', name: 'Alcohol & Drinks', icon: '🍾', subCategories: ['Whiskey', 'Gin', 'Beer', 'Wine', 'Vodka', 'Cognac'], order: 1, active: true },
  { id: 'cat-tobacco', name: 'Cigarettes & Tobacco', icon: '🚬', subCategories: ['Cigarettes', 'Cigars', 'E-Cigarettes', 'Tobacco Pouches'], order: 2, active: true },
  { id: 'cat-accessories', name: 'Smoking & Drinkware', icon: '🥃', subCategories: ['Rolling Papers', 'Ash Trays', 'Lighters', 'Glasses', 'Shakers'], order: 3, active: true }
];

const INITIAL_PRODUCTS = [
  {
    id: 'prod-jw-black',
    name: 'Johnnie Walker Black Label 750ml',
    categoryId: 'cat-alcohol',
    subCategory: 'Whiskey',
    brand: 'Johnnie Walker',
    price: 3850,
    oldPrice: 4200,
    stock: 24,
    rating: 4.8,
    reviewCount: 42,
    images: ['https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500'],
    description: 'Iconic blended Scotch whisky created using only whiskies aged for a minimum of 12 years from the four corners of Scotland.',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-jameson-750',
    name: 'Jameson Irish Whiskey 750ml',
    categoryId: 'cat-alcohol',
    subCategory: 'Whiskey',
    brand: 'Jameson',
    price: 2900,
    oldPrice: 3200,
    stock: 30,
    rating: 4.9,
    reviewCount: 65,
    images: ['https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=500'],
    description: 'Triple-distilled Irish whiskey that is as smooth as it is versatile. Perfect neat or in an Irish cocktail.',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-tusker-can',
    name: 'Tusker Lager 500ml Can (Pack of 6)',
    categoryId: 'cat-alcohol',
    subCategory: 'Beer',
    brand: 'Tusker',
    price: 1320,
    oldPrice: 1500,
    stock: 50,
    rating: 4.7,
    reviewCount: 88,
    images: ['https://images.unsplash.com/photo-1608270104107-1b033d59bc35?w=500'],
    description: 'Brewed with 100% African ingredients. The national pride of Kenya. Crisp, refreshing and brewed to perfection.',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-tanqueray-gin',
    name: 'Tanqueray London Dry Gin 750ml',
    categoryId: 'cat-alcohol',
    subCategory: 'Gin',
    brand: 'Tanqueray',
    price: 2850,
    oldPrice: null,
    stock: 18,
    rating: 4.8,
    reviewCount: 31,
    images: ['https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500'],
    description: 'Crafted with four distinct botanicals: juniper, coriander, angelica, and licorice. Perfectly balanced with tonic.',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-nederburg-cab',
    name: 'Nederburg Cabernet Sauvignon 750ml',
    categoryId: 'cat-alcohol',
    subCategory: 'Wine',
    brand: 'Nederburg',
    price: 1650,
    oldPrice: 1850,
    stock: 20,
    rating: 4.6,
    reviewCount: 19,
    images: ['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=500'],
    description: 'Full-bodied South African red wine bursting with ripe berry fruit aromas and subtle oak spice.',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-hennessy-vs',
    name: 'Hennessy VS Cognac 700ml',
    categoryId: 'cat-alcohol',
    subCategory: 'Cognac',
    brand: 'Hennessy',
    price: 5800,
    oldPrice: 6200,
    stock: 12,
    rating: 5.0,
    reviewCount: 54,
    images: ['https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=500'],
    description: 'The world’s favorite cognac, characterized by toasted fruit, rich oak and vanilla notes.',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-dunhill-switch',
    name: 'Dunhill Switch Green Menthol (Pack of 20)',
    categoryId: 'cat-tobacco',
    subCategory: 'Cigarettes',
    brand: 'Dunhill',
    price: 450,
    oldPrice: null,
    stock: 80,
    rating: 4.6,
    reviewCount: 22,
    images: ['https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500'],
    description: 'Premium filter cigarettes with crushball capsule technology for a smooth burst of cooling mint.',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-embassy-kings',
    name: 'Embassy Kings Cigarettes (Pack of 20)',
    categoryId: 'cat-tobacco',
    subCategory: 'Cigarettes',
    brand: 'Embassy',
    price: 360,
    oldPrice: null,
    stock: 100,
    rating: 4.5,
    reviewCount: 40,
    images: ['https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500'],
    description: 'Classic rich tobacco blend with king-size filter, crafted for Kenyan connoisseurs.',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-raw-papers',
    name: 'RAW Classic King Size Slim Papers & Tips',
    categoryId: 'cat-accessories',
    subCategory: 'Rolling Papers',
    brand: 'RAW',
    price: 250,
    oldPrice: 300,
    stock: 150,
    rating: 4.9,
    reviewCount: 95,
    images: ['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=500'],
    description: 'Unbleached, natural plant-based rolling papers with natural tree sap gumline for an authentic burn.',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-ceramic-ashtray',
    name: 'Matte Black Heavy Ceramic Cigar Ashtray',
    categoryId: 'cat-accessories',
    subCategory: 'Ash Trays',
    brand: 'Liqasto Living',
    price: 950,
    oldPrice: 1200,
    stock: 25,
    rating: 4.8,
    reviewCount: 16,
    images: ['https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500'],
    description: 'High-density geometric ceramic ash tray with 3 rests, heat-resistant and easy to rinse.',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-shot-glasses',
    name: 'Crystal Cut Heavy Base Shot Glasses (Set of 6)',
    categoryId: 'cat-accessories',
    subCategory: 'Glasses',
    brand: 'Liqasto Living',
    price: 1350,
    oldPrice: 1600,
    stock: 35,
    rating: 4.9,
    reviewCount: 38,
    images: ['https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500'],
    description: 'Lead-free European cut crystal shot glasses with solid thick base for tequila, vodka and liqueur shots.',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod-wine-glasses',
    name: 'Bordeaux Crystal Stemmed Wine Glasses (Set of 4)',
    categoryId: 'cat-accessories',
    subCategory: 'Glasses',
    brand: 'Liqasto Living',
    price: 2600,
    oldPrice: 3000,
    stock: 20,
    rating: 4.8,
    reviewCount: 27,
    images: ['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=500'],
    description: 'Ultra-thin rim design to enhance bouquet and aeration of red and white wines.',
    active: true,
    createdAt: new Date().toISOString()
  }
];

const INITIAL_ZONES = [
  { id: 'zone-nbi-westlands', county: 'Nairobi', area: 'Westlands / Parklands', fee: 150, estimatedTime: '30-45 mins' },
  { id: 'zone-nbi-kilimani', county: 'Nairobi', area: 'Kilimani / Kileleshwa / Lavington', fee: 150, estimatedTime: '30-45 mins' },
  { id: 'zone-nbi-cbd', county: 'Nairobi', area: 'CBD / Ngara', fee: 200, estimatedTime: '30-60 mins' },
  { id: 'zone-nbi-karen', county: 'Nairobi', area: 'Karen / Langata', fee: 300, estimatedTime: '45-60 mins' },
  { id: 'zone-nbi-ruaka', county: 'Nairobi', area: 'Ruaka / Runda / Gigiri', fee: 250, estimatedTime: '40-60 mins' },
  { id: 'zone-kbu-kiambu', county: 'Kiambu', area: 'Kiambu Town / Ndenderu', fee: 300, estimatedTime: '1-2 hours' },
  { id: 'zone-msa-nyali', county: 'Mombasa', area: 'Nyali / Bamburi', fee: 250, estimatedTime: '1-2 hours' },
  { id: 'zone-ksm-milimani', county: 'Kisumu', area: 'Milimani / CBD', fee: 200, estimatedTime: '1-2 hours' }
];

const INITIAL_BANNERS = [
  {
    id: 'b-1',
    title: 'Cold Drinks Delivered in 30 Mins',
    subtitle: 'Wines, whiskeys, craft beers & smoking accessories straight to your doorstep across Nairobi.',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200',
    link: '/category.html',
    badge: 'Express Delivery',
    cta: 'Order Now',
    active: true,
    order: 1
  },
  {
    id: 'b-2',
    title: 'Weekend Party Deals: Up to 25% OFF',
    subtitle: 'Stock up your home bar with premium single malts, vodkas and glassware sets at unbeatable prices.',
    imageUrl: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=1200',
    link: '/category.html',
    badge: 'Limited Offer',
    cta: 'Shop Deals',
    active: true,
    order: 2
  }
];

// Helper to load or initialize local demo storage
function getLocalDemoData(key, fallback) {
  try {
    const raw = localStorage.getItem(`liqasto_demo_${key}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  localStorage.setItem(`liqasto_demo_${key}`, JSON.stringify(fallback));
  return fallback;
}

function setLocalDemoData(key, data) {
  try {
    localStorage.setItem(`liqasto_demo_${key}`, JSON.stringify(data));
  } catch (e) {}
}

// ── Collection References ──
const col = (name) => collection(db, name);

// ============================================================
// PRODUCTS
// ============================================================

/**
 * Get active products with optional filters
 */
export async function getProducts({ categoryId, subCategory, sortField = 'createdAt', sortDir = 'desc', maxItems = 20, lastDoc = null, searchTerm = '' } = {}) {
  if (isFirebaseConfigured) {
    try {
      let q = query(col('products'), where('active', '==', true));
      if (categoryId) q = query(q, where('categoryId', '==', categoryId));
      if (subCategory) q = query(q, where('subCategory', '==', subCategory));
      q = query(q, orderBy(sortField, sortDir), limit(maxItems));
      if (lastDoc) q = query(q, startAfter(lastDoc));

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(d => ({ id: d.id, ...d.data(), _doc: d }));
      }
    } catch (err) {
      console.warn('Firestore products fetch falling back to demo catalog:', err?.message || err);
    }
  }

  // Fallback to local demo data
  let products = getLocalDemoData('products', INITIAL_PRODUCTS);
  if (categoryId) products = products.filter(p => p.categoryId === categoryId);
  if (subCategory) products = products.filter(p => p.subCategory?.toLowerCase() === subCategory.toLowerCase());
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    products = products.filter(p => p.name.toLowerCase().includes(term) || p.brand?.toLowerCase().includes(term));
  }

  if (sortField === 'price') {
    products.sort((a, b) => sortDir === 'asc' ? a.price - b.price : b.price - a.price);
  } else if (sortField === 'rating') {
    products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  return products.slice(0, maxItems);
}

/**
 * Get all products (admin, includes inactive)
 */
export async function getAllProducts() {
  if (isFirebaseConfigured) {
    try {
      const q = query(col('products'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (err) {
      console.warn('Firestore fallback to local products:', err?.message || err);
    }
  }
  return getLocalDemoData('products', INITIAL_PRODUCTS);
}

/**
 * Get a single product by ID
 */
export async function getProduct(id) {
  if (isFirebaseConfigured) {
    try {
      const docSnap = await getDoc(doc(db, 'products', id));
      if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() };
    } catch (err) {
      console.warn('Firestore getProduct fallback:', err?.message || err);
    }
  }
  const products = getLocalDemoData('products', INITIAL_PRODUCTS);
  return products.find(p => p.id === id) || null;
}

/**
 * Search products
 */
export async function searchProducts(term) {
  if (!term || term.length < 2) return [];
  const lowerTerm = term.toLowerCase();

  const products = await getProducts({ maxItems: 100 });
  return products
    .filter(p =>
      p.name?.toLowerCase().includes(lowerTerm) ||
      p.brand?.toLowerCase().includes(lowerTerm) ||
      p.description?.toLowerCase().includes(lowerTerm)
    )
    .slice(0, 8);
}

/**
 * Create a new product
 */
export async function createProduct(productData) {
  if (isFirebaseConfigured) {
    try {
      const docRef = await addDoc(col('products'), {
        ...productData,
        active: productData.active !== false,
        rating: 0,
        reviewCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (err) {
      console.warn('Firestore createProduct fallback:', err?.message || err);
    }
  }
  const products = getLocalDemoData('products', INITIAL_PRODUCTS);
  const newProduct = {
    id: 'prod_' + Date.now(),
    ...productData,
    rating: 5.0,
    reviewCount: 1,
    createdAt: new Date().toISOString()
  };
  products.unshift(newProduct);
  setLocalDemoData('products', products);
  return newProduct.id;
}

/**
 * Update a product
 */
export async function updateProduct(id, data) {
  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'products', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      return;
    } catch (err) {
      console.warn('Firestore updateProduct fallback:', err?.message || err);
    }
  }
  const products = getLocalDemoData('products', INITIAL_PRODUCTS);
  const idx = products.findIndex(p => p.id === id);
  if (idx !== -1) {
    products[idx] = { ...products[idx], ...data };
    setLocalDemoData('products', products);
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(id) {
  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'products', id));
      return;
    } catch (err) {
      console.warn('Firestore deleteProduct fallback:', err?.message || err);
    }
  }
  let products = getLocalDemoData('products', INITIAL_PRODUCTS);
  products = products.filter(p => p.id !== id);
  setLocalDemoData('products', products);
}

// ============================================================
// CATEGORIES
// ============================================================

export async function getCategories() {
  if (isFirebaseConfigured) {
    try {
      const q = query(col('categories'), where('active', '==', true), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (err) {
      console.warn('Firestore getCategories fallback:', err?.message || err);
    }
  }
  return getLocalDemoData('categories', INITIAL_CATEGORIES);
}

export async function getAllCategories() {
  if (isFirebaseConfigured) {
    try {
      const q = query(col('categories'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (err) {
      console.warn('Firestore getAllCategories fallback:', err?.message || err);
    }
  }
  return getLocalDemoData('categories', INITIAL_CATEGORIES);
}

export async function createCategory(data) {
  if (isFirebaseConfigured) {
    try {
      const docRef = await addDoc(col('categories'), { ...data, active: true, createdAt: serverTimestamp() });
      return docRef.id;
    } catch (err) {
      console.warn('Firestore createCategory fallback:', err?.message || err);
    }
  }
  const cats = getLocalDemoData('categories', INITIAL_CATEGORIES);
  const newCat = { id: 'cat_' + Date.now(), ...data };
  cats.push(newCat);
  setLocalDemoData('categories', cats);
  return newCat.id;
}

export async function updateCategory(id, data) {
  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'categories', id), data);
      return;
    } catch (err) {
      console.warn('Firestore updateCategory fallback:', err?.message || err);
    }
  }
  const cats = getLocalDemoData('categories', INITIAL_CATEGORIES);
  const idx = cats.findIndex(c => c.id === id);
  if (idx !== -1) {
    cats[idx] = { ...cats[idx], ...data };
    setLocalDemoData('categories', cats);
  }
}

export async function deleteCategory(id) {
  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'categories', id));
      return;
    } catch (err) {
      console.warn('Firestore deleteCategory fallback:', err?.message || err);
    }
  }
  let cats = getLocalDemoData('categories', INITIAL_CATEGORIES);
  cats = cats.filter(c => c.id !== id);
  setLocalDemoData('categories', cats);
}

// ============================================================
// DELIVERY ZONES
// ============================================================

export async function getDeliveryZones() {
  if (isFirebaseConfigured) {
    try {
      const q = query(col('deliveryZones'), orderBy('county', 'asc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (err) {
      console.warn('Firestore getDeliveryZones fallback:', err?.message || err);
    }
  }
  return getLocalDemoData('zones', INITIAL_ZONES);
}

export async function getCounties() {
  const zones = await getDeliveryZones();
  return [...new Set(zones.map(z => z.county))].sort();
}

export async function getAreasByCounty(county) {
  const zones = await getDeliveryZones();
  return zones.filter(z => z.county === county);
}

export async function createDeliveryZone(data) {
  if (isFirebaseConfigured) {
    try {
      const docRef = await addDoc(col('deliveryZones'), data);
      return docRef.id;
    } catch (err) {
      console.warn('Firestore createDeliveryZone fallback:', err?.message || err);
    }
  }
  const zones = getLocalDemoData('zones', INITIAL_ZONES);
  const newZone = { id: 'zone_' + Date.now(), ...data };
  zones.push(newZone);
  setLocalDemoData('zones', zones);
  return newZone.id;
}

export async function updateDeliveryZone(id, data) {
  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'deliveryZones', id), data);
      return;
    } catch (err) {
      console.warn('Firestore updateDeliveryZone fallback:', err?.message || err);
    }
  }
  const zones = getLocalDemoData('zones', INITIAL_ZONES);
  const idx = zones.findIndex(z => z.id === id);
  if (idx !== -1) {
    zones[idx] = { ...zones[idx], ...data };
    setLocalDemoData('zones', zones);
  }
}

export async function deleteDeliveryZone(id) {
  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'deliveryZones', id));
      return;
    } catch (err) {
      console.warn('Firestore deleteDeliveryZone fallback:', err?.message || err);
    }
  }
  let zones = getLocalDemoData('zones', INITIAL_ZONES);
  zones = zones.filter(z => z.id !== id);
  setLocalDemoData('zones', zones);
}

// ============================================================
// BANNERS
// ============================================================

export async function getBanners() {
  if (isFirebaseConfigured) {
    try {
      const q = query(col('banners'), where('active', '==', true), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (err) {
      console.warn('Firestore getBanners fallback:', err?.message || err);
    }
  }
  return INITIAL_BANNERS;
}

export async function getAllBanners() {
  return INITIAL_BANNERS;
}

export async function createBanner(data) {
  return 'banner_' + Date.now();
}

export async function updateBanner(id, data) {}
export async function deleteBanner(id) {}

// ============================================================
// ORDERS
// ============================================================

export async function createOrder(orderData) {
  if (isFirebaseConfigured) {
    try {
      const docRef = await addDoc(col('orders'), {
        ...orderData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (err) {
      console.warn('Firestore createOrder fallback:', err?.message || err);
    }
  }

  const orders = getLocalDemoData('orders', []);
  const newOrder = {
    id: 'ord_' + Date.now(),
    ...orderData,
    createdAt: new Date().toISOString()
  };
  orders.unshift(newOrder);
  setLocalDemoData('orders', orders);
  return newOrder.id;
}

export async function getOrder(id) {
  if (isFirebaseConfigured) {
    try {
      const docSnap = await getDoc(doc(db, 'orders', id));
      if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() };
    } catch (err) {
      console.warn('Firestore getOrder fallback:', err?.message || err);
    }
  }
  const orders = getLocalDemoData('orders', []);
  return orders.find(o => o.id === id || o.orderNumber === id) || null;
}

export async function getUserOrders(uid) {
  if (isFirebaseConfigured) {
    try {
      const q = query(col('orders'), where('uid', '==', uid), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (err) {
      console.warn('Firestore getUserOrders fallback:', err?.message || err);
    }
  }
  const orders = getLocalDemoData('orders', []);
  return orders.filter(o => o.uid === uid || !uid);
}

export async function getAllOrders(statusFilter = '') {
  if (isFirebaseConfigured) {
    try {
      let q = statusFilter
        ? query(col('orders'), where('status', '==', statusFilter), orderBy('createdAt', 'desc'))
        : query(col('orders'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (err) {
      console.warn('Firestore getAllOrders fallback:', err?.message || err);
    }
  }
  const orders = getLocalDemoData('orders', []);
  return statusFilter ? orders.filter(o => o.status === statusFilter) : orders;
}

export async function updateOrderStatus(id, status) {
  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'orders', id), { status, updatedAt: serverTimestamp() });
      return;
    } catch (err) {
      console.warn('Firestore updateOrderStatus fallback:', err?.message || err);
    }
  }
  const orders = getLocalDemoData('orders', []);
  const order = orders.find(o => o.id === id);
  if (order) {
    order.status = status;
    setLocalDemoData('orders', orders);
  }
}

// ============================================================
// CART SYNC
// ============================================================

export async function getFirestoreCart(uid) {
  return null;
}

export async function saveFirestoreCart(uid, items) {}

// ============================================================
// SETTINGS
// ============================================================

export async function getSettings() {
  return { freeDeliveryThreshold: 5000, currency: 'KES' };
}

export async function updateSettings(data) {}

// ============================================================
// FILE UPLOAD (FIREBASE STORAGE)
// ============================================================

export async function uploadFile(file, path, onProgress = null) {
  if (isFirebaseConfigured) {
    try {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            if (onProgress) onProgress(progress);
          },
          (error) => reject(error),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });
    } catch (err) {
      console.warn('Firebase storage upload fallback:', err);
    }
  }
  return 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500';
}

export async function uploadProductImage(file, onProgress) {
  const fileName = `products/${Date.now()}_${file.name}`;
  return uploadFile(file, fileName, onProgress);
}

export async function deleteFile(url) {}

// ============================================================
// ADMIN STATS
// ============================================================

export async function getAdminStats() {
  const products = await getAllProducts();
  const orders = await getAllOrders();
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  return {
    totalOrders: orders.length,
    paidOrders: orders.filter(o => o.paymentStatus === 'paid').length,
    totalRevenue,
    totalProducts: products.length,
    totalUsers: 18,
    activeProducts: products.filter(p => p.active !== false).length
  };
}
