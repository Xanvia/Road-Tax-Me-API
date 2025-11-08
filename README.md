# Road Tax Me API

A comprehensive backend API for the Road Tax Me application built with Express.js, TypeScript, PostgreSQL, and TypeORM.

## Features

- **Admin-Only Authentication**: Secure JWT-based authentication for admin users
- **DVLA Integration**: Complete vehicle lookup and data storage from DVLA API
- **Payment Processing**: Stripe/PayStack integration for tax payments
- **Submission Tracking**: Admin dashboard for managing all user submissions
- **WhatsApp Support**: Customer contact via WhatsApp for follow-ups
- **Role-Based Access Control**: Admin and Super Admin roles with different permissions

## Tech Stack

- **Node.js 18+** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL 15+** - Relational database
- **TypeORM** - Object-Relational Mapping
- **Docker** - Containerization
- **JWT** - Authentication token management
- **Stripe** - Payment processing

## Project Structure

```
src/
├── entities/             # Database entity definitions
├── routes/              # API route handlers
├── middleware/          # Custom middleware
├── services/            # Business logic (to be implemented)
├── controllers/         # Request handlers (to be implemented)
├── database/            # Database configuration
├── utils/               # Utility functions
├── config/              # Configuration files
└── index.ts             # Application entry point
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL 15+
- Docker (optional)

### Installation

1. **Clone the repository** (or navigate to the project)
   ```bash
   cd Road-Tax-Me-API
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Update .env with your credentials**
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=taxme_user
   DB_PASSWORD=your_secure_password
   DB_NAME=roadtaxme_db
   
   JWT_SECRET=your_secure_jwt_secret
   DVLA_API_KEY=your_dvla_api_key
   STRIPE_SECRET_KEY=your_stripe_secret
   ```

### Development

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Build TypeScript**
   ```bash
   npm run build
   ```

3. **Start production server**
   ```bash
   npm run start
   ```

## API Endpoints

### Public Endpoints

#### Vehicles
- `POST /api/vehicles/lookup` - Lookup vehicle by registration number
- `GET /api/vehicles/:registration` - Get cached vehicle details

#### Submissions
- `POST /api/submissions` - Create new submission
- `GET /api/submissions/:id` - Get submission details
- `GET /api/submissions/:id/status` - Get submission status

#### Payments
- `POST /api/payments/create-intent` - Create Stripe payment intent
- `POST /api/payments/webhook/stripe` - Stripe webhook endpoint
- `GET /api/payments/:submissionId` - Get payment details

#### Tax Options
- `GET /api/tax-options` - Get all active tax options
- `GET /api/tax-options/:id` - Get specific tax option

### Admin Endpoints (JWT Required)

#### Authentication
- `POST /api/admin/auth/login` - Admin login
- `GET /api/admin/auth/me` - Get current admin profile
- `POST /api/admin/auth/logout` - Admin logout

#### Dashboard
- `GET /api/admin/dashboard/statistics` - Get overview statistics
- `GET /api/admin/dashboard/recent-submissions` - Get recent submissions

#### Submissions Management
- `GET /api/admin/submissions` - Get all submissions (paginated)
- `GET /api/admin/submissions/:id` - Get submission details
- `PATCH /api/admin/submissions/:id` - Update submission status
- `DELETE /api/admin/submissions/:id` - Delete submission

## Database Schema

### Entities

1. **Admin** - Admin users with authentication
2. **Vehicle** - DVLA vehicle data
3. **Submission** - User submissions
4. **UserContact** - Contact information (no authentication)
5. **TaxOption** - Tax duration and pricing options
6. **Payment** - Payment transaction records

## Development Workflow

### Phase 1: Setup ✅ (Complete)
- Project initialization
- Dependencies installation
- Environment configuration

### Phase 2: Database (Next)
- Create TypeORM migrations
- Initialize PostgreSQL database
- Test database connection

### Phase 3: Services
- Implement DVLA integration
- Build vehicle service
- Create submission service
- Develop payment service

### Phase 4: API Implementation
- Implement public endpoints
- Build admin endpoints
- Add authentication middleware

### Phase 5: Testing & Deployment
- Unit and integration tests
- Docker containerization
- Deployment configuration

## Docker Setup

### Running with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `NODE_ENV` - Environment (development/staging/production)
- `PORT` - Server port
- `DB_*` - Database credentials
- `JWT_SECRET` - JWT secret for token generation
- `DVLA_*` - DVLA API configuration
- `STRIPE_*` - Stripe payment configuration

## Security Best Practices

- ✅ Environment variables for sensitive data
- ✅ Password hashing with bcrypt
- ✅ JWT token-based authentication
- ✅ CORS configuration
- ✅ Input validation
- ⚠️ HTTPS in production (configure reverse proxy)
- ⚠️ Rate limiting on public endpoints
- ⚠️ SQL injection prevention (via TypeORM)

## Debugging

Enable detailed logging:
```bash
DEBUG=* npm run dev
```

## Resources

- [Express.js Documentation](https://expressjs.com)
- [TypeORM Documentation](https://typeorm.io)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [JWT.io](https://jwt.io)
- [Stripe API Documentation](https://stripe.com/docs/api)

## Next Steps

1. Set up PostgreSQL database locally or in Docker
2. Create `.env` file with actual credentials
3. Run database migrations
4. Start implementing services (DVLA, Payment, etc.)
5. Add input validation DTOs
6. Implement error handling
7. Add comprehensive tests
8. Set up Docker configuration

## Support

For issues or questions, please refer to the init.md documentation or create an issue.
