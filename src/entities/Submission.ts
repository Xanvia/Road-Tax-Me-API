import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToOne, JoinColumn, Index } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Vehicle } from './Vehicle';
import { UserContact } from './UserContact';
import { TaxOption } from './TaxOption';
import { Payment } from './Payment';

@Entity('submissions')
export class Submission {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @ManyToOne(() => Vehicle)
  vehicle: Vehicle;

  @Column('uuid')
  vehicleId: string;

  @ManyToOne(() => TaxOption)
  taxOption: TaxOption;

  @Column('uuid')
  taxOptionId: string;

  @OneToOne(() => UserContact, (contact) => contact.submission, { cascade: true })
  userContact: UserContact;

  @Column('uuid', { nullable: true })
  userContactId: string;

  @OneToOne(() => Payment, (payment) => payment.submission, { nullable: true })
  payment: Payment;

  @Column('uuid', { nullable: true })
  paymentId: string;

  @Column({ type: 'enum', enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ nullable: true })
  adminNotes: string;

  @Column({ nullable: true })
  userIpAddress: string;

  @Column({ nullable: true })
  sessionId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
