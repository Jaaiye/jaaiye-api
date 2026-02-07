/**
 * Logging Module
 * Dependency Injection container for Logging domain
 */
const GetLogsUseCase = require('./use-cases/GetLogsUseCase');
const GetLogStatsUseCase = require('./use-cases/GetLogStatsUseCase');
const LoggingController = require('./logging.controller');
const LoggingRoutes = require('./logging.routes');

class LoggingModule {
    constructor() {
        // Use cases
        this._getLogsUseCase = new GetLogsUseCase();
        this._getLogStatsUseCase = new GetLogStatsUseCase();

        // Controller
        this._loggingController = new LoggingController({
            getLogsUseCase: this._getLogsUseCase,
            getLogStatsUseCase: this._getLogStatsUseCase
        });

        // Routes
        this._loggingRoutes = new LoggingRoutes({
            loggingController: this._loggingController
        });
    }

    getLoggingRoutes() {
        return this._loggingRoutes.getRoutes();
    }
}

module.exports = new LoggingModule();
