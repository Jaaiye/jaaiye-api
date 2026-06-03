/**
 * ReferralRepository
 * Mongoose implementation of IReferralRepository.
 */

const InfluencerReferralSchema = require('../entities/InfluencerReferral.schema');
const InfluencerReferralEntity = require('../entities/InfluencerReferral.entity');
const IReferralRepository = require('./interfaces/IReferralRepository');

class ReferralRepository extends IReferralRepository {
    _toEntity(doc) {
        if (!doc) return null;
        const data = doc.toObject ? doc.toObject() : doc;
        return new InfluencerReferralEntity({
            id: data._id?.toString() || data.id,
            name: data.name,
            email: data.email,
            code: data.code,
            isActive: data.isActive,
            usageCount: data.usageCount,
            meta: data.meta,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        });
    }

    async create(data) {
        const doc = await InfluencerReferralSchema.create(data);
        return this._toEntity(doc);
    }

    async findById(id) {
        const doc = await InfluencerReferralSchema.findById(id);
        return this._toEntity(doc);
    }

    async findByCode(code) {
        const doc = await InfluencerReferralSchema.findOne({
            code: code.toUpperCase()
        });
        return this._toEntity(doc);
    }

    async findByEmail(email) {
        const doc = await InfluencerReferralSchema.findOne({
            email: email.toLowerCase()
        });
        return this._toEntity(doc);
    }

    async incrementUsage(id) {
        const doc = await InfluencerReferralSchema.findByIdAndUpdate(
            id,
            { $inc: { usageCount: 1 } },
            { new: true }
        );
        return this._toEntity(doc);
    }

    async findAll(options = {}) {
        const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;
        const docs = await InfluencerReferralSchema.find()
            .sort(sort)
            .skip(skip)
            .limit(limit);
        return docs.map(doc => this._toEntity(doc));
    }
}

module.exports = ReferralRepository;
