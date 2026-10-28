const { ValidationError, NotFoundError } = require('../../common/errors');
const { InvalidTicketTypeError } = require('../errors');
const CreateTicketDTO = require('../../ticket/dto/CreateTicketDTO');
const UserSchema = require('../../common/entities/User.schema'); // Adjust path if needed
const authService = require('../../auth/services/auth.service'); // Adjust path if needed
const crypto = require('crypto');

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

    async execute(userId, eventId, { ticketTypeId = null, referralCode = null, guestData = null } = {}) {
        let targetUserId = userId;
        let authToken = null;

        // 1. Resolve User (Logged in vs Guest)
        if (!targetUserId) {
            if (!guestData || !guestData.email || !guestData.name) {
                throw new ValidationError('Guest name and email are required');
            }

            const email = guestData.email.toLowerCase().trim();
            let user = await UserSchema.findOne({ email });

            if (!user) {
                // Create a Guest account
                const tempPassword = crypto.randomBytes(16).toString('hex');
                user = await UserSchema.create({
                    email,
                    fullName: guestData.name,
                    username: email.split('@')[0] + Math.floor(Math.random() * 1000), // Generate username
                    password: tempPassword, // Will be hashed by your schema pre-save hook if you have one
                    isGuest: true // Optional: if your schema has this field
                });
            }

            targetUserId = user._id;
            // Generate token so they are auto-logged in on the frontend
            authToken = authService.generateToken(user);
        }

        // 2. Resolve event (accepts id or slug)
        const event = await this.eventRepository.findByIdOrSlug(eventId);
        if (!event) throw new NotFoundError('Event not found');

        // 3. Status gate
        if (!['scheduled', 'published'].includes(event.status)) {
            throw new ValidationError(`Cannot RSVP for ${event.status} event`);
        }

        // 4. Must actually be a free event
        if (!this._isFreeEvent(event)) {
            throw new ValidationError('This is a paid event. Please purchase a ticket instead.');
        }

        // 5. Creator / team cannot RSVP
        if (event.creatorId && String(event.creatorId) === String(targetUserId)) {
            throw new ValidationError('Event creators cannot RSVP.');
        }
        if (this.eventTeamRepository) {
            const teamMember = await this.eventTeamRepository.findByEventAndUser(event.id, targetUserId);
            if (teamMember && teamMember.status === 'accepted') {
                throw new ValidationError('Event team members cannot RSVP.');
            }
        }

        // 6. One active RSVP per user per event
        const existing = await this.ticketRepository.find({
            userId: targetUserId,
            eventId: event.id,
            status: { $ne: 'cancelled' },
        });
        if (existing && existing.tickets && existing.tickets.length > 0) {
            throw new ValidationError('You already have a ticket for this event');
        }

        // 7. Resolve ticket type
        const chosenType = this._resolveTicketType(event, ticketTypeId);
        const admissionSize = chosenType?.admissionSize || 1;

        // 8. Create the ticket
        const dto = new CreateTicketDTO({
            eventId: event.id,
            ticketTypeId: chosenType?._id || chosenType?.id || null,
            userId: targetUserId,
            quantity: 1,
            admissionSize,
            bypassCapacity: false,
            skipEmail: false,
            transactionId: null,
            referralCode,
        });

        const ticket = await this.createTicketUseCase.execute(dto);

        return { ticket, authToken };
    }

    _isFreeEvent(event) {
        if (event.ticketFee === 'free' || Number(event.ticketFee) === 0) return true;
        const types = (event.ticketTypes || []).filter(
            (t) => t.isActive !== false && t.type !== 'complimentary'
        );
        if (types.length === 0) return false;
        return types.every((t) => Number(t.price ?? 0) <= 0);
    }

    _resolveTicketType(event, ticketTypeId) {
        const types = (event.ticketTypes || []).filter(
            (t) => t.isActive !== false && t.type !== 'complimentary'
        );

        if (types.length === 0) {
            if (event.ticketFee === 'free' || Number(event.ticketFee) === 0) return null;
            throw new InvalidTicketTypeError('No available ticket types');
        }

        const now = new Date();
        if (ticketTypeId) {
            const match = types.find((t) => String(t._id || t.id) === String(ticketTypeId));
            if (!match) throw new InvalidTicketTypeError('Ticket type not found or not available');
            if (match.salesStartDate && now < new Date(match.salesStartDate)) throw new InvalidTicketTypeError('Ticket sales have not started');
            if (match.salesEndDate && now > new Date(match.salesEndDate)) throw new InvalidTicketTypeError('Ticket sales have ended');
            if (match.capacity != null && (match.soldCount || 0) >= match.capacity) throw new InvalidTicketTypeError('This ticket type is sold out');
            return match;
        }

        const available = types.filter((t) => {
            if (t.salesStartDate && now < new Date(t.salesStartDate)) return false;
            if (t.salesEndDate && now > new Date(t.salesEndDate)) return false;
            if (t.capacity != null && (t.soldCount || 0) >= t.capacity) return false;
            return true;
        });
        if (available.length === 0) throw new InvalidTicketTypeError('No available ticket types');
        return available[0];
    }
}

module.exports = RSVPEventUseCase;