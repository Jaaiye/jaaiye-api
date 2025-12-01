const authContainer = require('../domains/auth/config/container');

/**
 * Check if token is blacklisted
 * Uses TokenBlacklistRepository from Auth domain
 */
module.exports = async (req, res, next) => {
    try {
        const tokenBlacklistRepository = authContainer.getTokenBlacklistRepository();
        const isBlacklisted = await tokenBlacklistRepository.isBlacklisted(req.token);

        if (isBlacklisted) {
            return res.status(401).json({ error: 'Token revoked' });
        }
        next();
    } catch (error) {
        return res.status(500).json({ error: 'Error checking token blacklist' });
    }
};