import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  OneToMany,
  CreateDateColumn, 
  UpdateDateColumn, 
  Index 
} from 'typeorm';
import { JobSkill } from './job-skill.entity';

@Entity('job_offers')
@Index(['title', 'companyName'])
@Index(['salaryMin', 'salaryMax'])
@Index(['city', 'state'])
export class JobOffer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  externalId!: string;

  @Column()
  title!: string;

  @Column({ nullable: true })
  city!: string;

  @Column({ nullable: true })
  state!: string;

  @Column()
  fullAddress!: string;

  @Column({ default: false })
  isRemote!: boolean;

  @Column()
  employmentType!: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  salaryMin!: number | null;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  salaryMax!: number | null;

  @Column({ default: 'USD', length: 3 })
  salaryCurrency!: string;

  @Column({ nullable: true })
  salaryOriginalRange!: string | null;

  @Column()
  companyName!: string;

  @Column({ nullable: true })
  companyIndustry!: string | null;

  @Column({ nullable: true })
  companyWebsite!: string | null;

  @Column({ nullable: true })
  experienceYears!: number | null;

  @Column({ type: 'timestamp' })
  postedDate!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fetchedDate!: Date;

  @Column({ default: 'API' })
  provider!: string;

  @OneToMany(() => JobSkill, (jobSkill) => jobSkill.jobOffer, { 
    cascade: true,
    eager: false 
  })
  jobSkills!: JobSkill[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
