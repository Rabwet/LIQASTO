/**
 * LIQASTO — Products Module
 * Product rendering for home page, category page, and product detail page
 */

import { getProducts, getProduct, getCategories, searchProducts } from './store.js';
import { formatPrice, sanitize, renderStars, calcDiscount, debounce, getQueryParam, placeholderImage } from './utils.js';
import { addToCart, isInCart } from './cart.js';
import { toggleWishlist, isInWishlist } from './wishlist.js';
import { productSkeletons, emptyState } from './ui.js';

// ── Product Card Renderer ──
/**
 * Render a product card HTML string
 * @param {Object} product
 * @returns {string}
 */
export function renderProductCard(product) {
  const discount = calcDiscount(product.oldPrice, product.price);
  const imageUrl = product.images?.[0] || placeholderImage(300, 300, product.name || 'Product');
  const inWishlist = isInWishlist(product.id);
  const outOfStock = product.stock <= 0;

  return `
    <div class="product-card" data-product-id="${sanitize(product.id)}">
      <div class="product-card__image-wrap">
        <a href="/product.html?id=${sanitize(product.id)}">
          <img class="product-card__image" src="${sanitize(imageUrl)}" alt="${sanitize(product.name)}" loading="lazy">
        </a>
        <div class="product-card__badges">
          ${discount > 0 ? `<span class="badge badge-discount">-${discount}%</span>` : ''}
          ${outOfStock ? '<span class="badge badge-out">Out of Stock</span>' : ''}
        </div>
        <button class="product-card__wishlist ${inWishlist ? 'active' : ''}" data-wishlist-id="${sanitize(product.id)}" aria-label="Add to wishlist">
          ${inWishlist ? '❤️' : '🤍'}
        </button>
      </div>
      <div class="product-card__body">
        <span class="product-card__category">${sanitize(product.categoryName || '')}</span>
        <h3 class="product-card__name">
          <a href="/product.html?id=${sanitize(product.id)}">${sanitize(product.name)}</a>
        </h3>
        <div class="product-card__rating">
          <div class="product-card__stars">${renderStars(product.rating || 0)}</div>
          <span class="product-card__rating-count">(${product.reviewCount || 0})</span>
        </div>
        <div class="product-card__price-row">
          <span class="product-card__price">${formatPrice(product.price)}</span>
          ${product.oldPrice ? `<span class="product-card__old-price">${formatPrice(product.oldPrice)}</span>` : ''}
        </div>
        <button class="product-card__add-btn ${outOfStock ? 'out-of-stock' : ''}" 
                data-add-cart-id="${sanitize(product.id)}" 
                ${outOfStock ? 'disabled' : ''}>
          ${outOfStock ? 'Out of Stock' : '🛒 Add to Cart'}
        </button>
      </div>
    </div>
  `;
}

/**
 * Attach event listeners to product cards in a container
 * @param {HTMLElement} container
 * @param {Array} products - Products array for lookup
 */
export function attachProductCardEvents(container, products) {
  // Add to cart
  container.querySelectorAll('[data-add-cart-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.dataset.addCartId;
      const product = products.find(p => p.id === id);
      if (product && product.stock > 0) {
        addToCart(product);
        // Micro animation
        btn.textContent = '✓ Added!';
        btn.style.background = 'var(--color-success)';
        setTimeout(() => {
          btn.textContent = '🛒 Add to Cart';
          btn.style.background = '';
        }, 1500);
      }
    });
  });

  // Wishlist toggle
  container.querySelectorAll('[data-wishlist-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.wishlistId;
      const product = products.find(p => p.id === id);
      if (product) {
        const added = toggleWishlist(product);
        btn.classList.toggle('active', added);
        btn.textContent = added ? '❤️' : '🤍';
      }
    });
  });
}

/**
 * Load and render a product section (for home page rows)
 * @param {HTMLElement} container
 * @param {Object} options
 */
export async function renderProductSection(container, { title, icon = '', categoryId = '', sortField = 'createdAt', sortDir = 'desc', maxItems = 10, viewAllLink = '', isRow = true } = {}) {
  if (!container) return;

  // Show skeletons
  container.innerHTML = `
    <div class="section__header">
      <h2 class="section__title">${icon ? `<span class="section__title-icon">${icon}</span>` : ''}${sanitize(title)}</h2>
      ${viewAllLink ? `<a href="${sanitize(viewAllLink)}" class="section__view-all">View All →</a>` : ''}
    </div>
    <div class="${isRow ? 'product-row' : 'product-grid'}">
      ${productSkeletons(isRow ? 6 : 8)}
    </div>
  `;

  try {
    const products = await getProducts({ categoryId, sortField, sortDir, maxItems });

    if (products.length === 0) {
      container.querySelector(`.${isRow ? 'product-row' : 'product-grid'}`).innerHTML =
        emptyState({ icon: '📦', title: 'No products yet', text: 'Check back soon!' });
      return;
    }

    // Enrich with category names
    const categories = await getCategories();
    const catMap = {};
    categories.forEach(c => { catMap[c.id] = c.name; });
    products.forEach(p => { p.categoryName = catMap[p.categoryId] || ''; });

    const gridEl = container.querySelector(`.${isRow ? 'product-row' : 'product-grid'}`);
    gridEl.innerHTML = products.map(p => renderProductCard(p)).join('');
    attachProductCardEvents(gridEl, products);

  } catch (err) {
    console.error('Error loading products:', err);
    container.querySelector(`.${isRow ? 'product-row' : 'product-grid'}`).innerHTML =
      emptyState({ icon: '⚠️', title: 'Failed to load products', text: 'Please try again later.' });
  }
}

/**
 * Render the product detail page
 * @param {HTMLElement} container
 */
export async function renderProductDetail(container) {
  if (!container) return;

  const productId = getQueryParam('id');
  if (!productId) {
    container.innerHTML = emptyState({ icon: '🔍', title: 'Product not found', text: 'The product you are looking for does not exist.', actionText: 'Go Home', actionHref: '/' });
    return;
  }

  // Show loading
  container.innerHTML = `
    <div class="container">
      <div class="breadcrumb">
        <a href="/">Home</a>
        <span class="breadcrumb__separator">›</span>
        <span class="breadcrumb__current skeleton" style="width: 100px; height: 16px; display: inline-block;"></span>
      </div>
      <div class="product-detail">
        <div class="gallery">
          <div class="skeleton skeleton-image" style="border-radius: var(--radius-lg);"></div>
        </div>
        <div class="product-detail__info">
          <div class="skeleton skeleton-text" style="width: 30%; height: 14px;"></div>
          <div class="skeleton skeleton-title" style="height: 36px; margin: 12px 0;"></div>
          <div class="skeleton skeleton-text" style="width: 50%; height: 20px;"></div>
          <div class="skeleton skeleton-text" style="width: 40%; height: 36px; margin: 16px 0;"></div>
          <div class="skeleton" style="height: 120px; margin: 16px 0;"></div>
          <div class="skeleton skeleton-btn" style="height: 48px; margin-top: 24px;"></div>
        </div>
      </div>
    </div>
  `;

  try {
    const product = await getProduct(productId);
    if (!product) {
      container.innerHTML = emptyState({ icon: '🔍', title: 'Product not found', actionText: 'Go Home', actionHref: '/' });
      return;
    }

    const discount = calcDiscount(product.oldPrice, product.price);
    const images = product.images?.length ? product.images : [placeholderImage(400, 400, product.name)];
    const inWishlist = isInWishlist(product.id);
    const outOfStock = product.stock <= 0;
    const lowStock = product.stock > 0 && product.stock <= 5;

    // Get category name
    const categories = await getCategories();
    const category = categories.find(c => c.id === product.categoryId);

    container.innerHTML = `
      <div class="container">
        <div class="breadcrumb">
          <a href="/">Home</a>
          <span class="breadcrumb__separator">›</span>
          ${category ? `<a href="/category.html?id=${sanitize(category.id)}">${sanitize(category.name)}</a><span class="breadcrumb__separator">›</span>` : ''}
          <span class="breadcrumb__current">${sanitize(product.name)}</span>
        </div>

        <div class="product-detail">
          <!-- Image Gallery -->
          <div class="gallery">
            <div class="gallery__main" id="gallery-main">
              <img src="${sanitize(images[0])}" alt="${sanitize(product.name)}" id="gallery-main-img">
            </div>
            ${images.length > 1 ? `
              <div class="gallery__thumbs">
                ${images.map((img, i) => `
                  <div class="gallery__thumb ${i === 0 ? 'active' : ''}" data-img="${sanitize(img)}">
                    <img src="${sanitize(img)}" alt="View ${i + 1}" loading="lazy">
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <!-- Product Info -->
          <div class="product-detail__info">
            ${product.brand ? `<span class="product-detail__brand">${sanitize(product.brand)}</span>` : ''}
            <h1 class="product-detail__name">${sanitize(product.name)}</h1>

            <div class="product-detail__rating">
              <div class="product-card__stars">${renderStars(product.rating || 0)}</div>
              <span class="product-detail__rating-text">${product.rating || 0} (${product.reviewCount || 0} reviews)</span>
            </div>

            <div class="product-detail__price-block">
              <span class="product-detail__price">${formatPrice(product.price)}</span>
              ${product.oldPrice ? `<span class="product-detail__old-price">${formatPrice(product.oldPrice)}</span>` : ''}
              ${discount > 0 ? `<span class="product-detail__discount">-${discount}% OFF</span>` : ''}
            </div>

            <div class="product-detail__stock ${outOfStock ? 'out-of-stock' : lowStock ? 'low-stock' : 'in-stock'}">
              <span class="product-detail__stock-dot"></span>
              ${outOfStock ? 'Out of Stock' : lowStock ? `Only ${product.stock} left in stock!` : 'In Stock'}
            </div>

            <div class="product-detail__meta">
              ${product.volume ? `
                <div class="product-detail__meta-item">
                  <span class="product-detail__meta-label">Size / Volume</span>
                  <span class="product-detail__meta-value">${sanitize(product.volume)}</span>
                </div>
              ` : ''}
              ${product.brand ? `
                <div class="product-detail__meta-item">
                  <span class="product-detail__meta-label">Brand</span>
                  <span class="product-detail__meta-value">${sanitize(product.brand)}</span>
                </div>
              ` : ''}
              ${category ? `
                <div class="product-detail__meta-item">
                  <span class="product-detail__meta-label">Category</span>
                  <span class="product-detail__meta-value">${sanitize(category.name)}</span>
                </div>
              ` : ''}
              ${product.subCategory ? `
                <div class="product-detail__meta-item">
                  <span class="product-detail__meta-label">Sub-Category</span>
                  <span class="product-detail__meta-value">${sanitize(product.subCategory)}</span>
                </div>
              ` : ''}
            </div>

            ${product.description ? `
              <div class="product-detail__description">
                <h4>Description</h4>
                <p>${sanitize(product.description)}</p>
              </div>
            ` : ''}

            <div class="product-detail__actions">
              <div class="qty-selector" id="detail-qty">
                <button class="qty-selector__btn" id="detail-qty-minus" ${outOfStock ? 'disabled' : ''}>−</button>
                <input class="qty-selector__value" type="number" value="1" min="1" max="${product.stock || 1}" id="detail-qty-input" readonly>
                <button class="qty-selector__btn" id="detail-qty-plus" ${outOfStock ? 'disabled' : ''}>+</button>
              </div>
              <button class="btn btn-primary btn-lg" id="detail-add-cart" ${outOfStock ? 'disabled' : ''}>
                ${outOfStock ? 'Out of Stock' : '🛒 Add to Cart'}
              </button>
              <button class="product-detail__wishlist-btn ${inWishlist ? 'active' : ''}" id="detail-wishlist">
                ${inWishlist ? '❤️' : '🤍'}
              </button>
            </div>
          </div>
        </div>

        <!-- Related Products -->
        <div class="related-products">
          <div class="section" id="related-products-section"></div>
        </div>
      </div>
    `;

    // ── Gallery Thumbnails ──
    container.querySelectorAll('.gallery__thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        container.querySelector('#gallery-main-img').src = thumb.dataset.img;
        container.querySelectorAll('.gallery__thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });

    // ── Quantity Controls ──
    let qty = 1;
    const qtyInput = container.querySelector('#detail-qty-input');
    container.querySelector('#detail-qty-minus')?.addEventListener('click', () => {
      if (qty > 1) { qty--; qtyInput.value = qty; }
    });
    container.querySelector('#detail-qty-plus')?.addEventListener('click', () => {
      if (qty < (product.stock || 99)) { qty++; qtyInput.value = qty; }
    });

    // ── Add to Cart ──
    container.querySelector('#detail-add-cart')?.addEventListener('click', () => {
      addToCart(product, qty);
    });

    // ── Wishlist ──
    container.querySelector('#detail-wishlist')?.addEventListener('click', () => {
      const btn = container.querySelector('#detail-wishlist');
      const added = toggleWishlist(product);
      btn.classList.toggle('active', added);
      btn.textContent = added ? '❤️' : '🤍';
    });

    // ── Load Related Products ──
    if (product.categoryId) {
      renderProductSection(container.querySelector('#related-products-section'), {
        title: 'Related Products',
        icon: '🔗',
        categoryId: product.categoryId,
        maxItems: 6,
        isRow: true
      });
    }

  } catch (err) {
    console.error('Error loading product:', err);
    container.innerHTML = emptyState({ icon: '⚠️', title: 'Error loading product', text: err.message });
  }
}
