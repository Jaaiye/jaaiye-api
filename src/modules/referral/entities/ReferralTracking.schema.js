/**
 * ReferralTracking Mongoose Schema
 * Infrastructure layer - persistence model for tracking individual referral uses.
 */

const mongoose = require('mongoose');

const referralTrackingSchema = new mongoose.Schema({
    influencerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InfluencerReferral',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    referralCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    }
}, {
    timestamps: true
});

// Ensure a user can only be referred into the system once (if that's the logic)
// But since the user said "track referrals", we might allow multiple if applicable.
// For Influencer campaigns, usually it's one-time attribution per sign-up.
referralTrackingSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.models.ReferralTracking || mongoose.model('ReferralTracking', referralTrackingSchema);
