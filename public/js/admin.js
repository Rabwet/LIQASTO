/**
 * LIQASTO — Admin Dashboard Module
 * Complete management of products, categories, delivery zones, orders, and stats
 */

import {
  getAllProducts, createProduct, updateProduct, deleteProduct,
  getAllCategories, createCategory, updateCategory, deleteCategory,
  getDeliveryZones, createDeliveryZone, updateDeliveryZone, deleteDeliveryZone,
  getAllOrders, updateOrderStatus, uploadProductImage, getAdminStats
} from './store.js';
import { requireAdmin, waitForAuth, getCurrentUser, logout } from './auth.js';
import { formatPrice, formatDate, sanitize } from './utils.js';
import { toast, confirmModal, loadingOverlay } from './ui.js';

let cachedProducts = [];
let cachedCategories = [];
let cachedZones = [];
let cachedOrders = [];

export async function initAdmin() {
  await waitForAuth();
  const isAdmin = await requireAdmin();
  if (!isAdmin) return;

  const user = getCurrentUser();
  const displayEl = document.querySelector('#admin-user-display');
  if (displayEl && user?.email) {
    displayEl.textContent = user.email;
  }

  const logoutBtn = document.querySelector('#admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  setupNavigation();
  await loadDashboardStats();
  await loadProducts();
  await loadCategories();
  await loadDeliveryZones();
  await loadOrders();
}

function setupNavigation() {
  const links = document.querySelectorAll('.admin-sidebar__link');
  const sections = document.querySelectorAll('.admin-panel-section');

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-target');
      if (!targetId) return;

      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      sections.forEach(s => {
        s.style.display = s.id === targetId ? 'block' : 'none';
      });
    });
  });
}

// ── Stats ──
async function loadDashboardStats() {
  try {
    const stats = await getAdminStats();
    const elRevenue = document.querySelector('#stat-revenue');
    const elOrders = document.querySelector('#stat-orders');
    const elProducts = document.querySelector('#stat-products');
    const elCustomers = document.querySelector('#stat-customers');

    if (elRevenue) elRevenue.textContent = formatPrice(stats.totalRevenue || 0);
    if (elOrders) elOrders.textContent = stats.totalOrders || 0;
    if (elProducts) elProducts.textContent = stats.totalProducts || 0;
    if (elCustomers) elCustomers.textContent = stats.totalUsers || 0;
  } catch (err) {
    console.warn('Stats error:', err);
  }
}

// ── Products Management ──
async function loadProducts() {
  const tbody = document.querySelector('#admin-products-table tbody');
  if (!tbody) return;

  try {
    cachedProducts = await getAllProducts();
    renderProductsTable();
    setupProductModals();
  } catch (err) {
    console.error('Failed to load products:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-error); padding: 20px;">Failed to load products.</td></tr>`;
  }
}

function renderProductsTable() {
  const tbody = document.querySelector('#admin-products-table tbody');
  if (!tbody) return;

  if (cachedProducts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--color-gray-500);">No products found. Add your first product above.</td></tr>`;
    return;
  }

  tbody.innerHTML = cachedProducts.map(p => `
    <tr>
      <td>
        <img src="${sanitize(p.images?.[0] || 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=100')}" style="width: 44px; height: 44px; object-fit: contain; border-radius: 4px; background: #fff; border: 1px solid var(--color-gray-200);">
      </td>
      <td>
        <strong style="color: var(--color-gray-900); font-size: 14px;">${sanitize(p.name)}</strong>
        <div style="font-size: 12px; color: var(--color-gray-500);">${sanitize(p.brand || 'Unbranded')} • ${sanitize(p.subCategory || '')}</div>
      </td>
      <td><strong>${formatPrice(p.price)}</strong></td>
      <td>
        <span class="badge ${p.stock > 5 ? 'badge-success' : (p.stock > 0 ? 'badge-warning' : 'badge-danger')}">
          ${p.stock > 0 ? `${p.stock} in stock` : 'Out of Stock'}
        </span>
      </td>
      <td>
        <span class="badge ${p.active !== false ? 'badge-primary' : 'badge-ghost'}">
          ${p.active !== false ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td style="white-space: nowrap;">
        <button class="btn btn-ghost btn-sm edit-product-btn" data-id="${sanitize(p.id)}">✏️ Edit</button>
        <button class="btn btn-ghost btn-sm delete-product-btn" data-id="${sanitize(p.id)}" style="color: var(--color-error);">🗑️</button>
      </td>
    </tr>
  `).join('');

  // Event handlers
  tbody.querySelectorAll('.edit-product-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditProductModal(btn.dataset.id));
  });

  tbody.querySelectorAll('.delete-product-btn').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteProduct(btn.dataset.id));
  });
}

function setupProductModals() {
  const addBtn = document.querySelector('#btn-add-product');
  const modal = document.querySelector('#product-modal');
  const closeBtn = document.querySelector('#close-product-modal');
  const form = document.querySelector('#product-form');

  if (addBtn && modal) {
    addBtn.addEventListener('click', () => {
      form.reset();
      document.querySelector('#product-modal-title').textContent = 'Add New Product';
      document.querySelector('#product-id-input').value = '';
      populateCategorySelects();
      modal.classList.add('open');
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleSaveProduct();
    });
  }
}

function populateCategorySelects() {
  const select = document.querySelector('#product-category-input');
  if (!select) return;

  select.innerHTML = '<option value="">Select Category</option>' +
    cachedCategories.map(c => `<option value="${sanitize(c.id)}">${sanitize(c.name)}</option>`).join('');
}

function openEditProductModal(id) {
  const p = cachedProducts.find(item => item.id === id);
  if (!p) return;

  populateCategorySelects();
  document.querySelector('#product-modal-title').textContent = 'Edit Product';
  document.querySelector('#product-id-input').value = p.id;
  document.querySelector('#product-name-input').value = p.name || '';
  document.querySelector('#product-category-input').value = p.categoryId || '';
  document.querySelector('#product-subcategory-input').value = p.subCategory || '';
  document.querySelector('#product-brand-input').value = p.brand || '';
  document.querySelector('#product-price-input').value = p.price || '';
  document.querySelector('#product-oldprice-input').value = p.oldPrice || '';
  document.querySelector('#product-stock-input').value = p.stock || 0;
  document.querySelector('#product-image-input').value = p.images?.[0] || '';
  document.querySelector('#product-desc-input').value = p.description || '';
  document.querySelector('#product-active-input').checked = p.active !== false;

  document.querySelector('#product-modal')?.classList.add('open');
}

async function handleSaveProduct() {
  const id = document.querySelector('#product-id-input')?.value;
  const name = document.querySelector('#product-name-input')?.value?.trim();
  const categoryId = document.querySelector('#product-category-input')?.value;
  const subCategory = document.querySelector('#product-subcategory-input')?.value?.trim();
  const brand = document.querySelector('#product-brand-input')?.value?.trim();
  const price = Number(document.querySelector('#product-price-input')?.value);
  const oldPriceVal = document.querySelector('#product-oldprice-input')?.value;
  const oldPrice = oldPriceVal ? Number(oldPriceVal) : null;
  const stock = Number(document.querySelector('#product-stock-input')?.value || 0);
  const image = document.querySelector('#product-image-input')?.value?.trim();
  const description = document.querySelector('#product-desc-input')?.value?.trim();
  const active = document.querySelector('#product-active-input')?.checked;

  if (!name || isNaN(price)) {
    toast.error('Product name and valid price are required.');
    return;
  }

  const payload = {
    name,
    categoryId: categoryId || 'alcohol',
    subCategory: subCategory || '',
    brand: brand || '',
    price,
    oldPrice,
    stock,
    images: image ? [image] : ['https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500'],
    description: description || '',
    active
  };

  loadingOverlay.show('Saving product...');
  try {
    if (id) {
      await updateProduct(id, payload);
      toast.success('Product updated successfully!');
    } else {
      await createProduct(payload);
      toast.success('Product created successfully!');
    }
    document.querySelector('#product-modal')?.classList.remove('open');
    await loadProducts();
    await loadDashboardStats();
  } catch (err) {
    console.error('Error saving product:', err);
    toast.error('Failed to save product.');
  } finally {
    loadingOverlay.hide();
  }
}

async function confirmDeleteProduct(id) {
  const confirmed = await confirmModal({
    title: 'Delete Product',
    message: 'Are you sure you want to delete this product? This action cannot be undone.',
    confirmText: 'Delete',
    danger: true
  });
  if (!confirmed) return;

  loadingOverlay.show('Deleting product...');
  try {
    await deleteProduct(id);
    toast.success('Product deleted.');
    await loadProducts();
    await loadDashboardStats();
  } catch (err) {
    console.error('Error deleting product:', err);
    toast.error('Failed to delete product.');
  } finally {
    loadingOverlay.hide();
  }
}

// ── Categories Management ──
async function loadCategories() {
  const tbody = document.querySelector('#admin-categories-table tbody');
  if (!tbody) return;

  try {
    cachedCategories = await getAllCategories();
    renderCategoriesTable();
    setupCategoryModals();
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

function renderCategoriesTable() {
  const tbody = document.querySelector('#admin-categories-table tbody');
  if (!tbody) return;

  tbody.innerHTML = cachedCategories.map(c => `
    <tr>
      <td style="font-size: 20px;">${sanitize(c.icon || '🏷️')}</td>
      <td><strong>${sanitize(c.name)}</strong></td>
      <td>${(c.subCategories || []).join(', ') || 'None'}</td>
      <td>${c.order || 0}</td>
      <td>
        <span class="badge ${c.active !== false ? 'badge-success' : 'badge-ghost'}">${c.active !== false ? 'Active' : 'Inactive'}</span>
      </td>
      <td>
        <button class="btn btn-ghost btn-sm delete-cat-btn" data-id="${sanitize(c.id)}" style="color: var(--color-error);">🗑️</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.delete-cat-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await confirmModal({ title: 'Delete Category', message: 'Delete this category?', danger: true });
      if (ok) {
        await deleteCategory(btn.dataset.id);
        toast.success('Category removed.');
        await loadCategories();
      }
    });
  });
}

function setupCategoryModals() {
  const addBtn = document.querySelector('#btn-add-category');
  const modal = document.querySelector('#category-modal');
  const form = document.querySelector('#category-form');
  const closeBtn = document.querySelector('#close-category-modal');

  addBtn?.addEventListener('click', () => {
    form?.reset();
    modal?.classList.add('open');
  });

  closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.querySelector('#category-name-input')?.value?.trim();
    const icon = document.querySelector('#category-icon-input')?.value?.trim() || '🍾';
    const subs = document.querySelector('#category-subs-input')?.value?.split(',').map(s => s.trim()).filter(Boolean) || [];
    const order = Number(document.querySelector('#category-order-input')?.value || 1);

    if (!name) return;
    await createCategory({ name, icon, subCategories: subs, order, active: true });
    toast.success('Category created!');
    modal?.classList.remove('open');
    await loadCategories();
  });
}

// ── Delivery Zones Management ──
async function loadDeliveryZones() {
  const tbody = document.querySelector('#admin-zones-table tbody');
  if (!tbody) return;

  try {
    cachedZones = await getDeliveryZones();
    tbody.innerHTML = cachedZones.map(z => `
      <tr>
        <td><strong>${sanitize(z.county)}</strong></td>
        <td>${sanitize(z.area)}</td>
        <td><strong>${formatPrice(z.fee)}</strong></td>
        <td>${sanitize(z.estimatedTime || 'Same Day')}</td>
        <td>
          <button class="btn btn-ghost btn-sm delete-zone-btn" data-id="${sanitize(z.id)}" style="color: var(--color-error);">🗑️</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.delete-zone-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await confirmModal({ title: 'Delete Zone', message: 'Delete this zone?', danger: true });
        if (ok) {
          await deleteDeliveryZone(btn.dataset.id);
          toast.success('Zone deleted.');
          await loadDeliveryZones();
        }
      });
    });

    const addBtn = document.querySelector('#btn-add-zone');
    const modal = document.querySelector('#zone-modal');
    const form = document.querySelector('#zone-form');
    const closeBtn = document.querySelector('#close-zone-modal');

    addBtn?.addEventListener('click', () => {
      form?.reset();
      modal?.classList.add('open');
    });
    closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const county = document.querySelector('#zone-county-input')?.value?.trim();
      const area = document.querySelector('#zone-area-input')?.value?.trim();
      const fee = Number(document.querySelector('#zone-fee-input')?.value || 250);
      const estimatedTime = document.querySelector('#zone-time-input')?.value?.trim() || '2-4 hours';

      if (!county || !area) return;
      await createDeliveryZone({ county, area, fee, estimatedTime });
      toast.success('Zone added.');
      modal?.classList.remove('open');
      await loadDeliveryZones();
    });

  } catch (err) {
    console.error('Failed to load zones:', err);
  }
}

// ── Orders Management ──
async function loadOrders() {
  const tbody = document.querySelector('#admin-orders-table tbody');
  if (!tbody) return;

  try {
    cachedOrders = await getAllOrders();
    renderOrdersTable();

    document.querySelector('#admin-orders-filter')?.addEventListener('change', (e) => {
      const filter = e.target.value;
      renderOrdersTable(filter);
    });
  } catch (err) {
    console.error('Failed to load orders:', err);
  }
}

function renderOrdersTable(filterStatus = '') {
  const tbody = document.querySelector('#admin-orders-table tbody');
  if (!tbody) return;

  const filtered = filterStatus
    ? cachedOrders.filter(o => o.status === filterStatus)
    : cachedOrders;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--color-gray-500);">No orders found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(o => `
    <tr>
      <td><strong>#${sanitize(o.orderNumber || o.id)}</strong></td>
      <td>
        <div>${sanitize(o.customer?.name || 'Customer')}</div>
        <div style="font-size: 11px; color: var(--color-gray-500);">${sanitize(o.customer?.phone || '')}</div>
      </td>
      <td>${sanitize(o.delivery?.county || '')} (${sanitize(o.delivery?.area || '')})</td>
      <td><strong>${formatPrice(o.total || 0)}</strong></td>
      <td>
        <span class="badge ${o.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}">
          ${sanitize(o.paymentMethod || 'M-Pesa')} (${sanitize(o.paymentStatus || 'paid')})
        </span>
      </td>
      <td>
        <select class="form-select order-status-select" data-id="${sanitize(o.id)}" style="font-size: 12px; padding: 4px 8px;">
          ${['Confirmed', 'Processing', 'Out for delivery', 'Delivered', 'Cancelled'].map(st => `
            <option value="${st}" ${o.status === st ? 'selected' : ''}>${st}</option>
          `).join('')}
        </select>
      </td>
      <td>
        <span style="font-size: 12px; color: var(--color-gray-500);">${formatDate(o.createdAt, true)}</span>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.order-status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const id = sel.dataset.id;
      const newStatus = sel.value;
      try {
        await updateOrderStatus(id, newStatus);
        toast.success(`Order #${id} status updated to ${newStatus}`);
      } catch (err) {
        console.error('Error updating status:', err);
        toast.error('Failed to update status.');
      }
    });
  });
}
