/**
 * InfluencerReferral Mongoose Schema
 * Infrastructure layer - persistence model for influencer referral programs.
 */

const mongoose = require('mongoose');

const influencerReferralSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    usageCount: {
        type: Number,
        default: 0
    },
    meta: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.InfluencerReferral || mongoose.model('InfluencerReferral', influencerReferralSchema);
