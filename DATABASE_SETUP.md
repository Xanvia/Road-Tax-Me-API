# Database Setup Guide

## Option 1: Docker Compose (Easiest - Recommended)

### Start PostgreSQL with Docker
```bash
# Start the database container
docker-compose up -d postgres

# Wait for database to be ready (about 5 seconds)
sleep 5

# Verify it's running
docker-compose ps postgres
```

This will:
- Create PostgreSQL container on port 5432
- Create database: `roadtaxme_db`
- Create user: `taxme_user`
- Set password from `.env` (DB_PASSWORD)

### Access Database with PgAdmin UI
```bash
# Start PgAdmin
docker-compose up -d pgadmin

# Open browser: http://localhost:5050
# Login: admin@taxme.com / admin

# Add server:
# - Name: Road Tax DB
# - Host: postgres (use docker internal hostname)
# - Port: 5432
# - Username: taxme_user
# - Password: (from .env DB_PASSWORD)
```

### Connect Backend to Database
```bash
# Start backend (after database is running)
docker-compose up -d backend

# Or in development:
npm run dev
```

---

## Option 2: Local PostgreSQL Installation

### Install PostgreSQL (macOS with Homebrew)
```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Verify installation
psql --version
```

### Create Database and User
```bash
# Create the user
createuser taxme_user

# Create the database
createdb -O taxme_user roadtaxme_db

# Set password for user
psql -U postgres -c "ALTER USER taxme_user WITH PASSWORD 'your_secure_password';"

# Verify
psql -U taxme_user -d roadtaxme_db -c "SELECT 1;"
```

### Update .env
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=taxme_user
DB_PASSWORD=your_secure_password
DB_NAME=roadtaxme_db
```

### Test Connection
```bash
npm run dev
# Should log: "Database connection established"
```

---

## Option 3: Docker (Manual)

### Run PostgreSQL Container
```bash
# Start container
docker run -d \
  --name road-tax-db \
  -e POSTGRES_USER=taxme_user \
  -e POSTGRES_PASSWORD=secure_password \
  -e POSTGRES_DB=roadtaxme_db \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine

# Wait for startup
sleep 5

# Verify
docker logs road-tax-db | grep "ready to accept connections"
```

### Update .env
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=taxme_user
DB_PASSWORD=secure_password
DB_NAME=roadtaxme_db
```

---

## Verify Database Connection

### Test with Node Script
```bash
# Create test-db.js
cat > test-db.js << 'EOF'
const { AppDataSource } = require('./dist/database/connection');

AppDataSource.initialize()
  .then(() => {
    console.log('✅ Database connection successful!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });
EOF

# Run test
npm run build
node test-db.js
```

### Test with psql (CLI)
```bash
# Connect directly
psql -h localhost -U taxme_user -d roadtaxme_db

# Inside psql:
# \dt -- list tables
# \q  -- quit

# One-liner test
psql -h localhost -U taxme_user -d roadtaxme_db -c "SELECT 1;"
```

---

## Common Issues & Solutions

### ❌ "Connection refused"
```bash
# Check if database is running
# Docker
docker-compose ps postgres

# Local
brew services list | grep postgres

# Start if needed
docker-compose up -d postgres
# or
brew services start postgresql@15
```

### ❌ "Authentication failed"
```bash
# Check credentials in .env match database
# Reset password if needed
psql -U postgres -c "ALTER USER taxme_user WITH PASSWORD 'new_password';"
```

### ❌ "Database does not exist"
```bash
# Create the database
createdb -O taxme_user roadtaxme_db

# Or with Docker
docker exec road-tax-db createdb -U taxme_user roadtaxme_db
```

### ❌ "Port 5432 already in use"
```bash
# Find what's using the port
lsof -i :5432

# Kill the process
kill -9 <PID>

# Or use a different port in docker-compose
# Change DB_PORT in .env to 5433, update docker-compose.yml
```

---

## Database Tables (Auto-created by TypeORM)

When you start the application with `synchronize: true` (development), TypeORM will auto-create these tables:

```sql
-- Entities
- admins          -- Admin users and authentication
- vehicles        -- DVLA vehicle data
- submissions     -- User form submissions  
- user_contacts   -- Contact information (no auth required)
- tax_options     -- Tax duration and pricing options
- payments        -- Payment transactions
```

Each table has:
- UUID primary key (id)
- Created/Updated timestamps
- Proper relationships (foreign keys)

---

## Backup & Restore

### Backup Database (Docker)
```bash
# Backup
docker exec road-tax-db pg_dump -U taxme_user roadtaxme_db > backup.sql

# Or with docker-compose
docker-compose exec postgres pg_dump -U taxme_user roadtaxme_db > backup.sql
```

### Restore Database (Docker)
```bash
# Restore
docker exec -i road-tax-db psql -U taxme_user roadtaxme_db < backup.sql
```

### Backup Local PostgreSQL
```bash
# Backup
pg_dump -U taxme_user roadtaxme_db > backup.sql

# Restore
psql -U taxme_user roadtaxme_db < backup.sql
```

---

## Database Migrations (Future)

When you add new entities or modify existing ones:

```bash
# Generate migration
npm run migration:generate -- -n AddNewColumn

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

---

## Development Tips

### Monitor Database
```bash
# SSH into database container
docker exec -it road-tax-db psql -U taxme_user -d roadtaxme_db

# Common commands
\dt              -- List all tables
\d <table_name>  -- Describe table
SELECT * FROM admins;  -- Query data
\q               -- Quit
```

### Check Database Size
```bash
# Docker
docker exec road-tax-db psql -U taxme_user -d roadtaxme_db -c \
  "SELECT pg_size_pretty(pg_database_size('roadtaxme_db'));"

# Local
psql -U taxme_user -d roadtaxme_db -c \
  "SELECT pg_size_pretty(pg_database_size('roadtaxme_db'));"
```

---

## Next Steps

1. Choose setup method (recommended: Docker)
2. Start database service
3. Update `.env` with correct credentials
4. Run `npm run dev` to start backend
5. Verify at `http://localhost:3000/health`
6. Start implementing services!
