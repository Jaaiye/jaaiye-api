const { Server } = require('socket.io');
const logger = require('./logger');
const TokenService = require('../modules/common/services/TokenService');

let io = null;

/**
 * Initialize Socket.io Server
 * @param {http.Server} server - Node.js HTTP server 
 */
function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // Authentication Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
            logger.warn(`Connection rejected: No token provided from ${socket.handshake.address}`);
            return next(new Error('Authentication error: Token required'));
        }

        try {
            const decoded = TokenService.verifyAccessToken(token);
            socket.user = decoded; // Attach user info to socket (id, email, role, etc)
            next();
        } catch (err) {
            logger.warn(`Connection rejected: Invalid token from ${socket.handshake.address}`);
            return next(new Error('Authentication error: Invalid or expired token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.user.id;
        const ip = socket.handshake.address;

        // Automatically join the user to their private room
        socket.join(userId);
        logger.info(`User ${userId} authenticated and connected via Socket.io from ${ip}`);

        socket.on('join_group', (groupId) => {
            socket.join(`group_${groupId}`);
            logger.debug(`User ${userId} joined group room: group_${groupId}`);
        });

        socket.on('leave_group', (groupId) => {
            socket.leave(`group_${groupId}`);
            logger.debug(`User ${userId} left group room: group_${groupId}`);
        });

        socket.on('join_event', (eventId) => {
            socket.join(`event_${eventId}`);
            logger.debug(`User ${userId} joined event room: event_${eventId}`);
        });

        socket.on('leave_event', (eventId) => {
            socket.leave(`event_${eventId}`);
            logger.debug(`User ${userId} left event room: event_${eventId}`);
        });

        socket.on('disconnect', () => {
            logger.info(`User ${userId} disconnected (${ip})`);
        });

        socket.on('error', (err) => {
            logger.error(`Socket.io error for user ${userId}:`, err);
        });

        // Send initial connection confirmation with user info
        socket.emit('connection_status', {
            status: 'connected',
            userId: userId,
            user: {
                username: socket.user.username,
                role: socket.user.role
            }
        });
    });

    return io;
}

/**
 * Send message to a specific user
 * @param {string} userId - Target user ID
 * @param {string} event - Event name
 * @param {Object} data - Data to send
 */
function sendToUser(userId, event, data) {
    if (!io) return;
    io.to(userId).emit(event, data);
}

/**
 * Send message to a specific group room
 * @param {string} groupId - Target group ID
 * @param {string} event - Event name
 * @param {Object} data - Data to send
 */
function sendToGroup(groupId, event, data) {
    if (!io) return;
    io.to(`group_${groupId}`).emit(event, data);
}

/**
 * Broadcast message to all connected clients
 * @param {string} event - Event name
 * @param {Object} data - Data to broadcast
 */
function broadcast(event, data) {
    if (!io) return;
    io.emit(event, data);
}

/**
 * Get Socket.io instance
 */
function getIo() {
    return io;
}

module.exports = {
    initSocket,
    sendToUser,
    sendToGroup,
    broadcast,
    getIo
};
