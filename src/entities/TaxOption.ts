import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('tax_options')
export class TaxOption {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @Column()
  duration: string; // 1-month, 3-months, 6-months, 12-months

  @Column('decimal', { precision: 10, scale: 2 })
  price: number; // in GBP

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  displayOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
