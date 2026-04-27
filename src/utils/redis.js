const redis = require('redis');
const logger = require('./logger');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const client = redis.createClient({
    url: REDIS_URL
});

client.on('error', (err) => {
    logger.error('Redis Client Error', err);
});

client.on('connect', () => {
    logger.info('Connected to Redis');
});

// Immediately invoke connection
(async () => {
    try {
        await client.connect();
    } catch (err) {
        logger.error('Failed to connect to Redis', err);
    }
})();

module.exports = client;
