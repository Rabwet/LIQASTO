/**
 * LIQASTO — Search Module
 * Instant search suggestions with debouncing and keyword matching
 */

import { searchProducts } from './store.js';
import { debounce, formatPrice, sanitize } from './utils.js';

export function initSearch() {
  const searchInput = document.querySelector('#header-search-input');
  const searchForm = document.querySelector('#header-search-form');
  const suggestionsBox = document.querySelector('#search-suggestions');

  if (!searchInput) return;

  const handleInput = debounce(async (e) => {
    const term = e.target.value.trim();

    if (term.length < 2) {
      if (suggestionsBox) {
        suggestionsBox.style.display = 'none';
        suggestionsBox.innerHTML = '';
      }
      return;
    }

    try {
      const results = await searchProducts(term);

      if (!suggestionsBox) return;

      if (results.length === 0) {
        suggestionsBox.innerHTML = `
          <div class="search-suggestion-item no-result" style="padding: 12px 16px; color: var(--color-gray-500); font-size: 13px;">
            No products found for "${sanitize(term)}"
          </div>
        `;
        suggestionsBox.style.display = 'block';
        return;
      }

      suggestionsBox.innerHTML = results.map(p => `
        <a href="/product.html?id=${sanitize(p.id)}" class="search-suggestion-item" style="display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid var(--color-gray-100); text-decoration: none; color: inherit;">
          <img src="${sanitize(p.images?.[0] || 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=100')}" alt="${sanitize(p.name)}" style="width: 40px; height: 40px; object-fit: contain; border-radius: 4px; background: #fff;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--color-gray-800);">${sanitize(p.name)}</div>
            <div style="font-size: 12px; color: var(--color-emerald-600); font-weight: 700;">${formatPrice(p.price)}</div>
          </div>
        </a>
      `).join('') + `
        <a href="/category.html?search=${encodeURIComponent(term)}" style="display: block; padding: 10px 16px; background: var(--color-gray-50); font-size: 12px; font-weight: 600; text-align: center; color: var(--color-emerald-700);">
          View all results for "${sanitize(term)}" →
        </a>
      `;

      suggestionsBox.style.display = 'block';
    } catch (err) {
      console.warn('Search suggestion error:', err);
    }
  }, 250);

  searchInput.addEventListener('input', handleInput);

  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const term = searchInput.value.trim();
      if (term) {
        window.location.href = `/category.html?search=${encodeURIComponent(term)}`;
      }
    });
  }

  // Close suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (suggestionsBox && !searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
      suggestionsBox.style.display = 'none';
    }
  });

  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim().length >= 2 && suggestionsBox && suggestionsBox.children.length > 0) {
      suggestionsBox.style.display = 'block';
    }
  });
}
