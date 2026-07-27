/**
 * Secure Authentication & Cryptographic Hashing Utilities
 * Passwords are NEVER stored or transmitted in plain text.
 * Uses Web Crypto API (crypto.subtle) SHA-256 algorithm with unique salting.
 */

// Generate salted SHA-256 hash of password
export const hashPassword = async (password, email = '') => {
  if (!password) return '';
  const salt = `ft_salt_${email.toLowerCase().trim()}_v1`;
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Storage keys
const USERS_STORAGE_KEY = 'familyTree_accounts_v1';
const CURRENT_USER_KEY  = 'familyTree_session_v1';

// Fetch all registered user accounts
export const getStoredUsers = () => {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read users vault:', e);
    return [];
  }
};

// Fetch current active user session
export const getActiveSession = () => {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

// Register a new user account
export const registerUserAccount = async ({ name, email, password }) => {
  const cleanEmail = email.toLowerCase().trim();
  const users = getStoredUsers();

  if (users.some(u => u.email === cleanEmail)) {
    throw new Error('An account with this email already exists.');
  }

  const passwordHash = await hashPassword(password, cleanEmail);
  const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

  const newUser = {
    id: userId,
    name: name.trim(),
    email: cleanEmail,
    passwordHash, // Stored strictly as SHA-256 hash
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

  // Save session
  const session = { id: newUser.id, name: newUser.name, email: newUser.email };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(session));

  return session;
};

// Authenticate and login existing user
export const loginUserAccount = async ({ email, password }) => {
  const cleanEmail = email.toLowerCase().trim();
  const users = getStoredUsers();
  const targetUser = users.find(u => u.email === cleanEmail);

  if (!targetUser) {
    throw new Error('No account found with this email address.');
  }

  const inputHash = await hashPassword(password, cleanEmail);

  if (inputHash !== targetUser.passwordHash) {
    throw new Error('Incorrect password. Please try again.');
  }

  const session = { id: targetUser.id, name: targetUser.name, email: targetUser.email };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(session));

  return session;
};

// Logout active user session
export const logoutUserAccount = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};
