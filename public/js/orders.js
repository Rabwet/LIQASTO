/**
 * LIQASTO — Orders Module
 * Order history, live order tracking, timeline, and customer order lookup
 */

import { getOrder, getUserOrders } from './store.js';
import { getCurrentUser, waitForAuth } from './auth.js';
import { formatPrice, formatDate, getQueryParam, sanitize } from './utils.js';
import { emptyState, toast } from './ui.js';

export async function initOrders() {
  await waitForAuth();
  const orderId = getQueryParam('orderId');

  if (orderId) {
    await renderOrderDetail(orderId);
  } else {
    await renderOrderList();
  }
}

async function renderOrderDetail(orderId) {
  const container = document.querySelector('#order-detail-view');
  const listView = document.querySelector('#orders-list-view');

  if (listView) listView.style.display = 'none';
  if (!container) return;
  container.style.display = 'block';

  try {
    const order = await getOrder(orderId);
    if (!order) {
      container.innerHTML = emptyState({
        icon: '🔍',
        title: 'Order Not Found',
        text: `We couldn't locate order #${sanitize(orderId)}.`,
        actionText: 'Back to Shop',
        actionUrl: '/'
      });
      return;
    }

    const statuses = ['Pending payment', 'Confirmed', 'Processing', 'Out for delivery', 'Delivered'];
    const currentIdx = Math.max(0, statuses.indexOf(order.status || 'Confirmed'));

    container.innerHTML = `
      <div class="card" style="margin-bottom: var(--space-6); padding: var(--space-6);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: var(--space-6); border-bottom: 1px solid var(--color-gray-100); padding-bottom: var(--space-4);">
          <div>
            <span class="badge badge-primary" style="margin-bottom: 6px;">Order #${sanitize(order.orderNumber || order.id)}</span>
            <h1 style="font-size: var(--text-2xl); margin-top: 4px;">Order Status: <span style="color: var(--color-emerald-600);">${sanitize(order.status || 'Confirmed')}</span></h1>
            <p style="color: var(--color-gray-500); font-size: 13px; margin: 0;">Placed on ${formatDate(order.createdAt, true)}</p>
          </div>
          <div>
            <a href="/" class="btn btn-secondary btn-sm">← Continue Shopping</a>
          </div>
        </div>

        <!-- Order Timeline -->
        <div class="order-timeline" style="display: flex; justify-content: space-between; position: relative; margin: var(--space-8) 0 var(--space-8); padding: 0 var(--space-4);">
          ${statuses.map((step, idx) => {
            const isCompleted = idx <= currentIdx;
            const isCurrent = idx === currentIdx;
            return `
              <div style="display: flex; flex-direction: column; align-items: center; position: relative; z-index: 2; flex: 1; text-align: center;">
                <div style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; margin-bottom: 8px; background: ${isCompleted ? 'var(--color-emerald-600)' : 'var(--color-gray-200)'}; color: ${isCompleted ? '#fff' : 'var(--color-gray-600)'}; box-shadow: ${isCurrent ? '0 0 0 4px rgba(16, 185, 129, 0.2)' : 'none'};">
                  ${isCompleted ? '✓' : idx + 1}
                </div>
                <div style="font-size: 12px; font-weight: ${isCurrent ? '700' : '500'}; color: ${isCompleted ? 'var(--color-gray-900)' : 'var(--color-gray-400)'};">
                  ${step}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Details Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-top: var(--space-6); background: var(--color-gray-50); padding: var(--space-5); border-radius: var(--radius-lg);">
          <div>
            <h4 style="font-size: var(--text-sm); text-transform: uppercase; color: var(--color-gray-500); letter-spacing: 0.05em; margin-bottom: 8px;">Delivery Details</h4>
            <div style="font-weight: 600; font-size: 14px; color: var(--color-gray-800);">${sanitize(order.customer?.name || 'Customer')}</div>
            <div style="font-size: 13px; color: var(--color-gray-600); margin-top: 2px;">${sanitize(order.customer?.phone || '')}</div>
            <div style="font-size: 13px; color: var(--color-gray-600); margin-top: 2px;">${sanitize(order.delivery?.street || '')}, ${sanitize(order.delivery?.area || '')}, ${sanitize(order.delivery?.county || '')}</div>
            <div style="font-size: 12px; color: var(--color-emerald-700); font-weight: 600; margin-top: 6px;">Est. delivery: ${sanitize(order.delivery?.estimatedTime || '2-4 hours')}</div>
          </div>
          <div>
            <h4 style="font-size: var(--text-sm); text-transform: uppercase; color: var(--color-gray-500); letter-spacing: 0.05em; margin-bottom: 8px;">Payment Info</h4>
            <div style="font-size: 13px; color: var(--color-gray-700);"><strong style="text-transform: uppercase;">Method:</strong> ${sanitize(order.paymentMethod || 'M-Pesa')}</div>
            <div style="font-size: 13px; color: var(--color-gray-700); margin-top: 4px;"><strong>Status:</strong> <span class="badge badge-success">${sanitize(order.paymentStatus || 'Paid')}</span></div>
            ${order.mpesaReceipt ? `<div style="font-size: 13px; color: var(--color-emerald-700); margin-top: 4px; font-weight: 600;">M-Pesa Code: ${sanitize(order.mpesaReceipt)}</div>` : ''}
          </div>
        </div>

        <!-- Ordered Items -->
        <h3 style="margin-top: var(--space-6); margin-bottom: var(--space-4); font-size: var(--text-lg);">Items Ordered</h3>
        <div style="border: 1px solid var(--color-gray-200); border-radius: var(--radius-md); overflow: hidden;">
          ${(order.items || []).map(it => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--color-gray-100); background: #fff;">
              <div style="display: flex; align-items: center; gap: 14px;">
                <img src="${sanitize(it.image || 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=100')}" style="width: 48px; height: 48px; object-fit: contain; border-radius: 4px; background: #fff; border: 1px solid var(--color-gray-200);">
                <div>
                  <div style="font-weight: 600; font-size: 14px;">${sanitize(it.name)}</div>
                  <div style="font-size: 12px; color: var(--color-gray-500);">Qty: ${it.quantity} × ${formatPrice(it.price)}</div>
                </div>
              </div>
              <div style="font-weight: 700; color: var(--color-gray-900);">${formatPrice(it.price * it.quantity)}</div>
            </div>
          `).join('')}
          <div style="padding: 16px; background: var(--color-gray-50); border-top: 2px solid var(--color-gray-200);">
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
              <span>Subtotal</span>
              <span>${formatPrice(order.subtotal || 0)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
              <span>Delivery Fee</span>
              <span>${formatPrice(order.deliveryFee || 0)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: var(--color-emerald-700); border-top: 1px solid var(--color-gray-200); padding-top: 8px;">
              <span>Total Paid</span>
              <span>${formatPrice(order.total || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Error fetching order:', err);
    container.innerHTML = emptyState({
      icon: '⚠️',
      title: 'Failed to load order',
      text: 'Please check your connection and try again.'
    });
  }
}

async function renderOrderList() {
  const container = document.querySelector('#orders-list-view');
  const user = getCurrentUser();

  if (!container) return;

  if (!user) {
    container.innerHTML = `
      <div class="card" style="padding: var(--space-8); text-align: center; max-width: 500px; margin: 0 auto;">
        <span style="font-size: 48px;">📦</span>
        <h2 style="margin: 12px 0 6px;">Track Your Orders</h2>
        <p style="color: var(--color-gray-500); margin-bottom: 20px;">Log in to view your complete order history, or search by Order ID below.</p>
        <div style="display: flex; gap: 10px; margin-bottom: 24px;">
          <input type="text" id="track-order-input" class="form-input" placeholder="e.g. LIQ-894218" style="flex: 1;">
          <button id="track-order-btn" class="btn btn-primary">Track</button>
        </div>
        <div>
          <a href="/login.html" class="btn btn-secondary">Sign In to Liqasto</a>
        </div>
      </div>
    `;

    document.querySelector('#track-order-btn')?.addEventListener('click', () => {
      const val = document.querySelector('#track-order-input')?.value?.trim();
      if (val) window.location.href = `/orders.html?orderId=${encodeURIComponent(val)}`;
    });
    return;
  }

  try {
    const orders = await getUserOrders(user.uid);
    if (orders.length === 0) {
      container.innerHTML = emptyState({
        icon: '🛍️',
        title: 'No Orders Yet',
        text: 'You have not placed any orders yet. Discover our drinks & accessories collection!',
        actionText: 'Start Shopping',
        actionUrl: '/'
      });
      return;
    }

    container.innerHTML = `
      <h1 style="font-size: var(--text-2xl); margin-bottom: var(--space-6);">My Orders</h1>
      <div style="display: flex; flex-direction: column; gap: var(--space-4);">
        ${orders.map(o => `
          <div class="card" style="padding: var(--space-5); display: flex; justify-content: space-between; align-items: center; flex-wrap: gap: 16px;">
            <div>
              <div style="font-weight: 700; font-size: 15px; color: var(--color-gray-900);">Order #${sanitize(o.orderNumber || o.id)}</div>
              <div style="font-size: 12px; color: var(--color-gray-500); margin-top: 2px;">Placed ${formatDate(o.createdAt, true)}</div>
              <div style="font-size: 13px; color: var(--color-gray-700); margin-top: 6px;">${(o.items || []).length} items • <strong style="color: var(--color-emerald-700);">${formatPrice(o.total || 0)}</strong></div>
            </div>
            <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
              <span class="badge badge-primary">${sanitize(o.status || 'Confirmed')}</span>
              <a href="/orders.html?orderId=${sanitize(o.id)}" class="btn btn-secondary btn-sm">View Details & Track →</a>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    console.error('Error fetching user orders:', err);
    container.innerHTML = emptyState({
      icon: '⚠️',
      title: 'Failed to load order history',
      text: 'Please check your connection and try again.'
    });
  }
}
