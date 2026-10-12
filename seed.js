/**
 * LIQASTO — Firestore Database Seeding Script
 * Run with: node seed.js (requires serviceAccountKey.json in root)
 */

import admin from 'firebase-admin';
import fs from 'fs';

if (!fs.existsSync('./serviceAccountKey.json')) {
  console.log('Notice: serviceAccountKey.json not found in root.');
  console.log('To seed live Firestore, download your Service Account Key from Firebase Console -> Project Settings -> Service accounts, save it as serviceAccountKey.json in the project root, and re-run.');
  console.log('Note: The client-side application already includes built-in mock fallback catalog data for offline and local testing.');
  process.exit(0);
}

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const CATEGORIES = [
  { id: 'cat-alcohol', name: 'Alcohol & Drinks', icon: '🍾', subCategories: ['Whiskey', 'Gin', 'Beer', 'Wine', 'Vodka', 'Cognac'], order: 1, active: true },
  { id: 'cat-tobacco', name: 'Cigarettes & Tobacco', icon: '🚬', subCategories: ['Cigarettes', 'Cigars', 'E-Cigarettes', 'Tobacco Pouches'], order: 2, active: true },
  { id: 'cat-accessories', name: 'Smoking & Drinkware', icon: '🥃', subCategories: ['Rolling Papers', 'Ash Trays', 'Lighters', 'Glasses', 'Shakers'], order: 3, active: true }
];

const PRODUCTS = [
  {
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
    description: 'Iconic blended Scotch whisky aged for a minimum of 12 years.',
    active: true
  },
  {
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
    description: 'Triple-distilled Irish whiskey, smooth and versatile.',
    active: true
  },
  {
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
    description: 'The national pride of Kenya. Crisp and refreshing.',
    active: true
  },
  {
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
    description: 'Crafted with four distinct botanicals for a refreshing finish.',
    active: true
  },
  {
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
    description: 'Full-bodied South African red wine with rich berry notes.',
    active: true
  },
  {
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
    description: 'Premium French cognac with toasted oak and vanilla.',
    active: true
  },
  {
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
    description: 'Filter cigarettes with crushball menthol capsule technology.',
    active: true
  },
  {
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
    description: 'Unbleached natural plant fibers for an even burn.',
    active: true
  },
  {
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
    description: 'Heavy duty ceramic ashtray with geometric styling.',
    active: true
  },
  {
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
    description: 'Cut crystal shot glasses with solid thick weighted base.',
    active: true
  }
];

const ZONES = [
  { county: 'Nairobi', area: 'Westlands / Parklands', fee: 150, estimatedTime: '30-45 mins' },
  { county: 'Nairobi', area: 'Kilimani / Kileleshwa / Lavington', fee: 150, estimatedTime: '30-45 mins' },
  { county: 'Nairobi', area: 'CBD / Ngara', fee: 200, estimatedTime: '30-60 mins' },
  { county: 'Nairobi', area: 'Karen / Langata', fee: 300, estimatedTime: '45-60 mins' },
  { county: 'Nairobi', area: 'Ruaka / Runda / Gigiri', fee: 250, estimatedTime: '40-60 mins' },
  { county: 'Kiambu', area: 'Kiambu Town / Ndenderu', fee: 300, estimatedTime: '1-2 hours' },
  { county: 'Mombasa', area: 'Nyali / Bamburi', fee: 250, estimatedTime: '1-2 hours' },
  { county: 'Kisumu', area: 'Milimani / CBD', fee: 200, estimatedTime: '1-2 hours' }
];

async function seed() {
  console.log('Seeding Liqasto Firestore database...');

  // 1. Categories
  for (const cat of CATEGORIES) {
    const { id, ...data } = cat;
    await db.collection('categories').doc(id).set({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  console.log('✓ Categories seeded');

  // 2. Products
  for (const prod of PRODUCTS) {
    await db.collection('products').add({
      ...prod,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  console.log('✓ Products seeded');

  // 3. Zones
  for (const zone of ZONES) {
    await db.collection('deliveryZones').add(zone);
  }
  console.log('✓ Delivery zones seeded');

  console.log('Database seeding complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
