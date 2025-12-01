/**
 * Webhook Routes
 * Infrastructure layer - external webhook handlers
 * Uses new domain repositories
 */

const express = require('express');
const router = express.Router();
const { syncQueue } = require('../queues');
const paymentContainer = require('../domains/payment/config/container');
const sharedContainer = require('../domains/shared/config/container');

// Google Calendar webhook
// POST /webhooks/google/calendar
router.post('/google/calendar', async (req, res) => {
  try {
    const channelToken = req.get('X-Goog-Channel-Token');
    const resourceId = req.get('X-Goog-Resource-Id');
    const state = req.get('X-Goog-Resource-State');
    const channelId = req.get('X-Goog-Channel-Id');

    if (!resourceId || !channelId) {
      return res.status(200).end(); // Acknowledge but ignore
    }

    // Optionally verify token if set
    if (process.env.GOOGLE_CHANNEL_TOKEN && channelToken !== process.env.GOOGLE_CHANNEL_TOKEN) {
      return res.status(200).end();
    }

    // Find the user who has this resource/channel registered
    const userRepository = sharedContainer.getUserRepository();
    const user = await userRepository.findByGoogleCalendarResourceId(resourceId);

    if (user) {
      syncQueue.add({
        type: 'googleIncrementalSync',
        userId: user.id,
        resourceId,
        channelId,
        state
      });
    }

    return res.status(200).end();
  } catch (err) {
    return res.status(200).end();
  }
});

// Paystack webhook
router.post('/paystack', express.json({ type: '*/*' }), paymentContainer.getPaymentController().handlePaystackWebhook);

// Flutterwave webhook
router.post('/flutterwave', express.json({ type: '*/*' }), paymentContainer.getPaymentController().handleFlutterwaveWebhook);

module.exports = router;
