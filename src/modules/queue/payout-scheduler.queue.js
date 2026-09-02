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

const TIMEZONE = 'Africa/Lagos';
const HOLD_CRON = '0 15 * * 2';   // Tuesday 15:00
const PAYOUT_CRON = '0 15 * * 4'; // Thursday 15:00

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
      return;
    }

    this._holdInProgress = true;
    try {
      logger.info('Payout hold job started');
      const summary = await this._getHoldUseCase().execute();
      logger.info('Payout hold job completed', summary);
    } catch (error) {
      logger.error('Payout hold job failed', { error: error.message, stack: error.stack });
    } finally {
      this._holdInProgress = false;
    }
  }

  async runPayout() {
    if (this._payoutInProgress) {
      logger.warn('Scheduled payout job already in progress, skipping this trigger');
      return;
    }

    this._payoutInProgress = true;
    try {
      logger.info('Scheduled payout job started');
      const summary = await this._getPayoutUseCase().execute();
      logger.info('Scheduled payout job completed', summary);
    } catch (error) {
      logger.error('Scheduled payout job failed', { error: error.message, stack: error.stack });
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
