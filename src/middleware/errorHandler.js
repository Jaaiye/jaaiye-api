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

  // Minimal, sanitized request context
  const context = sanitizeLogData({
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    userId: req.user?.id || 'unauthenticated',
    statusCode: error.statusCode,
    errorName: error.name,
    errorMessage: error.message
  });

  // Filter out high-volume, low-value errors to save log quota
  const isHighVolumeError = error.statusCode === 404 || error.name === 'ValidationError' || error.name === 'NotFoundError';
  const isSecurityError = error.statusCode === 401 || error.statusCode === 403;

  // Log server errors (5xx) and security events (401/403). Skip the rest.
  if (error.statusCode >= 500) {
    logger.error('Server Error', { ...context, stack: error.stack });
  } else if (isSecurityError) {
    logger.warn('Security Event', context);
  }
  // 404s and Validation errors are now completely silent in logs

  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json(handleValidationError(error));
  }

  // Handle SyntaxError (JSON parsing errors)
  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body'
    });
  }

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json(handleJWTError(error));
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json(handleJWTExpiredError(error));
  }

  if (error.code === 11000) {
    return res.status(409).json(handleDuplicateKeyError(error));
  }

  if (error.name === 'CastError') {
    return res.status(400).json(handleCastError(error));
  }

  // Handle NotFoundError specifically
  if (error.name === 'NotFoundError' || error.statusCode === 404) {
    return res.status(404).json({
      success: false,
      error: error.message || 'Resource not found'
    });
  }

  // Handle operational errors
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message
    });
  }

  // Handle programming or unknown errors
  return res.status(500).json(handleDefaultError(error));
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