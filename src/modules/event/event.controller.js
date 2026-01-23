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
    listTeamInvitationsUseCase
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
  }

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

  getEvent = asyncHandler(async (req, res) => {
    const result = await this.getEventUseCase.execute(req.params.id, req.user?.id);

    return successResponse(res, { event: result });
  });

  updateEvent = asyncHandler(async (req, res) => {
    const { UpdateEventDTO } = require('./dto');
    const dto = new UpdateEventDTO(req.body);
    const result = await this.updateEventUseCase.execute(req.params.id, req.user.id, dto, req.file);

    return successResponse(res, { event: result }, 200, 'Event updated successfully');
  });

  deleteEvent = asyncHandler(async (req, res) => {
    const result = await this.deleteEventUseCase.execute(req.body.id, req.user.id);

    return successResponse(res, null, 200, 'Event deleted successfully');
  });

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
    const result = await this.listEventsUseCase.execute(userId, dto);

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
    const eventRepository = container.getEventRepository();

    // Validate event exists
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    let eventId;

    if (isObjectId) {
      eventId = req.params.id;
      const event = await eventRepository.findById(eventId);
      if (!event) {
        return res.status(404).json({ success: false, error: 'Event not found' });
      }
    } else {
      const event = await eventRepository.findBySlug(req.params.id);
      if (!event) {
        return res.status(404).json({ success: false, error: 'Event not found' });
      }
      eventId = event.id;
    }

    const ticketTypeData = {
      type: req.body.type || 'custom',
      name: req.body.name,
      description: req.body.description,
      price: Number(req.body.price || 0),
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
    const doc = await EventSchema.findById(req.params.id);
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
    const cloudinaryAdapter = container.getCloudinaryAdapter();

    const event = await eventRepository.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Image file is required' });
    }

    const imageUrl = await cloudinaryAdapter.uploadImage(req.file.buffer);
    const updatedEvent = await eventRepository.update(req.params.id, { image: imageUrl });

    return successResponse(res, { event: updatedEvent }, 200, 'Event image updated successfully');
  });

  publishEvent = asyncHandler(async (req, res) => {
    const result = await this.publishEventUseCase.execute(req.params.id, req.user.id);
    return successResponse(res, { event: result }, 200, 'Event published successfully');
  });

  unpublishEvent = asyncHandler(async (req, res) => {
    const result = await this.unpublishEventUseCase.execute(req.params.id, req.user.id);
    return successResponse(res, { event: result }, 200, 'Event unpublished successfully');
  });

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
  issueTicket = asyncHandler(async (req, res) => {
    console.log('[EventController] issueTicket called', {
      eventId: req.params.id,
      userId: req.user.id,
      body: req.body
    });

    const container = require('./event.module');
    const ticketModule = require('../ticket/ticket.module');
    const { NotFoundError } = require('../common/errors');
    const eventRepository = container.getEventRepository();
    const eventTeamRepository = container.getEventTeamRepository();
    const userRepository = container.getUserRepository();
    const createTicketUseCase = ticketModule.getCreateTicketUseCase();
    const { CreateTicketDTO } = require('../ticket/dto');

    const eventId = req.params.id;
    const userId = req.user.id;

    console.log('[EventController] Checking permissions', { eventId, userId });

    // Check if user is creator or co-organizer
    const event = await eventRepository.findById(eventId);
    if (!event) {
      console.error('[EventController] Event not found', { eventId });
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    console.log('[EventController] Event found', {
      eventId: event.id,
      creatorId: event.creatorId,
      category: event.category
    });

    const isCreator = event.creatorId && String(event.creatorId) === String(userId);
    let hasPermission = isCreator;

    console.log('[EventController] Permission check', { isCreator, hasPermission });

    if (!hasPermission && event.category === 'event') {
      console.log('[EventController] Checking team membership', { eventId, userId });
      const teamMember = await eventTeamRepository.findByEventAndUser(eventId, userId);
      console.log('[EventController] Team member found', {
        hasTeamMember: !!teamMember,
        status: teamMember?.status,
        role: teamMember?.role,
        manageTickets: teamMember?.permissions?.manageTickets
      });

      hasPermission = teamMember &&
        teamMember.status === 'accepted' &&
        (teamMember.role === 'co_organizer' || teamMember.role === 'creator') &&
        teamMember.permissions?.manageTickets === true;
    }

    console.log('[EventController] Final permission check', { hasPermission });

    if (!hasPermission) {
      console.warn('[EventController] Permission denied', { eventId, userId });
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to issue tickets for this event'
      });
    }

    // Search for target user by username or email
    const { username, email } = req.body;
    console.log('[EventController] Searching for target user', { username, email });

    if (!username && !email) {
      console.error('[EventController] Missing username and email');
      return res.status(400).json({
        success: false,
        error: 'Either username or email is required'
      });
    }

    let targetUser = null;
    if (username) {
      console.log('[EventController] Looking up user by username', { username });
      targetUser = await userRepository.findByUsername(username);
      console.log('[EventController] User lookup by username result', {
        found: !!targetUser,
        userId: targetUser?.id
      });
    }
    if (!targetUser && email) {
      console.log('[EventController] Looking up user by email', { email });
      targetUser = await userRepository.findByEmail(email);
      console.log('[EventController] User lookup by email result', {
        found: !!targetUser,
        userId: targetUser?.id
      });
    }

    if (!targetUser) {
      console.error('[EventController] Target user not found', { username, email });
      return res.status(404).json({
        success: false,
        error: 'User not found with the provided username or email'
      });
    }

    const targetUserId = targetUser.id;
    console.log('[EventController] Target user found', {
      targetUserId,
      username: targetUser.username,
      email: targetUser.email
    });

    // Create ticket with userId
    const dtoData = {
      eventId,
      ticketTypeId: req.body.ticketTypeId || null,
      quantity: req.body.quantity || 1,
      userId: targetUserId,
      bypassCapacity: req.body.bypassCapacity || false
    };

    console.log('[EventController] Creating CreateTicketDTO', dtoData);
    const dto = new CreateTicketDTO(dtoData);
    console.log('[EventController] CreateTicketDTO created', {
      eventId: dto.eventId,
      ticketTypeId: dto.ticketTypeId,
      quantity: dto.quantity,
      userId: dto.userId,
      bypassCapacity: dto.bypassCapacity
    });

    console.log('[EventController] Executing createTicketUseCase');
    const ticket = await createTicketUseCase.execute(dto);
    console.log('[EventController] Ticket created successfully', {
      ticketId: ticket.id,
      publicId: ticket.publicId
    });

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
      }
    }, 201, 'Ticket issued successfully');
  });
}

module.exports = EventController;

