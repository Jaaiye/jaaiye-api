/**
 * Event Controller
 * Presentation layer - HTTP request/response handling
 */

const { asyncHandler } = require('../../../../utils/asyncHandler');
const { successResponse } = require('../../../../utils/response');

class EventController {
  constructor({
    createEventUseCase,
    getEventUseCase,
    updateEventUseCase,
    deleteEventUseCase,
    listEventsUseCase,
    addParticipantsUseCase,
    updateParticipantStatusUseCase,
    removeParticipantUseCase
  }) {
    this.createEventUseCase = createEventUseCase;
    this.getEventUseCase = getEventUseCase;
    this.updateEventUseCase = updateEventUseCase;
    this.deleteEventUseCase = deleteEventUseCase;
    this.listEventsUseCase = listEventsUseCase;
    this.addParticipantsUseCase = addParticipantsUseCase;
    this.updateParticipantStatusUseCase = updateParticipantStatusUseCase;
    this.removeParticipantUseCase = removeParticipantUseCase;
  }

  createEvent = asyncHandler(async (req, res) => {
    const { CreateEventDTO } = require('../../application/dto');
    const dto = new CreateEventDTO(req.body);
    const result = await this.createEventUseCase.execute(req.user.id, dto, req.file);

    return successResponse(res, result, 201, 'Event created successfully');
  });

  getEvent = asyncHandler(async (req, res) => {
    const result = await this.getEventUseCase.execute(req.params.id, req.user?.id);

    return successResponse(res, { event: result });
  });

  updateEvent = asyncHandler(async (req, res) => {
    const { UpdateEventDTO } = require('../../application/dto');
    const dto = new UpdateEventDTO(req.body);
    const result = await this.updateEventUseCase.execute(req.params.id, req.user.id, dto);

    return successResponse(res, { event: result }, 200, 'Event updated successfully');
  });

  deleteEvent = asyncHandler(async (req, res) => {
    const result = await this.deleteEventUseCase.execute(req.body.id, req.user.id);

    return successResponse(res, null, 200, 'Event deleted successfully');
  });

  listEvents = asyncHandler(async (req, res) => {
    const { ListEventsDTO } = require('../../application/dto');
    const dto = new ListEventsDTO(req.query);

    // Validate scope - 'mine' requires authentication
    if (dto.scope === 'mine' && !req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required for "mine" scope'
      });
    }

    const userId = req.user?.id || null;
    const result = await this.listEventsUseCase.execute(userId, dto);

    return successResponse(res, result);
  });

  addParticipants = asyncHandler(async (req, res) => {
    const { AddParticipantsDTO } = require('../../application/dto');
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
    const container = require('../../config/container');
    const eventRepository = container.getEventRepository();
    const event = await eventRepository.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const ticketTypeData = {
      name: req.body.name,
      price: Number(req.body.price),
      capacity: req.body.capacity !== undefined && req.body.capacity !== null ? Number(req.body.capacity) : null,
      isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true,
      salesStartDate: req.body.salesStartDate ? new Date(req.body.salesStartDate) : null,
      salesEndDate: req.body.salesEndDate ? new Date(req.body.salesEndDate) : null
    };

    const updatedEvent = await eventRepository.addTicketType(req.params.id, ticketTypeData);
    return successResponse(res, { event: updatedEvent }, 201, 'Ticket type added successfully');
  });

  getAvailableTicketTypes = asyncHandler(async (req, res) => {
    const EventSchema = require('../../infrastructure/persistence/schemas/Event.schema');
    const doc = await EventSchema.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const availableTypes = doc.getAvailableTicketTypes();
    return successResponse(res, { ticketTypes: availableTypes });
  });

  updateEventImage = asyncHandler(async (req, res) => {
    const container = require('../../config/container');
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
}

module.exports = EventController;

