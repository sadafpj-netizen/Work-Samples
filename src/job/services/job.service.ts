import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { throwError } from 'rxjs';

import { JobOffer } from '../entities/job-offer.entity';
import { JobSkill } from '../entities/job-skill.entity';
import { Skill } from '../entities/skill.entity';
import {
  UnifiedJob,
  Provider1Job,
  Provider1Response,
  Provider2Job,
  Provider2Response,
  LocationData,
  SalaryRange
} from '../interfaces/unified-job.interface';

import {
  JobFilters,
  PaginationResult,
  TopSkillRaw,
  TopSkill,
  JobStats
} from '../interfaces/job-filters.interface';
import { AxiosError } from 'axios';

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(
    @InjectRepository(JobOffer)
    private readonly jobOfferRepository: Repository<JobOffer>,
    @InjectRepository(JobSkill)
    private readonly jobSkillRepository: Repository<JobSkill>,
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(process.env.CRON_SCHEDULE || '0 */6 * * *')
  async aggregateJobs(): Promise<void> {
    this.logger.log('Starting job aggregation process...');

    try {
      const [provider1Jobs, provider2Jobs] = await Promise.allSettled([
        this.fetchProvider1Jobs(),
        this.fetchProvider2Jobs(),
      ]);

      const allUnifiedJobs: UnifiedJob[] = [];

      if (provider1Jobs.status === 'fulfilled') {
        const transformedJobs = this.transformProvider1Jobs(provider1Jobs.value);
        allUnifiedJobs.push(...transformedJobs);
        this.logger.log(`Provider 1: ${transformedJobs.length} jobs fetched`);
      } else {
        this.logger.error('Provider 1 failed:', provider1Jobs.reason);
      }

      if (provider2Jobs.status === 'fulfilled') {
        const transformedJobs = this.transformProvider2Jobs(provider2Jobs.value);
        allUnifiedJobs.push(...transformedJobs);
        this.logger.log(`Provider 2: ${transformedJobs.length} jobs fetched`);
      } else {
        this.logger.error('Provider 2 failed:', provider2Jobs.reason);
      }

      const storedCount = await this.storeJobs(allUnifiedJobs);
      
      this.logger.log(`Job aggregation completed. ${storedCount} new jobs stored out of ${allUnifiedJobs.length} total jobs`);
    } catch (error) {
      this.logger.error('Critical error during job aggregation:', error);
      throw error;
    }
  }

private async fetchProvider1Jobs(): Promise<Provider1Job[]> {
    const url = this.configService.get<string>('API1_URL') || 'https://assignment.devotel.io/api/provider1/jobs';

    this.logger.debug(`Fetching from Provider 1: ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<Provider1Response>(url, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Job-Aggregator/1.0',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        }).pipe(
          timeout(30000),
          catchError((error: AxiosError | Error) => {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return throwError(() => new Error(`Provider 1 API error: ${message}`));
          })
        )
      );

      return response.data.jobs || [];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch from Provider 1: ${errorMessage}`);
      throw new Error(`Failed to fetch Provider 1 jobs: ${errorMessage}`);
    }
}

private async fetchProvider2Jobs(): Promise<Provider2Job[]> {
    const url = this.configService.get<string>('API2_URL') || 'https://assignment.devotel.io/api/provider2/jobs';

    this.logger.debug(`Fetching from Provider 2: ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<Provider2Response>(url, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Job-Aggregator/1.0',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        }).pipe(
          timeout(30000),
          catchError((error: AxiosError | Error) => {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return throwError(() => new Error(`Provider 2 API error: ${message}`));
          })
        )
      );

      if (response.data.status !== 'success') {
        throw new Error(`Provider 2 API returned status: ${response.data.status}`);
      }

      return Object.values(response.data.data.jobsList);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch from Provider 2: ${errorMessage}`);
      throw new Error(`Failed to fetch Provider 2 jobs: ${errorMessage}`);
    }
}

  private transformProvider1Jobs(jobs: Provider1Job[]): UnifiedJob[] {
    return jobs.map(job => {
      const salary = this.parseSalaryRange(job.details.salaryRange);
      const location = this.parseLocation(job.details.location);

      return {
        externalId: `provider1_${job.jobId}`,
        title: job.title?.trim() || 'Unknown Title',
        city: location.city,
        state: location.state,
        fullAddress: job.details.location?.trim() || 'Unknown Location',
        isRemote: this.isRemoteLocation(job.details.location),
        employmentType: job.details.type?.trim() || 'Unknown Type',
        salaryMin: salary.min || undefined,
        salaryMax: salary.max || undefined,
        salaryCurrency: salary.currency,
        salaryOriginalRange: job.details.salaryRange,
        companyName: job.company.name?.trim() || 'Unknown Company',
        companyIndustry: job.company.industry?.trim(),
        companyWebsite: undefined,
        experienceYears: undefined,
        skills: this.sanitizeSkills(job.skills),
        postedDate: this.parseDate(job.postedDate),
        provider: 'provider1'
      };
    });
  }

  private transformProvider2Jobs(jobs: Provider2Job[]): UnifiedJob[] {
    return jobs.map(job => ({
      externalId: `provider2_${this.generateJobId(job)}`,
      title: job.position?.trim() || 'Unknown Title',
      city: job.location?.city?.trim() || 'Unknown City',
      state: job.location?.state?.trim() || 'Unknown State',
      fullAddress: this.formatFullAddress(job.location),
      isRemote: job.location?.remote || false,
      employmentType: 'Full-time',
      salaryMin: job.compensation?.min || undefined,
      salaryMax: job.compensation?.max || undefined,
      salaryCurrency: job.compensation?.currency || 'USD',
      salaryOriginalRange: job.compensation ? `${job.compensation.min}-${job.compensation.max} ${job.compensation.currency}` : undefined,
      companyName: job.employer?.companyName?.trim() || 'Unknown Company',
      companyIndustry: undefined,
      companyWebsite: job.employer?.website?.trim(),
      experienceYears: job.requirements?.experience,
      skills: this.sanitizeSkills(job.requirements?.technologies || []),
      postedDate: this.parseDate(job.datePosted),
      provider: 'provider2'
    }));
  }

  private async storeJobs(jobs: UnifiedJob[]): Promise<number> {
    let storedCount = 0;

    for (const jobData of jobs) {
      try {
        const existingJob = await this.jobOfferRepository.findOne({
          where: { externalId: jobData.externalId }
        });

        if (existingJob) {
          this.logger.debug(`Job ${jobData.externalId} already exists, skipping...`);
          continue;
        }

        const jobOffer = this.jobOfferRepository.create({
          externalId: jobData.externalId,
          title: jobData.title,
          city: jobData.city,
          state: jobData.state,
          fullAddress: jobData.fullAddress,
          isRemote: jobData.isRemote,
          employmentType: jobData.employmentType,
          salaryMin: jobData.salaryMin || null,
          salaryMax: jobData.salaryMax || null,
          salaryCurrency: jobData.salaryCurrency,
          salaryOriginalRange: jobData.salaryOriginalRange || null,
          companyName: jobData.companyName,
          companyIndustry: jobData.companyIndustry || null,
          companyWebsite: jobData.companyWebsite || null,
          experienceYears: jobData.experienceYears || null,
          postedDate: jobData.postedDate,
          fetchedDate: new Date(),
          provider: jobData.provider,
        });

        const savedJob = await this.jobOfferRepository.save(jobOffer);
        await this.processJobSkills(savedJob, jobData.skills);

        storedCount++;
        this.logger.debug(`Stored job: ${jobData.title} at ${jobData.companyName}`);
      } catch (error) {
        this.logger.error(`Error storing job ${jobData.externalId}:`, error);
      }
    }

    return storedCount;
  }

  private async processJobSkills(jobOffer: JobOffer, skillNames: string[]): Promise<void> {
    for (const skillName of skillNames) {
      if (!skillName?.trim()) continue;

      const cleanSkillName = skillName.trim();

      let skill = await this.skillRepository.findOne({
        where: { name: cleanSkillName }
      });

      if (!skill) {
        skill = this.skillRepository.create({ name: cleanSkillName });
        skill = await this.skillRepository.save(skill);
        this.logger.debug(`Created new skill: ${cleanSkillName}`);
      }

      const jobSkill = this.jobSkillRepository.create({
        jobOffer: jobOffer,
        skill: skill
      });

      await this.jobSkillRepository.save(jobSkill);
    }
  }

  private parseLocation(location: string): { city: string; state: string } {
    if (!location) {
      return { city: 'Unknown City', state: 'Unknown State' };
    }

    const parts = location.split(',').map(p => p.trim());

    if (parts.length >= 2) {
      return {
        city: parts[0] || 'Unknown City',
        state: parts[1] || 'Unknown State'
      };
    }

    return {
      city: parts[0] || 'Unknown City',
      state: 'Unknown State'
    };
  }

  private formatFullAddress(location: LocationData | null | undefined): string {
    if (!location) return 'Unknown Location';

    if (location.remote) {
      return 'Remote';
    }

    const city = location.city || '';
    const state = location.state || '';
    const formatted = `${city}, ${state}`.replace(/^,\s*|,\s*$/g, '');

    return formatted || 'Unknown Location';
  }

  private parseSalaryRange(salaryRange: string | null | undefined): SalaryRange {
    if (!salaryRange) {
      return { currency: 'USD' };
    }

    const patterns = [
      /\$?([\d,]+)k?\s*[-–]\s*\$?([\d,]+)k?\s*([A-Z]{3})?/i,
      /([\d,]+)K?\s*[-–]\s*([\d,]+)K?\s*([A-Z]{3})?/i
    ];

    for (const pattern of patterns) {
      const match = salaryRange.match(pattern);
      if (match) {
        const salaryString1 = match[1];
        const salaryString2 = match[2];

        const multiplier1 = salaryString1.toLowerCase().includes('k') ? 1000 : 1;
        const multiplier2 = salaryString2.toLowerCase().includes('k') ? 1000 : 1;

        const min = parseInt(salaryString1.replace(/[,k]/gi, ''), 10) * multiplier1;
        const max = parseInt(salaryString2.replace(/[,k]/gi, ''), 10) * multiplier2;
        const currency = match[3] || 'USD';

        return { min, max, currency };
      }
    }

    return { currency: 'USD' };
  }

  private isRemoteLocation(location: string): boolean {
    if (!location) return false;
    const remotePatterns = /remote|anywhere|work from home|wfh/i;
    return remotePatterns.test(location);
  }

  private generateJobId(job: Provider2Job): string {
    const content = `${job.position}_${job.employer?.companyName}_${job.datePosted}`;
    return Buffer.from(content).toString('base64').slice(0, 16);
  }

  private sanitizeSkills(skills: string[]): string[] {
    if (!Array.isArray(skills)) return [];

    return skills
      .filter(skill => skill && typeof skill === 'string')
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0 && skill.length <= 100)
      .slice(0, 20);
  }

  private parseDate(dateString: string): Date {
    if (!dateString) return new Date();

    const date = new Date(dateString);
    return isNaN(date.getTime()) ? new Date() : date;
  }

  async findAll(
    page = 1,
    limit = 20,
    filters: JobFilters = {}
  ): Promise<PaginationResult<JobOffer>> {
    const queryBuilder = this.buildJobQuery(this.jobOfferRepository.createQueryBuilder('job'), filters);
    
    const [jobs, total] = await queryBuilder
      .orderBy('job.postedDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: jobs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

private buildJobQuery(queryBuilder: SelectQueryBuilder<JobOffer>, filters: JobFilters): SelectQueryBuilder<JobOffer> {
  queryBuilder
    .leftJoinAndSelect('job.jobSkills', 'jobSkill')
    .leftJoinAndSelect('jobSkill.skill', 'skill');

  if (filters.location) {
    queryBuilder.andWhere(
      '(job.city LIKE :location OR job.state LIKE :location OR job.fullAddress LIKE :location)',
      { location: `%${filters.location}%` }
    );
  }

  if (filters.isRemote !== undefined) {
    queryBuilder.andWhere('job.isRemote = :isRemote', { isRemote: filters.isRemote });
  }

  if (filters.minSalary !== undefined && filters.minSalary > 0) {
    queryBuilder.andWhere('job.salaryMin >= :minSalary', { minSalary: filters.minSalary });
  }

  if (filters.maxSalary !== undefined && filters.maxSalary > 0) {
    queryBuilder.andWhere('job.salaryMax <= :maxSalary', { maxSalary: filters.maxSalary });
  }

  if (filters.title) {
    queryBuilder.andWhere('job.title LIKE :title', { title: `%${filters.title}%` });
  }

  if (filters.company) {
    queryBuilder.andWhere('job.companyName LIKE :company', { company: `%${filters.company}%` });
  }

  if (filters.skills && Array.isArray(filters.skills) && filters.skills.length > 0) {
    queryBuilder.andWhere('skill.name IN (:...skills)', { skills: filters.skills });
  }

  return queryBuilder;
}

  async findOne(id: number): Promise<JobOffer | null> {
    return this.jobOfferRepository.findOne({
      where: { id },
      relations: ['jobSkills', 'jobSkills.skill']
    });
  }

async search(query: string, page = 1, limit = 20): Promise<PaginationResult<JobOffer>> {
  const [jobs, total] = await this.jobOfferRepository
    .createQueryBuilder('job')
    .leftJoinAndSelect('job.jobSkills', 'jobSkill')
    .leftJoinAndSelect('jobSkill.skill', 'skill')
    .where(
      'job.title LIKE :query OR job.companyName LIKE :query OR skill.name LIKE :query',
      { query: `%${query}%` }
    )
    .orderBy('job.postedDate', 'DESC')
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();

  return {
    data: jobs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  };
}

  async getStats(): Promise<JobStats> {
    const [totalJobs, remoteJobs, topSkillsRaw] = await Promise.all([
      this.jobOfferRepository.count(),
      this.jobOfferRepository.count({ where: { isRemote: true } }),
      this.skillRepository
        .createQueryBuilder('skill')
        .leftJoin('skill.jobSkills', 'jobSkill')
        .leftJoin('jobSkill.jobOffer', 'job')
        .select('skill.name', 'name')
        .addSelect('COUNT(job.id)', 'count')
        .groupBy('skill.id, skill.name')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany<TopSkillRaw>()
    ]);

    const topSkills: TopSkill[] = topSkillsRaw.map((skill: TopSkillRaw) => ({
      name: skill.name,
      count: parseInt(skill.count, 10) || 0
    }));

    return {
      totalJobs,
      remoteJobs,
      remotePercentage: totalJobs > 0 ? Math.round((remoteJobs / totalJobs) * 100) : 0,
      topSkills,
      lastUpdated: new Date().toISOString()
    };
  }

  async triggerManualAggregation(): Promise<void> {
    this.logger.log('Manual job aggregation triggered');
    await this.aggregateJobs();
  }
}
