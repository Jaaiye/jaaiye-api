/**
 * Database Connection Configuration
 * Handles MongoDB connection with retry logic and exponential backoff
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Retry configuration constants
const MAX_RETRIES = parseInt(process.env.MONGODB_MAX_RETRIES || '5', 10);
const INITIAL_RETRY_DELAY_MS = parseInt(process.env.MONGODB_RETRY_DELAY_MS || '1000', 10);
const MAX_RETRY_DELAY_MS = parseInt(process.env.MONGODB_MAX_RETRY_DELAY_MS || '30000', 10);
const RETRY_MULTIPLIER = 2;

/**
 * Calculate delay for retry with exponential backoff
 * @param {number} attemptNumber - Current attempt number (0-indexed)
 * @returns {number} Delay in milliseconds
 */
function calculateRetryDelay(attemptNumber) {
  const delay = INITIAL_RETRY_DELAY_MS * Math.pow(RETRY_MULTIPLIER, attemptNumber);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Connect to MongoDB with retry logic
 * @param {number} attemptNumber - Current attempt number (0-indexed)
 * @returns {Promise<mongoose.Connection>}
 */
async function connectWithRetry(attemptNumber = 0) {
  try {
    const options = {
      serverSelectionTimeoutMS: 5000, // 5 seconds timeout for server selection
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      connectTimeoutMS: 10000, // 10 seconds connection timeout
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    logger.info(`MongoDB Connected: ${conn.connection.host}`, {
      database: conn.connection.name,
      attempt: attemptNumber + 1
    });

    // Set up connection event handlers
    setupConnectionHandlers(conn.connection);

    return conn;
  } catch (error) {
    const isLastAttempt = attemptNumber >= MAX_RETRIES - 1;

    logger.error(`MongoDB connection attempt ${attemptNumber + 1} failed:`, {
      error: error.message,
      attempt: attemptNumber + 1,
      maxRetries: MAX_RETRIES,
      willRetry: !isLastAttempt
    });

    if (isLastAttempt) {
      logger.error('MongoDB connection failed after all retry attempts. Exiting process.', {
        totalAttempts: MAX_RETRIES,
        error: error.message
      });
      process.exit(1);
    }

    // Calculate delay and retry
    const delay = calculateRetryDelay(attemptNumber);
    logger.info(`Retrying MongoDB connection in ${delay}ms...`, {
      nextAttempt: attemptNumber + 2,
      maxRetries: MAX_RETRIES
    });

    await sleep(delay);
    return connectWithRetry(attemptNumber + 1);
  }
}

/**
 * Set up MongoDB connection event handlers
 * @param {mongoose.Connection} connection - Mongoose connection object
 */
function setupConnectionHandlers(connection) {
  connection.on('connected', () => {
    logger.info('MongoDB connection established');
  });

  connection.on('error', (error) => {
    logger.error('MongoDB connection error:', { error: error.message });
  });

  connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting to reconnect...');
  });

  connection.on('reconnected', () => {
    logger.info('MongoDB reconnected successfully');
  });

  // Handle process termination
  process.on('SIGINT', async () => {
    await connection.close();
    logger.info('MongoDB connection closed due to application termination');
    process.exit(0);
  });
}

/**
 * Main database connection function
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    await connectWithRetry();
  } catch (error) {
    logger.error('Fatal error in database connection:', { error: error.message });
    process.exit(1);
  }
};

module.exports = connectDB;