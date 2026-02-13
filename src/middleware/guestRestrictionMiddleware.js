/**
 * Guest Restriction Middleware
 * Restricts guests from performing write operations or accessing sensitive data
 */

const { UnauthorizedError } = require('../modules/common/errors');

/**
 * Middleware to restrict guest users
 * 1. Blocks POST/PUT/PATCH/DELETE for guests except for specific whitelisted paths (payments, tickets)
 * 2. Blocks access to chats or other specific features for guests
 */
exports.restrictGuest = (req, res, next) => {
    const user = req.user;

    // If not a guest or not logged in, proceed
    if (!user || !user.isGuest) {
        return next();
    }

    const method = req.method;
    const path = req.path || '';

    // 1. Whitelist for guests (Allowed paths)
    const whitelist = [
        '/api/v1/auth/refresh-token',
        '/api/v1/users/profile',
        '/api/v1/events', // GET is handled by the use case for category logic
        '/api/v1/payments', // Allowed for ticketing
        '/api/v1/tickets',  // Allowed for ticketing
        '/api/v1/transactions' // Allowed for ticketing
    ];

    const isWhitelisted = whitelist.some(p => path.startsWith(p));

    // 2. Block specific features explicitly
    if (path.includes('/chats')) {
        return res.status(403).json({
            success: false,
            error: 'Please login as a real user to access this feature',
            code: 'GUEST_RESTRICTION'
        });
    }

    // 3. Block Write operations (POST, PUT, PATCH, DELETE) for guests
    // except for whitelisted paths like payments/tickets
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        // Check if it's a whitelisted path for writes
        const writeWhitelist = [
            '/api/v1/payments/',
            '/api/v1/tickets/',
            '/api/v1/transactions/',
            '/api/v1/auth/refresh-token'
        ];

        if (!writeWhitelist.some(p => path.startsWith(p))) {
            return res.status(403).json({
                success: false,
                error: 'Please login as a real user to access this feature',
                code: 'GUEST_RESTRICTION'
            });
        }
    }

    next();
};
