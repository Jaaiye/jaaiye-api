/**
 * Resend Event Tickets Use Case
 * Application layer - resend ticket emails to all ticket holders for an event
 */

const { NotFoundError, ValidationError } = require('../../common/errors');
const logger = require('../../../utils/logger');

class ResendEventTicketsUseCase {
    constructor({ ticketRepository, eventRepository, userRepository, emailAdapter, eventTeamRepository }) {
        this.ticketRepository = ticketRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.emailAdapter = emailAdapter;
        this.eventTeamRepository = eventTeamRepository;
    }

    async execute(eventId, userId) {
        // 1. Find event
        const event = await this.eventRepository.findById(eventId);
        if (!event) {
            throw new NotFoundError('Event not found');
        }

        // 2. Check permissions (creator or co-organizer)
        const isCreator = event.creatorId && String(event.creatorId) === String(userId);

        let isCoOrganizer = false;
        if (!isCreator && this.eventTeamRepository) {
            const teamMember = await this.eventTeamRepository.findByEventAndUser(eventId, userId);
            if (teamMember && teamMember.status === 'accepted' && (teamMember.role === 'co_organizer' || teamMember.role === 'creator')) {
                isCoOrganizer = true;
            }
        }

        if (!isCreator && !isCoOrganizer) {
            throw new Error('You do not have permission to resend tickets for this event');
        }

        // 3. Find all tickets for this event
        const allTickets = await this.ticketRepository.findByEvent(eventId);
        const validTickets = allTickets.filter(t => t.status !== 'cancelled');

        if (validTickets.length === 0) {
            return { success: true, count: 0, message: 'No active tickets found for this event' };
        }

        // 4. Group tickets by user to send one email per user (consolidated)
        const ticketsByUser = {};
        validTickets.forEach(ticket => {
            const ticketUserId = ticket.userId?._id?.toString() || ticket.userId?.toString();
            if (!ticketUserId) return;

            if (!ticketsByUser[ticketUserId]) {
                ticketsByUser[ticketUserId] = [];
            }
            ticketsByUser[ticketUserId].push(ticket);
        });

        const userIds = Object.keys(ticketsByUser);
        let successCount = 0;
        let failCount = 0;

        logger.info(`Resending tickets for event ${eventId} to ${userIds.length} users`);

        // 5. Send emails one by one
        for (const ticketUserId of userIds) {
            try {
                const userTickets = ticketsByUser[ticketUserId];
                const user = await this.userRepository.findById(ticketUserId);

                if (user && user.email) {
                    // Send consolidated email if more than one ticket, else single
                    // Wait, emailAdapter.sendPaymentConfirmationEmail handles both Object and Array
                    await this.emailAdapter.sendPaymentConfirmationEmail(user, userTickets);
                    successCount++;
                } else {
                    logger.warn(`Skip resending to user ${ticketUserId} - no email found`);
                    failCount++;
                }
            } catch (error) {
                logger.error(`Failed to resend tickets to user ${ticketUserId}`, { error: error.message });
                failCount++;
            }
        }

        return {
            success: true,
            totalUsers: userIds.length,
            successCount,
            failCount,
            message: `Resent tickets to ${successCount} users. ${failCount} failed.`
        };
    }
}

module.exports = ResendEventTicketsUseCase;
