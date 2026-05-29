/**
 * IReferralTrackingRepository
 * Interface for referral tracking persistence.
 */

class IReferralTrackingRepository {
    async create(data) {
        throw new Error('Not implemented');
    }

    async findByUserId(userId) {
        throw new Error('Not implemented');
    }

    async findByInfluencerId(influencerId) {
        throw new Error('Not implemented');
    }
}

module.exports = IReferralTrackingRepository;
