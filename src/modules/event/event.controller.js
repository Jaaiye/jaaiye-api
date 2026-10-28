/**
 * Event Controller
 * Presentation layer - HTTP request/response handling
 */

const { asyncHandler } = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/response');

class EventController {
  constructor({
    createEventUseCase,
    getEventUseCase,
    updateEventUseCase,
    deleteEventUseCase,
    listEventsUseCase,
    addParticipantsUseCase,
    updateParticipantStatusUseCase,
    removeParticipantUseCase,
    publishEventUseCase,
    unpublishEventUseCase,
    cancelEventUseCase,
    updateTicketTypeUseCase,
    deleteTicketTypeUseCase,
    getTicketTypesUseCase,
    addEventTeamMemberUseCase,
    updateEventTeamMemberUseCase,
    removeEventTeamMemberUseCase,
    getEventTeamUseCase,
    getEventAnalyticsUseCase,
    getTeamEventsUseCase,
    listTeamInvitationsUseCase,
    resendEventTicketsUseCase,
    issueTicketUseCase,
    RSVPEventUseCase
  }) {
    this.createEventUseCase = createEventUseCase;
    this.getEventUseCase = getEventUseCase;
    this.updateEventUseCase = updateEventUseCase;
    this.deleteEventUseCase = deleteEventUseCase;
    this.listEventsUseCase = listEventsUseCase;
    this.addParticipantsUseCase = addParticipantsUseCase;
    this.updateParticipantStatusUseCase = updateParticipantStatusUseCase;
    this.removeParticipantUseCase = removeParticipantUseCase;
    this.publishEventUseCase = publishEventUseCase;
    this.unpublishEventUseCase = unpublishEventUseCase;
    this.cancelEventUseCase = cancelEventUseCase;
    this.updateTicketTypeUseCase = updateTicketTypeUseCase;
    this.deleteTicketTypeUseCase = deleteTicketTypeUseCase;
    this.getTicketTypesUseCase = getTicketTypesUseCase;
    this.addEventTeamMemberUseCase = addEventTeamMemberUseCase;
    this.updateEventTeamMemberUseCase = updateEventTeamMemberUseCase;
    this.removeEventTeamMemberUseCase = removeEventTeamMemberUseCase;
    this.getEventTeamUseCase = getEventTeamUseCase;
    this.getEventAnalyticsUseCase = getEventAnalyticsUseCase;
    this.getTeamEventsUseCase = getTeamEventsUseCase;
    this.listTeamInvitationsUseCase = listTeamInvitationsUseCase;
    this.resendEventTicketsUseCase = resendEventTicketsUseCase;
    this.issueTicketUseCase = issueTicketUseCase;
    this.RSVPEventUseCase = RSVPEventUseCase;
  }

  /**
   * @swagger
   * /events:
   *   post:
   *     summary: Create a new event
   *     tags: [Events]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               date:
   *                 type: string
   *                 format: date-time
   *               location:
   *                 type: string
   *               category:
   *                 type: string
   *               ticketTypes:
   *                 type: string
   *                 description: JSON string of ticket types
   *               image:
   *                 type: string
   *                 format: binary
   *                 description: Event banner image
   *     responses:
   *       201:
   *         description: Event created successfully
   */
  createEvent = asyncHandler(async (req, res) => {
    const { CreateEventDTO } = require('./dto');

    // Parse JSON strings from FormData (e.g., ticketTypes)
    const body = { ...req.body };
    if (body.ticketTypes && typeof body.ticketTypes === 'string') {
      try {
        body.ticketTypes = JSON.parse(body.ticketTypes);
      } catch (e) {
        // If parsing fails, keep as string - validation will catch it
      }
    }

    const dto = new CreateEventDTO(body);
    const result = await this.createEventUseCase.execute(req.user.id, dto, req.file);

    return successResponse(res, result, 201, 'Event created successfully');
  });

  /**
   * @swagger
   * /events/{id}:
   *   get:
   *     summary: Get event details
   *     tags: [Events]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Event details
   */
  getEvent = asyncHandler(async (req, res) => {
    const result = await this.getEventUseCase.execute(req.params.id, req.user?.id);

    return successResponse(res, { event: result });
  });

  /**
   * @swagger
   * /events/{id}:
   *   put:
   *     summary: Update event
   *     tags: [Events]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Event updated
   */
  updateEvent = asyncHandler(async (req, res) => {
    const { UpdateEventDTO } = require('./dto');
    const dto = new UpdateEventDTO(req.body);
    const result = await this.updateEventUseCase.execute(req.params.id, req.user.id, dto, req.file);

    return successResponse(res, { event: result }, 200, 'Event updated successfully');
  });

  /**
   * @swagger
   * /events:
   *   delete:
   *     summary: Delete event
   *     tags: [Events]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [id]
   *             properties:
   *               id:
   *                 type: string
   *     responses:
   *       200:
   *         description: Event deleted
   */
  deleteEvent = asyncHandler(async (req, res) => {
    const result = await this.deleteEventUseCase.execute(req.body.id, req.user.id);

    return successResponse(res, null, 200, 'Event deleted successfully');
  });

  /**
   * @swagger
   * /events:
   *   get:
   *     summary: List events
   *     tags: [Events]
   *     parameters:
   *       - in: query
   *         name: scope
   *         schema:
   *           type: string
   *           enum: [public, mine, creator]
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of events
   */
  listEvents = asyncHandler(async (req, res) => {
    const { ListEventsDTO } = require('./dto');
    const dto = new ListEventsDTO(req.query);

    // Validate scope - 'mine' and 'creator' require authentication
    if ((dto.scope === 'mine' || dto.scope === 'creator') && !req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required for "mine" and "creator" scopes'
      });
    }

    const userId = req.user?.id || null;
    const isAdmin = !!req.user && ['admin', 'superadmin'].includes(req.user.role);
    const result = await this.listEventsUseCase.execute(userId, dto, isAdmin);

    return successResponse(res, result);
  });

  addParticipants = asyncHandler(async (req, res) => {
    const { AddParticipantsDTO } = require('./dto');
    // Handle both single participant and array
    const input = req.body.participants ? req.body : { participants: [req.body] };
    const dto = new AddParticipantsDTO(input);
    const result = await this.addParticipantsUseCase.execute(req.params.id, req.user.id, dto);

    return successResponse(res, { participants: result }, 201, 'Participants added successfully');
  });

  updateParticipantStatus = asyncHandler(async (req, res) => {
    const result = await this.updateParticipantStatusUseCase.execute(
      req.params.id,
      req.user.id,
      req.body.status
    );

    return successResponse(res, { participant: result }, 200, 'Participant status updated');
  });

  removeParticipant = asyncHandler(async (req, res) => {
    const result = await this.removeParticipantUseCase.execute(
      req.body.eventId,
      req.user.id,
      req.body.userId
    );

    return successResponse(res, null, 200, 'Participant removed successfully');
  });

  addTicketType = asyncHandler(async (req, res) => {
    const container = require('./event.module');
    const { canUserManageTicketTypes } = require('./services/EventOwnershipService');
    const eventRepository = container.getEventRepository();
    const eventTeamRepository = container.getEventTeamRepository();

    const event = await eventRepository.findByIdOrSlug(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    const eventId = event.id;

    // This endpoint previously had no ownership check at all - any
    // authenticated user could add a ticket type to any event. Uses the
    // same creator-or-authorized-team-member rule as update/delete.
    const userId = req.user.id;
    const isCreator = event.creatorId && String(event.creatorId) === String(userId);
    const teamMember = isCreator
      ? null
      : await eventTeamRepository.findByEventAndUser(eventId, userId);

    if (!canUserManageTicketTypes({ eventEntity: event, userId, teamMember })) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to add ticket types for this event'
      });
    }

    // Only events can have ticket types - same rule enforced in
    // UpdateTicketTypeUseCase/DeleteTicketTypeUseCase, previously missing here.
    if (event.category !== 'event') {
      return res.status(400).json({ success: false, error: 'Only events can have ticket types' });
    }

    const ticketTypeData = {
      type: req.body.type || 'custom',
      name: req.body.name,
      description: req.body.description,
      price: Number(req.body.price || 0),
      admissionSize: Math.max(1, Number(req.body.admissionSize || 1)),
      capacity: req.body.capacity !== undefined && req.body.capacity !== null && req.body.capacity !== '' ? Number(req.body.capacity) : null,
      quantityLimit: req.body.quantityLimit !== undefined && req.body.quantityLimit !== null && req.body.quantityLimit !== '' ? Number(req.body.quantityLimit) : null,
      isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true,
      salesStartDate: req.body.salesStartDate ? new Date(req.body.salesStartDate) : null,
      salesEndDate: req.body.salesEndDate ? new Date(req.body.salesEndDate) : null
    };

    // Use repository method instead of entity method
    const updatedEvent = await eventRepository.addTicketType(eventId, ticketTypeData);
    return successResponse(res, { event: updatedEvent }, 201, 'Ticket type added successfully');
  });

  getTicketTypes = asyncHandler(async (req, res) => {
    const result = await this.getTicketTypesUseCase.execute(req.params.id);
    return successResponse(res, result);
  });

  updateTicketType = asyncHandler(async (req, res) => {
    const { ticketTypeId } = req.params;
    const result = await this.updateTicketTypeUseCase.execute(req.params.id, ticketTypeId, req.user.id, req.body);
    return successResponse(res, { event: result }, 200, 'Ticket type updated successfully');
  });

  deleteTicketType = asyncHandler(async (req, res) => {
    const { ticketTypeId } = req.params;
    const result = await this.deleteTicketTypeUseCase.execute(req.params.id, ticketTypeId, req.user.id);
    return successResponse(res, { event: result }, 200, 'Ticket type deleted successfully');
  });

  getAvailableTicketTypes = asyncHandler(async (req, res) => {
    const EventSchema = require('../entities/Event.schema');
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    const query = isObjectId ? { _id: req.params.id } : { slug: req.params.id };
    const doc = await EventSchema.findOne(query);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const availableTypes = doc.getAvailableTicketTypes()
      .filter(ticket => ticket.type !== 'complimentary');
    return successResponse(res, { ticketTypes: availableTypes });
  });

  updateEventImage = asyncHandler(async (req, res) => {
    const container = require('./event.module');
    const eventRepository = container.getEventRepository();
    const storageAdapter = container.getStorageAdapter();

    const event = await eventRepository.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Image file is required' });
    }

    const imageUrl = await storageAdapter.uploadImage(req.file.buffer, {
      folder: 'events',
      contentType: req.file.mimetype
    });
    const updatedEvent = await eventRepository.update(req.params.id, { image: imageUrl });

    return successResponse(res, { event: updatedEvent }, 200, 'Event image updated successfully');
  });

  /**
   * @swagger
   * /events/{id}/publish:
   *   post:
   *     summary: Publish event
   *     tags: [Events]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Event published
   */
  publishEvent = asyncHandler(async (req, res) => {
    const result = await this.publishEventUseCase.execute(req.params.id, req.user.id);
    return successResponse(res, { event: result }, 200, 'Event published successfully');
  });

  unpublishEvent = asyncHandler(async (req, res) => {
    const result = await this.unpublishEventUseCase.execute(req.params.id, req.user.id);
    return successResponse(res, { event: result }, 200, 'Event unpublished successfully');
  });

  /**
   * @swagger
   * /events/{id}/cancel:
   *   post:
   *     summary: Cancel event
   *     tags: [Events]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Event cancelled
   */
  cancelEvent = asyncHandler(async (req, res) => {
    const reason = req.body.reason || 'Event cancelled by organizer';
    const result = await this.cancelEventUseCase.execute(req.params.id, req.user.id, reason);
    return successResponse(res, { event: result }, 200, 'Event cancelled successfully. Refunds are being processed.');
  });

  // Team management
  addTeamMember = asyncHandler(async (req, res) => {
    const result = await this.addEventTeamMemberUseCase.execute(req.params.id, req.user.id, req.body);
    return successResponse(res, { teamMember: result }, 201, 'Team member added successfully');
  });

  /**
   * @swagger
   * /events/{id}/team:
   *   get:
   *     summary: Get event team
   *     tags: [Events]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of team members
   */
  getTeam = asyncHandler(async (req, res) => {
    const result = await this.getEventTeamUseCase.execute(req.params.id);
    return successResponse(res, result);
  });

  getTeamEvents = asyncHandler(async (req, res) => {
    const { status, page, limit } = req.query;
    const result = await this.getTeamEventsUseCase.execute(req.user.id, {
      status,
      page: page || 1,
      limit: limit || 12
    });
    return successResponse(res, result);
  });

  listTeamInvitations = asyncHandler(async (req, res) => {
    const result = await this.listTeamInvitationsUseCase.execute(req.user.id);
    return successResponse(res, { invitations: result });
  });

  updateTeamMember = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const result = await this.updateEventTeamMemberUseCase.execute(req.params.id, userId, req.user.id, req.body);
    return successResponse(res, { teamMember: result }, 200, 'Team member updated successfully');
  });

  removeTeamMember = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const result = await this.removeEventTeamMemberUseCase.execute(req.params.id, userId, req.user.id);
    return successResponse(res, result, 200, 'Team member removed successfully');
  });

  // Analytics
  /**
   * @swagger
   * /events/{id}/analytics:
   *   get:
   *     summary: Get event analytics
   *     tags: [Events]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Event analytics
   */
  getAnalytics = asyncHandler(async (req, res) => {
    const { startDate, endDate, groupBy } = req.query;
    const result = await this.getEventAnalyticsUseCase.execute(req.params.id, req.user.id, {
      startDate,
      endDate,
      groupBy: groupBy || 'day'
    });
    return successResponse(res, result);
  });

  // Issue ticket (for event creators/co-organizers)
  /**
   * @swagger
   * /events/{id}/tickets/issue:
   *   post:
   *     summary: Issue tickets manually
   *     tags: [Events]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [userId, ticketTypeId, quantity]
   *             properties:
   *               userId:
   *                 type: string
   *               ticketTypeId:
   *                 type: string
   *               quantity:
   *                 type: number
   *               paymentMethod:
   *                 type: string
   *                 enum: [complimentary, manual_payment, onsite]
   *               amount:
   *                 type: number
   *                 description: Required for manual_payment/onsite - amount collected off-platform
   *     responses:
   *       201:
   *         description: Tickets issued
   */
  issueTicket = asyncHandler(async (req, res) => {
    const result = await this.issueTicketUseCase.execute({
      eventId: req.params.id,
      issuedBy: req.user.id,
      ticketTypeId: req.body.ticketTypeId || null,
      quantity: req.body.quantity || 1,
      username: req.body.username,
      email: req.body.email,
      bypassCapacity: req.body.bypassCapacity || false,
      paymentMethod: req.body.paymentMethod || 'complimentary',
      amount: req.body.amount
    });

    const { ticket, walletFunding } = result;

    return successResponse(res, {
      ticket: {
        id: ticket.id,
        qrCode: ticket.qrCode,
        publicId: ticket.publicId,
        ticketTypeName: ticket.ticketTypeName,
        price: ticket.price,
        quantity: ticket.quantity,
        status: ticket.status,
        createdAt: ticket.createdAt
      },
      walletBalanceAfter: walletFunding ? walletFunding.walletBalance : undefined
    }, 201, 'Ticket issued successfully');
  });

  resendEventTickets = asyncHandler(async (req, res) => {
    const result = await this.resendEventTicketsUseCase.execute(req.params.id, req.user.id);
    return successResponse(res, result, 200, result.message);
  });

  rsvpEvent = asyncHandler(async (req, res, next) => {
    try {
      const { ticketTypeId, referralCode, name, email } = req.body;

      // If req.user exists, they are logged in. Otherwise, pass guestData.
      const userId = req.user ? req.user.id : null;
      const guestData = (!userId && name && email) ? { name, email } : null;

      const result = await this.rsvpEventUseCase.execute(
        userId,
        req.params.eventId,
        { ticketTypeId, referralCode, guestData }
      );

      res.status(201).json({
        ticket: result.ticket.toJSON(),
        token: result.authToken // Return token if guest
      });
    } catch (err) {
      next(err);
    }
  });
}

module.exports = EventController;

