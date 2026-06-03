/**
 * ReferralController
 */

class ReferralController {
    constructor({ referralService }) {
        this.referralService = referralService;
    }

    /**
     * Verify a referral code (Mobile standalone)
     * GET /v1/referrals/verify/:code
     */
    async verifyCode(req, res) {
        const { code } = req.params;
        const result = await this.referralService.verifyCode(code);

        // Status depends on validity to some extent, but 200 is safer for "checked successfully"
        return res.status(200).json({
            success: true,
            data: result,
            error: null
        });
    }

    /**
     * Create an influencer referral (Admin)
     * POST /v1/admin/referrals
     */
    async createInfluencer(req, res) {
        const { name, email, vanityCode } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                data: null,
                error: 'Name and Email are required'
            });
        }

        const code = await this.referralService.generateUniqueCode({ name, email, vanityCode });

        const influencer = await this.referralService.referralRepository.create({
            name,
            email,
            code,
            isActive: true
        });

        // Send the welcome email
        if (this.referralService.emailAdapter) {
            await this.referralService.emailAdapter.sendInfluencerWelcomeEmail({
                email: influencer.email,
                name: influencer.name,
                code: influencer.code
            });
        }

        return res.status(201).json({
            success: true,
            data: influencer.toJSON(),
            error: null
        });
    }

    /**
     * List all influencers (Admin)
     * GET /v1/admin/referrals
     */
    async listInfluencers(req, res) {
        const influencers = await this.referralService.referralRepository.findAll();
        return res.status(200).json({
            success: true,
            data: influencers.map(i => i.toJSON()),
            error: null
        });
    }
}

module.exports = ReferralController;
