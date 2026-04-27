/**
 * App Config Controller
 * Handles versioning and configuration endpoints
 */

const { asyncHandler } = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/response');

class AppConfigController {
    constructor({ getAppVersionUseCase, updateAppVersionUseCase }) {
        this.getAppVersionUseCase = getAppVersionUseCase;
        this.updateAppVersionUseCase = updateAppVersionUseCase;
    }

    /**
     * Get app version and update requirements
     * GET /app-config/version
     */
    getVersion = asyncHandler(async (req, res) => {
        const result = await this.getAppVersionUseCase.execute();
        return successResponse(res, result);
    });

    /**
     * Update app version and update requirements
     * PATCH /app-config/version
     */
    updateVersion = asyncHandler(async (req, res) => {
        const { latest_version, force_update } = req.body;
        await this.updateAppVersionUseCase.execute({
            version: latest_version,
            force_update: force_update
        });

        return successResponse(res, null, 200, 'App version updated successfully');
    });
}

module.exports = AppConfigController;
