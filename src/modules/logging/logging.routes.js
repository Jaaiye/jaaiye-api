/**
 * Logging Routes
 */
const express = require('express');
const router = express.Router();
const { protect, admin } = require('../../middleware/authMiddleware');

class LoggingRoutes {
    constructor({ loggingController }) {
        this.loggingController = loggingController;
    }

    getRoutes() {
        // All logging routes require admin role
        router.use(protect, admin);

        router.get('/logs', this.loggingController.getLogs);
        router.get('/stats', this.loggingController.getStats);
        router.get('/trace/:traceId', this.loggingController.getTrace);

        return router;
    }
}

module.exports = LoggingRoutes;
