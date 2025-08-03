
import { JobFilters } from '../interfaces/job-filters.interface';

export function buildJobFilters(params: {
  location?: string;
  isRemote?: boolean;
  minSalary?: number;
  maxSalary?: number;
  skills?: string;
}): JobFilters {
  const filters: JobFilters = {};

  if (params.location?.trim()) {
    filters.location = params.location.trim();
  }
  
  if (params.isRemote !== undefined) {
    filters.isRemote = params.isRemote;
  }
  
  if (params.minSalary && params.minSalary > 0) {
    filters.minSalary = params.minSalary;
  }
  
  if (params.maxSalary && params.maxSalary > 0) {
    filters.maxSalary = params.maxSalary;
  }
  
  if (params.skills?.trim()) {
    filters.skills = params.skills
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  return filters;
}
