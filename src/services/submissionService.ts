import { AppDataSource } from '../database/connection';
import { Submission } from '../entities/Submission';
import { UserContact } from '../entities/UserContact';
import { Vehicle } from '../entities/Vehicle';
import taxCalculator from '../utils/taxCalculator';

export interface CreateSubmissionDTO {
  vehicleId: string;
  taxPreference: number; // 1 = 6 months, 2 = 12 months, 3 = Direct Debit
  userContact: {
    name: string;
    email: string;
    mobile?: string;
    whatsapp: string;
  };
  userIpAddress?: string;
  sessionId?: string;
}

export interface UpdateSubmissionDTO {
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  adminNotes?: string;
}

class SubmissionService {
  private submissionRepository = AppDataSource.getRepository(Submission);
  private userContactRepository = AppDataSource.getRepository(UserContact);
  private vehicleRepository = AppDataSource.getRepository(Vehicle);

  /**
   * Calculate tax and total amount based on vehicle data and user preference
   */
  private calculateTaxForSubmission(vehicle: Vehicle, taxPreference: number): {
    sixMonthTaxRate: number | null;
    twelveMonthTaxRate: number | null;
    commissionFee: number;
    totalAmount: number;
    taxCalculationNotes: string;
  } {
    // Calculate the base tax rates using the vehicle data
    const taxResult = taxCalculator.calculateVehicleTax(vehicle);

    let commissionFee: number;
    let totalAmount: number;
    let selectedTaxRate: number | null;

    switch (taxPreference) {
      case 1: // 6 months + £50 commission
        commissionFee = 50;
        selectedTaxRate = taxResult.sixMonthRate;
        totalAmount = taxCalculator.calculateWithCommission(selectedTaxRate, commissionFee);
        break;

      case 2: // 12 months + £50 commission
        commissionFee = 50;
        selectedTaxRate = taxResult.twelveMonthRate;
        totalAmount = taxCalculator.calculateWithCommission(selectedTaxRate, commissionFee);
        break;

      case 3: // Direct Debit - Commission only (£60)
        commissionFee = 60;
        selectedTaxRate = null;
        totalAmount = commissionFee; // No tax, just commission for direct debit setup
        break;

      default:
        commissionFee = 50;
        selectedTaxRate = taxResult.twelveMonthRate;
        totalAmount = taxCalculator.calculateWithCommission(selectedTaxRate, commissionFee);
    }

    return {
      sixMonthTaxRate: taxResult.sixMonthRate,
      twelveMonthTaxRate: taxResult.twelveMonthRate,
      commissionFee,
      totalAmount,
      taxCalculationNotes: taxResult.notes || ''
    };
  }

  async createSubmission(data: CreateSubmissionDTO): Promise<Submission> {
    try {
      // Create user contact
      const userContact = this.userContactRepository.create({
        name: data.userContact.name,
        email: data.userContact.email,
        mobile: data.userContact.mobile,
        whatsapp: data.userContact.whatsapp,
      });

      await this.userContactRepository.save(userContact);

      // Get vehicle data for tax calculation
      const vehicle = await this.vehicleRepository.findOne({
        where: { id: data.vehicleId }
      });

      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      // Calculate tax amounts based on vehicle data and preference
      const taxCalculation = this.calculateTaxForSubmission(vehicle, data.taxPreference);

      // Create submission with all required fields
      const submission = new Submission();
      submission.vehicle = vehicle;
      submission.taxPreference = data.taxPreference;
      submission.sixMonthTaxRate = taxCalculation.sixMonthTaxRate;
      submission.twelveMonthTaxRate = taxCalculation.twelveMonthTaxRate;
      submission.commissionFee = taxCalculation.commissionFee;
      submission.totalAmount = taxCalculation.totalAmount;
      submission.taxCalculationNotes = taxCalculation.taxCalculationNotes;
      submission.userContact = userContact;
      submission.status = 'pending';
      submission.userIpAddress = data.userIpAddress ?? null;
      submission.sessionId = data.sessionId ?? null;

      await this.submissionRepository.save(submission);
      console.log(`Submission created: ${submission.id}`);
      return submission;
    } catch (error) {
      console.error('Error creating submission:', error);
      throw error;
    }
  }

  async getSubmissionById(id: string): Promise<Submission | null> {
    try {
      const submission = await this.submissionRepository.findOne({
        where: { id },
        relations: ['vehicle', 'userContact', 'payment'],
      });
      return submission || null;
    } catch (error) {
      console.error('Error fetching submission:', error);
      throw error;
    }
  }

  async getSubmissionStatus(id: string): Promise<{ status: string; updatedAt: Date } | null> {
    try {
      const submission = await this.submissionRepository.findOne({
        where: { id },
        select: ['status', 'updatedAt'],
      });
      return submission ? { status: submission.status, updatedAt: submission.updatedAt } : null;
    } catch (error) {
      console.error('Error fetching submission status:', error);
      throw error;
    }
  }

  async updateSubmission(id: string, data: UpdateSubmissionDTO): Promise<Submission | null> {
    try {
      const submission = await this.getSubmissionById(id);
      if (!submission) {
        return null;
      }

      if (data.status) {
        submission.status = data.status;
      }
      if (data.adminNotes !== undefined) {
        submission.adminNotes = data.adminNotes;
      }

      await this.submissionRepository.save(submission);
      console.log(`Submission updated: ${id}`);
      return submission;
    } catch (error) {
      console.error('Error updating submission:', error);
      throw error;
    }
  }

  async getAllSubmissions(limit: number = 10, offset: number = 0, filters?: { status?: string; search?: string }): Promise<{ submissions: Submission[]; total: number }> {
    try {
      let query = this.submissionRepository.createQueryBuilder('submission')
        .leftJoinAndSelect('submission.vehicle', 'vehicle')
        .leftJoinAndSelect('submission.userContact', 'userContact')
        .leftJoinAndSelect('submission.payment', 'payment')
        .skip(offset)
        .take(limit)
        .orderBy('submission.createdAt', 'DESC');

      if (filters?.status) {
        query = query.andWhere('submission.status = :status', { status: filters.status });
      }

      if (filters?.search) {
        query = query.andWhere(
          '(userContact.name ILIKE :search OR userContact.email ILIKE :search OR vehicle.registrationNumber ILIKE :search)',
          { search: `%${filters.search}%` }
        );
      }

      const [submissions, total] = await query.getManyAndCount();
      return { submissions, total };
    } catch (error) {
      console.error('Error fetching submissions:', error);
      throw error;
    }
  }

  async deleteSubmission(id: string): Promise<boolean> {
    try {
      const submission = await this.getSubmissionById(id);
      if (!submission) {
        return false;
      }

      // Delete user contact (cascade)
      if (submission.userContactId) {
        await this.userContactRepository.delete(submission.userContactId);
      }

      // Delete submission
      await this.submissionRepository.delete(id);
      console.log(`Submission deleted: ${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting submission:', error);
      throw error;
    }
  }

  async getRecentSubmissions(limit: number = 5): Promise<Submission[]> {
    try {
      return await this.submissionRepository.find({
        relations: ['vehicle', 'userContact', 'payment'],
        order: { createdAt: 'DESC' },
        take: limit,
      });
    } catch (error) {
      console.error('Error fetching recent submissions:', error);
      throw error;
    }
  }

  async getSubmissionsByStatus(status: 'pending' | 'processing' | 'completed' | 'failed'): Promise<Submission[]> {
    try {
      return await this.submissionRepository.find({
        where: { status },
        relations: ['vehicle', 'userContact'],
      });
    } catch (error) {
      console.error('Error fetching submissions by status:', error);
      throw error;
    }
  }
}

export default new SubmissionService();
