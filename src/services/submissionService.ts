import { AppDataSource } from '../database/connection';
import { Submission } from '../entities/Submission';
import { UserContact } from '../entities/UserContact';

export interface CreateSubmissionDTO {
  vehicleId: string;
  taxOptionId: string;
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

      // Create submission
      const submission = this.submissionRepository.create({
        vehicleId: data.vehicleId,
        taxOptionId: data.taxOptionId,
        userContact,
        userContactId: userContact.id,
        status: 'pending',
        userIpAddress: data.userIpAddress,
        sessionId: data.sessionId,
      });

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
        relations: ['vehicle', 'taxOption', 'userContact', 'payment'],
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
        .leftJoinAndSelect('submission.taxOption', 'taxOption')
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
        relations: ['vehicle', 'taxOption', 'userContact', 'payment'],
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
