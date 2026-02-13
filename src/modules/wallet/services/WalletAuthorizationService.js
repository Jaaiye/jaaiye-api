/**
 * WalletAuthorizationService
 * Centralized authorization logic for wallet access
 * 
 * Responsibilities:
 * - Check if user can VIEW wallet (balance, ledger, withdrawals)
 * - Check if user can WITHDRAW from wallet
 * - Verify ownership/permissions for EVENT and GROUP wallets
 */

class WalletAuthorizationService {
    constructor({ eventRepository, groupRepository }) {
        this.eventRepository = eventRepository;
        this.groupRepository = groupRepository;
    }

    /**
     * Check if user can view wallet details
     * 
     * Rules:
     * - EVENT: creator, co-organizers (accepted), or admins
     * - GROUP: creator, admins, or members
     * - PLATFORM: admins only
     * 
     * @param {Object} params
     * @param {'EVENT'|'GROUP'|'PLATFORM'} params.ownerType
     * @param {string|null} params.ownerId
     * @param {string} params.userId
     * @param {boolean} params.isAdmin - Is the user a system admin?
     * @returns {Promise<{allowed: boolean, reason?: string}>}
     */
    async canViewWallet({ ownerType, ownerId, userId, isAdmin = false }) {
        // Platform wallet - admins only
        if (ownerType === 'PLATFORM') {
            return {
                allowed: isAdmin,
                reason: isAdmin ? undefined : 'Only admins can view platform wallet'
            };
        }

        // EVENT wallet
        if (ownerType === 'EVENT') {
            const event = await this.eventRepository.findByIdOrSlug(ownerId);
            if (!event) {
                return { allowed: false, reason: 'Event not found' };
            }

            // Check if user is the creator
            if (event.creatorId && String(event.creatorId) === String(userId)) {
                return { allowed: true, resolvedOwnerId: event.id };
            }

            // Check if user is an accepted co-organizer
            const EventTeam = require('../../../models/EventTeam');
            const teamMember = await EventTeam.findOne({
                event: ownerId,
                user: userId,
                role: 'co_organizer',
                status: 'accepted'
            });

            if (teamMember) {
                return { allowed: true, resolvedOwnerId: event.id };
            }

            // Admins can view any event wallet
            if (isAdmin) {
                return { allowed: true, resolvedOwnerId: event.id };
            }

            return {
                allowed: false,
                reason: 'You do not have permission to view this event wallet'
            };
        }

        // GROUP wallet
        if (ownerType === 'GROUP') {
            const group = await this.groupRepository.findById(ownerId);
            if (!group) {
                return { allowed: false, reason: 'Group not found' };
            }

            // Check if user is the creator
            if (group.creator && String(group.creator) === String(userId)) {
                return { allowed: true, resolvedOwnerId: group.id };
            }

            // Check if user is an admin member
            if (group.isAdmin(userId)) {
                return { allowed: true, resolvedOwnerId: group.id };
            }

            // Check if user is a member (can view but not withdraw)
            if (group.isMember(userId)) {
                return { allowed: true, resolvedOwnerId: group.id };
            }

            // System admins can view any group wallet
            if (isAdmin) {
                return { allowed: true, resolvedOwnerId: group.id };
            }

            return {
                allowed: false,
                reason: 'You do not have permission to view this group wallet'
            };
        }

        return { allowed: false, reason: 'Invalid ownerType' };
    }

    /**
     * Check if user can withdraw from wallet
     * 
     * Rules (stricter than viewing):
     * - EVENT: only creator of user-origin events
     * - GROUP: only group creator
     * - PLATFORM: no one (withdrawals not supported)
     * 
     * @param {Object} params
     * @param {'EVENT'|'GROUP'} params.ownerType
     * @param {string} params.ownerId
     * @param {string} params.userId
     * @returns {Promise<{allowed: boolean, reason?: string}>}
     */
    async canWithdrawFromWallet({ ownerType, ownerId, userId }) {
        if (ownerType === 'PLATFORM') {
            return {
                allowed: false,
                reason: 'Withdrawals from platform wallet are not supported'
            };
        }

        if (ownerType === 'EVENT') {
            const event = await this.eventRepository.findByIdOrSlug(ownerId);
            if (!event) {
                return { allowed: false, reason: 'Event not found' };
            }

            // Allow withdrawal for any event type as long as user is the creator
            const isCreator = event.creatorId && String(event.creatorId) === String(userId);

            if (!isCreator) {
                return {
                    allowed: false,
                    reason: 'Only the event creator can request withdrawals'
                };
            }

            return { allowed: true, resolvedOwnerId: event.id };
        }

        if (ownerType === 'GROUP') {
            const group = await this.groupRepository.findById(ownerId);
            if (!group) {
                return { allowed: false, reason: 'Group not found' };
            }

            // Only group creator can withdraw
            const isCreator = group.creator && String(group.creator) === String(userId);
            if (!isCreator) {
                return {
                    allowed: false,
                    reason: 'Only the group creator can request withdrawals'
                };
            }

            return { allowed: true, resolvedOwnerId: group.id };
        }

        return { allowed: false, reason: 'Invalid ownerType' };
    }
}

module.exports = WalletAuthorizationService;
