import { Entity, PrimaryColumn, Column, CreateDateColumn, OneToOne } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Submission } from './Submission';

@Entity('user_contacts')
export class UserContact {
  @PrimaryColumn('uuid')
  id: string = uuidv4();

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  mobile: string;

  @Column({ nullable: true })
  whatsapp: string;

  @OneToOne(() => Submission, (submission) => submission.userContact)
  submission: Submission;

  @CreateDateColumn()
  createdAt: Date;
}
