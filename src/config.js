// YouTube API Keys configuration and rotation manager
// Keys are loaded from environment variables (set in .env file)
// Vite injects VITE_ prefixed vars at build time via import.meta.env

// Safe access to Vite environment variables (fallback to empty object if not running under Vite)
const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

const envKeys = [
  env.VITE_YT_KEY_1,
  env.VITE_YT_KEY_2,
  env.VITE_YT_KEY_3,
  env.VITE_YT_KEY_4,
  env.VITE_YT_KEY_5,
  env.VITE_YT_KEY_6,
  env.VITE_YT_KEY_7,
  env.VITE_YT_KEY_8,
  env.VITE_YT_KEY_9,
  env.VITE_YT_KEY_10
];

// Filter out any undefined/empty keys
export const YOUTUBE_KEYS = envKeys.filter(k => k && k.trim().length > 0);

if (YOUTUBE_KEYS.length === 0) {
  console.error('[Sonoria] No YouTube API keys found! Set VITE_YT_KEY_1 through VITE_YT_KEY_10 in your .env file.');
}

const LOCAL_STORAGE_KEY_INDEX = 'sonoria_active_key_index';

// Initialize current index from localStorage
let currentIndex = 0;
try {
  const savedIndex = localStorage.getItem(LOCAL_STORAGE_KEY_INDEX);
  if (savedIndex !== null) {
    const parsed = parseInt(savedIndex, 10);
    if (parsed >= 0 && parsed < YOUTUBE_KEYS.length) {
      currentIndex = parsed;
    }
  }
} catch (e) {
  console.error('[Sonoria] Failed to load API key index from localStorage', e);
}

/**
 * Gets the current active YouTube API key
 * @returns {string}
 */
export function getActiveKey() {
  return YOUTUBE_KEYS[currentIndex];
}

/**
 * Gets the current active key index
 * @returns {number}
 */
export function getActiveKeyIndex() {
  return currentIndex;
}

/**
 * Rotates the YouTube API key to the next available key
 * @returns {boolean} Returns true if key was rotated
 */
export function rotateKey() {
  const oldIndex = currentIndex;
  currentIndex = (currentIndex + 1) % YOUTUBE_KEYS.length;
  
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_INDEX, currentIndex.toString());
  } catch (e) {
    console.error('[Sonoria] Failed to save rotated API key index to localStorage', e);
  }
  
  console.warn(`[Sonoria] YouTube API Key Rotated: Index ${oldIndex} -> ${currentIndex}`);
  
  // Custom event to update UI when a key rotates
  const event = new CustomEvent('sonoria-key-rotated', {
    detail: { oldIndex, newIndex: currentIndex }
  });
  window.dispatchEvent(event);
  
  return true;
}

/**
 * Get all keys metadata for debugging / developer view
 * @returns {Array<{index: number, key: string, active: boolean}>}
 */
export function getKeysStatus() {
  return YOUTUBE_KEYS.map((key, index) => ({
    index,
    maskedKey: `${key.substring(0, 8)}...${key.substring(key.length - 4)}`,
    isActive: index === currentIndex
  }));
}
