/**
 * App Config Module
 * Dependency Injection container for App Config domain
 */

const VersionService = require('./services/VersionService');
const GetAppVersionUseCase = require('./use-cases/GetAppVersionUseCase');
const UpdateAppVersionUseCase = require('./use-cases/UpdateAppVersionUseCase');
const AppConfigController = require('./app-config.controller');
const createAppConfigRoutes = require('./app-config.routes');

// Import Auth Module for middleware
const authModule = require('../auth/auth.module');

class AppConfigModule {
    constructor() {
        this._instances = {};
    }

    getVersionService() {
        if (!this._instances.versionService) {
            this._instances.versionService = new VersionService();
        }
        return this._instances.versionService;
    }

    getGetAppVersionUseCase() {
        if (!this._instances.getAppVersionUseCase) {
            this._instances.getAppVersionUseCase = new GetAppVersionUseCase({
                versionService: this.getVersionService()
            });
        }
        return this._instances.getAppVersionUseCase;
    }

    getUpdateAppVersionUseCase() {
        if (!this._instances.updateAppVersionUseCase) {
            this._instances.updateAppVersionUseCase = new UpdateAppVersionUseCase({
                versionService: this.getVersionService()
            });
        }
        return this._instances.updateAppVersionUseCase;
    }

    getAppConfigController() {
        if (!this._instances.appConfigController) {
            this._instances.appConfigController = new AppConfigController({
                getAppVersionUseCase: this.getGetAppVersionUseCase(),
                updateAppVersionUseCase: this.getUpdateAppVersionUseCase()
            });
        }
        return this._instances.appConfigController;
    }

    getAppConfigRoutes() {
        return createAppConfigRoutes({
            appConfigController: this.getAppConfigController(),
            authMiddleware: authModule.getAuthMiddleware()
        });
    }
}

module.exports = new AppConfigModule();
