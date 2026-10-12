/**
 * LIQASTO — Age Gate Module
 * Full-screen modal for 18+ age verification on first visit
 */

const AGE_GATE_KEY = 'liqasto_age_verified';

/**
 * Check if the age gate has been confirmed
 * @returns {boolean}
 */
export function isAgeVerified() {
  return localStorage.getItem(AGE_GATE_KEY) === 'true';
}

/**
 * Show the age gate modal if not yet verified
 */
export function showAgeGate() {
  if (isAgeVerified()) return;

  const overlay = document.createElement('div');
  overlay.className = 'age-gate-overlay';
  overlay.id = 'age-gate';
  overlay.innerHTML = `
    <div class="age-gate">
      <div class="age-gate__icon">🔞</div>
      <h2 class="age-gate__title">Age Verification Required</h2>
      <p class="age-gate__text">
        You must be <strong>18 years or older</strong> to enter Liqasto.<br>
        By clicking "I am 18+" you confirm that you are of legal drinking age in Kenya.
      </p>
      <div class="age-gate__actions">
        <button class="btn btn-primary" id="age-gate-confirm">
          ✓ I am 18 or older
        </button>
        <button class="btn btn-ghost" id="age-gate-exit" style="color: var(--color-gray-500);">
          Exit
        </button>
      </div>
      <p style="font-size: 11px; color: var(--color-gray-400); margin-top: 20px;">
        Drink responsibly. Do not sell to persons under 18.
      </p>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // Confirm button
  overlay.querySelector('#age-gate-confirm').addEventListener('click', () => {
    localStorage.setItem(AGE_GATE_KEY, 'true');
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.4s ease';
    setTimeout(() => {
      overlay.remove();
      document.body.style.overflow = '';
    }, 400);
  });

  // Exit button
  overlay.querySelector('#age-gate-exit').addEventListener('click', () => {
    window.location.href = 'https://www.google.com';
  });
}
