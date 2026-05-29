/**
 * IReferralRepository
 * Interface for referral persistence.
 */

class IReferralRepository {
    async create(data) {
        throw new Error('Not implemented');
    }

    async findById(id) {
        throw new Error('Not implemented');
    }

    async findByCode(code) {
        throw new Error('Not implemented');
    }

    async findByEmail(email) {
        throw new Error('Not implemented');
    }

    async incrementUsage(id) {
        throw new Error('Not implemented');
    }

    async findAll(options) {
        throw new Error('Not implemented');
    }
}

module.exports = IReferralRepository;
