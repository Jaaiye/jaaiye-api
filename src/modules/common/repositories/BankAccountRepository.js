/**
 * BankAccountRepository
 * Shared infrastructure repository for user bank accounts.
 */

// Note: BankAccount model will be migrated from models/ during legacy cleanup
// For now, keeping reference to models/ - will update after model migration
const BankAccount = require('../entities/BankAccount.schema');

class BankAccountRepository {
  async create(data) {
    const doc = await BankAccount.create(data);
    return doc.toObject();
  }

  async findByUser(userId) {
    const docs = await BankAccount.find({ user: userId }).sort({ createdAt: -1 });
    return docs.map(doc => doc.toObject());
  }

  async findDefaultByUser(userId) {
    const doc = await BankAccount.findOne({ user: userId, isDefault: true });
    return doc ? doc.toObject() : null;
  }

  async findByIdForUser(id, userId) {
    const doc = await BankAccount.findOne({ _id: id, user: userId });
    return doc ? doc.toObject() : null;
  }

  async findById(id) {
    const doc = await BankAccount.findById(id);
    return doc ? doc.toObject() : null;
  }

  async setDefault(userId, bankAccountId) {
    // Unset existing defaults
    await BankAccount.updateMany(
      { user: userId, isDefault: true },
      { $set: { isDefault: false } }
    );

    // Set new default
    const doc = await BankAccount.findOneAndUpdate(
      { _id: bankAccountId, user: userId },
      { $set: { isDefault: true } },
      { new: true }
    );

    return doc ? doc.toObject() : null;
  }
}

module.exports = BankAccountRepository;


