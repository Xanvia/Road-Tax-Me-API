import axios, { AxiosError } from 'axios';

export interface DVLAResponse {
  registrationNumber: string;
  taxStatus: string;
  taxDueDate: string;
  motStatus: string;
  motExpiryDate: string;
  make: string;
  colour: string;
  fuelType: string;
  engineCapacity: number;
  co2Emissions: number;
  yearOfManufacture: number;
  euroStatus: string;
  typeApproval: string;
  automatedVehicle: boolean;
  [key: string]: any;
}

class DVLAService {
  private apiKey: string = process.env.DVLA_API_KEY || '';
  private baseUrl: string = process.env.DVLA_PROD_URL || 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry';
  private testUrl: string = process.env.DVLA_TEST_URL || 'https://uat.driver-vehicle-licensing.api.gov.uk/vehicle-enquiry';

  async lookupVehicle(registrationNumber: string): Promise<DVLAResponse> {
    try {
      // Validate registration number format
      if (!this.isValidRegistration(registrationNumber)) {
        throw new Error('Invalid registration number format');
      }

      // In production, use actual DVLA endpoint
      // For now, we'll use mock data for development
      const isDevelopment = process.env.NODE_ENV === 'development';

      if (isDevelopment) {
        console.log(`[DEV] Looking up vehicle: ${registrationNumber}`);
        return this.getMockVehicleData(registrationNumber);
      }

      // Production DVLA API call
      const response = await axios.post(
        `${this.baseUrl}/v1/vehicles`,
        {
          registrationNumber: registrationNumber.toUpperCase(),
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      console.log(`Vehicle lookup successful for: ${registrationNumber}`);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      
      if (axiosError.response?.status === 404) {
        console.error(`Vehicle not found: ${registrationNumber}`);
        throw new Error('Vehicle not found');
      }

      if (axiosError.response?.status === 400) {
        console.error(`Invalid registration format: ${registrationNumber}`);
        throw new Error('Invalid registration format');
      }

      console.error('DVLA API error:', error);
      throw new Error('Failed to lookup vehicle from DVLA');
    }
  }

  private isValidRegistration(registration: string): boolean {
    // UK registration format validation
    // Format: XXX YYY or XXXXYYY
    const pattern = /^[A-Z]{2}\d{2}\s?[A-Z]{3}$|^[A-Z]{3}\d{3}[A-Z]$|^[A-Z]\d[A-Z]\s?\d[A-Z]{3}$/;
    return pattern.test(registration.toUpperCase());
  }

  private getMockVehicleData(registration: string): DVLAResponse {
    // Mock data for development
    return {
      registrationNumber: registration.toUpperCase(),
      taxStatus: 'Taxed',
      taxDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      motStatus: 'Valid',
      motExpiryDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      make: 'FORD',
      colour: 'Blue',
      fuelType: 'Petrol',
      engineCapacity: 1600,
      co2Emissions: 145,
      yearOfManufacture: 2020,
      euroStatus: 'EURO 6d-TEMP',
      typeApproval: '168/2013/EC',
      automatedVehicle: false,
    };
  }
}

export default new DVLAService();
