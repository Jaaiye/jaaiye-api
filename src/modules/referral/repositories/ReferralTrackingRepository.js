/**
 * ReferralTrackingRepository
 * Mongoose implementation of IReferralTrackingRepository.
 */

const ReferralTrackingSchema = require('../entities/ReferralTracking.schema');
const ReferralTrackingEntity = require('../entities/ReferralTracking.entity');
const IReferralTrackingRepository = require('./interfaces/IReferralTrackingRepository');

class ReferralTrackingRepository extends IReferralTrackingRepository {
    _toEntity(doc) {
        if (!doc) return null;
        const data = doc.toObject ? doc.toObject() : doc;
        return new ReferralTrackingEntity({
            id: data._id?.toString() || data.id,
            influencerId: data.influencerId?.toString(),
            userId: data.userId?.toString(),
            referralCode: data.referralCode,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        });
    }

    async create(data) {
        const doc = await ReferralTrackingSchema.create(data);
        return this._toEntity(doc);
    }

    async findByUserId(userId) {
        const doc = await ReferralTrackingSchema.findOne({ userId });
        return this._toEntity(doc);
    }

    async findByInfluencerId(influencerId) {
        const docs = await ReferralTrackingSchema.find({ influencerId });
        return docs.map(doc => this._toEntity(doc));
    }
}

module.exports = ReferralTrackingRepository;
