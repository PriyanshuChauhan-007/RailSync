/**
 * chatStorage.js - Safe localStorage persistence for RailSaathi conversation.
 *
 * Safety rules:
 *  - History is isolated by territory + plan. Eastern != Northern. Plan A != Plan B.
 *  - Only serializable, non-sensitive fields are persisted (role, content, engine, preview).
 *  - GEMINI_API_KEY, AbortControllers, raw API objects, plan payloads are never stored.
 *  - Bounded to MAX_MESSAGES per context (matches in-memory bound).
 *  - All reads and writes are wrapped in try/catch -- malformed JSON never crashes the UI.
 */

const STORAGE_PREFIX = "railsync:railsaathi:v1";
const MAX_MESSAGES = 12;

/** Build an isolated storage key for a territory + plan context. */
export function storageKey(territoryId, planId) {
  const tid = territoryId ? String(territoryId) : "no-territory";
  const pid = planId ? String(planId) : "no-plan";
  return `${STORAGE_PREFIX}:${tid}:${pid}`;
}

/**
 * Load persisted chat messages for the given context.
 * Returns [] on any error (missing key, malformed JSON, wrong shape).
 * Never throws.
 */
export function loadChat(territoryId, planId) {
  try {
    const key = storageKey(territoryId, planId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate shape: keep only well-formed messages, drop error/transient ones.
    return parsed.filter(
      (m) =>
        m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    );
  } catch {
    return [];
  }
}

/**
 * Save bounded chat messages for the given context.
 * Strips: error flag (transient), AbortControllers, non-serializable fields.
 * Keeps: role, content, engine, preview (all safe to display on restore).
 * Never throws.
 */
export function saveChat(territoryId, planId, messages) {
  try {
    const key = storageKey(territoryId, planId);
    // Filter out transient error messages -- they are never useful after a refresh.
    const toStore = messages
      .filter((m) => !m.error)
      .slice(-MAX_MESSAGES)
      .map(({ role, content, engine, preview }) => ({
        role,
        content: typeof content === "string" ? content.slice(0, 4000) : "",
        ...(engine !== undefined ? { engine } : {}),
        ...(preview !== undefined ? { preview: Boolean(preview) } : {}),
      }));
    localStorage.setItem(key, JSON.stringify(toStore));
  } catch {
    // QuotaExceededError or serialization failure -- silently ignore.
  }
}

/**
 * Clear chat history for the given context only.
 * Does NOT affect any other territory/plan history.
 * Does NOT affect RailSync plan data, selected block, or solver state.
 * Never throws.
 */
export function clearChat(territoryId, planId) {
  try {
    const key = storageKey(territoryId, planId);
    localStorage.removeItem(key);
  } catch {
    // Storage unavailable -- silently ignore.
  }
}
