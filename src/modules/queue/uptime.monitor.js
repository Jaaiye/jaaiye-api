/**
 * Uptime Monitor
 * Periodic heartbeat and system health checks
 */

const logger = require('../../utils/logger');
const axios = require('axios');
const mongoose = require('mongoose');

class UptimeMonitor {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.pingInterval = 60 * 1000; // 1 minute
        this.emailAdapter = null;
        this.consecutiveFailures = 0;
        this.alertThreshold = 3; // Alert after 3 consecutive failures
    }

    // Inject dependencies
    init({ emailAdapter }) {
        this.emailAdapter = emailAdapter;
    }

    // Start the heartbeat job
    start() {
        if (this.isRunning) {
            logger.warn('Uptime monitor is already running');
            return;
        }

        this.isRunning = true;
        logger.info('Starting uptime monitor', { intervalMs: this.pingInterval });

        // Run immediately on start
        this.performCheck();

        // Schedule recurring checks
        this.intervalId = setInterval(() => {
            this.performCheck();
        }, this.pingInterval);
    }

    // Stop the job
    stop() {
        if (!this.isRunning) return;

        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        logger.info('Uptime monitor stopped');
    }

    async performCheck() {
        const isProduction = process.env.NODE_ENV === 'production';
        let healthIssues = [];

        // 1. Check MongoDB Connection
        const dbState = mongoose.connection.readyState;
        if (dbState !== 1) {
            healthIssues.push(`Database connection issue: State is ${dbState}`);
        }

        // 2. Check External Heartbeat (Optional)
        const heartbeatUrl = process.env.UPTIME_HEARTBEAT_URL;
        if (heartbeatUrl) {
            try {
                await axios.get(heartbeatUrl);
            } catch (error) {
                healthIssues.push(`Heartbeat ping failed: ${error.message}`);
            }
        }

        // Process Issues
        if (healthIssues.length > 0) {
            this.consecutiveFailures++;
            logger.error('System Health Check Failed', { issues: healthIssues, consecutiveFailures: this.consecutiveFailures });

            // Send alert if threshold reached and it's production
            if (this.consecutiveFailures >= this.alertThreshold && isProduction && this.emailAdapter) {
                await this.emailAdapter.sendSystemAlert(
                    'CRITICAL SYSTEM DOWN',
                    `Multiple health checks have failed consecutively:\n\n${healthIssues.join('\n')}`
                );
            }
        } else {
            if (this.consecutiveFailures > 0) {
                logger.info('System Health Restored');
                if (isProduction && this.emailAdapter) {
                    await this.emailAdapter.sendSystemAlert('System Restored', 'All health checks are passing again.');
                }
            }
            this.consecutiveFailures = 0;
            logger.debug('System Health Check Passed');
        }
    }
}

module.exports = new UptimeMonitor();
