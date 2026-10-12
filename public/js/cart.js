/**
 * LIQASTO — Cart Module
 * localStorage-based cart with Firestore sync for logged-in users
 */

import { getCurrentUser } from './auth.js';
import { getFirestoreCart, saveFirestoreCart, getProduct } from './store.js';
import { formatPrice, sanitize } from './utils.js';
import { toast } from './ui.js';

const CART_KEY = 'liqasto_cart';

// ── Cart State ──
let cartItems = [];
let cartListeners = [];

/**
 * Initialize cart (load from localStorage, sync with Firestore if logged in)
 */
export async function initCart() {
  // Load from localStorage
  const stored = localStorage.getItem(CART_KEY);
  if (stored) {
    try {
      cartItems = JSON.parse(stored);
    } catch {
      cartItems = [];
    }
  }

  // Sync with Firestore if logged in
  const user = getCurrentUser();
  if (user) {
    try {
      const firestoreCart = await getFirestoreCart(user.uid);
      if (firestoreCart?.items?.length) {
        // Merge: Firestore takes precedence, but keep local items not in Firestore
        const firestoreIds = new Set(firestoreCart.items.map(i => i.productId));
        const localOnly = cartItems.filter(i => !firestoreIds.has(i.productId));
        cartItems = [...firestoreCart.items, ...localOnly];
      }
      // Save merged cart
      saveCart();
    } catch (err) {
      console.warn('Error syncing cart with Firestore:', err);
    }
  }

  notifyListeners();
  updateCartBadge();
}

/**
 * Get all cart items
 * @returns {Array}
 */
export function getCartItems() {
  return [...cartItems];
}

/**
 * Get cart item count
 * @returns {number}
 */
export function getCartCount() {
  return cartItems.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Get cart subtotal
 * @returns {number}
 */
export function getCartSubtotal() {
  return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

/**
 * Add item to cart
 * @param {Object} product
 * @param {number} quantity
 */
export function addToCart(product, quantity = 1) {
  const existing = cartItems.find(i => i.productId === product.id);

  if (existing) {
    existing.quantity += quantity;
    if (existing.quantity > (product.stock || 99)) {
      existing.quantity = product.stock || 99;
      toast.warning('Maximum available quantity reached.');
      return;
    }
  } else {
    cartItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || '',
      brand: product.brand || '',
      volume: product.volume || '',
      quantity,
      stock: product.stock || 0
    });
  }

  saveCart();
  notifyListeners();
  updateCartBadge();
  toast.success(`${sanitize(product.name)} added to cart!`);
}

/**
 * Update item quantity
 * @param {string} productId
 * @param {number} quantity
 */
export function updateQuantity(productId, quantity) {
  const item = cartItems.find(i => i.productId === productId);
  if (!item) return;

  if (quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  if (quantity > item.stock && item.stock > 0) {
    quantity = item.stock;
    toast.warning('Maximum available quantity reached.');
  }

  item.quantity = quantity;
  saveCart();
  notifyListeners();
  updateCartBadge();
}

/**
 * Remove item from cart
 * @param {string} productId
 */
export function removeFromCart(productId) {
  const item = cartItems.find(i => i.productId === productId);
  cartItems = cartItems.filter(i => i.productId !== productId);
  saveCart();
  notifyListeners();
  updateCartBadge();
  if (item) {
    toast.info(`${sanitize(item.name)} removed from cart.`);
  }
}

/**
 * Clear the entire cart
 */
export function clearCart() {
  cartItems = [];
  saveCart();
  notifyListeners();
  updateCartBadge();
}

/**
 * Check if a product is in the cart
 * @param {string} productId
 * @returns {boolean}
 */
export function isInCart(productId) {
  return cartItems.some(i => i.productId === productId);
}

// ── Persistence ──
function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cartItems));

  // Sync to Firestore in background
  const user = getCurrentUser();
  if (user) {
    saveFirestoreCart(user.uid, cartItems).catch(err => {
      console.warn('Error saving cart to Firestore:', err);
    });
  }
}

// ── Listeners ──
/**
 * Subscribe to cart changes
 * @param {Function} callback
 * @returns {Function} Unsubscribe
 */
export function onCartChange(callback) {
  cartListeners.push(callback);
  return () => {
    cartListeners = cartListeners.filter(l => l !== callback);
  };
}

function notifyListeners() {
  cartListeners.forEach(l => l(cartItems));
}

// ── Badge Update ──
function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-badge');
  const count = getCartCount();
  badges.forEach(badge => {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  });
}

/**
 * Render the cart page
 * @param {HTMLElement} container
 */
export function renderCartPage(container) {
  if (!container) return;

  if (cartItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🛒</div>
        <h3 class="empty-state__title">Your cart is empty</h3>
        <p class="empty-state__text">Browse our collection and add items to your cart.</p>
        <a href="/" class="btn btn-primary">Start Shopping</a>
      </div>
    `;
    return;
  }

  const subtotal = getCartSubtotal();

  container.innerHTML = `
    <div class="cart-layout">
      <div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4);">
          <h2 style="font-size: var(--text-xl); font-weight: var(--font-bold);">Shopping Cart (${getCartCount()} items)</h2>
          <button class="btn btn-ghost btn-sm" id="clear-cart-btn">Clear All</button>
        </div>
        <div class="cart-items" id="cart-items-list">
          ${cartItems.map(item => renderCartItem(item)).join('')}
        </div>
      </div>
      <div class="cart-summary">
        <h3 class="cart-summary__title">Order Summary</h3>
        <div class="cart-summary__row">
          <span class="cart-summary__label">Subtotal (${getCartCount()} items)</span>
          <span class="cart-summary__value">${formatPrice(subtotal)}</span>
        </div>
        <div class="cart-summary__row">
          <span class="cart-summary__label">Delivery</span>
          <span class="cart-summary__value text-muted">Calculated at checkout</span>
        </div>
        <div class="cart-summary__row total">
          <span>Total</span>
          <span>${formatPrice(subtotal)}</span>
        </div>
        <a href="/checkout.html" class="btn btn-primary btn-block btn-lg">
          Proceed to Checkout →
        </a>
        <p class="cart-summary__note">🔒 Secure checkout</p>
      </div>
    </div>
  `;

  // Attach event listeners
  attachCartEvents(container);
}

function renderCartItem(item) {
  const itemTotal = item.price * item.quantity;
  const imageUrl = item.image || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect fill='%23f3f4f6' width='120' height='120'/%3E%3Ctext x='60' y='65' fill='%239ca3af' font-size='12' text-anchor='middle'%3ENo Image%3C/text%3E%3C/svg%3E`;

  return `
    <div class="cart-item" data-product-id="${sanitize(item.productId)}">
      <div class="cart-item__image">
        <a href="/product.html?id=${sanitize(item.productId)}">
          <img src="${sanitize(imageUrl)}" alt="${sanitize(item.name)}" loading="lazy">
        </a>
      </div>
      <div class="cart-item__info">
        <h4 class="cart-item__name">
          <a href="/product.html?id=${sanitize(item.productId)}">${sanitize(item.name)}</a>
        </h4>
        <p class="cart-item__meta">${sanitize(item.brand)}${item.volume ? ' · ' + sanitize(item.volume) : ''}</p>
        <div class="cart-item__bottom">
          <div class="qty-selector">
            <button class="qty-selector__btn qty-minus" data-id="${sanitize(item.productId)}" ${item.quantity <= 1 ? 'disabled' : ''}>−</button>
            <input class="qty-selector__value" type="number" value="${item.quantity}" min="1" max="${item.stock || 99}" data-id="${sanitize(item.productId)}" readonly>
            <button class="qty-selector__btn qty-plus" data-id="${sanitize(item.productId)}" ${item.quantity >= (item.stock || 99) ? 'disabled' : ''}>+</button>
          </div>
          <span class="cart-item__price">${formatPrice(itemTotal)}</span>
          <button class="cart-item__remove" data-id="${sanitize(item.productId)}">🗑 Remove</button>
        </div>
      </div>
    </div>
  `;
}

function attachCartEvents(container) {
  // Clear all
  container.querySelector('#clear-cart-btn')?.addEventListener('click', () => {
    clearCart();
    renderCartPage(container);
  });

  // Quantity buttons
  container.querySelectorAll('.qty-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const item = cartItems.find(i => i.productId === id);
      if (item) {
        updateQuantity(id, item.quantity - 1);
        renderCartPage(container);
      }
    });
  });

  container.querySelectorAll('.qty-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const item = cartItems.find(i => i.productId === id);
      if (item) {
        updateQuantity(id, item.quantity + 1);
        renderCartPage(container);
      }
    });
  });

  // Remove buttons
  container.querySelectorAll('.cart-item__remove').forEach(btn => {
    btn.addEventListener('click', () => {
      removeFromCart(btn.dataset.id);
      renderCartPage(container);
    });
  });
}
