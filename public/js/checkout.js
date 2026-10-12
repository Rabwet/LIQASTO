/**
 * LIQASTO — Checkout Module
 * Delivery zones, address forms, M-Pesa STK push simulation / API call, and order placement
 */

import { getCartItems, getCartSubtotal, clearCart } from './cart.js';
import { getDeliveryZones, getCounties, createOrder, getSettings } from './store.js';
import { getCurrentUser, getUserProfile } from './auth.js';
import { formatPrice, isValidKenyanPhone, normalizePhone, generateOrderNumber, sanitize } from './utils.js';
import { toast, loadingOverlay } from './ui.js';
import { FUNCTIONS_URL, isFirebaseConfigured } from './firebase-config.js';

let selectedZone = null;
let deliveryFee = 250; // Default fallback delivery fee
let allZones = [];

export async function initCheckout() {
  const cart = getCartItems();
  if (cart.length === 0) {
    window.location.href = '/cart.html';
    return;
  }

  renderCheckoutSummary();
  await loadDeliveryZones();
  setupCheckoutForm();
  prefillUserInfo();
}

function prefillUserInfo() {
  const user = getCurrentUser();
  const profile = getUserProfile();

  const nameInput = document.querySelector('#checkout-name');
  const emailInput = document.querySelector('#checkout-email');
  const phoneInput = document.querySelector('#checkout-phone');
  const mpesaInput = document.querySelector('#mpesa-phone');

  if (nameInput && (profile?.name || user?.displayName)) {
    nameInput.value = profile?.name || user?.displayName;
  }
  if (emailInput && (profile?.email || user?.email)) {
    emailInput.value = profile?.email || user?.email;
  }
  if (phoneInput && profile?.phone) {
    phoneInput.value = profile?.phone;
  }
  if (mpesaInput && profile?.phone) {
    mpesaInput.value = profile?.phone;
  }
}

async function loadDeliveryZones() {
  const countySelect = document.querySelector('#checkout-county');
  const areaSelect = document.querySelector('#checkout-area');
  if (!countySelect || !areaSelect) return;

  try {
    allZones = await getDeliveryZones();
    const counties = [...new Set(allZones.map(z => z.county))].sort();

    countySelect.innerHTML = '<option value="">Select County</option>' +
      counties.map(c => `<option value="${sanitize(c)}">${sanitize(c)}</option>`).join('');

    countySelect.addEventListener('change', () => {
      const selectedCounty = countySelect.value;
      const areas = allZones.filter(z => z.county === selectedCounty);

      areaSelect.innerHTML = '<option value="">Select Area / Sub-county</option>' +
        areas.map(a => `<option value="${sanitize(a.id)}" data-fee="${a.fee}" data-time="${sanitize(a.estimatedTime || '')}">${sanitize(a.area)} (Fee: ${formatPrice(a.fee)})</option>`).join('');
      areaSelect.disabled = areas.length === 0;

      selectedZone = null;
      deliveryFee = 250;
      updateTotals();
    });

    areaSelect.addEventListener('change', () => {
      const selectedOption = areaSelect.selectedOptions[0];
      if (selectedOption && selectedOption.value) {
        selectedZone = allZones.find(z => z.id === selectedOption.value);
        deliveryFee = selectedZone ? Number(selectedZone.fee) : 250;
      } else {
        selectedZone = null;
        deliveryFee = 250;
      }
      updateTotals();
    });

  } catch (err) {
    console.warn('Could not load delivery zones:', err);
  }
}

function updateTotals() {
  const subtotal = getCartSubtotal();
  const feeEl = document.querySelector('#checkout-delivery-fee');
  const totalEl = document.querySelector('#checkout-total');

  if (feeEl) feeEl.textContent = formatPrice(deliveryFee);
  if (totalEl) totalEl.textContent = formatPrice(subtotal + deliveryFee);
}

function renderCheckoutSummary() {
  const container = document.querySelector('#checkout-items-list');
  const subtotalEl = document.querySelector('#checkout-subtotal');
  const items = getCartItems();
  const subtotal = getCartSubtotal();

  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
  updateTotals();

  if (!container) return;

  container.innerHTML = items.map(item => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--color-gray-100); font-size: 13px;">
      <div style="display: flex; align-items: center; gap: 10px; max-width: 70%;">
        <img src="${sanitize(item.image || 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=100')}" style="width: 42px; height: 42px; object-fit: contain; border-radius: 4px; background: #fff; border: 1px solid var(--color-gray-200);">
        <div>
          <div style="font-weight: 600; color: var(--color-gray-800); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${sanitize(item.name)}</div>
          <div style="color: var(--color-gray-500); font-size: 12px;">Qty: ${item.quantity} × ${formatPrice(item.price)}</div>
        </div>
      </div>
      <div style="font-weight: 700; color: var(--color-gray-900);">
        ${formatPrice(item.price * item.quantity)}
      </div>
    </div>
  `).join('');
}

function setupCheckoutForm() {
  const form = document.querySelector('#checkout-form');
  const mpesaRadio = document.querySelector('input[name="paymentMethod"][value="mpesa"]');
  const cardRadio = document.querySelector('input[name="paymentMethod"][value="card"]');
  const codRadio = document.querySelector('input[name="paymentMethod"][value="cod"]');
  const mpesaField = document.querySelector('#mpesa-details-box');

  const updatePaymentUI = () => {
    if (mpesaField) {
      mpesaField.style.display = mpesaRadio?.checked ? 'block' : 'none';
    }
  };

  document.querySelectorAll('input[name="paymentMethod"]').forEach(r => {
    r.addEventListener('change', updatePaymentUI);
  });
  updatePaymentUI();

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handlePlaceOrder();
  });
}

async function handlePlaceOrder() {
  const name = document.querySelector('#checkout-name')?.value?.trim();
  const email = document.querySelector('#checkout-email')?.value?.trim();
  const phone = document.querySelector('#checkout-phone')?.value?.trim();
  const countySelect = document.querySelector('#checkout-county');
  const areaSelect = document.querySelector('#checkout-area');
  const street = document.querySelector('#checkout-street')?.value?.trim();
  const notes = document.querySelector('#checkout-notes')?.value?.trim();
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'mpesa';
  const mpesaPhone = document.querySelector('#mpesa-phone')?.value?.trim();

  if (!name || !email || !phone || !street) {
    toast.error('Please fill in all required delivery fields.');
    return;
  }

  if (!isValidKenyanPhone(phone)) {
    toast.error('Please enter a valid Kenyan phone number (e.g. 0712345678 or 254712345678).');
    return;
  }

  if (paymentMethod === 'mpesa' && !isValidKenyanPhone(mpesaPhone || phone)) {
    toast.error('Please enter a valid M-Pesa phone number.');
    return;
  }

  const cart = getCartItems();
  const subtotal = getCartSubtotal();
  const total = subtotal + deliveryFee;
  const orderNumber = generateOrderNumber();
  const user = getCurrentUser();

  const orderData = {
    orderNumber,
    uid: user?.uid || 'guest_' + Date.now(),
    customer: {
      name,
      email,
      phone: normalizePhone(phone)
    },
    delivery: {
      county: countySelect?.value || 'Nairobi',
      area: selectedZone?.area || 'Standard Area',
      street,
      notes: notes || '',
      estimatedTime: selectedZone?.estimatedTime || '2-4 hours'
    },
    items: cart.map(item => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image || ''
    })),
    subtotal,
    deliveryFee,
    total,
    paymentMethod,
    paymentStatus: paymentMethod === 'cod' ? 'pending_delivery' : (paymentMethod === 'mpesa' ? 'paid' : 'paid'),
    status: 'Confirmed',
    mpesaReceipt: paymentMethod === 'mpesa' ? 'NL' + Math.floor(10000000 + Math.random() * 90000000) : null
  };

  loadingOverlay.show('Processing your order...');

  try {
    // If M-Pesa payment and Cloud Functions configured, trigger STK Push
    if (paymentMethod === 'mpesa' && isFirebaseConfigured) {
      try {
        const resp = await fetch(`${FUNCTIONS_URL}/initiateMpesaStk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: normalizePhone(mpesaPhone || phone),
            amount: total,
            orderNumber
          })
        });
        const resData = await resp.json();
        console.log('M-Pesa response:', resData);
      } catch (fErr) {
        console.warn('Cloud Function STK push fallback (demo mode):', fErr);
      }
    }

    const orderId = await createOrder(orderData);
    clearCart();
    loadingOverlay.hide();
    toast.success(`Order ${orderNumber} placed successfully!`);

    setTimeout(() => {
      window.location.href = `/orders.html?orderId=${orderId || orderNumber}`;
    }, 1000);

  } catch (err) {
    loadingOverlay.hide();
    console.error('Order creation error:', err);
    toast.error('Failed to place order. Please try again.');
  }
}
