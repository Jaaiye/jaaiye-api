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
}

module.exports = EventController;

