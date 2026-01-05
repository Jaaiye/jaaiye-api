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
    // Accepts either token or publicId in request body
    router.post('/scan', protect, scanner, ...scanAndVerifyTicketValidator, validate, this.ticketController.scanAndVerify);

    // Ticket management routes
    router.post('/', protect, admin, ...createTicketValidator, validate, this.ticketController.createTicket);
    router.get('/my-tickets', protect, this.ticketController.getMyTickets);
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

