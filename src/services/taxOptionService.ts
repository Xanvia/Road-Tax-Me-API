import { AppDataSource } from '../database/connection';
import { TaxOption } from '../entities/TaxOption';
import logger from '../utils/logger';

export interface CreateTaxOptionDTO {
  duration: '6-months' | '12-months';
  price: number;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateTaxOptionDTO {
  duration?: '6-months' | '12-months';
  price?: number;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
}

class TaxOptionService {
  private taxOptionRepository = AppDataSource.getRepository(TaxOption);

  async createTaxOption(data: CreateTaxOptionDTO): Promise<TaxOption> {
    try {
      const taxOption = this.taxOptionRepository.create({
        duration: data.duration,
        price: data.price,
        description: data.description,
        isActive: data.isActive !== false,
        displayOrder: data.displayOrder || 0,
      });

      await this.taxOptionRepository.save(taxOption);
      logger.info(`Tax option created: ${data.duration}`);
      return taxOption;
    } catch (error) {
      logger.error('Error creating tax option:', error);
      throw error;
    }
  }

  async getTaxOptionById(id: string): Promise<TaxOption | null> {
    try {
      return await this.taxOptionRepository.findOne({
        where: { id },
      });
    } catch (error) {
      logger.error('Error fetching tax option:', error);
      throw error;
    }
  }

  async getAllTaxOptions(activeOnly: boolean = true): Promise<TaxOption[]> {
    try {
      let query = this.taxOptionRepository.createQueryBuilder('taxOption');

      if (activeOnly) {
        query = query.where('taxOption.isActive = :isActive', { isActive: true });
      }

      return await query
        .orderBy('taxOption.displayOrder', 'ASC')
        .addOrderBy('taxOption.duration', 'ASC')
        .getMany();
    } catch (error) {
      logger.error('Error fetching tax options:', error);
      throw error;
    }
  }

  async getActiveTaxOptions(): Promise<TaxOption[]> {
    return this.getAllTaxOptions(true);
  }

  async updateTaxOption(id: string, data: UpdateTaxOptionDTO): Promise<TaxOption | null> {
    try {
      const taxOption = await this.getTaxOptionById(id);
      if (!taxOption) {
        return null;
      }

      if (data.duration) {
        taxOption.duration = data.duration;
      }
      if (data.price !== undefined) {
        taxOption.price = data.price;
      }
      if (data.description !== undefined) {
        taxOption.description = data.description;
      }
      if (data.isActive !== undefined) {
        taxOption.isActive = data.isActive;
      }
      if (data.displayOrder !== undefined) {
        taxOption.displayOrder = data.displayOrder;
      }

      await this.taxOptionRepository.save(taxOption);
      logger.info(`Tax option updated: ${id}`);
      return taxOption;
    } catch (error) {
      logger.error('Error updating tax option:', error);
      throw error;
    }
  }

  async deleteTaxOption(id: string): Promise<boolean> {
    try {
      const result = await this.taxOptionRepository.delete(id);
      if (result.affected === 0) {
        return false;
      }
      logger.info(`Tax option deleted: ${id}`);
      return true;
    } catch (error) {
      logger.error('Error deleting tax option:', error);
      throw error;
    }
  }

  async initializeDefaultTaxOptions(): Promise<void> {
    try {
      const count = await this.taxOptionRepository.count();
      if (count > 0) {
        return;
      }

      const defaultOptions = [
        { duration: '6-months' as const, price: 149.99, description: '6 Months Road Tax' },
        { duration: '12-months' as const, price: 249.99, description: '12 Months Road Tax' },
      ];

      for (let i = 0; i < defaultOptions.length; i++) {
        await this.createTaxOption({
          ...defaultOptions[i],
          isActive: true,
          displayOrder: i + 1,
        });
      }

      logger.info('Default tax options initialized');
    } catch (error) {
      logger.error('Error initializing default tax options:', error);
    }
  }
}

export default new TaxOptionService();
