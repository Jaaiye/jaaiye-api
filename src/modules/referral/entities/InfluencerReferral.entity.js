/**
 * InfluencerReferral Entity
 * Core business representation of an influencer referral program.
 */

class InfluencerReferralEntity {
    constructor({
        id,
        name,
        email,
        code,
        isActive = true,
        usageCount = 0,
        meta = {},
        createdAt,
        updatedAt
    }) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.code = code;
        this.isActive = isActive;
        this.usageCount = usageCount;
        this.meta = meta;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            code: this.code,
            isActive: this.isActive,
            usageCount: this.usageCount,
            meta: this.meta,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = InfluencerReferralEntity;
