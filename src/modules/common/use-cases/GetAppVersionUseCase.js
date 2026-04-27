/**
 * Get App Version Use Case
 * Retrieves the latest version and force update status
 */

class GetAppVersionUseCase {
    constructor({ versionService }) {
        this.versionService = versionService;
    }

    async execute() {
        return await this.versionService.getVersionInfo();
    }
}

module.exports = GetAppVersionUseCase;
