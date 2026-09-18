/**
 * Distributed Lock (Redis-backed)
 *
 * Minimal SET NX PX / Lua-guarded-release lock for cross-instance mutual
 * exclusion. Currently only used by PayoutSchedulerQueue, which runs on a
 * single instance today - this exists so that guarantee doesn't have to be
 * re-verified by hand every time the deployment topology changes. A
 * financial job like the payout scheduler must never run twice
 * concurrently, so this fails closed: if Redis is unreachable or the lock
 * is already held, the caller does not run at all.
 */

const crypto = require('crypto');
const redisClient = require('./redis');
const logger = require('./logger');

const RELEASE_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

async function acquire(key, ttlMs) {
  const lockKey = `lock:${key}`;
  const token = crypto.randomUUID();

  const result = await redisClient.set(lockKey, token, { NX: true, PX: ttlMs });
  if (result !== 'OK') return null;

  return { key: lockKey, token };
}

async function release(lock) {
  if (!lock) return;
  try {
    await redisClient.eval(RELEASE_SCRIPT, {
      keys: [lock.key],
      arguments: [lock.token]
    });
  } catch (error) {
    // Non-fatal - the PX TTL cleans it up regardless.
    logger.warn('Failed to release distributed lock, will expire via TTL', {
      key: lock.key,
      error: error.message
    });
  }
}

/**
 * Run `fn` only if the lock is acquired. Fails closed: any error acquiring
 * the lock (Redis down, etc.) or the lock already being held means `fn` is
 * skipped entirely rather than run without protection.
 *
 * @param {string} key - logical lock name (namespaced under 'lock:')
 * @param {number} ttlMs - how long the lock is held before auto-expiring
 * @param {() => Promise<any>} fn
 * @returns {Promise<{ran: boolean, result?: any}>}
 */
async function withLock(key, ttlMs, fn) {
  let lock;
  try {
    lock = await acquire(key, ttlMs);
  } catch (error) {
    logger.error('Distributed lock acquisition failed, skipping run', {
      key,
      error: error.message
    });
    return { ran: false };
  }

  if (!lock) {
    logger.warn('Distributed lock already held, skipping run', { key });
    return { ran: false };
  }

  try {
    const result = await fn();
    return { ran: true, result };
  } finally {
    await release(lock);
  }
}

module.exports = { acquire, release, withLock };
