import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToOne, JoinColumn, Index } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Vehicle } from './Vehicle';
import { UserContact } from './UserContact';
import { Payment } from './Payment';

@Entity('submissions')
export class Submission {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @ManyToOne(() => Vehicle)
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  @Column('uuid')
  vehicleId: string;

  @Column({ type: 'int' })
  taxPreference: number; // 1 = 6 months, 2 = 12 months, 3 = Direct Debit (commission only)

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  sixMonthTaxRate: number | null; // Base 6-month tax rate (before commission)

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  twelveMonthTaxRate: number | null; // Base 12-month tax rate (before commission)

  @Column('decimal', { precision: 10, scale: 2 })
  commissionFee: number; // Commission fee added (50 for tax options, 60 for direct debit)

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number; // Total amount: tax + commission

  @Column({ type: 'text', nullable: true })
  taxCalculationNotes: string | null; // Notes about tax calculation (band, special conditions, etc.)

  @OneToOne(() => UserContact, (contact) => contact.submission, { cascade: true })
  @JoinColumn({ name: 'userContactId' })
  userContact: UserContact;

  @Column('uuid', { nullable: true })
  userContactId: string;

  @OneToOne(() => Payment, (payment) => payment.submission, { nullable: true })
  payment: Payment;

  @Column({ type: 'enum', enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ type: 'text', nullable: true })
  adminNotes: string | null;

  @Column({ type: 'varchar', nullable: true })
  userIpAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  sessionId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
