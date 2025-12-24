const ApiKey = require('../modules/common/entities/ApiKey.schema');

// Validate mobile API key
exports.validateMobileApiKey = async (req, res, next) => {
  // Skip API key validation for public OAuth redirect endpoints
  // Google redirects here without API key, and user ID is extracted from state parameter
  const publicOAuthPaths = [
    '/oauth/redirect',
    '/api/v1/calendars/google/oauth/callback'
  ];

  if (publicOAuthPaths.some(path =>
    req.path === path ||
    req.originalUrl === path ||
    req.originalUrl.startsWith(path + '?') ||
    req.url === path ||
    req.url.startsWith(path + '?')
  )) {
    return next();
  }

  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key is required'
    });
  }

  try {
    const validKey = await ApiKey.findOne({
      key: apiKey,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!validKey) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired API key'
      });
    }

    // Update last used timestamp
    validKey.lastUsed = new Date();
    await validKey.save();

    req.apiKey = validKey;
    next();
  } catch(error) {
    res.status(500).json({
      success: false,
      error: 'Error validating API key'
    });
  }
};