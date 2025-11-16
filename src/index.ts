import 'reflect-metadata';
// Disable stdout buffering for Docker/production environments
if (typeof (process.stdout as any)._handle !== 'undefined') {
  (process.stdout as any)._handle.setBlocking(true);
}
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { AppDataSource } from './database/connection';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';
import { Admin } from './entities/Admin';
import bcrypt from 'bcrypt';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
  credentials: true,
}));

// Stripe webhook needs raw body for signature verification
app.use('/api/payments/webhook/stripe', express.raw({ type: 'application/json' }));

// Regular JSON parsing for all other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', routes);

// Error handling middleware
app.use(errorHandler);

// Seed admin user at startup
const seedAdminUser = async () => {
  try {
    const adminRepository = AppDataSource.getRepository(Admin);

    // Check if admin already exists
    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.log('ℹ️  Skipping admin seed: SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD not set');
      return;
    }

    const existingAdmin = await adminRepository.findOne({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const admin = adminRepository.create({
      email: adminEmail,
      passwordHash,
      firstName: process.env.SEED_ADMIN_FIRST_NAME || 'Super',
      lastName: process.env.SEED_ADMIN_LAST_NAME || 'Admin',
      isActive: true,
    });

    await adminRepository.save(admin);

    console.log('✅ Admin user created successfully!');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.firstName} ${admin.lastName}`);
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    // Don't exit, just log the error
  }
};

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize TypeORM connection
    await AppDataSource.initialize();
    console.log('Database connection established');

    // Seed admin user
    await seedAdminUser();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(0);
});

startServer();

export default app;
