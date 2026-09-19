/**
 * GetBankAccountsUseCase
 * - Lists the requesting user's bank accounts (add/set-default/delete
 *   already existed; there was no read endpoint for the global wallet
 *   screen's bank account section to call).
 */

const { BadRequestError } = require('../../common/errors');

class GetBankAccountsUseCase {
  constructor({ bankAccountRepository }) {
    this.bankAccountRepository = bankAccountRepository;
  }

  async execute(userId) {
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }
    return await this.bankAccountRepository.findByUser(userId);
  }
}

module.exports = GetBankAccountsUseCase;
