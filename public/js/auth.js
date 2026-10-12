/**
 * LIQASTO — Auth Module
 * Firebase Authentication flows, route guards, and session management
 * Grants super admin privileges to seanrabwet@gmail.com
 */

import { auth, db, isFirebaseConfigured } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onIdTokenChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  doc, setDoc, getDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { toast } from './ui.js';
import { isValidGmail, isValidKenyanPhone, isAtLeast18, normalizePhone } from './utils.js';

// ── Master Admin Emails ──
export const ADMIN_EMAILS = [
  'seanrabwet@gmail.com'
];

// ── Current User State ──
let currentUser = null;
let currentUserProfile = null;
let idToken = null;
let authReadyResolve;
const authReady = new Promise(resolve => { authReadyResolve = resolve; });

/**
 * Get the current authenticated user
 * @returns {Object|null}
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Get the current user's Firestore profile
 * @returns {Object|null}
 */
export function getUserProfile() {
  return currentUserProfile;
}

/**
 * Get the current ID token for Cloud Functions
 * @returns {string|null}
 */
export function getIdToken() {
  return idToken;
}

/**
 * Wait for auth to be initialized
 * @returns {Promise}
 */
export function waitForAuth() {
  return authReady;
}

/**
 * Check if the current user is an admin
 * @returns {boolean}
 */
export function isAdmin() {
  if (!currentUser) return false;
  const userEmail = (currentUser.email || '').toLowerCase();
  return ADMIN_EMAILS.includes(userEmail) ||
         currentUser?.customClaims?.admin === true ||
         currentUserProfile?.role === 'admin';
}

// ── Token Refresh / Auth Listener ──
if (isFirebaseConfigured) {
  onIdTokenChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      idToken = await user.getIdToken();

      // Get user profile from Firestore
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          currentUserProfile = { id: userDoc.id, ...userDoc.data() };
        }
      } catch (err) {
        console.warn('Notice fetching user profile:', err?.message || err);
      }

      // Check custom claims
      try {
        const tokenResult = await user.getIdTokenResult();
        currentUser.customClaims = tokenResult.claims;
      } catch (err) {
        console.warn('Notice getting claims:', err?.message || err);
      }

      // Auto-elevate master admin
      if (ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
        if (!currentUser.customClaims) currentUser.customClaims = {};
        currentUser.customClaims.admin = true;
        if (!currentUserProfile) {
          currentUserProfile = { name: 'Sean Rabwet (Admin)', email: user.email, role: 'admin' };
        } else {
          currentUserProfile.role = 'admin';
        }
      }

      updateAuthUI(true);
    } else {
      currentUser = null;
      currentUserProfile = null;
      idToken = null;
      updateAuthUI(false);
    }
    authReadyResolve();
  });
} else {
  // Demo Mode Local Session Recovery
  try {
    const saved = localStorage.getItem('liqasto_demo_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      currentUser = parsed.user;
      currentUserProfile = parsed.profile;
      currentUser.getIdTokenResult = async () => ({ claims: { admin: isAdmin() } });
      currentUser.getIdToken = async () => 'demo_token';
      updateAuthUI(true);
    }
  } catch (e) {}
  authReadyResolve();
}

// ── Register ──
/**
 * Register a new user
 * @param {Object} userData
 * @returns {Promise<Object>} The created user
 */
export async function register({ name, email, phone, dob, password }) {
  const normalizedEmail = (email || '').trim().toLowerCase();

  // Client-side validations
  if (!isValidGmail(normalizedEmail)) {
    throw new Error('Only Gmail addresses (@gmail.com) are accepted.');
  }
  if (!isValidKenyanPhone(phone)) {
    throw new Error('Please enter a valid Kenyan phone number (07XX/01XX/+254).');
  }
  if (!isAtLeast18(dob)) {
    throw new Error('You must be at least 18 years old to register.');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const isSuperAdmin = ADMIN_EMAILS.includes(normalizedEmail);

  if (!isFirebaseConfigured) {
    // Demo Mode Registration
    currentUser = {
      uid: isSuperAdmin ? 'admin_seanrabwet' : 'user_' + Date.now(),
      email: normalizedEmail,
      displayName: name,
      customClaims: { admin: isSuperAdmin },
      getIdTokenResult: async () => ({ claims: { admin: isSuperAdmin } }),
      getIdToken: async () => 'demo_token'
    };
    currentUserProfile = {
      name,
      email: normalizedEmail,
      phone: normalizePhone(phone),
      dob,
      role: isSuperAdmin ? 'admin' : 'customer'
    };
    localStorage.setItem('liqasto_demo_user', JSON.stringify({ user: currentUser, profile: currentUserProfile }));
    updateAuthUI(true);
    toast.success(`Account created successfully! ${isSuperAdmin ? '👑 Admin access enabled.' : ''}`);
    return currentUser;
  }

  // Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  const user = userCredential.user;

  // Update display name
  await updateProfile(user, { displayName: name });

  // Create Firestore user document
  await setDoc(doc(db, 'users', user.uid), {
    name,
    email: normalizedEmail,
    phone: normalizePhone(phone),
    dob,
    role: isSuperAdmin ? 'admin' : 'customer',
    addresses: [],
    createdAt: serverTimestamp()
  });

  if (isSuperAdmin) {
    toast.success(`Admin account registered for ${normalizedEmail}! 👑`);
  } else {
    toast.success('Registration successful! Welcome to Liqasto.');
  }

  return user;
}

// ── Login ──
/**
 * Login with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>}
 */
export async function login(email, password) {
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('Please enter your email address.');
  }
  if (!password) {
    throw new Error('Please enter your password.');
  }

  if (!isFirebaseConfigured) {
    // Demo Mode Login
    const isSuperAdmin = ADMIN_EMAILS.includes(normalizedEmail);
    currentUser = {
      uid: isSuperAdmin ? 'admin_seanrabwet' : 'user_' + Date.now(),
      email: normalizedEmail,
      displayName: isSuperAdmin ? 'Sean Rabwet' : normalizedEmail.split('@')[0],
      customClaims: { admin: isSuperAdmin },
      getIdTokenResult: async () => ({ claims: { admin: isSuperAdmin } }),
      getIdToken: async () => 'demo_token'
    };
    currentUserProfile = {
      name: currentUser.displayName,
      email: normalizedEmail,
      role: isSuperAdmin ? 'admin' : 'customer'
    };
    localStorage.setItem('liqasto_demo_user', JSON.stringify({ user: currentUser, profile: currentUserProfile }));
    updateAuthUI(true);
    toast.success(`Welcome back, ${currentUser.displayName}! ${isSuperAdmin ? '👑 Admin Mode' : ''}`);
    return currentUser;
  }

  const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
  const user = userCredential.user;

  if (ADMIN_EMAILS.includes(normalizedEmail)) {
    toast.success('Signed in as Administrator 👑');
  } else {
    toast.success('Signed in successfully!');
  }

  return user;
}

// ── Logout ──
/**
 * Sign out the current user
 */
export async function logout() {
  if (isFirebaseConfigured) {
    await signOut(auth);
  }
  currentUser = null;
  currentUserProfile = null;
  idToken = null;
  localStorage.removeItem('liqasto_demo_user');
  updateAuthUI(false);
  toast.info('Signed out.');
  window.location.href = '/';
}

// ── Password Reset ──
export async function resetPassword(email) {
  if (!email || !isValidGmail(email)) {
    throw new Error('Please provide a valid Gmail address.');
  }
  if (isFirebaseConfigured) {
    await sendPasswordResetEmail(auth, email);
  }
  toast.success('Password reset link sent to ' + email);
}

// ── Route Guards ──
export async function requireAuth(redirectTo = '') {
  await waitForAuth();
  if (!currentUser) {
    const redirect = redirectTo || window.location.pathname + window.location.search;
    window.location.href = `/login.html?redirect=${encodeURIComponent(redirect)}`;
    return false;
  }
  return true;
}

export async function requireAdmin() {
  await waitForAuth();
  if (!currentUser) {
    window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
    return false;
  }

  const userIsAdmin = isAdmin();
  if (!userIsAdmin) {
    try {
      const tokenResult = await currentUser.getIdTokenResult();
      if (tokenResult.claims?.admin) return true;
    } catch (e) {}

    toast.error('Access denied. Administrator privileges required.');
    window.location.href = '/';
    return false;
  }
  return true;
}

export async function redirectIfAuthenticated() {
  await waitForAuth();
  if (currentUser) {
    window.location.href = '/';
    return true;
  }
  return false;
}

// ── UI Update ──
function updateAuthUI(loggedIn) {
  const accountLabel = document.querySelector('#header-account-label');
  const accountLink = document.querySelector('#header-account-link');
  const dropdown = document.querySelector('#account-dropdown');

  if (accountLabel) {
    if (loggedIn) {
      const isAdm = isAdmin();
      accountLabel.textContent = isAdm ? 'Admin 👑' : (currentUserProfile?.name?.split(' ')[0] || 'Account');
    } else {
      accountLabel.textContent = 'Account';
    }
  }

  if (accountLink) {
    if (loggedIn) {
      accountLink.href = '#';
    } else {
      accountLink.href = '/login.html';
    }
  }

  // Show/hide auth-dependent elements
  document.querySelectorAll('[data-auth="logged-in"]').forEach(el => {
    el.style.display = loggedIn ? '' : 'none';
  });
  document.querySelectorAll('[data-auth="logged-out"]').forEach(el => {
    el.style.display = loggedIn ? 'none' : '';
  });
}

// ── Account Dropdown Setup ──
export function setupAccountDropdown() {
  const trigger = document.querySelector('#header-account-link');
  const dropdown = document.querySelector('#account-dropdown');
  if (!trigger || !dropdown) return;

  trigger.addEventListener('click', (e) => {
    if (!currentUser) {
      window.location.href = '/login.html';
      return;
    }
    e.preventDefault();
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  });

  document.addEventListener('click', (e) => {
    if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  const logoutBtn = document.querySelector('#logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
}
