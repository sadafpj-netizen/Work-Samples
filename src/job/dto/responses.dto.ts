import { ApiProperty } from '@nestjs/swagger';
import { JobOffer } from '../entities/job-offer.entity';
import { JobStats } from '../interfaces/job-filters.interface';

export class PaginationDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class JobResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [JobOffer] })
  data: JobOffer[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}

export class SingleJobResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: JobOffer })
  data: JobOffer;
}

export class SearchResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  query: string;

  @ApiProperty({ type: [JobOffer] })
  data: JobOffer[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}

export class JobStatsResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  data: JobStats;
}

export class TriggerResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  triggeredAt: string;
}

export class HealthResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  data: {
    totalJobs: number;
    lastUpdated: string;
    status: string;
  };
}
