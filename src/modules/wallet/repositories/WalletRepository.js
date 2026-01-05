/**
 * WalletRepository
 * Mongoose implementation of IWalletRepository.
 */

const WalletSchema = require('../entities/Wallet.schema');
const WalletEntity = require('../entities/Wallet.entity');
const { IWalletRepository } = require('./interfaces');

class WalletRepository extends IWalletRepository {
  _toEntity(doc) {
    if (!doc) return null;
    const data = doc.toObject ? doc.toObject() : doc;
    return new WalletEntity({
      id: data._id?.toString() || data.id,
      ownerType: data.ownerType,
      ownerId: data.ownerId ? data.ownerId.toString() : null,
      balance: data.balance ? data.balance.toString() : '0.00',
      currency: data.currency,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    });
  }

  async create(walletData) {
    const doc = await WalletSchema.create(walletData);
    return this._toEntity(doc);
  }

  async findById(id) {
    const doc = await WalletSchema.findById(id);
    return this._toEntity(doc);
  }

  async findByOwner(ownerType, ownerId) {
    const doc = await WalletSchema.findOne({ ownerType, ownerId });
    return this._toEntity(doc);
  }

  async updateBalance(id, newBalance) {
    const doc = await WalletSchema.findByIdAndUpdate(
      id,
      { $set: { balance: newBalance } },
      { new: true }
    );
    return this._toEntity(doc);
  }

  async update(id, updateData) {
    const doc = await WalletSchema.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );
    return this._toEntity(doc);
  }
}

module.exports = WalletRepository;


