import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  ParseIntPipe,
  HttpException,
  HttpStatus,
  Logger,
  ValidationPipe,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JobService } from './services/job.service';
import { JobFiltersDto } from './dto/job-filters.dto';
import {
  JobResponseDto,
  SingleJobResponseDto,
  SearchResponseDto,
  JobStatsResponseDto,
  TriggerResponseDto,
  HealthResponseDto,
} from './dto/responses.dto';

@ApiTags('Jobs')
@Controller('jobs')
export class JobController {
  private readonly logger = new Logger(JobController.name);

  constructor(private readonly jobService: JobService) {}

  @Get()
  @ApiOperation({ summary: 'Get all jobs with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully', type: JobResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'location', required: false, example: 'New York' })
  @ApiQuery({ name: 'isRemote', required: false, example: true })
  @ApiQuery({ name: 'minSalary', required: false, example: 50000 })
  @ApiQuery({ name: 'maxSalary', required: false, example: 150000 })
  @ApiQuery({ name: 'skills', required: false, example: ['JavaScript', 'React'], isArray: true, type: String })
  @ApiQuery({ name: 'title', required: false, example: 'Software Engineer' })
  @ApiQuery({ name: 'company', required: false, example: 'Google' })
  @HttpCode(HttpStatus.OK)
  async findAll(@Query(new ValidationPipe({ transform: true })) filters: JobFiltersDto): Promise<JobResponseDto> {
    try {
      const { page, limit, ...otherFilters } = filters;
      const result = await this.jobService.findAll(page || 1, limit || 20, otherFilters);

      return {
        success: true,
        message: `Retrieved ${result.data.length} jobs`,
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      this.logger.error('Error fetching jobs:', error);
      throw new HttpException('Failed to fetch jobs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get job statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully', type: JobStatsResponseDto })
  @HttpCode(HttpStatus.OK)
  async getStats(): Promise<JobStatsResponseDto> {
    try {
      const stats = await this.jobService.getStats();
      return {
        success: true,
        message: 'Statistics retrieved successfully',
        data: stats,
      };
    } catch (error) {
      this.logger.error('Error fetching job statistics:', error);
      throw new HttpException('Failed to retrieve statistics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('search')
  @ApiOperation({ summary: 'Search jobs by query' })
  @ApiResponse({ status: 200, description: 'Search results', type: SearchResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid search query' })
  @ApiQuery({ name: 'q', required: true, example: 'Software Engineer' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @HttpCode(HttpStatus.OK)
  async search(
    @Query('q') query: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ): Promise<SearchResponseDto> {
    try {
      if (!query || query.trim().length < 2) {
        throw new HttpException('Search query must be at least 2 characters', HttpStatus.BAD_REQUEST);
      }

      if (limit > 100) {
        throw new HttpException('Limit cannot exceed 100', HttpStatus.BAD_REQUEST);
      }

      const result = await this.jobService.search(query.trim(), page, limit);

      return {
        success: true,
        message: `Found ${result.pagination.total} jobs matching "${query}"`,
        query: query.trim(),
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      this.logger.error(`Error searching jobs with query "${query}":`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to search jobs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy', type: HealthResponseDto })
  @HttpCode(HttpStatus.OK)
  async healthCheck(): Promise<HealthResponseDto> {
    try {
      const stats = await this.jobService.getStats();
      return {
        success: true,
        message: 'Service is healthy',
        data: {
          totalJobs: stats.totalJobs,
          lastUpdated: stats.lastUpdated,
          status: 'operational',
        },
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      throw new HttpException('Service is unhealthy', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job by ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job retrieved successfully', type: SingleJobResponseDto })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 400, description: 'Invalid job ID format' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<SingleJobResponseDto> {
    try {
      const job = await this.jobService.findOne(id);

      if (!job) {
        throw new HttpException(`Job with ID ${id} not found`, HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        message: 'Job retrieved successfully',
        data: job,
      };
    } catch (error) {
      this.logger.error(`Error fetching job ${id}:`, error);
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch job', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('admin/trigger-aggregation')
  @ApiOperation({ summary: 'Manually trigger job aggregation' })
  @ApiResponse({ status: 200, description: 'Aggregation triggered successfully', type: TriggerResponseDto })
  @HttpCode(HttpStatus.OK)
  async triggerAggregation(): Promise<TriggerResponseDto> {
    try {
      await this.jobService.triggerManualAggregation().catch((error: Error) => {
        this.logger.error('Background aggregation failed:', error.message);
      });

      return {
        success: true,
        message: 'Job aggregation triggered successfully',
        triggeredAt: new Date().toISOString(),
      };
    } catch (error: unknown) {
      this.logger.error('Error triggering aggregation:', error instanceof Error ? error.message : 'Unknown error');
      throw new HttpException('Failed to trigger job aggregation', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
