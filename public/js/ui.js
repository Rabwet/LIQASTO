/**
 * LIQASTO — UI Module
 * Toast notifications, loading skeletons, modals, and empty states
 */

// ── Toast Notification System ──
class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.id = 'toast-container';
    document.body.appendChild(this.container);
  }

  /**
   * Show a toast notification
   * @param {Object} options
   * @param {string} options.type - 'success' | 'error' | 'warning' | 'info'
   * @param {string} options.title
   * @param {string} options.message
   * @param {number} options.duration - ms (default 4000)
   */
  show({ type = 'info', title = '', message = '', duration = 4000 }) {
    this.init();

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast__icon">${icons[type]}</div>
      <div class="toast__content">
        ${title ? `<div class="toast__title">${this._escape(title)}</div>` : ''}
        <div class="toast__message">${this._escape(message)}</div>
      </div>
      <button class="toast__close" aria-label="Close">✕</button>
    `;

    // Close handler
    toast.querySelector('.toast__close').addEventListener('click', () => {
      this._remove(toast);
    });

    this.container.appendChild(toast);

    // Auto-remove
    if (duration > 0) {
      setTimeout(() => this._remove(toast), duration);
    }

    return toast;
  }

  success(message, title = 'Success') {
    return this.show({ type: 'success', title, message });
  }

  error(message, title = 'Error') {
    return this.show({ type: 'error', title, message, duration: 6000 });
  }

  warning(message, title = 'Warning') {
    return this.show({ type: 'warning', title, message });
  }

  info(message, title = 'Info') {
    return this.show({ type: 'info', title, message });
  }

  _remove(toast) {
    if (!toast.parentNode) return;
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }

  _escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

export const toast = new ToastManager();

// ── Loading Skeleton Generator ──
/**
 * Generate product card skeletons
 * @param {number} count
 * @returns {string} HTML
 */
export function productSkeletons(count = 8) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="skeleton-card">
        <div class="skeleton skeleton-image"></div>
        <div class="skeleton-body">
          <div class="skeleton skeleton-text" style="width: 40%"></div>
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text" style="width: 50%"></div>
          <div style="margin-top: 12px">
            <div class="skeleton skeleton-btn"></div>
          </div>
        </div>
      </div>
    `;
  }
  return html;
}

/**
 * Generate table row skeletons
 * @param {number} rows
 * @param {number} cols
 * @returns {string} HTML
 */
export function tableSkeletons(rows = 5, cols = 5) {
  let html = '';
  for (let i = 0; i < rows; i++) {
    html += '<tr>';
    for (let j = 0; j < cols; j++) {
      html += `<td><div class="skeleton skeleton-text" style="width: ${60 + Math.random() * 30}%"></div></td>`;
    }
    html += '</tr>';
  }
  return html;
}

/**
 * Generate a generic list skeleton
 * @param {number} count
 * @returns {string} HTML
 */
export function listSkeletons(count = 5) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div style="display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
        <div class="skeleton" style="width: 48px; height: 48px; border-radius: 8px; flex-shrink: 0;"></div>
        <div style="flex: 1;">
          <div class="skeleton skeleton-text" style="width: ${50 + Math.random() * 40}%"></div>
          <div class="skeleton skeleton-text" style="width: ${30 + Math.random() * 30}%"></div>
        </div>
      </div>
    `;
  }
  return html;
}

// ── Empty State Generator ──
/**
 * Generate an empty state UI
 * @param {Object} options
 * @returns {string} HTML
 */
export function emptyState({ icon = '📦', title = 'Nothing here', text = '', actionText = '', actionHref = '' } = {}) {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${icon}</div>
      <h3 class="empty-state__title">${escapeHtml(title)}</h3>
      ${text ? `<p class="empty-state__text">${escapeHtml(text)}</p>` : ''}
      ${actionText ? `<a href="${escapeHtml(actionHref)}" class="btn btn-primary">${escapeHtml(actionText)}</a>` : ''}
    </div>
  `;
}

// ── Modal Manager ──
/**
 * Show a modal
 * @param {Object} options
 * @returns {HTMLElement}
 */
export function showModal({ title = '', content = '', footer = '', className = '', onClose = null, maxWidth = '480px' } = {}) {
  const overlay = document.createElement('div');
  overlay.className = `modal-overlay ${className}`;
  overlay.innerHTML = `
    <div class="modal" style="max-width: ${maxWidth}">
      <div class="modal__header">
        <h3 class="modal__title">${escapeHtml(title)}</h3>
        <button class="modal__close" aria-label="Close modal">✕</button>
      </div>
      <div class="modal__body">${content}</div>
      ${footer ? `<div class="modal__footer">${footer}</div>` : ''}
    </div>
  `;

  // Close handlers
  const closeModal = () => {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 300);
    if (onClose) onClose();
  };

  overlay.querySelector('.modal__close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.body.appendChild(overlay);
  // Force reflow then activate
  requestAnimationFrame(() => overlay.classList.add('active'));

  return { overlay, close: closeModal };
}

/**
 * Show a confirm dialog
 * @param {Object} options
 * @returns {Promise<boolean>}
 */
export function confirmDialog({ title = 'Confirm', message = 'Are you sure?', confirmText = 'Confirm', cancelText = 'Cancel', danger = false } = {}) {
  return new Promise((resolve) => {
    const { overlay, close } = showModal({
      title,
      content: `<p style="color: var(--color-gray-600)">${escapeHtml(message)}</p>`,
      footer: `
        <button class="btn btn-ghost" id="modal-cancel">${escapeHtml(cancelText)}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm">${escapeHtml(confirmText)}</button>
      `,
      onClose: () => resolve(false)
    });

    overlay.querySelector('#modal-cancel').addEventListener('click', () => {
      close();
      resolve(false);
    });

    overlay.querySelector('#modal-confirm').addEventListener('click', () => {
      close();
      resolve(true);
    });
  });
}

// ── Loading Overlay ──
let overlayEl = null;

/**
 * Show a full-page loading overlay
 * @param {string} message
 */
export function showLoading(message = '') {
  if (overlayEl) return;
  overlayEl = document.createElement('div');
  overlayEl.className = 'loading-overlay';
  overlayEl.innerHTML = `
    <div style="text-align: center;">
      <div class="loading-spinner loading-spinner-lg"></div>
      ${message ? `<p style="margin-top: 16px; color: var(--color-gray-600); font-size: 14px;">${escapeHtml(message)}</p>` : ''}
    </div>
  `;
  document.body.appendChild(overlayEl);
}

/**
 * Hide the loading overlay
 */
export function hideLoading() {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
}

export const loadingOverlay = {
  show: showLoading,
  hide: hideLoading
};

// ── Helper: Escape HTML ──
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Scroll to Top ──
export function scrollToTop(smooth = true) {
  window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
}

// ── Tab Switcher ──
/**
 * Initialize tab switching
 * @param {string} containerSelector
 */
export function initTabs(containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const tabs = container.querySelectorAll('.tab');
  const contents = container.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetContent = container.querySelector(`#tab-${target}`);
      if (targetContent) targetContent.classList.add('active');
    });
  });
}
