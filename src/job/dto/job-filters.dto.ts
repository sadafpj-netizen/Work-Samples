import { IsOptional, IsBoolean, IsNumber, IsString, IsArray, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class JobFiltersDto {
  @ApiProperty({ required: false, example: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, example: 20, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({ required: false, example: 'New York', description: 'Location filter' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false, example: true, description: 'Remote jobs only' })
  @IsOptional()
  @Transform(({ value }): boolean => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    if (typeof value === 'boolean') {
      return value;
    }
    return false;
  })
  @IsBoolean()
  isRemote?: boolean;

  @ApiProperty({ required: false, example: 50000, description: 'Minimum salary' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minSalary?: number;

  @ApiProperty({ required: false, example: 150000, description: 'Maximum salary' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxSalary?: number;

  @ApiProperty({ 
    required: false, 
    example: ['JavaScript', 'React'], 
    description: 'Skills filter',
    isArray: true,
    type: String
  })
  @IsOptional()
  @Transform(({ value }): string[] => {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
    }
    return [];
  })
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({ required: false, example: 'Software Engineer', description: 'Job title filter' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false, example: 'Google', description: 'Company name filter' })
  @IsOptional()
  @IsString()
  company?: string;
}
