/**
 * Referral Routes
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { protect, admin } = require('../../middleware/authMiddleware');

// Stricter limiter for public referral verification
const referralVerifyLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: 'Too many verification attempts, please try again later'
});

function createReferralRoutes({ referralController }) {
    // Public Endpoint: Verify referral code (for Mobile)
    router.get(
        '/verify/:code',
        referralVerifyLimiter,
        referralController.verifyCode.bind(referralController)
    );

    // Admin Endpoints
    router.post(
        '/admin',
        protect,
        admin,
        referralController.createInfluencer.bind(referralController)
    );

    router.get(
        '/admin',
        protect,
        admin,
        referralController.listInfluencers.bind(referralController)
    );

    return router;
}

module.exports = createReferralRoutes;
