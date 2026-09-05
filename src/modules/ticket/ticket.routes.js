/**
 * Ticket Routes
 * Presentation layer - route definitions
 */

const express = require('express');
const router = express.Router();
const { protect, admin, scanner } = require('../../middleware/authMiddleware');
const { validate } = require('../../middleware/validationMiddleware');
const {
  createTicketValidator,
  getTicketByIdValidator,
  getEventTicketsValidator,
  getTicketByPublicIdValidator,
  scanAndVerifyTicketValidator,
  cancelTicketValidator
} = require('./validators/ticketValidators');

class TicketRoutes {
  constructor({ ticketController }) {
    this.ticketController = ticketController;
  }

  getRoutes() {
    // Unified scan and verify endpoint (authenticated scanner)
    // Accepts either token or publicId in request body.
    // Authorization is per-event, handled inside ScanAndVerifyTicketUseCase
    // (event creator, or an accepted team member with the checkInTickets
    // permission - admin/superadmin still bypass via req.user.role). The
    // platform-wide 'scanner' role gate previously used here blocked any
    // event-team ticket_scanner from ever reaching this endpoint, since
    // that per-event team role never touches the global user.role field.
    router.post('/scan', protect, ...scanAndVerifyTicketValidator, validate, this.ticketController.scanAndVerify);

    // Ticket management routes
    router.post('/', protect, admin, ...createTicketValidator, validate, this.ticketController.createTicket);
    router.get('/my-tickets', protect, this.ticketController.getMyTickets);
    router.get('/my', protect, this.ticketController.getMyTickets);
    router.get('/active', protect, this.ticketController.getActiveTickets);
    router.get('/event/:eventId', protect, admin, ...getEventTicketsValidator, validate, this.ticketController.getEventTickets);
    router.get('/public/:publicId', protect, scanner, ...getTicketByPublicIdValidator, validate, this.ticketController.getTicketByPublicId);

    // Parameterized routes MUST come last to avoid matching specific routes
    router.get('/:ticketId', protect, ...getTicketByIdValidator, validate, this.ticketController.getTicketById);

    // Cancel ticket
    router.patch('/cancel', protect, ...cancelTicketValidator, validate, this.ticketController.cancelTicket);

    return router;
  }
}

module.exports = TicketRoutes;

