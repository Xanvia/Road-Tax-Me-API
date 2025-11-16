import bcrypt from 'bcrypt';
import { AppDataSource } from '../database/connection';
import { Admin } from '../entities/Admin';
import { Submission } from '../entities/Submission';
import { Payment } from '../entities/Payment';
import { generateToken } from '../utils/jwt';

export interface AdminLoginDTO {
  email: string;
  password: string;
}

export interface CreateAdminDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface DashboardStatistics {
  totalSubmissions: number;
  completedSubmissions: number;
  pendingSubmissions: number;
  failedSubmissions: number;
  totalRevenue: number;
  conversionRate: number;
}

class AdminService {
  private adminRepository = AppDataSource.getRepository(Admin);
  private submissionRepository = AppDataSource.getRepository(Submission);
  private paymentRepository = AppDataSource.getRepository(Payment);

  async login(data: AdminLoginDTO): Promise<{ token: string; admin: Admin }> {
    try {
      const admin = await this.adminRepository.findOne({
        where: { email: data.email.toLowerCase() },
      });

      if (!admin) {
        throw new Error('Admin not found');
      }

      if (!admin.isActive) {
        throw new Error('Admin account is inactive');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(data.password, admin.passwordHash);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      admin.lastLogin = new Date();
      await this.adminRepository.save(admin);

      // Generate token
      const token = generateToken({
        adminId: admin.id,
        email: admin.email,
      });

      console.log(`Admin logged in: ${admin.email}`);
      return { token, admin };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async createAdmin(data: CreateAdminDTO): Promise<Admin> {
    try {
      // Check if admin already exists
      const existingAdmin = await this.adminRepository.findOne({
        where: { email: data.email.toLowerCase() },
      });

      if (existingAdmin) {
        throw new Error('Admin with this email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 10);

      // Create admin
      const admin = this.adminRepository.create({
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        isActive: true,
      });

      await this.adminRepository.save(admin);
      console.log(`Admin created: ${admin.email}`);
      return admin;
    } catch (error) {
      console.error('Error creating admin:', error);
      throw error;
    }
  }

  async getAdminById(id: string): Promise<Admin | null> {
    try {
      return await this.adminRepository.findOne({
        where: { id },
      });
    } catch (error) {
      throw error;
    }
  }

  async getAllAdmins(): Promise<Admin[]> {
    try {
      return await this.adminRepository.find({
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      console.error('Error fetching admins:', error);
      throw error;
    }
  }

  async updateAdmin(id: string, updates: Partial<Admin>): Promise<Admin | null> {
    try {
      const admin = await this.getAdminById(id);
      if (!admin) {
        return null;
      }

      // Update fields
      if (updates.email) {
        admin.email = updates.email.toLowerCase();
      }
      if (updates.firstName) {
        admin.firstName = updates.firstName;
      }
      if (updates.lastName) {
        admin.lastName = updates.lastName;
      }
      if (updates.isActive !== undefined) {
        admin.isActive = updates.isActive;
      }

      await this.adminRepository.save(admin);
      return admin;
    } catch (error) {
      console.error('Error updating admin:', error);
      throw error;
    }
  }

  async deleteAdmin(id: string): Promise<boolean> {
    try {
      const result = await this.adminRepository.delete(id);
      if (result.affected === 0) {
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error deleting admin:', error);
      throw error;
    }
  }

  async getDashboardStatistics(): Promise<DashboardStatistics> {
    try {
      const totalSubmissions = await this.submissionRepository.count();
      const completedSubmissions = await this.submissionRepository.countBy({ status: 'completed' });
      const pendingSubmissions = await this.submissionRepository.countBy({ status: 'pending' });
      const failedSubmissions = await this.submissionRepository.countBy({ status: 'failed' });

      // Calculate total revenue
      const payments = await this.paymentRepository.find({
        where: { status: 'completed' },
      });

      const totalRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const conversionRate = totalSubmissions > 0 ? (completedSubmissions / totalSubmissions) * 100 : 0;

      return {
        totalSubmissions,
        completedSubmissions,
        pendingSubmissions,
        failedSubmissions,
        totalRevenue,
        conversionRate: Math.round(conversionRate * 100) / 100,
      };
    } catch (error) {
      console.error('Error getting dashboard statistics:', error);
      throw error;
    }
  }

  async validateAdminCredentials(email: string, password: string): Promise<boolean> {
    try {
      const admin = await this.adminRepository.findOne({
        where: { email: email.toLowerCase() },
      });

      if (!admin || !admin.isActive) {
        return false;
      }

      return await bcrypt.compare(password, admin.passwordHash);
    } catch (error) {
      console.error('Error validating credentials:', error);
      return false;
    }
  }
}

export default new AdminService();
