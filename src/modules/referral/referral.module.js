/**
 * ReferralModule
 * Dependency Injection container for Referral domain
 */

const { ReferralRepository, ReferralTrackingRepository } = require('./repositories');
const ReferralService = require('./services/ReferralService');
const ReferralController = require('./referral.controller');
const createReferralRoutes = require('./referral.routes');
const appEventEmitter = require('../../utils/events');

class ReferralModule {
    constructor() {
        this._instances = {};
        this._initializeListeners();
    }

    // REPOSITORIES
    getReferralRepository() {
        if (!this._instances.referralRepository) {
            this._instances.referralRepository = new ReferralRepository();
        }
        return this._instances.referralRepository;
    }

    getReferralTrackingRepository() {
        if (!this._instances.referralTrackingRepository) {
            this._instances.referralTrackingRepository = new ReferralTrackingRepository();
        }
        return this._instances.referralTrackingRepository;
    }

    // SERVICES
    getReferralService() {
        if (!this._instances.referralService) {
            // Lazy load EmailAdapter to avoid circular deps if any
            const EmailAdapter = require('../email/adapters/email.adapter');

            this._instances.referralService = new ReferralService({
                referralRepository: this.getReferralRepository(),
                referralTrackingRepository: this.getReferralTrackingRepository(),
                emailAdapter: new EmailAdapter()
            });
        }
        return this._instances.referralService;
    }

    // CONTROLLERS
    getReferralController() {
        if (!this._instances.referralController) {
            this._instances.referralController = new ReferralController({
                referralService: this.getReferralService()
            });
        }
        return this._instances.referralController;
    }

    // ROUTES
    getReferralRoutes() {
        return createReferralRoutes({
            referralController: this.getReferralController()
        });
    }

    // EVENT LISTENERS
    _initializeListeners() {
        appEventEmitter.on('auth.user.registered', async (data) => {
            try {
                const { userId, referralCode, metadata } = data;
                if (referralCode) {
                    const service = this.getReferralService();
                    await service.trackReferral(userId, referralCode, metadata);
                }
            } catch (error) {
                console.error('Error tracking referral from event:', error);
            }
        });
    }
}

module.exports = new ReferralModule();
