/**
 * ReferralTracking Entity
 * Core business representation of a referral link usage.
 */

class ReferralTrackingEntity {
    constructor({
        id,
        influencerId,
        userId,
        referralCode,
        ipAddress,
        userAgent,
        createdAt,
        updatedAt
    }) {
        this.id = id;
        this.influencerId = influencerId;
        this.userId = userId;
        this.referralCode = referralCode;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    toJSON() {
        return {
            id: this.id,
            influencerId: this.influencerId,
            userId: this.userId,
            referralCode: this.referralCode,
            ipAddress: this.ipAddress,
            userAgent: this.userAgent,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = ReferralTrackingEntity;
