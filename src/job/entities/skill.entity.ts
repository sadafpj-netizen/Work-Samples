import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { JobSkill } from './job-skill.entity';

@Entity('skills')
export class Skill {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @OneToMany(() => JobSkill, (jobSkill) => jobSkill.skill, {
    cascade: false 
  })
  jobSkills!: JobSkill[];
}
