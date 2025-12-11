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
  getTicketByPublicIdValidator,
  scanTicketValidator,
  verifyAndUseTicketValidator,
  verifyAndUseTicketByPublicIdValidator,
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
    router.get('/public/:publicId', protect, scanner, ...getTicketByPublicIdValidator, validate, this.ticketController.getTicketByPublicId);
    router.get('/:ticketId', protect, ...getTicketByIdValidator, validate, this.ticketController.getTicketById);

    // Public scanning (view only)
    router.get('/scan', ...scanTicketValidator, validate, this.ticketController.scanTicket);

    // Authenticated scanner (mark as used) - uses same endpoint but with auth
    router.get('/scan/auth', protect, scanner, ...scanTicketValidator, validate, this.ticketController.scanTicket);

    // Verify and use ticket by token (for scanner)
    router.post('/verify', protect, scanner, ...verifyAndUseTicketValidator, validate, this.ticketController.verifyAndUseTicket);

    // Verify and use ticket by public ID (for scanner)
    router.post('/verify/public', protect, scanner, ...verifyAndUseTicketByPublicIdValidator, validate, this.ticketController.verifyAndUseTicketByPublicId);

    // Cancel ticket
    router.patch('/cancel', protect, ...cancelTicketValidator, validate, this.ticketController.cancelTicket);

    return router;
  }
}

module.exports = TicketRoutes;

