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
     * @swagger
     * /app-config/version:
     *   get:
     *     summary: Get app version and update requirements
     *     tags: [AppConfig]
     *     responses:
     *       200:
     *         description: Version info
     */
    getVersion = asyncHandler(async (req, res) => {
        const result = await this.getAppVersionUseCase.execute();
        return successResponse(res, result);
    });

    /**
     * @swagger
     * /app-config/version:
     *   patch:
     *     summary: Update app version and update requirements
     *     tags: [AppConfig]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               latest_version:
     *                 type: string
     *               force_update:
     *                 type: boolean
     *     responses:
     *       200:
     *         description: App version updated
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
