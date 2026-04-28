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
    /**
     * @swagger
     * /tickets:
     *   post:
     *     summary: Create a ticket
     *     tags: [Tickets]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [eventId]
     *             properties:
     *               eventId:
     *                 type: string
     *               ticketTypeId:
     *                 type: string
     *               quantity:
     *                 type: number
     *     responses:
     *       201:
     *         description: Ticket created
     */
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

    /**
     * @swagger
     * /tickets/my:
     *   get:
     *     summary: Get my tickets
     *     tags: [Tickets]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of tickets
     */
    this.getMyTickets = asyncHandler(async (req, res) => {
      const userId = req.user._id || req.user.id;
      const result = await getMyTicketsUseCase.execute(userId);
      return successResponse(res, result);
    });

    /**
     * @swagger
     * /tickets/active:
     *   get:
     *     summary: Get active tickets
     *     tags: [Tickets]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of active tickets
     */
    this.getActiveTickets = asyncHandler(async (req, res) => {
      const userId = req.user._id || req.user.id;
      const result = await getActiveTicketsUseCase.execute(userId);
      return successResponse(res, result);
    });

    /**
     * @swagger
     * /tickets/event/{eventId}:
     *   get:
     *     summary: Get tickets for an event
     *     tags: [Tickets]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: eventId
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: List of tickets
     */
    this.getEventTickets = asyncHandler(async (req, res) => {
      const { eventId } = req.params;
      const result = await getEventTicketsUseCase.execute(eventId);
      return successResponse(res, result);
    });

    /**
     * @swagger
     * /tickets/{ticketId}:
     *   get:
     *     summary: Get specific ticket details
     *     tags: [Tickets]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: ticketId
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Ticket details
     */
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
    /**
     * @swagger
     * /tickets/scan:
     *   post:
     *     summary: Scan and verify ticket
     *     tags: [Tickets]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [identifier]
     *             properties:
     *               identifier:
     *                 type: string
     *               eventId:
     *                 type: string
     *     responses:
     *       200:
     *         description: Ticket verified
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

    /**
     * @swagger
     * /tickets/cancel:
     *   patch:
     *     summary: Cancel a ticket
     *     tags: [Tickets]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [ticketId]
     *             properties:
     *               ticketId:
     *                 type: string
     *     responses:
     *       200:
     *         description: Ticket cancelled
     */
    this.cancelTicket = asyncHandler(async (req, res) => {
      const { ticketId } = req.body;
      const userId = req.user._id || req.user.id;
      const result = await cancelTicketUseCase.execute(ticketId, userId);
      return successResponse(res, result, 200, 'Ticket cancelled successfully');
    });
  }
}

module.exports = TicketController;

