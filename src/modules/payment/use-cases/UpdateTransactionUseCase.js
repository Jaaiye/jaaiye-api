/**
 * Update Transaction Use Case
 * Application layer - business logic
 */

const { UpdateTransactionDTO } = require('../dto');
const { TransactionNotFoundError } = require('../errors');

class UpdateTransactionUseCase {
  constructor({ transactionRepository }) {
    this.transactionRepository = transactionRepository;
  }

  async execute(dto) {
    dto.validate();

    const transaction = await this.transactionRepository.findByReference(dto.reference);

    if (!transaction) {
      throw new TransactionNotFoundError();
    }

    const updateData = {};
    if (dto.transId !== undefined && dto.transId !== null) {
      updateData.transId = dto.transId;
      updateData.status = 'pending';
      if (dto.transReference !== undefined && dto.transReference !== null) {
        updateData.transReference = dto.transReference;
      }
    }

    const updatedTransaction = await this.transactionRepository.update(transaction.id, updateData);

    return {
      message: 'Transaction updated successfully',
      transaction: updatedTransaction.toJSON()
    };
  }
}

module.exports = UpdateTransactionUseCase;

