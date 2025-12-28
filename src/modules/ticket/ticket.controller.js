/**
 * Ticket Controller
 * Presentation layer - HTTP request handler
 */

const { asyncHandler } = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/response');
const { CreateTicketDTO } = require('./dto');
const {
  CreateTicketUseCase,
  GetMyTicketsUseCase,
  GetActiveTicketsUseCase,
  GetEventTicketsUseCase,
  GetTicketByIdUseCase,
  GetTicketByPublicIdUseCase,
  ScanAndVerifyTicketUseCase,
  CancelTicketUseCase
} = require('./use-cases');

class TicketController {
  constructor({
    createTicketUseCase,
    getMyTicketsUseCase,
    getActiveTicketsUseCase,
    getEventTicketsUseCase,
    getTicketByIdUseCase,
    getTicketByPublicIdUseCase,
    scanAndVerifyTicketUseCase,
    cancelTicketUseCase
  }) {
    this.createTicket = asyncHandler(async (req, res) => {
      const dto = new CreateTicketDTO(req.body);
      const ticket = await createTicketUseCase.execute(dto);

      return successResponse(res, {
        ticket: {
          id: ticket.id,
          qrCode: ticket.qrCode,
          ticketData: ticket.getTicketData(),
          ticketTypeName: ticket.ticketTypeName,
          price: ticket.price,
          quantity: ticket.quantity,
          status: ticket.status,
          createdAt: ticket.createdAt,
          event: ticket.eventId,
          user: ticket.userId
        }
      }, 201, 'Ticket created successfully');
    });

    this.getMyTickets = asyncHandler(async (req, res) => {
      const userId = req.user._id || req.user.id;
      const result = await getMyTicketsUseCase.execute(userId);
      return successResponse(res, result);
    });

    this.getActiveTickets = asyncHandler(async (req, res) => {
      const userId = req.user._id || req.user.id;
      const result = await getActiveTicketsUseCase.execute(userId);
      return successResponse(res, result);
    });

    this.getEventTickets = asyncHandler(async (req, res) => {
      const { eventId } = req.params;
      const result = await getEventTicketsUseCase.execute(eventId);
      return successResponse(res, result);
    });

    this.getTicketById = asyncHandler(async (req, res) => {
      const { ticketId } = req.params;
      const userId = req.user._id || req.user.id;
      const userRole = req.user.role || 'user';
      const result = await getTicketByIdUseCase.execute(ticketId, userId, userRole);
      return successResponse(res, result);
    });

    this.getTicketByPublicId = asyncHandler(async (req, res) => {
      const { publicId } = req.params;
      const { eventId } = req.query;
      const result = await getTicketByPublicIdUseCase.execute(publicId, eventId || null);
      return successResponse(res, result);
    });

    /**
     * Unified scan and verify endpoint
     * Accepts either token or publicId in request body
     * Automatically detects type and verifies/marks ticket as used
     */
    this.scanAndVerify = asyncHandler(async (req, res) => {
      const { identifier, eventId } = req.body;
      const userId = req.user._id || req.user.id;

      const result = await scanAndVerifyTicketUseCase.execute(
        identifier,
        userId,
        eventId || null
      );

      // If ticket is already used, return 400 with standardized format
      if (result.status === 'used') {
        return res.status(400).json(result);
      }

      // Success - ticket verified and marked as used
      return successResponse(res, result);
    });

    this.cancelTicket = asyncHandler(async (req, res) => {
      const { ticketId } = req.body;
      const userId = req.user._id || req.user.id;
      const result = await cancelTicketUseCase.execute(ticketId, userId);
      return successResponse(res, result, 200, 'Ticket cancelled successfully');
    });
  }
}

module.exports = TicketController;

