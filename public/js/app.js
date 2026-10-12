/**
 * LIQASTO — Global App Entry Point
 * Header navigation, mobile drawer, age verification, search bar, and badge updates
 */

import { initAgeGate } from './age-gate.js';
import { initCart, updateCartBadge } from './cart.js';
import { initWishlist, updateWishlistBadge } from './wishlist.js';
import { initSearch } from './search.js';
import { setupAccountDropdown, waitForAuth } from './auth.js';

export function initApp() {
  // 1. Age verification modal
  initAgeGate();

  // 2. Cart & Wishlist state
  initCart();
  initWishlist();

  // 3. Header instant search
  initSearch();

  // 4. Auth header & dropdown
  setupAccountDropdown();

  // 5. Mobile hamburger drawer menu
  setupMobileDrawer();

  // 6. Sticky header shadow on scroll
  setupHeaderScrollEffect();
}

function setupMobileDrawer() {
  const hamburger = document.querySelector('#btn-mobile-menu');
  const drawer = document.querySelector('#mobile-drawer');
  const backdrop = document.querySelector('#mobile-drawer-backdrop');
  const closeBtn = document.querySelector('#btn-close-drawer');

  if (!hamburger || !drawer) return;

  const openDrawer = () => {
    drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    document.body.style.overflow = '';
  };

  hamburger.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);
}

function setupHeaderScrollEffect() {
  const header = document.querySelector('.header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
