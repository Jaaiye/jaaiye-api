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
  // Admin-only: payout scheduler manual controls (off-cycle testing/ops
  // override - the scheduler otherwise only runs Tue/Thu on its own cron).
  // Static paths, registered before the /:ownerType/:ownerId routes below
  // so they're never shadowed by the param routes.
  router.get(
    '/admin/payout-scheduler/status',
    apiLimiter,
    protect,
    admin,
    walletController.getPayoutSchedulerStatus
  );

  router.post(
    '/admin/payout-scheduler/run-hold',
    apiLimiter,
    protect,
    admin,
    walletController.runPayoutSchedulerHold
  );

  router.post(
    '/admin/payout-scheduler/run-payout',
    apiLimiter,
    protect,
    admin,
    walletController.runPayoutSchedulerPayout
  );

  // Get withdrawal details - static path, must be registered before the
  // /:ownerType/:ownerId param route below, which would otherwise greedily
  // match '/withdrawals/:withdrawalId' as ownerType='withdrawals' and make
  // this route unreachable.
  router.get(
    '/withdrawals/:withdrawalId',
    apiLimiter,
    protect,
    validate,
    walletController.getWithdrawalDetails
  );

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

  // Admin-only: manually trigger a withdrawal (support/edge-case override).
  // Organizers no longer trigger this themselves - payouts run automatically
  // on a weekly schedule (see PayoutSchedulerQueue).
  router.post(
    '/:ownerType/:ownerId/withdraw',
    apiLimiter,
    protect,
    admin,
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

  return router;
}

module.exports = createWalletRoutes;

