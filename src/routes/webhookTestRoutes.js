/**
 * Webhook Test Endpoint
 * Helps verify that Flutterwave webhooks can reach the server
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Test endpoint for Flutterwave to verify webhook connectivity
router.post('/flutterwave/test', express.json({ type: '*/*' }), (req, res) => {
    try {
        logger.info('Flutterwave webhook test received', {
            headers: req.headers,
            body: req.body,
            timestamp: new Date().toISOString()
        });

        // Log specific webhook headers
        const webhookHeaders = {
            'verif-hash': req.headers['verif-hash'],
            'flutterwave-signature': req.headers['flutterwave-signature'],
            'content-type': req.headers['content-type'],
            'user-agent': req.headers['user-agent']
        };

        logger.info('Webhook headers:', webhookHeaders);

        // Respond immediately to acknowledge receipt
        res.status(200).json({
            status: 'success',
            message: 'Webhook test received successfully',
            timestamp: new Date().toISOString(),
            receivedHeaders: Object.keys(req.headers),
            receivedBody: !!req.body
        });

    } catch (error) {
        logger.error('Error processing webhook test', {
            error: error.message,
            stack: error.stack
        });

        res.status(200).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// GET endpoint for simple connectivity test
router.get('/flutterwave/test', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Webhook endpoint is reachable',
        timestamp: new Date().toISOString(),
        url: req.originalUrl
    });
});

module.exports = router;
