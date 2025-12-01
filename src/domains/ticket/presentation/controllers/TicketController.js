/**
 * Ticket Controller
 * Presentation layer - HTTP request handler
 */

const { asyncHandler } = require('../../../../utils/asyncHandler');
const { successResponse } = require('../../../../utils/response');
const { CreateTicketDTO } = require('../../application/dto');
const {
  CreateTicketUseCase,
  GetMyTicketsUseCase,
  GetActiveTicketsUseCase,
  GetEventTicketsUseCase,
  GetTicketByIdUseCase,
  ScanTicketUseCase,
  VerifyAndUseTicketUseCase,
  CancelTicketUseCase
} = require('../../application/use-cases');

class TicketController {
  constructor({
    createTicketUseCase,
    getMyTicketsUseCase,
    getActiveTicketsUseCase,
    getEventTicketsUseCase,
    getTicketByIdUseCase,
    scanTicketUseCase,
    verifyAndUseTicketUseCase,
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

    this.scanTicket = asyncHandler(async (req, res) => {
      const { t: token } = req.query;
      const result = await scanTicketUseCase.execute(token);
      return res.json(result);
    });

    this.verifyAndUseTicket = asyncHandler(async (req, res) => {
      const { token } = req.body;
      const userId = req.user._id || req.user.id;
      const result = await verifyAndUseTicketUseCase.execute(token, userId);
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

