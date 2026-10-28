/**
 * RSVP Event Use Case
 * Free-event ticket registration - bypasses payment entirely.
 *
 * A free event is one where ticketFee === 'free' OR every active
 * non-complimentary ticket type has price <= 0. Nothing in this flow
 * touches Transaction, WalletService, or PaymentService - there is no
 * money to move. Ticket shape is identical to the paid flow because it
 * reuses CreateTicketUseCase.
 */

const { ValidationError } = require('../../common/errors');
const { NotFoundError } = require('../../common/errors');
const { InvalidTicketTypeError } = require('../errors');
const CreateTicketDTO = require('../../ticket/dto/CreateTicketDTO');

class RSVPEventUseCase {
    constructor({
        eventRepository,
        eventTeamRepository,
        ticketRepository,
        createTicketUseCase,
    }) {
        this.eventRepository = eventRepository;
        this.eventTeamRepository = eventTeamRepository;
        this.ticketRepository = ticketRepository;
        this.createTicketUseCase = createTicketUseCase;
    }

    async execute(userId, eventId, { ticketTypeId = null, referralCode = null } = {}) {
        if (!userId) throw new ValidationError('User is required');

        // 1. Resolve event (accepts id or slug)
        const event = await this.eventRepository.findByIdOrSlug(eventId);
        if (!event) throw new NotFoundError('Event not found');

        // 2. Status gate - same rule as the paid path
        if (!['scheduled', 'published'].includes(event.status)) {
            throw new ValidationError(`Cannot RSVP for ${event.status} event`);
        }

        // 3. Must actually be a free event
        if (!this._isFreeEvent(event)) {
            throw new ValidationError('This is a paid event. Please purchase a ticket instead.');
        }

        // 4. Creator / team cannot RSVP to their own event
        if (event.creatorId && String(event.creatorId) === String(userId)) {
            throw new ValidationError(
                'Event creators cannot RSVP. Issue complimentary tickets from the event management page.'
            );
        }
        if (this.eventTeamRepository) {
            const teamMember = await this.eventTeamRepository.findByEventAndUser(event.id, userId);
            if (teamMember && teamMember.status === 'accepted') {
                throw new ValidationError(
                    'Event team members cannot RSVP. Issue complimentary tickets from the event management page.'
                );
            }
        }

        // 5. One active RSVP per user per event (product rule - remove this
        //    block if you want to allow multiple RSVPs from the same user)
        const existing = await this.ticketRepository.find({
            userId,
            eventId: event.id,
            status: { $ne: 'cancelled' },
        });
        if (existing && existing.tickets && existing.tickets.length > 0) {
            throw new ValidationError('You already have a ticket for this event');
        }

        // 6. Resolve the ticket type - validates capacity and sales window
        const chosenType = this._resolveTicketType(event, ticketTypeId);
        const admissionSize = chosenType?.admissionSize || 1;

        // 7. Reuse the paid flow's ticket creation - identical ticket shape,
        //    same QR generation, same email, same participant + calendar sync.
        const dto = new CreateTicketDTO({
            eventId: event.id,
            ticketTypeId: chosenType?._id || chosenType?.id || null,
            userId,
            quantity: 1,             // one physical QR per RSVP
            admissionSize,
            bypassCapacity: false,
            skipEmail: false,        // RSVP confirmation email IS the ticket delivery
            transactionId: null,     // no transaction - this is deliberate
            referralCode,
        });

        return await this.createTicketUseCase.execute(dto);
    }

    /** True if the event has no payable ticket type. */
    _isFreeEvent(event) {
        if (event.ticketFee === 'free' || Number(event.ticketFee) === 0) return true;

        const types = (event.ticketTypes || []).filter(
            (t) => t.isActive !== false && t.type !== 'complimentary'
        );
        if (types.length === 0) return false;
        return types.every((t) => Number(t.price ?? 0) <= 0);
    }

    /** Validate and return the ticket type to RSVP against. */
    _resolveTicketType(event, ticketTypeId) {
        const types = (event.ticketTypes || []).filter(
            (t) => t.isActive !== false && t.type !== 'complimentary'
        );

        if (types.length === 0) {
            // If there are no specific ticket types, but it's a free event, just let it pass.
            // CreateTicketUseCase handles the fallback pricing automatically.
            if (event.ticketFee === 'free' || Number(event.ticketFee) === 0) {
                return null;
            }
            throw new InvalidTicketTypeError('No available ticket types');
        }
        // ... rest of the existing logic

        const now = new Date();

        if (ticketTypeId) {
            const match = types.find((t) => String(t._id || t.id) === String(ticketTypeId));
            if (!match) throw new InvalidTicketTypeError('Ticket type not found or not available');

            if (match.salesStartDate && now < new Date(match.salesStartDate)) {
                throw new InvalidTicketTypeError('Ticket sales have not started');
            }
            if (match.salesEndDate && now > new Date(match.salesEndDate)) {
                throw new InvalidTicketTypeError('Ticket sales have ended');
            }
            if (match.capacity != null && (match.soldCount || 0) >= match.capacity) {
                throw new InvalidTicketTypeError('This ticket type is sold out');
            }
            return match;
        }

        const available = types.filter((t) => {
            if (t.salesStartDate && now < new Date(t.salesStartDate)) return false;
            if (t.salesEndDate && now > new Date(t.salesEndDate)) return false;
            if (t.capacity != null && (t.soldCount || 0) >= t.capacity) return false;
            return true;
        });
        if (available.length === 0) {
            throw new InvalidTicketTypeError('No available ticket types');
        }

        return (
            available.find((t) => /early\s*bird/i.test(t.name)) ||
            available.find((t) => /regular/i.test(t.name)) ||
            available[0]
        );
    }
}

module.exports = RSVPEventUseCase;