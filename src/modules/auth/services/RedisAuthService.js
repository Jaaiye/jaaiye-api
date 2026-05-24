/**
 * Redis Auth Service
 * Centralizes all ephemeral auth state in Redis:
 *  - Refresh token session store (with jti-based rotation)
 *  - Access token blacklist
 *  - Email verification codes
 *  - Password reset codes
 *  - Last login timestamp (fire-and-forget)
 *  - Online presence (heartbeat)
 *  - Login rate limiting
 */

const redisClient = require('../../../utils/redis');

// TTL constants (seconds)
const TTL = {
    REFRESH_TOKEN: 7 * 24 * 60 * 60,   // 7 days
    VERIFY_CODE: 10 * 60,                // 10 minutes
    RESET_CODE: 60 * 60,                 // 1 hour
    ONLINE_PRESENCE: 5 * 60,            // 5 minutes
    RATE_LIMIT_WINDOW: 15 * 60,         // 15-minute window
};

const RATE_LIMIT_MAX_ATTEMPTS = 10;

class RedisAuthService {
    // ─────────────────────────────────────────────
    // REFRESH TOKEN SESSION
    // ─────────────────────────────────────────────

    /**
     * Store a refresh token session in Redis.
     * @param {string} userId
     * @param {string} jti - Unique token ID from the JWT payload
     */
    async storeRefreshToken(userId, jti) {
        const key = this._refreshKey(userId, jti);
        await redisClient.set(key, '1', { EX: TTL.REFRESH_TOKEN });
    }

    /**
     * Validate a refresh token session exists.
     * @param {string} userId
     * @param {string} jti
     * @returns {Promise<boolean>}
     */
    async hasRefreshToken(userId, jti) {
        const key = this._refreshKey(userId, jti);
        const val = await redisClient.get(key);
        return val !== null;
    }

    /**
     * Rotate a refresh token atomically:
     * delete the old jti, store the new jti.
     * @param {string} userId
     * @param {string} oldJti
     * @param {string} newJti
     * @returns {Promise<boolean>} false if old token was already gone (replay attack)
     */
    async rotateRefreshToken(userId, oldJti, newJti) {
        const oldKey = this._refreshKey(userId, oldJti);
        const deleted = await redisClient.del(oldKey);
        if (deleted === 0) {
            // Key didn't exist — possible replay attack
            return false;
        }
        await this.storeRefreshToken(userId, newJti);
        return true;
    }

    /**
     * Delete a specific refresh token session (single-device logout).
     * @param {string} userId
     * @param {string} jti
     */
    async deleteRefreshToken(userId, jti) {
        const key = this._refreshKey(userId, jti);
        await redisClient.del(key);
    }

    /**
     * Delete ALL refresh token sessions for a user (logout all devices).
     * Uses SCAN to avoid blocking Redis with KEYS.
     * @param {string} userId
     */
    async deleteAllRefreshTokens(userId) {
        const pattern = `refresh:${userId}:*`;
        let cursor = 0;
        do {
            const result = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
            cursor = result.cursor;
            if (result.keys.length > 0) {
                await redisClient.del(result.keys);
            }
        } while (cursor !== 0);
    }

    // ─────────────────────────────────────────────
    // EMAIL VERIFICATION CODES
    // ─────────────────────────────────────────────

    /**
     * Store an email verification code.
     * @param {string} userId
     * @param {string} code
     * @param {number} [ttlSeconds]
     */
    async storeVerifyCode(userId, code, ttlSeconds = TTL.VERIFY_CODE) {
        const key = this._verifyKey(userId);
        await redisClient.set(key, code, { EX: ttlSeconds });
    }

    /**
     * Retrieve an email verification code.
     * @param {string} userId
     * @returns {Promise<string|null>}
     */
    async getVerifyCode(userId) {
        const key = this._verifyKey(userId);
        return await redisClient.get(key);
    }

    /**
     * Consume (get + delete) an email verification code.
     * @param {string} userId
     * @returns {Promise<string|null>}
     */
    async consumeVerifyCode(userId) {
        const key = this._verifyKey(userId);
        const code = await redisClient.get(key);
        if (code) await redisClient.del(key);
        return code;
    }

    // ─────────────────────────────────────────────
    // PASSWORD RESET CODES
    // ─────────────────────────────────────────────

    /**
     * Store a password reset code.
     * @param {string} userId
     * @param {string} code
     * @param {number} [ttlSeconds]
     */
    async storeResetCode(userId, code, ttlSeconds = TTL.RESET_CODE) {
        const key = this._resetKey(userId);
        await redisClient.set(key, code, { EX: ttlSeconds });
    }

    /**
     * Consume (get + delete) a password reset code.
     * @param {string} userId
     * @returns {Promise<string|null>}
     */
    async consumeResetCode(userId) {
        const key = this._resetKey(userId);
        const code = await redisClient.get(key);
        if (code) await redisClient.del(key);
        return code;
    }

    // ─────────────────────────────────────────────
    // LAST LOGIN
    // ─────────────────────────────────────────────

    /**
     * Record last login timestamp in Redis immediately.
     * Also triggers a non-blocking DB flush via setImmediate.
     * @param {string} userId
     * @param {Function} dbFlushFn - Async fn to persist to DB (fire-and-forget)
     */
    async recordLastLogin(userId, dbFlushFn) {
        const now = new Date().toISOString();
        await redisClient.set(`lastlogin:${userId}`, now);

        // Non-blocking DB persistence
        setImmediate(() => {
            dbFlushFn(now).catch(err => {
                // Don't crash the process — lastLogin is non-critical
                console.error(`[RedisAuthService] lastLogin DB flush failed for ${userId}:`, err);
            });
        });
    }

    /**
     * Get the last login timestamp for a user.
     * @param {string} userId
     * @returns {Promise<string|null>} ISO string or null
     */
    async getLastLogin(userId) {
        return await redisClient.get(`lastlogin:${userId}`);
    }

    // ─────────────────────────────────────────────
    // ONLINE PRESENCE
    // ─────────────────────────────────────────────

    /**
     * Mark a user as online (refreshes TTL on each call).
     * Called from the auth middleware on every authenticated request.
     * @param {string} userId
     */
    async markOnline(userId) {
        await redisClient.set(`online:${userId}`, '1', { EX: TTL.ONLINE_PRESENCE });
    }

    /**
     * Check if a user is currently online.
     * @param {string} userId
     * @returns {Promise<boolean>}
     */
    async isOnline(userId) {
        const val = await redisClient.get(`online:${userId}`);
        return val !== null;
    }

    // ─────────────────────────────────────────────
    // LOGIN RATE LIMITING
    // ─────────────────────────────────────────────

    /**
     * Check and increment login attempt counter for an IP.
     * @param {string} ip
     * @returns {Promise<{ allowed: boolean, attempts: number, retryAfterSeconds: number }>}
     */
    async checkLoginRateLimit(ip) {
        const key = `ratelimit:login:${ip}`;
        const attempts = await redisClient.incr(key);

        // Set expiry only on first attempt to preserve the window
        if (attempts === 1) {
            await redisClient.expire(key, TTL.RATE_LIMIT_WINDOW);
        }

        if (attempts > RATE_LIMIT_MAX_ATTEMPTS) {
            const ttl = await redisClient.ttl(key);
            return { allowed: false, attempts, retryAfterSeconds: ttl };
        }

        return { allowed: true, attempts, retryAfterSeconds: 0 };
    }

    /**
     * Clear login rate limit for an IP (e.g. after successful login).
     * @param {string} ip
     */
    async clearLoginRateLimit(ip) {
        await redisClient.del(`ratelimit:login:${ip}`);
    }

    // ─────────────────────────────────────────────
    // KEY BUILDERS (private)
    // ─────────────────────────────────────────────

    _refreshKey(userId, jti) {
        return `refresh:${userId}:${jti}`;
    }

    _blacklistKey(jti) {
        return `blacklist:${jti}`;
    }

    _verifyKey(userId) {
        return `verify:${userId}`;
    }

    _resetKey(userId) {
        return `pwreset:${userId}`;
    }
}

module.exports = RedisAuthService;
