/**
 * Sends an email alert for unhandled/programming errors in production.
 * Never throws — a failure here must never affect the request/process it was
 * triggered by. Throttled per error signature to avoid inbox floods during
 * an outage (see errorAlertThrottle.js).
 */

const logger = require('./logger');
const { shouldSkipAlert } = require('./errorAlertThrottle');

/**
 * @param {Error} error
 * @param {Object} context - sanitized request/process context (method, url, path, userId, statusCode, traceId)
 * @returns {Promise<void>}
 */
const notifyServerError = async (error, context = {}) => {
  if (process.env.NODE_ENV !== 'production') return;

  const key = `${error.name || 'Error'}:${error.message}:${context.path || ''}`;
  if (shouldSkipAlert(key)) return;

  try {
    // Lazy require — avoids loading the mailer client on every module init
    const EmailAdapter = require('../modules/ticket/services/EmailAdapter');
    const emailAdapter = new EmailAdapter();
    await emailAdapter.sendErrorAlert(error, context);
  } catch (sendError) {
    logger.error('Failed to send error alert email', { error: sendError.message });
  }
};

module.exports = { notifyServerError };
