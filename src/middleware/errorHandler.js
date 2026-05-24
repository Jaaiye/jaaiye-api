const logger = require('../utils/logger');
const { sanitizeLogData } = require('../utils/logSanitizer');

// Custom error classes (DRY)
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

// Error handlers (DRY)
const handleValidationError = (error) => {
  // Supports both Mongoose ValidationError (with error.errors)
  // and our custom ValidationError (without error.errors)
  let errorsArray = [];
  if (error && error.errors && typeof error.errors === 'object') {
    errorsArray = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
  }

  logger.warn('Validation Error', sanitizeLogData({
    errorMessage: error.message
  }));

  const payload = {
    success: false,
    error: 'Validation failed'
  };
  if (errorsArray.length > 0) {
    payload.errors = errorsArray;
  }
  return payload;
};

const handleJWTError = (error) => {
  logger.warn('JWT Error', sanitizeLogData({
    errorMessage: error.message
  }));

  return {
    success: false,
    error: 'Invalid token. Please log in again!'
  };
};

const handleJWTExpiredError = (error) => {
  logger.warn('JWT Expired', sanitizeLogData({
    errorMessage: error.message
  }));

  return {
    success: false,
    error: 'Your token has expired! Please log in again.'
  };
};

const handleAccessTokenExpiredError = (error) => {
  logger.warn('Access Token Expired', sanitizeLogData({ errorMessage: error.message }));
  return { success: false, error: error.message, code: 'ACCESS_TOKEN_EXPIRED' };
};

const handleAccessTokenInvalidError = (error) => {
  logger.warn('Access Token Invalid', sanitizeLogData({ errorMessage: error.message }));
  return { success: false, error: error.message, code: 'ACCESS_TOKEN_INVALID' };
};

const handleRefreshTokenExpiredError = (error) => {
  logger.warn('Refresh Token Expired', sanitizeLogData({ errorMessage: error.message }));
  return { success: false, error: error.message, code: 'REFRESH_TOKEN_EXPIRED' };
};

const handleRefreshTokenInvalidError = (error) => {
  logger.warn('Refresh Token Invalid', sanitizeLogData({ errorMessage: error.message }));
  return { success: false, error: error.message, code: 'REFRESH_TOKEN_INVALID' };
};

const handleDuplicateKeyError = (error) => {
  const field = Object.keys(error.keyValue)[0];

  logger.warn('Duplicate Key Error', sanitizeLogData({
    field,
    value: error.keyValue[field]
  }));

  return {
    success: false,
    error: `${field} already exists`
  };
};

const handleCastError = (error) => {
  logger.warn('Cast Error', sanitizeLogData({
    errorMessage: error.message,
    value: error.value,
    kind: error.kind
  }));

  return {
    success: false,
    error: 'Invalid ID format'
  };
};

const handleDefaultError = (error) => {
  logger.error('Server Error', sanitizeLogData({
    errorName: error.name,
    errorMessage: error.message
  }));

  return {
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Something went wrong!'
      : error.message
  };
};

// Main error handler middleware
const errorHandler = (error, req, res, next) => {
  // Handle JSON parsing errors for multipart/form-data requests
  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      // This is a multipart request that was incorrectly parsed as JSON
      // Let multer handle it by calling next without error
      return next();
    }
    // Otherwise, it's a real JSON parsing error
    error.statusCode = 400;
    error.status = 'fail';
  }

  // Set default status code
  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  // Extract trace ID from ALS or headers
  const als = require('../utils/als');
  const store = als.getStore();
  const traceId = store?.traceId || req.headers['x-trace-id'] || 'no-trace-id';

  // Minimal, sanitized request context
  const context = sanitizeLogData({
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    userId: req.user?.id || 'unauthenticated',
    statusCode: error.statusCode,
    errorName: error.name,
    errorMessage: error.message,
    traceId
  });

  // Log all errors
  if (error.statusCode >= 500) {
    logger.error(`Server Error: ${error.message}`, { ...context, stack: error.stack });
  } else {
    // 4xx errors are logged as warnings
    const isSecurityError = error.statusCode === 401 || error.statusCode === 403;
    const logLevel = isSecurityError ? 'Security Event' : 'Client Error';
    logger.warn(`${logLevel}: ${error.message}`, context);
  }

  // Handle specific error types and return standardized response
  let status = error.statusCode;
  let payload = {
    success: false,
    error: error.message,
    traceId
  };

  if (error.name === 'ValidationError') {
    status = 400;
    payload = { ...handleValidationError(error), traceId };
  } else if (error instanceof SyntaxError && error.message.includes('JSON')) {
    status = 400;
    payload.error = 'Invalid JSON in request body';
  } else if (error.name === 'JsonWebTokenError') {
    status = 401;
    payload = { ...handleJWTError(error), traceId };
  } else if (error.name === 'TokenExpiredError') {
    status = 401;
    payload = { ...handleJWTExpiredError(error), traceId };
  } else if (error.name === 'AccessTokenExpiredError') {
    status = 401;
    payload = { ...handleAccessTokenExpiredError(error), traceId };
  } else if (error.name === 'RefreshTokenExpiredError') {
    status = 401;
    payload = { ...handleRefreshTokenExpiredError(error), traceId };
  } else if (error.name === 'InvalidAccessTokenError') {
    status = 401;
    payload = { ...handleAccessTokenInvalidError(error), traceId };
  } else if (error.name === 'InvalidRefreshTokenError') {
    status = 401;
    payload = { ...handleRefreshTokenInvalidError(error), traceId };
  } else if (error.code === 11000) {
    status = 409;
    payload = { ...handleDuplicateKeyError(error), traceId };
  } else if (error.name === 'CastError') {
    status = 400;
    payload = { ...handleCastError(error), traceId };
  } else if (error.name === 'NotFoundError' || error.statusCode === 404) {
    status = 404;
    payload.error = error.message || 'Resource not found';
  } else if (error.isOperational) {
    // Already has standard status and message
  } else {
    // Programming or unknown errors
    status = 500;
    payload = { ...handleDefaultError(error), traceId };
  }

  return res.status(status).json(payload);
};

module.exports = {
  AppError,
  ValidationError,
  BadRequestError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  errorHandler
};