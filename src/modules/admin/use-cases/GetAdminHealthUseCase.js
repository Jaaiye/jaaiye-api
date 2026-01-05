/**
 * Get Admin Health Use Case
 * Application layer - business logic
 */

class GetAdminHealthUseCase {
  async execute() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = GetAdminHealthUseCase;


