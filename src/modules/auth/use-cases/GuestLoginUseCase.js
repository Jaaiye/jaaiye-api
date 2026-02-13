/**
 * Guest Login Use Case
 * Handles guest login business logic
 */

const { UserEntity } = require('../../common/entities');
const { TokenService } = require('../../common/services');
const { addDaysToNow } = require('../../../utils/dateUtils');
const { v4: uuidv4 } = require('uuid');

class GuestLoginUseCase {
    constructor({ userRepository, firebaseAdapter, calendarAdapter }) {
        this.userRepository = userRepository;
        this.firebaseAdapter = firebaseAdapter;
        this.calendarAdapter = calendarAdapter;
    }

    /**
     * Execute guest login
     * @returns {Promise<Object>} { user, accessToken, refreshToken, firebaseToken }
     */
    async execute() {
        const guestId = uuidv4();
        const guestSuffix = guestId.substring(0, 4);

        // Generate random guest details
        const adjectives = ['Cool', 'Swift', 'Dynamic', 'Bright', 'Epic', 'Modern', 'Sleek'];
        const nouns = ['Voyager', 'Explorer', 'Guest', 'Adventurer', 'User', 'Friend'];
        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

        const fullName = `Guest ${randomAdjective} ${randomNoun}`;
        const username = `guest_${guestSuffix}_${Math.floor(Math.random() * 1000)}`;
        const email = `${username}@jaaiye.com`;

        // Create guest user in database
        const guestUser = await this.userRepository.create({
            email,
            username,
            fullName,
            isGuest: true,
            emailVerified: true, // Guests are pre-verified to allow access
            isActive: true,
            role: 'user',
            profilePicture: {
                emoji: '👤',
                backgroundColor: '#F3F4F6'
            }
        });

        const userEntity = new UserEntity(guestUser);

        // Auto-create calendar for guest
        if (this.calendarAdapter) {
            try {
                await this.calendarAdapter.createDefaultCalendar(userEntity.id, userEntity.fullName || userEntity.username);
            } catch (error) {
                console.error('[GuestLoginUseCase] Failed to create guest calendar:', error);
            }
        }

        // Generate tokens
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
}

module.exports = GuestLoginUseCase;
