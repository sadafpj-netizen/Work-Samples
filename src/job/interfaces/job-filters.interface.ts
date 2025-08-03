
export interface JobFilters {
  location?: string;
  isRemote?: boolean;
  minSalary?: number;
  maxSalary?: number;
  skills?: string[];
  title?: string;        
  company?: string;      
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TopSkillRaw {
  name: string;
  count: string;
}

export interface TopSkill {
  name: string;
  count: number;
}

export interface JobStats {
  totalJobs: number;
  remoteJobs: number;
  remotePercentage: number;
  topSkills: TopSkill[];
  lastUpdated: string;
}