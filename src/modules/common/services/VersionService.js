/**
 * Version Service
 * Handles reading and writing app version configuration to Redis
 */

const redisClient = require('../../../utils/redis');
const logger = require('../../../utils/logger');

class VersionService {
    constructor() {
        this.KEY = 'app:config:version';
    }

    /**
     * Get latest version info
     * @returns {Promise<{latest_version: string, force_update: boolean}>}
     */
    async getVersionInfo() {
        try {
            const info = await redisClient.hGetAll(this.KEY);

            // Default values if not set
            if (!info || Object.keys(info).length === 0) {
                return {
                    latest_version: '1.0.0',
                    force_update: false
                };
            }

            return {
                latest_version: info.latest_version,
                force_update: info.force_update === 'true'
            };
        } catch (error) {
            logger.error('Error fetching version info from Redis', error);
            // Fallback to defaults
            return {
                latest_version: '1.0.0',
                force_update: false
            };
        }
    }

    /**
     * Update version info
     * @param {string} version 
     * @param {boolean} forceUpdate 
     */
    async updateVersionInfo(version, forceUpdate) {
        try {
            await redisClient.hSet(this.KEY, {
                latest_version: version,
                force_update: String(forceUpdate)
            });
            return true;
        } catch (error) {
            logger.error('Error updating version info in Redis', error);
            throw error;
        }
    }
}

module.exports = VersionService;
