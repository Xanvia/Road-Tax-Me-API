import { AppDataSource } from '../database/connection';
import { Vehicle } from '../entities/Vehicle';
import logger from '../utils/logger';
import { DVLAResponse } from './dvlaService';

class VehicleService {
  private vehicleRepository = AppDataSource.getRepository(Vehicle);

  async lookupAndSaveVehicle(registrationNumber: string, dvlaData: DVLAResponse): Promise<Vehicle> {
    try {
      let vehicle = await this.vehicleRepository.findOne({
        where: { registrationNumber: registrationNumber.toUpperCase() },
      });

      if (vehicle) {
        // Update existing vehicle
        vehicle.taxStatus = dvlaData.taxStatus || vehicle.taxStatus;
        vehicle.taxDueDate = dvlaData.taxDueDate || vehicle.taxDueDate;
        vehicle.motStatus = dvlaData.motStatus || vehicle.motStatus;
        vehicle.motExpiryDate = dvlaData.motExpiryDate || vehicle.motExpiryDate;
        vehicle.make = dvlaData.make || vehicle.make;
        vehicle.colour = dvlaData.colour || vehicle.colour;
        vehicle.fuelType = dvlaData.fuelType || vehicle.fuelType;
        vehicle.engineCapacity = dvlaData.engineCapacity || vehicle.engineCapacity;
        vehicle.co2Emissions = dvlaData.co2Emissions || vehicle.co2Emissions;
        vehicle.yearOfManufacture = dvlaData.yearOfManufacture || vehicle.yearOfManufacture;
        vehicle.euroStatus = dvlaData.euroStatus || vehicle.euroStatus;
        vehicle.typeApproval = dvlaData.typeApproval || vehicle.typeApproval;
        vehicle.automatedVehicle = dvlaData.automatedVehicle !== undefined ? dvlaData.automatedVehicle : vehicle.automatedVehicle;
        vehicle.dvlaData = dvlaData;
        vehicle.dvlaFetchedAt = new Date();
      } else {
        // Create new vehicle
        vehicle = this.vehicleRepository.create({
          registrationNumber: registrationNumber.toUpperCase(),
          taxStatus: dvlaData.taxStatus,
          taxDueDate: dvlaData.taxDueDate,
          motStatus: dvlaData.motStatus,
          motExpiryDate: dvlaData.motExpiryDate,
          make: dvlaData.make,
          colour: dvlaData.colour,
          fuelType: dvlaData.fuelType,
          engineCapacity: dvlaData.engineCapacity,
          co2Emissions: dvlaData.co2Emissions,
          yearOfManufacture: dvlaData.yearOfManufacture,
          euroStatus: dvlaData.euroStatus,
          typeApproval: dvlaData.typeApproval,
          automatedVehicle: dvlaData.automatedVehicle,
          dvlaData,
          dvlaFetchedAt: new Date(),
        });
      }

      await this.vehicleRepository.save(vehicle);
      logger.info(`Vehicle saved: ${registrationNumber}`);
      return vehicle;
    } catch (error) {
      logger.error('Error saving vehicle:', error);
      throw error;
    }
  }

  async getVehicleByRegistration(registrationNumber: string): Promise<Vehicle | null> {
    try {
      const vehicle = await this.vehicleRepository.findOne({
        where: { registrationNumber: registrationNumber.toUpperCase() },
      });
      return vehicle || null;
    } catch (error) {
      logger.error('Error fetching vehicle:', error);
      throw error;
    }
  }

  async getAllVehicles(limit: number = 10, offset: number = 0): Promise<{ vehicles: Vehicle[]; total: number }> {
    try {
      const [vehicles, total] = await this.vehicleRepository.findAndCount({
        skip: offset,
        take: limit,
        order: { createdAt: 'DESC' },
      });
      return { vehicles, total };
    } catch (error) {
      logger.error('Error fetching vehicles:', error);
      throw error;
    }
  }

  async getVehicleById(id: string): Promise<Vehicle | null> {
    try {
      return await this.vehicleRepository.findOne({
        where: { id },
      });
    } catch (error) {
      logger.error('Error fetching vehicle by ID:', error);
      throw error;
    }
  }
}

export default new VehicleService();
