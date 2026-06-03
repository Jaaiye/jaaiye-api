/**
 * ReferralService
 * Application service for referral logic.
 */

const crypto = require('crypto');

class ReferralService {
    constructor({ referralRepository, referralTrackingRepository, emailAdapter }) {
        this.referralRepository = referralRepository;
        this.referralTrackingRepository = referralTrackingRepository;
        this.emailAdapter = emailAdapter;
    }

    /**
     * Generate a unique referral code
     * @param {Object} data - Influencer data
     * @returns {Promise<string>}
     */
    async generateUniqueCode(data) {
        const { name, email, vanityCode } = data;

        // 1. Priority: Vanity Code
        if (vanityCode && vanityCode.trim()) {
            const sanitizedVanity = vanityCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            const existing = await this.referralRepository.findByCode(sanitizedVanity);
            if (existing) {
                throw new Error(`Referral code "${sanitizedVanity}" is already in use.`);
            }
            return sanitizedVanity;
        }

        // 2. Priority: Name-based slug
        let baseCode = '';
        if (name) {
            baseCode = name.split(' ')[0].toUpperCase();
        } else if (email) {
            // 3. Priority: Email-based slug
            baseCode = email.split('@')[0].toUpperCase();
        }

        // Clean baseCode
        baseCode = baseCode.replace(/[^A-Z0-9]/g, '');
        if (!baseCode) baseCode = 'REF';

        let code = baseCode;
        let existing = await this.referralRepository.findByCode(code);

        // 4. Collision Handling: Append random 3-char suffix
        while (existing) {
            const suffix = crypto.randomBytes(2).toString('hex').slice(0, 3).toUpperCase();
            code = `${baseCode}-${suffix}`;
            existing = await this.referralRepository.findByCode(code);
        }

        return code;
    }

    /**
     * Verify a referral code
     * @param {string} code
     * @returns {Promise<Object>}
     */
    async verifyCode(code) {
        if (!code) return { isValid: false };

        const influencer = await this.referralRepository.findByCode(code.toUpperCase());

        if (!influencer || !influencer.isActive) {
            return { isValid: false };
        }

        return {
            isValid: true,
            influencerId: influencer.id,
            influencerName: influencer.name
        };
    }

    /**
     * Track a successful referral
     * @param {string} userId - Referred User ID
     * @param {string} code - Code used
     * @param {Object} options - metadata
     */
    async trackReferral(userId, code, { ipAddress, userAgent } = {}) {
        const verification = await this.verifyCode(code);
        if (!verification.isValid) return null;

        // Check if user was already referred
        const alreadyTracked = await this.referralTrackingRepository.findByUserId(userId);
        if (alreadyTracked) return null;

        // Log tracking
        const tracking = await this.referralTrackingRepository.create({
            influencerId: verification.influencerId,
            userId,
            referralCode: code.toUpperCase(),
            ipAddress,
            userAgent
        });

        // Increment usage
        const updatedInfluencer = await this.referralRepository.incrementUsage(verification.influencerId);

        // Send milestone email
        if (this.emailAdapter) {
            await this.emailAdapter.sendReferralSuccessEmail({
                email: updatedInfluencer.email,
                name: updatedInfluencer.name,
                currentCount: updatedInfluencer.usageCount
            });
        }

        return tracking;
    }
}

module.exports = ReferralService;
