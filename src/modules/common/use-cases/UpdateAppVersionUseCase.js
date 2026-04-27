/**
 * Update App Version Use Case
 * Updates the latest version and force update status in Redis
 */

class UpdateAppVersionUseCase {
    constructor({ versionService }) {
        this.versionService = versionService;
    }

    async execute({ version, force_update }) {
        // Basic validation
        if (!version) {
            throw new Error('Version is required');
        }

        return await this.versionService.updateVersionInfo(version, force_update);
    }
}

module.exports = UpdateAppVersionUseCase;
