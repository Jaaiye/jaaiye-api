/**
 * Convert Guest Use Case
 * Upgrades a guest user into a permanent user account
 */

const { ValidationError } = require('../errors');
const { EmailAlreadyInUseError, UnauthorizedError } = require('../../common/errors');
const { PasswordService, TokenService } = require('../../common/services');
const { addDaysToNow } = require('../../../utils/dateUtils');

class ConvertGuestUseCase {
    constructor({ userRepository, emailService, emailQueue, firebaseAdapter }) {
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.emailQueue = emailQueue;
        this.firebaseAdapter = firebaseAdapter;
    }

    /**
     * Execute guest conversion
     * @param {string} userId - Current guest user ID
     * @param {ConvertGuestDTO} dto - Conversion data (email, password, fullName)
     * @returns {Promise<Object>} { user, accessToken, refreshToken }
     */
    async execute(userId, dto) {
        // Validate DTO
        const validation = dto.validate();
        if (!validation.valid) {
            throw new ValidationError(validation.errors.join(', '));
        }

        // Verify user exists and is a guest
        const guestUser = await this.userRepository.findById(userId);
        if (!guestUser) {
            throw new UnauthorizedError('User not found');
        }
        if (!guestUser.isGuest) {
            throw new ValidationError('User is already a permanent account');
        }

        // Check if new email is already in use
        const emailExists = await this.userRepository.emailExists(dto.email);
        if (emailExists) {
            throw new EmailAlreadyInUseError();
        }

        // Hash new password
        const hashedPassword = await PasswordService.hash(dto.password);

        // Generate verification code
        const verificationCode = PasswordService.generateVerificationCode();
        const codeExpiry = addDaysToNow(1); // 24 hours from now (UTC)

        // Update guest user to real user
        const username = dto.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random() * 1000);

        const userEntity = await this.userRepository.update(userId, {
            email: dto.email,
            password: hashedPassword,
            fullName: dto.fullName,
            username: username,
            isGuest: false,
            emailVerified: false, // Must verify real email
            verification: {
                code: verificationCode,
                expires: codeExpiry
            }
        });

        // Send verification email
        this._sendVerificationEmail(userEntity, verificationCode).catch(err => {
            console.error('[ConvertGuestUseCase] Failed to send verification email:', err);
        });

        // Generate new tokens
        const accessToken = TokenService.generateAccessToken(userEntity);
        const refreshToken = TokenService.generateRefreshToken(userEntity.id);
        const firebaseToken = this.firebaseAdapter
            ? await this.firebaseAdapter.generateToken(userEntity.id)
            : null;

        // Save refresh token to user
        const refreshExpiry = addDaysToNow(90);
        await this.userRepository.updateRefreshData(userEntity.id, {
            refreshToken,
            firebaseToken,
            refreshExpiry
        });

        return {
            user: userEntity,
            accessToken,
            refreshToken,
            firebaseToken
        };
    }

    /**
     * Send verification email (private helper)
     * @private
     */
    async _sendVerificationEmail(user, code) {
        if (this.emailQueue) {
            await this.emailQueue.sendVerificationEmailAsync(
                user.email,
                code,
                user.fullName || 'User'
            );
        } else if (this.emailService) {
            await this.emailService.sendVerificationEmail({
                to: user.email,
                name: user.fullName,
                code
            });
        }
    }
}

module.exports = ConvertGuestUseCase;
