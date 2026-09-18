/**
 * Payout Scheduler Queue
 * Runs the weekly automated organizer payout cycle:
 *   - Tuesday 3pm (Africa/Lagos): hold whatever each wallet currently holds
 *   - Thursday 3pm (Africa/Lagos): pay out whatever was held on Tuesday
 *
 * The Tuesday/Thursday gap gives Flutterwave's 24-48h settlement lag room
 * to clear before money leaves the platform's account.
 */

const cron = require('node-cron');
const logger = require('../../utils/logger');
const { withLock } = require('../../utils/distributedLock');

const TIMEZONE = 'Africa/Lagos';
const HOLD_CRON = '0 15 * * 2';   // Tuesday 15:00
const PAYOUT_CRON = '0 15 * * 4'; // Thursday 15:00

// Redis-backed - guards against this job running twice if the backend is
// ever scaled to more than one instance. The in-memory _holdInProgress /
// _payoutInProgress flags above only protect within a single process.
const HOLD_LOCK_TTL_MS = 30 * 60 * 1000;   // 30 minutes
const PAYOUT_LOCK_TTL_MS = 60 * 60 * 1000; // 60 minutes - one Flutterwave transfer call per wallet

class PayoutSchedulerQueue {
  constructor() {
    this.isRunning = false;
    this.holdTask = null;
    this.payoutTask = null;
    this._holdUseCase = null;
    this._payoutUseCase = null;
    // Guards against a slow run still executing when the next tick fires -
    // node-cron won't overlap the same task, but this also protects
    // against the two tasks somehow firing back to back.
    this._holdInProgress = false;
    this._payoutInProgress = false;
  }

  _getHoldUseCase() {
    if (!this._holdUseCase) {
      const walletModule = require('../wallet/wallet.module');
      this._holdUseCase = walletModule.getHoldWalletsForPayoutUseCase();
    }
    return this._holdUseCase;
  }

  _getPayoutUseCase() {
    if (!this._payoutUseCase) {
      const walletModule = require('../wallet/wallet.module');
      this._payoutUseCase = walletModule.getProcessScheduledPayoutsUseCase();
    }
    return this._payoutUseCase;
  }

  start() {
    if (this.isRunning) {
      logger.warn('Payout scheduler queue is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting payout scheduler queue', { holdCron: HOLD_CRON, payoutCron: PAYOUT_CRON, timezone: TIMEZONE });

    this.holdTask = cron.schedule(HOLD_CRON, () => this.runHold(), { timezone: TIMEZONE });
    this.payoutTask = cron.schedule(PAYOUT_CRON, () => this.runPayout(), { timezone: TIMEZONE });
  }

  stop() {
    if (!this.isRunning) {
      logger.warn('Payout scheduler queue is not running');
      return;
    }

    this.isRunning = false;
    if (this.holdTask) {
      this.holdTask.stop();
      this.holdTask = null;
    }
    if (this.payoutTask) {
      this.payoutTask.stop();
      this.payoutTask = null;
    }
    logger.info('Payout scheduler queue stopped');
  }

  async runHold() {
    if (this._holdInProgress) {
      logger.warn('Payout hold job already in progress, skipping this trigger');
      return { ran: false, reason: 'already_in_progress' };
    }

    this._holdInProgress = true;
    try {
      logger.info('Payout hold job started');
      const outcome = await withLock('payout-scheduler:hold', HOLD_LOCK_TTL_MS, () =>
        this._getHoldUseCase().execute()
      );
      if (outcome.ran) {
        logger.info('Payout hold job completed', outcome.result);
        return { ran: true, summary: outcome.result };
      }
      return { ran: false, reason: 'lock_not_acquired' };
    } catch (error) {
      logger.error('Payout hold job failed', { error: error.message, stack: error.stack });
      return { ran: false, reason: 'error', error: error.message };
    } finally {
      this._holdInProgress = false;
    }
  }

  async runPayout() {
    if (this._payoutInProgress) {
      logger.warn('Scheduled payout job already in progress, skipping this trigger');
      return { ran: false, reason: 'already_in_progress' };
    }

    this._payoutInProgress = true;
    try {
      logger.info('Scheduled payout job started');
      const outcome = await withLock('payout-scheduler:payout', PAYOUT_LOCK_TTL_MS, () =>
        this._getPayoutUseCase().execute()
      );
      if (outcome.ran) {
        logger.info('Scheduled payout job completed', outcome.result);
        return { ran: true, summary: outcome.result };
      }
      return { ran: false, reason: 'lock_not_acquired' };
    } catch (error) {
      logger.error('Scheduled payout job failed', { error: error.message, stack: error.stack });
      return { ran: false, reason: 'error', error: error.message };
    } finally {
      this._payoutInProgress = false;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      holdCron: HOLD_CRON,
      payoutCron: PAYOUT_CRON,
      timezone: TIMEZONE,
      holdInProgress: this._holdInProgress,
      payoutInProgress: this._payoutInProgress
    };
  }
}

module.exports = new PayoutSchedulerQueue();
