# Road Tax Me - Backend Setup Guidelines (Simplified)

## Overview

A comprehensive guide for building a backend API for the Road Tax Me application using **Express.js**, **TypeScript**, **PostgreSQL**, and **TypeORM**.

### Key Architecture Principles
- **Admin-Only Authentication**: Only admin users need to login
- **No User Registration**: Regular users submit forms anonymously
- **Complete DVLA Integration**: Store all vehicle data from DVLA API
- **WhatsApp Contact**: Users provide WhatsApp for follow-up
- **Payment Processing**: Stripe/PayStack integration
- **Submission Tracking**: Admin dashboard for all submissions

---

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [Database Design](#database-design)
3. [API Structure](#api-structure)
4. [Authentication](#authentication)
5. [Core Services](#core-services)
6. [Environment Setup](#environment-setup)
7. [Docker Setup](#docker-setup)
8. [Deployment](#deployment)

---

## Tech Stack

### Core Technologies
- **Node.js 18+** - Runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL 15+** - Database
- **TypeORM** - ORM
- **Docker** - Containerization

### Key Libraries
```bash
# Core
express cors dotenv uuid

# Database & ORM
typeorm pg

# Authentication & Security
jsonwebtoken bcrypt helmet express-rate-limit

# Validation
class-validator class-transformer

# Utilities
winston axios

```

---

## Database Design

### Core Entities Overview

#### 1. **Admin** (Authentication Required)
- Admin users only
- Email, hashed password, role
- First/Last name, active status
- Last login tracking

#### 2. **Vehicle** (DVLA Data)
- Registration number (unique, indexed)
- Complete DVLA data:
  - Tax status, tax due date
  - MOT status, MOT expiry date
  - Make, colour, fuel type
  - Engine capacity, CO2 emissions
  - Year of manufacture
  - Euro status, type approval
  - Automated vehicle flag
  - 25+ total fields
- DVLA data fetch timestamp
- Created/Updated timestamps

#### 3. **Submission** (User Submission)
- Links vehicle, tax option, payment
- User contact information
- Status: pending, processing, completed, failed
- Admin notes
- Submission timestamp

#### 4. **UserContact** (No Authentication)
- Name, email, mobile, WhatsApp
- Linked to submission
- Created timestamp

#### 5. **TaxOption** (Configuration)
- Duration: 1-month, 3-months, 6-months, 12-months
- Price in GBP
- Active/inactive toggle
- Display order
- Created/Updated timestamps

#### 6. **Payment** (Transaction)
- Amount, currency (GBP)
- Provider: stripe, paystack
- Transaction ID (unique)
- Status: pending, completed, failed, refunded
- Metadata (JSON)
- Created/Updated timestamps

### Entity Relationships

```
Admin (1) ─── (0..n) ─── Submission (admin manages submissions)
         
Submission (1) ─── (1) ─── Vehicle (one vehicle per submission)
Submission (1) ─── (1) ─── UserContact (one contact per submission)
Submission (1) ─── (1) ─── TaxOption (one tax option selected)
Submission (1) ─── (0..1) ─── Payment (optional, for paid submissions)
```

### Database Schema Notes
- **No User Table**: Regular users don't authenticate
- **Submissions Anonymous**: No userId field, tracked by IP/session
- **Complete DVLA Data**: All API response fields stored
- **Indexes**: registrationNumber (vehicles), email (admin)
- **Cascades**: Submission deletion cascades to userContact

---

## API Structure

### Base URL
```
http://localhost:3000/api
```

### Public Endpoints (No Authentication)

#### Vehicle Management
```
POST   /vehicles/lookup
  → Send: { registrationNumber: string }
  → Get: Vehicle data from DVLA API
  → Caches in database

GET    /vehicles/:registration
  → Get: Cached vehicle details
  → No API call needed if cached
```

#### Submission Management
```
POST   /submissions
  → Send: { 
      vehicleId, 
      taxOptionId, 
      userContact { name, email, mobile, whatsapp }
    }
  → Create: New submission record
  → Return: submissionId, status

GET    /submissions/:id
  → Get: Submission details
  → No authentication needed
  → Returns: vehicle, tax option, contact, payment status

GET    /submissions/:id/status
  → Get: Current submission status
  → For tracking purposes
```

#### Payment Processing
```
POST   /payments/create-intent
  → Send: { submissionId, amount }
  → Create: Stripe payment intent
  → Return: clientSecret, paymentIntentId

POST   /payments/webhook/stripe
  → Webhook endpoint for Stripe events
  → Updates submission status on payment completion
  → Handles: payment_intent.succeeded, payment_intent.failed

GET    /payments/:submissionId
  → Get: Payment details for submission
  → Status and transaction info
```

#### Tax Options
```
GET    /tax-options
  → Get: All active tax options
  → Return: List with prices and durations

GET    /tax-options/:id
  → Get: Single tax option details
```

---

### Admin Endpoints (JWT Authentication Required)

#### Admin Authentication
```
POST   /admin/auth/login
  → Send: { email, password }
  → Return: JWT token, admin info
  → Sets: lastLogin timestamp

POST   /admin/auth/logout
  → Invalidates token (optional)

GET    /admin/auth/me
  → Get: Current admin profile
  → Requires: Valid JWT token

POST   /admin/auth/refresh
  → Send: { token }
  → Return: New JWT token
```

#### Dashboard
```
GET    /admin/dashboard/statistics
  → Get: Overview stats
  → Returns: total submissions, completed, pending, 
             revenue, conversion rate

GET    /admin/dashboard/recent-submissions
  → Get: Recent submissions (paginated)
```

#### Submissions Management
```
GET    /admin/submissions
  → Query params: page, limit, status, search, sortBy
  → Get: All submissions with filters
  → Return: Paginated list with vehicle & contact info

GET    /admin/submissions/:id
  → Get: Full submission details
  → Includes: vehicle data, contact, payment, notes

PATCH  /admin/submissions/:id
  → Send: { status, notes }
  → Update: Submission status and admin notes
  → Log: Change history

DELETE /admin/submissions/:id
  → Delete: Submission and related data

GET    /admin/submissions/export
  → Query: format (csv, json), dateRange
  → Export: Submissions to file
```

#### Payments Management
```
GET    /admin/payments
  → Query: page, limit, status, dateRange
  → Get: All payments list
  → Return: Paginated payments with details

GET    /admin/payments/:id
  → Get: Payment details and transaction history

POST   /admin/payments/:id/refund
  → Send: { reason }
  → Initiate: Refund to original payment method
  → Update: Submission status to refunded
```

#### Tax Options Management
```
GET    /admin/tax-options
  → Get: All tax options (including inactive)

POST   /admin/tax-options
  → Send: { duration, price, description }
  → Create: New tax option

PUT    /admin/tax-options/:id
  → Send: { duration, price, description, isActive }
  → Update: Tax option details

DELETE /admin/tax-options/:id
  → Delete: Tax option (soft delete recommended)
```

#### Admin Users Management (Super Admin Only)
```
GET    /admin/admins
  → Get: List of all admin users

POST   /admin/admins
  → Send: { email, password, firstName, lastName }
  → Create: New admin user

PUT    /admin/admins/:id
  → Send: { email, firstName, lastName, role, isActive }
  → Update: Admin user

DELETE /admin/admins/:id
  → Delete: Admin user account
```

---

## Authentication

### JWT Token Structure

```typescript
// Admin Token Payload
{
  adminId: string (UUID),
  email: string,
  role: 'admin' | 'super_admin',
  iat: number (issued at),
  exp: number (expiration)
}
```

### Token Usage

**Request Headers:**
```
Authorization: Bearer <jwt_token>
```

**Token Expiry:** 7 days (configurable)

**Refresh Strategy:**
- Client stores token in localStorage
- Include in Authorization header for protected routes
- Refresh endpoint provides new token before expiry

### Protection Strategy

```
Public Routes (No Auth):
├── /api/vehicles/*
├── /api/submissions (POST, GET by ID)
├── /api/payments/create-intent
├── /api/payments/webhook/stripe
└── /api/tax-options

Admin Routes (Auth Required):
├── /api/admin/auth/* (login, logout, me, refresh)
└── All other /api/admin/* routes require valid JWT
    ├── Middleware: Verify JWT token
    ├── Extract: adminId, email, role from token
    └── Validate: Role permissions if needed
```

### Password Security
- **Hash Algorithm:** bcrypt (10 salt rounds)
- **Storage:** Never store plain text passwords
- **Comparison:** Use bcrypt.compare() for validation
- **Reset:** Implement forgot password with temporary tokens

---

## Core Services

### 1. DVLA Service
**Purpose:** Integrate with DVLA API for vehicle lookups

**Key Functions:**
- `lookupVehicle(registrationNumber)` - Call DVLA API
- `getCachedVehicle(registrationNumber)` - Get from database
- `mapDVLAResponse(data)` - Convert API response to entity

**Process:**
1. Receive registration number from user
2. Call DVLA API endpoint
3. Map response to vehicle fields
4. Save/update in database
5. Return vehicle data to client

**Error Handling:**
- 404: Vehicle not found
- 400: Invalid registration format
- 500: API error (retry logic)
- Rate limiting: Implement caching to reduce API calls

### 2. Submission Service
**Purpose:** Handle user submissions without authentication

**Key Functions:**
- `createSubmission(vehicleId, taxOptionId, userContact)` - New submission
- `getSubmission(submissionId)` - Retrieve submission
- `updateSubmissionStatus(submissionId, status)` - Update status
- `getSubmissionByIP(ip)` - Get user's submissions

**Process:**
1. Validate input data
2. Create submission record with status 'pending'
3. Generate unique submission ID
4. Return confirmation to client
5. Admin reviews in dashboard

**Tracking:**
- Store user's IP address
- Store session ID
- Timestamp all changes

### 3. Payment Service
**Purpose:** Handle payment processing via Stripe/PayStack

**Key Functions:**
- `createPaymentIntent(amount, submissionId)` - Create Stripe intent
- `processWebhook(event)` - Handle Stripe webhook
- `updatePaymentStatus(paymentId, status)` - Update status
- `initiateRefund(paymentId, reason)` - Refund processing

**Process:**
1. Create payment intent with Stripe
2. Return client secret to frontend
3. Frontend completes payment
4. Stripe sends webhook to backend
5. Update submission status to 'completed'
6. Send confirmation to user (WhatsApp)

**Webhook Handling:**
- Verify Stripe signature
- Handle: payment_intent.succeeded, payment_intent.failed
- Idempotent processing (check if already processed)
- Log all webhook events

### 4. Vehicle Service
**Purpose:** Manage vehicle data storage and retrieval

**Key Functions:**
- `saveVehicle(dvlaData)` - Save to database
- `updateVehicle(registration, data)` - Update existing
- `getVehicle(registration)` - Retrieve from database
- `getAllVehicles()` - List all vehicles (admin)

### 5. Admin Service
**Purpose:** Admin user management and authentication

**Key Functions:**
- `loginAdmin(email, password)` - Admin login
- `createAdmin(email, password, firstName, lastName)` - Create admin
- `updateAdmin(adminId, updates)` - Update admin
- `deleteAdmin(adminId)` - Deactivate admin
- `validateAdminCredentials(email, password)` - Verify password

**Permissions:**
- `admin`: View submissions, manage status, view payments
- `super_admin`: All + manage admins, manage tax options

---

## Environment Setup

### Required Environment Variables

```env
# Server
NODE_ENV=development|production|staging
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=taxme_user
DB_PASSWORD=secure_password
DB_NAME=roadtaxme_db

# JWT Configuration
JWT_SECRET=your_secure_secret_key_here
JWT_EXPIRY=7d

# DVLA API
DVLA_API_KEY=your_dvla_api_key
DVLA_PROD_URL=https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry
DVLA_TEST_URL=https://uat.driver-vehicle-licensing.api.gov.uk/vehicle-enquiry

# Payment Gateway (Stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# WhatsApp (Future)
WHATSAPP_ENABLED=false

# Logging
LOG_LEVEL=info|debug|error
```

---

## Docker Setup

### Docker Compose Structure

**Services:**
1. **PostgreSQL** - Database container
   - Port: 5432
   - Volume: postgres_data (persistent)
   - Health check: pg_isready

2. **Backend** - Node.js application
   - Port: 3000
   - Build: Multi-stage (builder + production)
   - Depends on: postgres (healthy)
   - Volume: ./src (hot reload in dev)

3. **PgAdmin** - Database UI (optional)
   - Port: 5050
   - Login: admin@taxme.com / admin

### Running Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Clean everything
docker-compose down -v
```

### Dockerfile Stages

**Stage 1 (Builder):**
- Use node:18-alpine
- Install dependencies
- Build TypeScript to JavaScript

**Stage 2 (Production):**
- Use node:18-alpine (lean image)
- Copy only necessary files
- Add dumb-init for proper signal handling
- Run as non-root user

---

## Project Structure

```

├── src/
│   ├── index.ts                    # Application entry point
│   ├── entities/                   # TypeORM entities
│   │   ├── Admin.ts
│   │   ├── Vehicle.ts
│   │   ├── Submission.ts
│   │   ├── Payment.ts
│   │   ├── UserContact.ts
│   │   └── TaxOption.ts
│   ├── controllers/                # Request handlers
│   │   ├── vehicleController.ts
│   │   ├── submissionController.ts
│   │   ├── paymentController.ts
│   │   ├── adminController.ts
│   │   └── authController.ts
│   ├── services/                   # Business logic
│   │   ├── dvlaService.ts
│   │   ├── vehicleService.ts
│   │   ├── submissionService.ts
│   │   ├── paymentService.ts
│   │   └── adminService.ts
│   ├── routes/                     # Express routes
│   │   ├── index.ts
│   │   ├── vehicles.ts
│   │   ├── submissions.ts
│   │   ├── payments.ts
│   │   ├── admin.ts
│   │   └── auth.ts
│   ├── middleware/                 # Custom middleware
│   │   ├── errorHandler.ts
│   │   ├── authentication.ts
│   │   └── validation.ts
│   ├── database/
│   │   ├── connection.ts
│   │   └── migrations/
│   ├── utils/                      # Utility functions
│   │   ├── jwt.ts
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   └── validators.ts
│   └── config/                     # Configuration
│       ├── database.ts
│       └── dvla.ts
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Implementation Workflow

### Phase 1: Setup (Day 1)
- Initialize Node project
- Install dependencies
- Configure Docker
- Set up environment variables
- Create directory structure

### Phase 2: Database (Day 1-2)
- Create entities
- Configure TypeORM connection
- Generate migrations
- Set up database

### Phase 3: Services (Day 2-3)
- Implement DVLA service
- Implement vehicle service
- Implement submission service
- Implement payment service

### Phase 4: API - Public (Day 3-4)
- Vehicle lookup endpoints
- Submission endpoints
- Payment endpoints
- Tax options endpoints

### Phase 5: Admin System (Day 4-5)
- Admin authentication
- Admin dashboard endpoints
- Admin management endpoints

### Phase 6: Testing & Deployment (Day 5-6)
- Unit tests
- Integration tests
- Deploy to staging
- Production deployment

---

## Key Design Decisions

### 1. No User Authentication
- Simplifies user experience
- Reduces security burden
- Faster submissions
- Contact info stored for follow-up

### 2. Complete DVLA Data Storage
- Reduces API calls (caching)
- Enables offline access
- Historical tracking
- Better performance

### 3. Admin-Only Admin Panel
- Secure operations
- Role-based access control
- Audit trail possible
- Resource management

### 4. WhatsApp for Customer Contact
- Modern communication
- Direct to customer
- Reduces email spam
- Two-way messaging possible

### 5. Separate Public & Admin APIs
- Clear security boundaries
- Independent scaling
- Different rate limits
- Easy to secure

---

## Response Format Standards

### Success Response
```json
{
  "status": "success",
  "data": {
    // response data here
  },
  "message": "Optional message"
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error description",
  "errors": {
    "field": ["error1", "error2"]
  }
}
```

### Paginated Response
```json
{
  "status": "success",
  "data": [
    // items
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

## Deployment

### Prerequisites
- Docker installed on server
- PostgreSQL credentials
- DVLA API key
- Stripe API keys
- Domain name (for HTTPS)

### Deployment Steps

1. **Prepare Environment**
   - Set production environment variables
   - Configure CORS for production domain
   - Update database credentials

2. **Build Docker Image**
   ```bash
   docker build -f docker/Dockerfile -t roadtaxme-backend:latest .
   ```

3. **Push to Registry** (Optional)
   ```bash
   docker tag roadtaxme-backend:latest your-registry/roadtaxme-backend:latest
   docker push your-registry/roadtaxme-backend:latest
   ```

4. **Deploy**
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

5. **Verify**
   - Check logs: `docker-compose logs backend`
   - Test endpoints: `curl http://localhost:3000/api/tax-options`
   - Monitor: Set up logging and monitoring

### Scaling Options
- **VPS**: Docker Compose on single server
- **Kubernetes**: Use Helm charts for multi-server
- **Cloud Platforms**: AWS ECS, Google Cloud Run, Azure Container Instances
- **Managed Databases**: Use cloud-managed PostgreSQL

---

## Development Tips

### Local Development
```bash
npm run dev        # Start with ts-node (hot reload)
npm run build      # Build TypeScript
npm test           # Run tests
npm run migration:generate  # Create new migration
```

### Debugging
```bash
DEBUG=* npm run dev    # Enable all debug logs
# Or use VS Code debugger with launch.json
```

### Database Changes
1. Create/modify entities
2. Generate migration: `npm run migration:generate -- -n DescriptionOfChange`
3. Review generated migration
4. Run migration: `npm run migration:run`

---

## Security Best Practices

1. **Never commit .env file** - Use .env.example
2. **Hash passwords** - Use bcrypt (never plain text)
3. **Validate input** - Validate all user inputs
4. **Rate limiting** - Implement on public endpoints
5. **CORS properly** - Whitelist only trusted origins
6. **HTTPS in production** - Always use SSL/TLS
7. **JWT secrets** - Use strong, unique secrets
8. **Sensitive logs** - Don't log passwords or tokens
9. **SQL injection prevention** - Use TypeORM (parameterized queries)
10. **CSRF protection** - If cookies are used

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Port 3000 already in use | `lsof -i :3000` then `kill -9 <PID>` |
| Database connection fails | Check DB_HOST, credentials, postgres container running |
| DVLA API 404 | Verify registration format, check DVLA API key |
| Payment webhook not working | Verify Stripe webhook URL, check signature |
| Migrations not running | Ensure database is ready, check migration files |
| Token expired | Implement refresh token endpoint |


---

## Resources

- [Express.js Docs](https://expressjs.com)
- [TypeORM Docs](https://typeorm.io)
- [PostgreSQL Docs](https://www.postgresql.org/docs)
- [JWT.io](https://jwt.io)
- [DVLA API Spec](https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/vehicle-enquiry-service/v1.2.0-vehicle-enquiry-service.json)
- [Stripe API Docs](https://stripe.com/docs/api)
