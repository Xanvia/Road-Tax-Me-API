import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('user_contacts')
export class UserContact {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @Column()
  submissionId: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  mobile: string;

  @Column({ nullable: true })
  whatsapp: string;

  @CreateDateColumn()
  createdAt: Date;

  submission?: any;
}
