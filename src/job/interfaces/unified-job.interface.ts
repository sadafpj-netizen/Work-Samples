
export interface UnifiedJob {
  externalId: string;
  title: string;
  city: string;
  state: string;
  fullAddress: string;
  isRemote: boolean;
  employmentType: string;
  salaryMin?: number;  
  salaryMax?: number;  
  salaryCurrency: string;
  salaryOriginalRange?: string;
  companyName: string;
  companyIndustry?: string;
  companyWebsite?: string;
  experienceYears?: number;
  skills: string[];
  postedDate: Date;
  provider: string;
}

export interface LocationData {
  city?: string;
  state?: string;
  country?: string;
  remote?: boolean;
}

export interface SalaryRange {
  min?: number;
  max?: number;
  currency: string;
}

export interface Provider1Job {
  jobId: string;
  title: string;
  details: {
    location: string;
    type: string;
    salaryRange: string;
  };
  company: {
    name: string;
    industry: string;
  };
  skills: string[];
  postedDate: string;
}

export interface Provider1Response {
  metadata: {
    requestId: string;
    timestamp: string;
  };
  jobs: Provider1Job[];
}

export interface Provider2Job {
  position: string;
  location: {
    city: string;
    state: string;
    remote: boolean;
  };
  compensation: {
    min: number;
    max: number;
    currency: string;
  };
  employer: {
    companyName: string;
    website: string;
  };
  requirements: {
    experience: number;
    technologies: string[];
  };
  datePosted: string;
}

export interface Provider2Response {
  status: string;
  data: {
    jobsList: Record<string, Provider2Job>;
  };
}
