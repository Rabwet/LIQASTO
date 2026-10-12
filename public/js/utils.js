/**
 * LIQASTO — Utility Functions
 * Formatting, sanitization, validation, and helpers
 */

// ── Currency Formatting ──
/**
 * Format a number as Kenyan Shillings
 * @param {number} amount
 * @returns {string} e.g. "KSh 1,250"
 */
export function formatPrice(amount) {
  if (amount == null || isNaN(amount)) return 'KSh 0';
  return 'KSh ' + Number(amount).toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

// ── Date Formatting ──
/**
 * Format a Firestore timestamp or Date to a readable string
 * @param {Object|Date|string} timestamp
 * @param {boolean} includeTime
 * @returns {string}
 */
export function formatDate(timestamp, includeTime = false) {
  let date;
  if (!timestamp) return '—';
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  return date.toLocaleDateString('en-KE', options);
}

/**
 * Get relative time string (e.g. "2 hours ago")
 * @param {Object|Date} timestamp
 * @returns {string}
 */
export function timeAgo(timestamp) {
  let date;
  if (timestamp?.toDate) date = timestamp.toDate();
  else if (timestamp instanceof Date) date = timestamp;
  else date = new Date(timestamp);

  const seconds = Math.floor((new Date() - date) / 1000);

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
  }
  return 'Just now';
}

// ── Sanitization ──
/**
 * Sanitize a string for safe DOM insertion (prevent XSS)
 * @param {string} str
 * @returns {string}
 */
export function sanitize(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Sanitize HTML content, allowing only safe tags
 * @param {string} html
 * @returns {string}
 */
export function sanitizeHTML(html) {
  if (!html) return '';
  const allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'h3', 'h4', 'h5'];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const clean = cleanNode(doc.body, allowedTags);
  return clean.innerHTML;
}

function cleanNode(node, allowedTags) {
  const fragment = document.createDocumentFragment();
  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      fragment.appendChild(document.createTextNode(child.textContent));
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      if (allowedTags.includes(child.tagName.toLowerCase())) {
        const el = document.createElement(child.tagName);
        el.appendChild(cleanNode(child, allowedTags));
        fragment.appendChild(el);
      } else {
        fragment.appendChild(cleanNode(child, allowedTags));
      }
    }
  }
  const wrapper = document.createElement('div');
  wrapper.appendChild(fragment);
  return wrapper;
}

// ── Validation ──
/**
 * Validate email is a Gmail address
 * @param {string} email
 * @returns {boolean}
 */
export function isValidGmail(email) {
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email);
}

/**
 * Validate Kenyan phone number (07XX, 01XX, +254)
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidKenyanPhone(phone) {
  // Accept: 07XXXXXXXX, 01XXXXXXXX, +2547XXXXXXXX, +2541XXXXXXXX, 2547XXXXXXXX
  return /^(?:\+?254|0)[17]\d{8}$/.test(phone.replace(/[\s-]/g, ''));
}

/**
 * Normalize Kenyan phone number to 254 format
 * @param {string} phone
 * @returns {string}
 */
export function normalizePhone(phone) {
  let cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('0')) cleaned = '254' + cleaned.substring(1);
  return cleaned;
}

/**
 * Check if a person is at least 18 years old
 * @param {string} dobString - Date of birth in YYYY-MM-DD format
 * @returns {boolean}
 */
export function isAtLeast18(dobString) {
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 18;
}

/**
 * Calculate password strength (0-4)
 * @param {string} password
 * @returns {{ score: number, label: string }}
 */
export function passwordStrength(password) {
  let score = 0;
  if (!password) return { score: 0, label: '' };
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  score = Math.min(score, 4);
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#ef4444', '#f59e0b', '#84cc16', '#10b981'];
  return { score, label: labels[score], color: colors[score] };
}

// ── Order Number Generation ──
/**
 * Generate an order number like LQ-20261008-0001
 * @param {number} orderCount - The sequential number
 * @returns {string}
 */
export function generateOrderNumber(orderCount) {
  const now = new Date();
  const datePart = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const seqPart = String(orderCount).padStart(4, '0');
  return `LQ-${datePart}-${seqPart}`;
}

// ── Star Rating HTML ──
/**
 * Generate star rating HTML
 * @param {number} rating - Rating value (0-5)
 * @param {number} maxStars
 * @returns {string}
 */
export function renderStars(rating, maxStars = 5) {
  let html = '';
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  for (let i = 0; i < fullStars; i++) {
    html += '<span class="star-filled">★</span>';
  }
  if (hasHalf) {
    html += '<span class="star-filled">★</span>';
  }
  const emptyStars = maxStars - fullStars - (hasHalf ? 1 : 0);
  for (let i = 0; i < emptyStars; i++) {
    html += '<span class="star-empty">★</span>';
  }
  return html;
}

// ── Debounce ──
/**
 * Debounce a function
 * @param {Function} func
 * @param {number} wait
 * @returns {Function}
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ── Throttle ──
/**
 * Throttle a function
 * @param {Function} func
 * @param {number} limit
 * @returns {Function}
 */
export function throttle(func, limit = 200) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ── Truncate Text ──
/**
 * Truncate text to a specified length
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text || '';
  return text.substring(0, maxLength).trim() + '…';
}

// ── Slug ──
/**
 * Convert a string to a URL-friendly slug
 * @param {string} str
 * @returns {string}
 */
export function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Query Params ──
/**
 * Get a query parameter from the URL
 * @param {string} name
 * @returns {string|null}
 */
export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * Set query parameters without page reload
 * @param {Object} params - Key-value pairs
 */
export function setQueryParams(params) {
  const url = new URL(window.location);
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  }
  window.history.replaceState({}, '', url);
}

// ── Discount Calculation ──
/**
 * Calculate discount percentage
 * @param {number} oldPrice
 * @param {number} newPrice
 * @returns {number}
 */
export function calcDiscount(oldPrice, newPrice) {
  if (!oldPrice || oldPrice <= newPrice) return 0;
  return Math.round(((oldPrice - newPrice) / oldPrice) * 100);
}

// ── Image placeholder ──
/**
 * Generate a placeholder image data URL
 * @param {number} width
 * @param {number} height
 * @param {string} text
 * @returns {string}
 */
export function placeholderImage(width = 300, height = 300, text = 'No Image') {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#9ca3af';
  ctx.font = `${Math.floor(width / 15)}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
  return canvas.toDataURL();
}

// ── Unique ID ──
/**
 * Generate a simple unique ID
 * @returns {string}
 */
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}
