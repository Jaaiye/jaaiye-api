const express = require('express');
const { requireAdmin } = require('../auth/authorize');

/**
 * Create App Config Routes
 */
function createAppConfigRoutes({ appConfigController, authMiddleware }) {
    const router = express.Router();

    // Public endpoint to get version info
    router.get('/version', appConfigController.getVersion);

    // Admin endpoint to update version info
    router.patch(
        '/version',
        authMiddleware,
        requireAdmin,
        appConfigController.updateVersion
    );

    return router;
}

module.exports = createAppConfigRoutes;
