import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { JobOffer } from './job-offer.entity';
import { Skill } from './skill.entity';

@Entity('job_skills')
export class JobSkill {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => JobOffer, (jobOffer) => jobOffer.jobSkills, { 
    onDelete: 'CASCADE' 
  })
  jobOffer!: JobOffer;

  @ManyToOne(() => Skill, (skill) => skill.jobSkills, { 
    onDelete: 'CASCADE' 
  })
  skill!: Skill;

  @CreateDateColumn()
  createdAt!: Date;
}
