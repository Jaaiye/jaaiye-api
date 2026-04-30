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

        socket.on('join_group', (data) => {
            const id = (data && typeof data === 'object') ? (data.groupId || data.id || data._id || data).toString() : String(data);
            socket.join(`group_${id}`);
            logger.debug(`User ${userId} joined group room: group_${id}`);
        });

        socket.on('leave_group', (data) => {
            const id = (data && typeof data === 'object') ? (data.groupId || data.id || data._id || data).toString() : String(data);
            socket.leave(`group_${id}`);
            logger.debug(`User ${userId} left group room: group_${id}`);
        });

        socket.on('join_event', (data) => {
            const id = (data && typeof data === 'object') ? (data.eventId || data.id || data._id || data).toString() : String(data);
            socket.join(`event_${id}`);
            logger.debug(`User ${userId} joined event room: event_${id}`);
        });

        socket.on('leave_event', (data) => {
            const id = (data && typeof data === 'object') ? (data.eventId || data.id || data._id || data).toString() : String(data);
            socket.leave(`event_${id}`);
            logger.debug(`User ${userId} left event room: event_${id}`);
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
 * Send message to a specific room
 * @param {string} room - Target room name
 * @param {string} event - Event name
 * @param {Object} data - Data to send
 */
function sendToRoom(room, event, data) {
    if (!io) return;
    logger.info(`[WS] Emitting ${event} to room ${room}`, { event, room });
    io.to(room).emit(event, data);
}

/**
 * Send message to a specific user
 * @param {string} userId - Target user ID
 * @param {string} event - Event name
 * @param {Object} data - Data to send
 */
function sendToUser(userId, event, data) {
    sendToRoom(String(userId), event, data);
}

/**
 * Send message to a specific group room
 * @param {string} groupId - Target group ID
 * @param {string} event - Event name
 * @param {Object} data - Data to send
 */
function sendToGroup(groupId, event, data) {
    sendToRoom(`group_${groupId}`, event, data);
}

/**
 * Send message to a specific event room
 * @param {string} eventId - Target event ID
 * @param {string} event - Event name
 * @param {Object} data - Data to send
 */
function sendToEvent(eventId, event, data) {
    sendToRoom(`event_${eventId}`, event, data);
}

/**
 * Broadcast message to all connected clients
 * @param {string} event - Event name
 * @param {Object} data - Data to broadcast
 */
function broadcast(event, data) {
    if (!io) return;
    logger.info(`[WS] Broadcasting ${event} to all users`, { event });
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
    sendToEvent,
    sendToRoom,
    broadcast,
    getIo
};
