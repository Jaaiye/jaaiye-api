/**
 * In-memory cooldown tracker to prevent duplicate error alert emails
 * from flooding the inbox during an outage. Per-process — acceptable
 * since the goal is "don't spam", not exact cross-instance dedup.
 */

const lastSentAt = new Map();

const COOLDOWN_MS = parseInt(process.env.ERROR_ALERT_COOLDOWN_MS, 10) || 10 * 60 * 1000; // 10 minutes

/**
 * Checks whether an alert for this key was already sent within the cooldown window.
 * If not, records the current time so the next call within the window is skipped.
 * @param {string} key - unique signature for the error (name+message+route)
 * @returns {boolean} true if the caller should SKIP sending (still within cooldown)
 */
const shouldSkipAlert = (key) => {
  const now = Date.now();
  const last = lastSentAt.get(key);

  if (last && now - last < COOLDOWN_MS) {
    return true;
  }

  lastSentAt.set(key, now);
  return false;
};

module.exports = { shouldSkipAlert, COOLDOWN_MS };
