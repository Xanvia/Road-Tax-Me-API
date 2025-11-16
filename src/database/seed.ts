import 'reflect-metadata';
import { AppDataSource } from './connection';
import { Admin } from '../entities/Admin';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const seedAdminUser = async () => {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('Database connection established');

    const adminRepository = AppDataSource.getRepository(Admin);

    // Check if admin already exists
    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error('❌ SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env file');
      process.exit(1);
    }

    const existingAdmin = await adminRepository.findOne({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
      process.exit(0);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const admin = adminRepository.create({
      email: adminEmail,
      passwordHash,
      firstName: process.env.SEED_ADMIN_FIRST_NAME || 'Super',
      lastName: process.env.SEED_ADMIN_LAST_NAME || 'Admin',
      role: 'super_admin',
      isActive: true,
    });

    await adminRepository.save(admin);

    console.log('✅ Admin user created successfully!');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Name: ${admin.firstName} ${admin.lastName}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    process.exit(1);
  }
};

seedAdminUser();
