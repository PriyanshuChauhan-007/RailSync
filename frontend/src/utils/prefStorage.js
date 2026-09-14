/**
 * prefStorage.js — global communication preference persistence for RailSaathi.
 *
 * Unlike chat history (keyed by territory + plan), communication preferences
 * are stored globally because they describe HOW the user wants answers written,
 * not railway facts. Preferences survive territory switches and plan changes.
 *
 * Key: railsync:railsaathi:preferences:v1
 * NOT persisted: GEMINI_API_KEY, secrets, raw system prompts, arbitrary user text.
 */

const PREF_KEY = "railsync:railsaathi:preferences:v1";

/** Default values — all fields are validated enums on the backend. */
const DEFAULT_PREFERENCES = {
  language: "auto",
  tone: "default",
  detail: "balanced",
  explanation_style: "default",
  jargon: "normal",
};

/** Return a fresh copy of the default preferences. */
export function defaultPreferences() {
  return { ...DEFAULT_PREFERENCES };
}

/**
 * Load saved preferences from localStorage.
 * Returns defaults if the key is absent, unreadable, or contains invalid data.
 */
export function loadPreferences() {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return defaultPreferences();
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return defaultPreferences();
    }
    // Merge with defaults so new fields added in future versions are handled gracefully.
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return defaultPreferences();
  }
}

/**
 * Save preferences to localStorage.
 * Merges with defaults so partial updates are safe.
 * Silently no-ops when storage is unavailable (private mode, quota full, etc.).
 */
export function savePreferences(prefs) {
  try {
    const toStore = { ...DEFAULT_PREFERENCES, ...prefs };
    localStorage.setItem(PREF_KEY, JSON.stringify(toStore));
  } catch {
    // Storage unavailable — continue without persistence.
  }
}

/**
 * Clear all saved preferences (restore to defaults on next load).
 * Does NOT clear chat history. Chat history is keyed separately by territory/plan.
 */
export function clearPreferences() {
  try {
    localStorage.removeItem(PREF_KEY);
  } catch {
    // Storage unavailable.
  }
}
