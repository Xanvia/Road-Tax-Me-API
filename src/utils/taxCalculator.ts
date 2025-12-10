import taxRatesData from '../../support/vehicle_tax_rates.json';
import { Vehicle } from '../entities/Vehicle';

export interface TaxCalculationResult {
  sixMonthRate: number | null;
  twelveMonthRate: number | null;
  isFirstYear: boolean;
  band?: string;
  notes?: string;
}

export class TaxCalculator {
  private taxRates = taxRatesData;

  /**
   * Main method to calculate tax for a vehicle
   */
  calculateVehicleTax(vehicle: Vehicle): TaxCalculationResult {
    const registrationDate = this.extractRegistrationDate(vehicle);
    
    if (!registrationDate) {
      return {
        sixMonthRate: null,
        twelveMonthRate: null,
        isFirstYear: false,
        notes: 'Unable to determine registration date'
      };
    }

    // Determine which tax system applies based on registration date
    if (registrationDate >= new Date('2017-04-01')) {
      return this.calculatePost2017Tax(vehicle, registrationDate);
    } else if (registrationDate >= new Date('2001-03-01')) {
      return this.calculate2001to2017Tax(vehicle);
    } else {
      return this.calculatePre2001Tax(vehicle);
    }
  }

  /**
   * Extract registration date from vehicle data
   */
  private extractRegistrationDate(vehicle: Vehicle): Date | null {
    if (vehicle.yearOfManufacture) {
      // Use year of manufacture as approximation
      return new Date(`${vehicle.yearOfManufacture}-01-01`);
    }

    // Try to extract from registration number (UK format)
    const reg = vehicle.registrationNumber.toUpperCase().replace(/\s/g, '');
    
    // New format (e.g., AB12CDE - 12 = Sep 2012 or Mar 2012)
    const newFormatMatch = reg.match(/^[A-Z]{2}(\d{2})[A-Z]{3}$/);
    if (newFormatMatch) {
      const regNumber = parseInt(newFormatMatch[1]);
      let year, month;
      
      if (regNumber >= 51) {
        // September registration (e.g., 51 = Sep 2001, 71 = Sep 2021)
        year = 2000 + (regNumber - 50);
        month = 9;
      } else {
        // March registration (e.g., 12 = Mar 2012, 23 = Mar 2023)
        year = 2000 + regNumber;
        month = 3;
      }
      
      return new Date(year, month - 1, 1);
    }

    // Old format (e.g., A123BCD - A = 1983/84, B = 1984/85, etc.)
    const oldFormatMatch = reg.match(/^[A-Z](\d{3})[A-Z]{3}$/);
    if (oldFormatMatch) {
      const letter = reg.charAt(0);
      const year = 1983 + (letter.charCodeAt(0) - 'A'.charCodeAt(0));
      return new Date(year, 7, 1); // August
    }

    return null;
  }

  /**
   * Calculate tax for vehicles registered on or after 1 April 2017
   */
  private calculatePost2017Tax(vehicle: Vehicle, registrationDate: Date): TaxCalculationResult {
    // Check if this is an N1 light goods vehicle
    if (vehicle.typeApproval === 'N1') {
      return this.calculateN1Tax(vehicle);
    }

    const today = new Date();
    const oneYearAfterReg = new Date(registrationDate);
    oneYearAfterReg.setFullYear(oneYearAfterReg.getFullYear() + 1);

    const isFirstYear = today < oneYearAfterReg;

    if (isFirstYear) {
      // First year rates based on CO2
      return this.calculateFirstYearTax(vehicle);
    } else {
      // Standard rates from second year onwards
      return this.calculateStandardTax(vehicle);
    }
  }

  /**
   * Calculate tax for N1 light goods vehicles
   */
  private calculateN1Tax(vehicle: Vehicle): TaxCalculationResult {
    const euroStatus = vehicle.euroStatus?.toLowerCase() || '';
    
    // N1 vehicles with EURO 5 or below use euro5_light_goods_tc36 rate (£140)
    // N1 vehicles with EURO 6 or above use light_goods_tc39 rate (£345)
    const isEuro6OrAbove = euroStatus.includes('euro 6') || euroStatus.includes('euro6');
    
    let rate;
    let notes;
    
    if (isEuro6OrAbove) {
      rate = this.taxRates.other.light_goods_tc39['12_month'];
      notes = 'N1 light goods vehicle (EURO 6+) - tc39 rate';
    } else {
      rate = this.taxRates.other.euro5_light_goods_tc36['12_month'];
      notes = 'N1 light goods vehicle (EURO 5 or below) - tc36 rate';
    }

    return {
      sixMonthRate: isEuro6OrAbove 
        ? this.taxRates.other.light_goods_tc39['6_month_dd']
        : this.taxRates.other.euro5_light_goods_tc36['6_month_dd'],
      twelveMonthRate: rate,
      isFirstYear: false,
      notes
    };
  }

  /**
   * Calculate first year tax (CO2-based for post-2017 vehicles)
   */
  private calculateFirstYearTax(vehicle: Vehicle): TaxCalculationResult {
    const co2 = vehicle.co2Emissions || 0;
    const rates = this.taxRates.cars['registered_on_or_after_2017-04-01'].firstYear_by_co2;

    for (const bracket of rates) {
      if (co2 >= bracket.co2_min && co2 <= bracket.co2_max) {
        const isDiesel = vehicle.fuelType?.toLowerCase().includes('diesel');
        const rate = isDiesel ? bracket.rates.all_other_diesel : bracket.rates.standard;

        return {
          sixMonthRate: null, // First year is 12 months only
          twelveMonthRate: rate,
          isFirstYear: true,
          notes: 'First year rate based on CO2 emissions'
        };
      }
    }

    return {
      sixMonthRate: null,
      twelveMonthRate: null,
      isFirstYear: true,
      notes: 'Unable to determine first year rate'
    };
  }

  /**
   * Calculate standard tax (from second year onwards for post-2017 vehicles)
   */
  private calculateStandardTax(vehicle: Vehicle): TaxCalculationResult {
    const co2 = vehicle.co2Emissions || 0;
    const listPrice = vehicle.dvlaData?.listPrice || 0;

    // Check if luxury surcharge applies
    const luxuryApplies = this.checkLuxurySurcharge(vehicle, listPrice);

    let rates;
    if (luxuryApplies) {
      rates = this.taxRates.cars['registered_on_or_after_2017-04-01'].luxury_adjusted_rates;
    } else {
      rates = this.taxRates.cars['registered_on_or_after_2017-04-01'].standard_from_second_year;
    }

    return {
      sixMonthRate: rates['6_month_direct_debit'],
      twelveMonthRate: rates['12_month_single'],
      isFirstYear: false,
      notes: luxuryApplies ? 'Includes luxury vehicle surcharge' : 'Standard rate'
    };
  }

  /**
   * Check if luxury surcharge applies
   */
  private checkLuxurySurcharge(vehicle: Vehicle, listPrice: number): boolean {
    const luxury = this.taxRates.common.luxurySurcharge;
    
    // Zero emission vehicles registered before April 2025 are exempt
    if (vehicle.co2Emissions === 0) {
      const regDate = this.extractRegistrationDate(vehicle);
      if (regDate && regDate < new Date('2025-04-01')) {
        return false;
      }
    }

    // Check if list price exceeds threshold
    if (listPrice >= luxury.thresholdListPrice) {
      const regDate = this.extractRegistrationDate(vehicle);
      if (regDate) {
        const now = new Date();
        const yearsSinceReg = (now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        
        // Luxury surcharge applies for 5 years
        if (yearsSinceReg <= luxury.appliesForYears) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculate tax for vehicles registered between 1 March 2001 and 31 March 2017
   */
  private calculate2001to2017Tax(vehicle: Vehicle): TaxCalculationResult {
    const co2 = vehicle.co2Emissions || 0;
    const bands = this.taxRates.cars['registered_2001-03-01_to_2017-03-31'].bands;

    for (const band of bands) {
      if (co2 >= band.co2_min && co2 <= band.co2_max) {
        return {
          sixMonthRate: band['6_month_dd'],
          twelveMonthRate: band['12_month'],
          isFirstYear: false,
          band: band.band,
          notes: `Tax band ${band.band}`
        };
      }
    }

    return {
      sixMonthRate: null,
      twelveMonthRate: null,
      isFirstYear: false,
      notes: 'Unable to determine tax band'
    };
  }

  /**
   * Calculate tax for vehicles registered before 1 March 2001
   */
  private calculatePre2001Tax(vehicle: Vehicle): TaxCalculationResult {
    const engineCapacity = vehicle.engineCapacity || 0;
    const rates = this.taxRates.pre_2001.cars_and_light_goods;

    for (const bracket of rates) {
      if (bracket.engine_cc_max && engineCapacity <= bracket.engine_cc_max) {
        return {
          sixMonthRate: bracket['6_month_dd'],
          twelveMonthRate: bracket['12_month'],
          isFirstYear: false,
          notes: `Based on engine capacity: ${engineCapacity}cc`
        };
      } else if (bracket.engine_cc_min && engineCapacity >= bracket.engine_cc_min) {
        return {
          sixMonthRate: bracket['6_month_dd'],
          twelveMonthRate: bracket['12_month'],
          isFirstYear: false,
          notes: `Based on engine capacity: ${engineCapacity}cc`
        };
      }
    }

    return {
      sixMonthRate: null,
      twelveMonthRate: null,
      isFirstYear: false,
      notes: 'Unable to determine tax based on engine capacity'
    };
  }

  /**
   * Calculate final amount with commission
   */
  calculateWithCommission(taxRate: number | null, commissionFee: number): number {
    if (taxRate === null) {
      return commissionFee;
    }
    return taxRate + commissionFee;
  }
}

export default new TaxCalculator();
