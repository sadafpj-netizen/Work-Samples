import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { JobController } from './job.controller';
import { JobService } from './services/job.service';
import { JobOffer } from './entities/job-offer.entity';
import { JobSkill } from './entities/job-skill.entity'; 
import { Skill } from './entities/skill.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobOffer, 
      JobSkill, 
      Skill
    ]),
    HttpModule,
  ],
  controllers: [JobController],
  providers: [JobService],
  exports: [JobService, TypeOrmModule],
})
export class JobModule {}