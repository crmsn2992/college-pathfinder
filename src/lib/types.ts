export interface StudentProfile {
  name: string;
  educationBoard: EducationBoard;
  currentGrade: Grade;
  subjects: string[];
  grades: number; // percentage or GPA converted to percentage
  testScores: TestScores;
  targetColleges: string[];
  preferredCountries: string[];
  extracurriculars: string[];
  extracurricularDetails: string;
  budgetRange: BudgetRange;
}

export type EducationBoard = 'CBSE' | 'ICSE' | 'State Board' | 'IB' | 'Cambridge';
export type Grade = '9th' | '10th' | '11th' | '12th' | 'Gap Year';

export type BudgetRange =
  | 'under-5l'
  | '5l-10l'
  | '10l-20l'
  | '20l-40l'
  | '40l-80l'
  | 'above-80l';

export const BUDGET_LABELS: Record<BudgetRange, string> = {
  'under-5l': 'Under ₹5 Lakhs/year',
  '5l-10l': '₹5-10 Lakhs/year',
  '10l-20l': '₹10-20 Lakhs/year',
  '20l-40l': '₹20-40 Lakhs/year',
  '40l-80l': '₹40-80 Lakhs/year',
  'above-80l': 'Above ₹80 Lakhs/year',
};

export const BUDGET_MAX_INR: Record<BudgetRange, number> = {
  'under-5l': 500000,
  '5l-10l': 1000000,
  '10l-20l': 2000000,
  '20l-40l': 4000000,
  '40l-80l': 8000000,
  'above-80l': Infinity,
};

export interface TestScores {
  sat?: number;
  act?: number;
  jee?: number; // percentile
  neet?: number;
  cuet?: number; // percentile
  ap?: number; // number of AP exams with 4+
}

export interface College {
  id: string;
  name: string;
  shortName?: string;
  location: string;
  country: string;
  type: 'public' | 'private';
  programs: string[];
  admissionRequirements: AdmissionRequirements;
  feesINR: number; // annual in INR
  feesUSD?: number; // annual in USD
  scholarships: Scholarship[];
  acceptanceRate: number; // percentage
  deadlines: Deadline[];
  extracurricularPreferences: string[];
  boardNotes: Record<string, string>;
  ranking?: string;
  website?: string;
}

export interface AdmissionRequirements {
  minGrades: number; // percentage
  requiredExams: string[];
  requiredSubjects: string[];
  preferredSubjects?: string[];
  minTestScores?: Partial<TestScores>;
  internationalStudentNotes?: string;
}

export interface Scholarship {
  name: string;
  type: 'merit' | 'need' | 'sport' | 'diversity';
  amount: string;
  description: string;
}

export interface Deadline {
  round: string;
  month: string;
  description?: string;
}

export interface CollegeRecommendation {
  college: College;
  category: 'reach' | 'match' | 'safety';
  matchScore: number; // 0-100
  requirementsMet: RequirementStatus[];
  areasToImprove: RequirementStatus[];
  requirementsNotMet: RequirementStatus[];
  alternativeSuggestions?: string[];
}

export interface RequirementStatus {
  requirement: string;
  status: 'met' | 'improve' | 'not_met';
  detail: string;
  suggestion?: string;
}

export interface PathStrategy {
  id: string;
  name: string;
  description: string;
  icon: string;
  timeline: TimelineItem[];
  examsToPrep: string[];
  extracurricularsToAdd: string[];
  gradeTarget: number;
  colleges: string[]; // college IDs this path targets
  pros: string[];
  cons: string[];
}

export interface TimelineItem {
  month: string;
  title: string;
  description: string;
  category: 'exam' | 'application' | 'extracurricular' | 'academic' | 'deadline';
}

export interface RecommendationResult {
  recommendations: CollegeRecommendation[];
  paths: PathStrategy[];
  gapAnalysis: GapAnalysis;
  resourceSuggestions: ResourceSuggestion[];
}

export interface GapAnalysis {
  currentGrades: number;
  targetGrades: number;
  gradeGap: number;
  missingExams: string[];
  missingSubjects: string[];
  extracurricularGaps: string[];
  strengths: string[];
}

export interface ResourceSuggestion {
  category: string;
  title: string;
  url: string;
  description: string;
  relevance: string;
}

export interface Resource {
  id: string;
  category: ResourceCategory;
  title: string;
  url: string;
  description: string;
  tags: string[];
  free: boolean;
  icon?: string;
}

export type ResourceCategory =
  | 'test-prep'
  | 'courses'
  | 'application-help'
  | 'scholarships'
  | 'skills';
