/**
 * Ticket Routes
 * Presentation layer - route definitions
 */

const express = require('express');
const router = express.Router();
const { protect, admin, scanner } = require('../../../../middleware/authMiddleware');
const { validate } = require('../../../../middleware/validationMiddleware');
const {
  createTicketValidator,
  getTicketByIdValidator,
  getEventTicketsValidator,
  scanTicketValidator,
  verifyAndUseTicketValidator,
  cancelTicketValidator
} = require('../validators/ticketValidators');

class TicketRoutes {
  constructor({ ticketController }) {
    this.ticketController = ticketController;
  }

  getRoutes() {
    // Ticket management routes
    router.post('/', protect, admin, ...createTicketValidator, validate, this.ticketController.createTicket);
    router.get('/my-tickets', protect, this.ticketController.getMyTickets);
    router.get('/active', protect, this.ticketController.getActiveTickets);
    router.get('/event/:eventId', protect, admin, ...getEventTicketsValidator, validate, this.ticketController.getEventTickets);
    router.get('/:ticketId', protect, ...getTicketByIdValidator, validate, this.ticketController.getTicketById);

    // Public scanning (view only)
    router.get('/scan', ...scanTicketValidator, validate, this.ticketController.scanTicket);

    // Authenticated scanner (mark as used) - uses same endpoint but with auth
    router.get('/scan/auth', protect, scanner, ...scanTicketValidator, validate, this.ticketController.scanTicket);

    // Cancel ticket
    router.patch('/cancel', protect, ...cancelTicketValidator, validate, this.ticketController.cancelTicket);

    return router;
  }
}

module.exports = TicketRoutes;

