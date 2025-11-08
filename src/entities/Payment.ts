import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Submission } from './Submission';

@Entity('payments')
export class Payment {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'GBP' })
  currency: string;

  @Column()
  provider: 'stripe' | 'paystack';

  @Column({ unique: true })
  transactionId: string;

  @Column({ type: 'enum', enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' })
  status: 'pending' | 'completed' | 'failed' | 'refunded';

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @OneToOne(() => Submission, (submission) => submission.payment)
  @JoinColumn()
  submission: Submission;

  @Column('uuid')
  submissionId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
