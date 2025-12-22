/**
 * Use Cases
 * Application layer - use cases exports
 */

const GetProfileUseCase = require('./GetProfileUseCase');
const UpdateProfileUseCase = require('./UpdateProfileUseCase');
const ChangePasswordUseCase = require('./ChangePasswordUseCase');
const UpdateEmailUseCase = require('./UpdateEmailUseCase');
const DeleteAccountUseCase = require('./DeleteAccountUseCase');
const LogoutUseCase = require('./LogoutUseCase');
const GetFirebaseTokenUseCase = require('./GetFirebaseTokenUseCase');
const AddBankAccountUseCase = require('./AddBankAccountUseCase');
const SetDefaultBankAccountUseCase = require('./SetDefaultBankAccountUseCase');

module.exports = {
  GetProfileUseCase,
  UpdateProfileUseCase,
  ChangePasswordUseCase,
  UpdateEmailUseCase,
  DeleteAccountUseCase,
  LogoutUseCase,
  GetFirebaseTokenUseCase,
  AddBankAccountUseCase,
  SetDefaultBankAccountUseCase
};

