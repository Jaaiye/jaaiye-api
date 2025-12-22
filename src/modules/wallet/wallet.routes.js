/**
 * Wallet Routes
 * Presentation layer - route definitions
 */

const express = require('express');
const router = express.Router();

const { apiLimiter } = require('../../middleware/securityMiddleware');
const { protect, admin } = require('../../middleware/authMiddleware');
const { validate } = require('../../middleware/validationMiddleware');

function createWalletRoutes(walletController) {
  // Get wallet details (balance + ledger)
  router.get(
    '/:ownerType/:ownerId',
    apiLimiter,
    protect,
    validate,
    walletController.getWalletDetails
  );

  // Get wallet ledger entries only
  router.get(
    '/:ownerType/:ownerId/ledger',
    apiLimiter,
    protect,
    validate,
    walletController.getWalletLedger
  );

  // Platform wallet (no ownerId)
  router.get(
    '/PLATFORM',
    apiLimiter,
    protect,
    validate,
    (req, res, next) => {
      // Rewrite to use PLATFORM as ownerType and null as ownerId
      req.params.ownerType = 'PLATFORM';
      req.params.ownerId = null;
      walletController.getWalletDetails(req, res, next);
    }
  );

  // Admin-only: Adjust wallet balance
  router.post(
    '/:ownerType/:ownerId/adjust',
    apiLimiter,
    protect,
    admin,
    validate,
    walletController.adjustWalletBalance
  );

  // Admin-only: Adjust platform wallet
  router.post(
    '/PLATFORM/adjust',
    apiLimiter,
    protect,
    admin,
    validate,
    (req, res, next) => {
      req.params.ownerType = 'PLATFORM';
      req.params.ownerId = null;
      walletController.adjustWalletBalance(req, res, next);
    }
  );

  // Request withdrawal with payout
  router.post(
    '/:ownerType/:ownerId/withdraw',
    apiLimiter,
    protect,
    validate,
    walletController.requestWithdrawal
  );

  // Get withdrawals for a wallet
  router.get(
    '/:ownerType/:ownerId/withdrawals',
    apiLimiter,
    protect,
    validate,
    walletController.getWalletWithdrawals
  );

  // Get withdrawal details
  router.get(
    '/withdrawals/:withdrawalId',
    apiLimiter,
    protect,
    validate,
    walletController.getWithdrawalDetails
  );

  return router;
}

module.exports = createWalletRoutes;

