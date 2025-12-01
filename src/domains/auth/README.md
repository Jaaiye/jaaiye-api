# 🔐 Auth Domain

Clean, DDD-architected authentication domain for Jaaiye.

## 📁 Structure

```
auth/
├── domain/              # Business logic (framework-agnostic)
│   ├── entities/        # UserEntity, TokenBlacklistEntity
│   ├── value-objects/   # Email, Password, VerificationCode
│   ├── services/        # TokenService, PasswordService, OAuthService
│   ├── repositories/    # IUserRepository, ITokenBlacklistRepository (interfaces)
│   └── errors/          # Domain-specific errors
├── application/         # Use cases (application logic)
│   ├── use-cases/       # RegisterUseCase, LoginUseCase, etc.
│   ├── dtos/            # RegisterDTO, LoginDTO, etc.
│   └── ports/           # Interfaces for external services
├── infrastructure/      # External implementations
│   ├── persistence/     # Mongoose schemas & repositories
│   │   ├── schemas/     # User.schema.js, TokenBlacklist.schema.js
│   │   └── repositories/# UserRepository, TokenBlacklistRepository
│   └── adapters/        # EmailAdapter, etc.
├── presentation/        # HTTP layer
│   ├── controllers/     # AuthController
│   ├── routes/          # auth.routes.js
│   ├── middleware/      # authenticate.js, authorize.js
│   └── validators/      # (future)
├── config/              # DI container
│   └── container.js     # Wires all dependencies
├── legacy/              # Old code (for safe deletion)
│   └── README.md        # Migration checklist
├── tests/               # Domain tests (future)
├── index.js             # Domain entry point
├── INTEGRATION.md       # Integration guide
└── README.md            # This file
```

## 🚀 Quick Start

### Mount in Main App

```javascript
const { authRoutes } = require('./domains/auth');
app.use('/api/auth', authRoutes);
```

See [INTEGRATION.md](./INTEGRATION.md) for full guide.

## 🎯 Features

- ✅ Registration with email verification
- ✅ Login with email/username
- ✅ Google OAuth 2.0
- ✅ Password reset flow
- ✅ JWT token management
- ✅ Token blacklisting (logout)
- ✅ Token refresh
- ✅ Role-based authorization (user, admin, scanner, superadmin)
- ✅ Mobile-safe API (100% backward compatible)

## 🛡️ Security

- Bcrypt password hashing (10 rounds)
- JWT with configurable expiration
- Token blacklisting for logout
- Email verification required for login
- Account blocking capability
- Role-based access control

## 📚 Documentation

- [Full Domain Documentation](../../docs/domains/auth/DOMAIN_DOCUMENTATION.md)
- [Integration Guide](./INTEGRATION.md)
- [Legacy Migration](./legacy/README.md)
- [DDD Playbook](../../docs/kisame/DDD_IMPLEMENTATION_PLAYBOOK.md)

## 🧪 Testing

```bash
# Run auth domain tests (future)
npm test -- --grep "Auth Domain"
```

## 📝 API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | No |
| POST | `/login` | Login user | No |
| POST | `/google` | Google OAuth | No |
| POST | `/verify-email` | Verify email | Yes |
| POST | `/resend-verification` | Resend verification | Yes |
| POST | `/forgot-password` | Request password reset | No |
| POST | `/reset-password` | Reset password | No |
| POST | `/logout` | Logout (blacklist token) | Yes |
| POST | `/refresh-token` | Refresh token | Yes |
| GET | `/me` | Get current user | Yes |

## 🔗 Dependencies

### Domain Layer
- `jsonwebtoken` - JWT token generation/verification
- `bcryptjs` - Password hashing
- `google-auth-library` - Google OAuth verification

### Infrastructure Layer
- `mongoose` - MongoDB ORM
- `resend` - Email service

### Presentation Layer
- `express` - HTTP framework

## 🎓 DDD Principles Applied

1. **Separation of Concerns** - Each layer has single responsibility
2. **Dependency Inversion** - Domain doesn't depend on infrastructure
3. **Repository Pattern** - Abstract data access
4. **Use Case Pattern** - Clear business operations
5. **Entity-Driven** - Business rules in entities
6. **Value Objects** - Immutable value types
7. **Dependency Injection** - Loose coupling via container

## 🚧 Future Enhancements

- [ ] Apple ID OAuth
- [ ] 2FA (Two-Factor Authentication)
- [ ] Session management
- [ ] Login history & device tracking
- [ ] Passwordless authentication
- [ ] Social login (Facebook, Twitter)
- [ ] Account deletion flow
- [ ] Email change flow

## 🤝 Contributing

When modifying this domain:

1. Keep layers separated
2. Business logic goes in domain layer
3. Infrastructure details in infrastructure layer
4. HTTP concerns in presentation layer
5. Wire new dependencies in container
6. Update documentation
7. Test mobile compatibility before merging

## 📞 Support

Questions? Check:
- [Domain Documentation](../../docs/domains/auth/DOMAIN_DOCUMENTATION.md)
- [DDD Playbook](../../docs/kisame/DDD_IMPLEMENTATION_PLAYBOOK.md)

---

**Built with ❤️ following DDD principles**

