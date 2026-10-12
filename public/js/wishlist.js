/**
 * LIQASTO — Wishlist Module
 * localStorage-based wishlist
 */

import { toast } from './ui.js';
import { sanitize } from './utils.js';

const WISHLIST_KEY = 'liqasto_wishlist';

let wishlistItems = [];
let wishlistListeners = [];

/**
 * Initialize wishlist from localStorage
 */
export function initWishlist() {
  const stored = localStorage.getItem(WISHLIST_KEY);
  if (stored) {
    try {
      wishlistItems = JSON.parse(stored);
    } catch {
      wishlistItems = [];
    }
  }
  updateWishlistBadge();
}

/**
 * Get all wishlist items
 * @returns {Array}
 */
export function getWishlistItems() {
  return [...wishlistItems];
}

/**
 * Get wishlist count
 * @returns {number}
 */
export function getWishlistCount() {
  return wishlistItems.length;
}

/**
 * Check if a product is in the wishlist
 * @param {string} productId
 * @returns {boolean}
 */
export function isInWishlist(productId) {
  return wishlistItems.some(i => i.productId === productId);
}

/**
 * Toggle an item in the wishlist
 * @param {Object} product
 * @returns {boolean} true if added, false if removed
 */
export function toggleWishlist(product) {
  if (isInWishlist(product.id)) {
    wishlistItems = wishlistItems.filter(i => i.productId !== product.id);
    saveWishlist();
    toast.info(`${sanitize(product.name)} removed from wishlist.`);
    return false;
  } else {
    wishlistItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      oldPrice: product.oldPrice || null,
      image: product.images?.[0] || '',
      brand: product.brand || '',
      addedAt: new Date().toISOString()
    });
    saveWishlist();
    toast.success(`${sanitize(product.name)} added to wishlist! ❤️`);
    return true;
  }
}

/**
 * Remove item from wishlist
 * @param {string} productId
 */
export function removeFromWishlist(productId) {
  wishlistItems = wishlistItems.filter(i => i.productId !== productId);
  saveWishlist();
}

/**
 * Clear the entire wishlist
 */
export function clearWishlist() {
  wishlistItems = [];
  saveWishlist();
}

// ── Persistence ──
function saveWishlist() {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlistItems));
  updateWishlistBadge();
  notifyListeners();
}

// ── Listeners ──
export function onWishlistChange(callback) {
  wishlistListeners.push(callback);
  return () => {
    wishlistListeners = wishlistListeners.filter(l => l !== callback);
  };
}

function notifyListeners() {
  wishlistListeners.forEach(l => l(wishlistItems));
}

// ── Badge ──
function updateWishlistBadge() {
  const badges = document.querySelectorAll('.wishlist-badge');
  const count = getWishlistCount();
  badges.forEach(badge => {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  });
}
