import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('vehicles')
@Index(['registrationNumber'], { unique: true })
export class Vehicle {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @Column()
  registrationNumber: string;

  @Column({ nullable: true })
  taxStatus: string;

  @Column({ nullable: true })
  taxDueDate: string;

  @Column({ nullable: true })
  motStatus: string;

  @Column({ nullable: true })
  motExpiryDate: string;

  @Column({ nullable: true })
  make: string;

  @Column({ nullable: true })
  colour: string;

  @Column({ nullable: true })
  fuelType: string;

  @Column({ nullable: true })
  engineCapacity: number;

  @Column({ nullable: true })
  co2Emissions: number;

  @Column({ nullable: true })
  yearOfManufacture: number;

  @Column({ nullable: true })
  euroStatus: string;

  @Column({ nullable: true })
  typeApproval: string;

  @Column({ default: false })
  automatedVehicle: boolean;

  @Column({ type: 'json', nullable: true })
  dvlaData: Record<string, any>;

  @Column({ nullable: true })
  dvlaFetchedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
