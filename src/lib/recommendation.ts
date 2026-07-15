import type {
  AdmissionRequirements,
  BudgetRange,
  College,
  CollegeRecommendation,
  GapAnalysis,
  PathStrategy,
  RecommendationResult,
  RequirementStatus,
  ResourceSuggestion,
  StudentProfile,
  TestScores,
  TimelineItem,
} from '@/lib/types';
import { BUDGET_MAX_INR } from '@/lib/types';

type ExamKey = keyof TestScores;
type PathKind =
  | 'indian-engineering'
  | 'international-university'
  | 'balanced-approach'
  | 'focused-improvement'
  | 'scholarship-first';

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  month: 'long',
  year: 'numeric',
});

const EXAM_LABELS: Record<ExamKey, string> = {
  sat: 'SAT',
  act: 'ACT',
  jee: 'JEE',
  neet: 'NEET',
  cuet: 'CUET',
  ap: 'AP exams',
};

const EXAM_CLOSE_MARGINS: Record<ExamKey, number> = {
  sat: 60,
  act: 2,
  jee: 3,
  neet: 40,
  cuet: 4,
  ap: 1,
};

const EXAM_IMPROVE_MARGINS: Record<ExamKey, number> = {
  sat: 140,
  act: 4,
  jee: 6,
  neet: 100,
  cuet: 8,
  ap: 2,
};

const EXTRACURRICULAR_IDEAS = [
  'leadership role',
  'community impact project',
  'research or STEM project',
  'competition participation',
];

export function generateRecommendations(
  profile: StudentProfile,
  colleges: College[],
): RecommendationResult {
  const eligibleColleges = filterColleges(profile, colleges);
  const recommendations = eligibleColleges
    .map((college) => createRecommendation(profile, college))
    .sort((left, right) => right.matchScore - left.matchScore);

  const paths = generatePaths(profile, recommendations);
  const gapAnalysis = generateGapAnalysis(profile, recommendations);
  const resourceSuggestions = generateResourceSuggestions(
    profile,
    recommendations,
    gapAnalysis,
  );

  return {
    recommendations,
    paths,
    gapAnalysis,
    resourceSuggestions,
  };
}

export function calculateGradeScore(
  studentGrades: number,
  requiredGrades: number,
): number {
  if (requiredGrades <= 0) {
    return 100;
  }

  const gap = studentGrades - requiredGrades;
  if (gap >= 8) {
    return 100;
  }
  if (gap >= 0) {
    return 90 + Math.min(10, gap * 1.25);
  }
  if (gap >= -3) {
    return 78 + (gap + 3) * 4;
  }
  if (gap >= -7) {
    return 52 + (gap + 7) * 6;
  }
  if (gap >= -12) {
    return 28 + (gap + 12) * 4;
  }

  return 10;
}

export function calculateExamScore(
  profile: StudentProfile,
  requirements: AdmissionRequirements,
): number {
  if (requirements.requiredExams.length === 0) {
    return 100;
  }

  const scores = requirements.requiredExams.map((examName) =>
    calculateSingleExamRequirementScore(
      examName,
      profile.testScores,
      requirements.minTestScores,
    ),
  );

  return roundScore(average(scores));
}

export function calculateSubjectScore(
  studentSubjects: string[],
  required: string[],
  preferred: string[] = [],
): number {
  const studentSet = new Set(studentSubjects.map(normalize));
  const requiredCoverage = calculateCoverage(required, studentSet);
  const preferredCoverage =
    preferred.length > 0 ? calculateCoverage(preferred, studentSet) : 1;

  if (required.length === 0 && preferred.length === 0) {
    return 100;
  }

  if (required.length === 0) {
    return roundScore(65 + preferredCoverage * 35);
  }

  if (preferred.length === 0) {
    return roundScore(requiredCoverage * 100);
  }

  return roundScore(requiredCoverage * 80 + preferredCoverage * 20);
}

export function calculateExtracurricularScore(
  studentEC: string[],
  collegePrefs: string[],
): number {
  if (collegePrefs.length === 0) {
    if (studentEC.length >= 4) {
      return 95;
    }
    if (studentEC.length >= 2) {
      return 82;
    }
    return studentEC.length > 0 ? 68 : 55;
  }

  const studentSet = new Set(studentEC.map(normalize));
  const overlap = collegePrefs.filter((item) => studentSet.has(normalize(item)));
  const overlapRatio = overlap.length / collegePrefs.length;
  const breadthBoost = Math.min(studentEC.length, 5) * 3;

  return roundScore(clamp(overlapRatio * 85 + breadthBoost, 0, 100));
}

export function calculateBudgetScore(
  budget: BudgetRange,
  feesINR: number,
): number {
  const maxBudget = BUDGET_MAX_INR[budget];
  if (!Number.isFinite(maxBudget)) {
    if (feesINR <= 8_000_000) {
      return 100;
    }
    if (feesINR <= 12_000_000) {
      return 92;
    }
    return 82;
  }

  const utilization = feesINR / maxBudget;
  if (utilization <= 0.5) {
    return 100;
  }
  if (utilization <= 0.75) {
    return 96;
  }
  if (utilization <= 1) {
    return 85;
  }
  if (utilization <= 1.1) {
    return 60;
  }
  if (utilization <= 1.25) {
    return 35;
  }

  return 10;
}

export function generatePaths(
  profile: StudentProfile,
  recommendations: CollegeRecommendation[],
): PathStrategy[] {
  const indianTargets = hasIndianEngineeringTarget(profile, recommendations);
  const internationalTargets = hasInternationalTarget(profile, recommendations);
  const paths: PathStrategy[] = [];

  if (indianTargets && internationalTargets) {
    paths.push(
      buildPath(profile, recommendations, 'balanced-approach'),
      buildPath(profile, recommendations, 'indian-engineering'),
      buildPath(profile, recommendations, 'international-university'),
    );
    return paths;
  }

  if (indianTargets) {
    paths.push(
      buildPath(profile, recommendations, 'indian-engineering'),
      buildPath(profile, recommendations, 'focused-improvement'),
    );
    return paths;
  }

  if (internationalTargets) {
    paths.push(
      buildPath(profile, recommendations, 'international-university'),
      buildPath(profile, recommendations, 'scholarship-first'),
    );
    return paths;
  }

  paths.push(
    buildPath(profile, recommendations, 'balanced-approach'),
    buildPath(profile, recommendations, 'focused-improvement'),
  );
  return paths;
}

export function generateGapAnalysis(
  profile: StudentProfile,
  recommendations: CollegeRecommendation[],
): GapAnalysis {
  const focusRecommendations = recommendations.slice(0, Math.min(5, recommendations.length));
  const targetGrades = focusRecommendations.length
    ? Math.max(
        ...focusRecommendations.map(
          (recommendation) => recommendation.college.admissionRequirements.minGrades,
        ),
      )
    : profile.grades;

  const examSet = new Set<string>();
  const subjectSet = new Set<string>();
  const extracurricularFrequency = new Map<string, number>();

  for (const recommendation of focusRecommendations) {
    const { college } = recommendation;
    for (const exam of college.admissionRequirements.requiredExams) {
      if (!meetsExamRequirement(exam, profile.testScores, college.admissionRequirements.minTestScores)) {
        examSet.add(formatExamRequirementLabel(exam));
      }
    }

    for (const subject of college.admissionRequirements.requiredSubjects) {
      if (!profile.subjects.some((studentSubject) => normalize(studentSubject) === normalize(subject))) {
        subjectSet.add(subject);
      }
    }

    for (const activity of college.extracurricularPreferences) {
      if (!profile.extracurriculars.some((item) => normalize(item) === normalize(activity))) {
        extracurricularFrequency.set(
          activity,
          (extracurricularFrequency.get(activity) ?? 0) + 1,
        );
      }
    }
  }

  const extracurricularGaps = [...extracurricularFrequency.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([activity]) => activity);

  // Generate subject-specific gap analysis
  const subjectGaps = generateSubjectGaps(profile, targetGrades, focusRecommendations);

  return {
    currentGrades: profile.grades,
    targetGrades,
    gradeGap: Math.max(0, roundScore(targetGrades - profile.grades)),
    missingExams: [...examSet],
    missingSubjects: [...subjectSet],
    extracurricularGaps,
    strengths: identifyStrengths(profile, focusRecommendations),
    subjectGaps,
  };
}

function generateSubjectGaps(
  profile: StudentProfile,
  targetGrades: number,
  recommendations: CollegeRecommendation[],
): import('@/lib/types').SubjectGap[] {
  if (profile.subjects.length === 0) return [];

  // Determine which subjects are most critical for target colleges
  const requiredSubjectSet = new Set<string>();
  for (const rec of recommendations) {
    for (const subj of rec.college.admissionRequirements.requiredSubjects) {
      requiredSubjectSet.add(normalize(subj));
    }
  }

  const subjectSuggestions: Record<string, string> = {
    'physics': 'Focus on mechanics, electrodynamics, and optics — heavily tested in competitive exams',
    'chemistry': 'Prioritize organic chemistry reactions and physical chemistry numericals',
    'mathematics': 'Practice calculus, algebra, and coordinate geometry daily',
    'biology': 'Focus on NCERT thoroughly — most medical exam questions come from textbook',
    'english': 'Read widely and practice essay writing for college applications',
    'computer science': 'Build projects and practice data structures & algorithms',
    'economics': 'Focus on micro/macro theory and current affairs for CUET',
    'accountancy': 'Practice financial statements and ratio analysis problems',
    'business studies': 'Focus on case studies and real-world business examples',
    'history': 'Create timelines and practice source-based questions',
    'political science': 'Connect theory to current political developments',
  };

  // For IB/Cambridge students with subject-level grades
  if (profile.educationBoard === 'Cambridge' && profile.cambridgeGrades) {
    const gradeToPercent: Record<string, number> = { 'A*': 95, 'A': 88, 'B': 78, 'C': 68, 'D': 58, 'E': 48 };
    return profile.subjects.map(subject => {
      const currentGrade = gradeToPercent[profile.cambridgeGrades?.[subject] || ''] || profile.grades;
      const isRequired = requiredSubjectSet.has(normalize(subject));
      const subjectTarget = isRequired ? Math.max(targetGrades + 5, 85) : targetGrades;
      const gap = Math.max(0, subjectTarget - currentGrade);
      return {
        subject,
        currentGrade,
        targetGrade: subjectTarget,
        gap,
        priority: gap > 15 ? 'high' as const : gap > 5 ? 'medium' as const : 'low' as const,
        suggestion: subjectSuggestions[normalize(subject)] || `Aim for ${subjectTarget}%+ in ${subject}`,
      };
    }).sort((a, b) => b.gap - a.gap);
  }

  // For IB students
  if (profile.educationBoard === 'IB' && profile.ibScore) {
    const avgSubjectScore = Math.round(((profile.ibScore - 3) / 6)); // rough per-subject average out of 7
    const avgPercent = Math.round((avgSubjectScore / 7) * 100);
    return profile.subjects.slice(0, 6).map(subject => {
      const isRequired = requiredSubjectSet.has(normalize(subject));
      const subjectTarget = isRequired ? Math.max(targetGrades + 5, 85) : targetGrades;
      const gap = Math.max(0, subjectTarget - avgPercent);
      return {
        subject,
        currentGrade: avgPercent,
        targetGrade: subjectTarget,
        gap,
        priority: gap > 15 ? 'high' as const : gap > 5 ? 'medium' as const : 'low' as const,
        suggestion: subjectSuggestions[normalize(subject)] || `Target a 6 or 7 in ${subject} at HL level`,
      };
    }).sort((a, b) => b.gap - a.gap);
  }

  // For CBSE/ICSE/State Board — estimate subject grades around overall percentage with variance
  return profile.subjects.map((subject, idx) => {
    // Simulate some variance around the overall grade
    const variance = ((idx % 5) - 2) * 4; // -8 to +8 variance
    const currentGrade = clamp(profile.grades + variance, 30, 100);
    const isRequired = requiredSubjectSet.has(normalize(subject));
    const subjectTarget = isRequired ? Math.max(targetGrades + 5, 85) : targetGrades;
    const gap = Math.max(0, subjectTarget - currentGrade);
    return {
      subject,
      currentGrade: Math.round(currentGrade),
      targetGrade: subjectTarget,
      gap: Math.round(gap),
      priority: gap > 15 ? 'high' as const : gap > 5 ? 'medium' as const : 'low' as const,
      suggestion: subjectSuggestions[normalize(subject)] || `Aim to improve ${subject} to ${subjectTarget}%+`,
    };
  }).sort((a, b) => b.gap - a.gap);
}

function filterColleges(profile: StudentProfile, colleges: College[]): College[] {
  const preferredCountries = new Set(
    profile.preferredCountries.map(normalize).filter(Boolean),
  );
  const maxBudget = BUDGET_MAX_INR[profile.budgetRange];

  const matchesCountry = (college: College) =>
    preferredCountries.size === 0 ||
    preferredCountries.has(normalize(college.country));

  // Filter by intended major if specified (unless "Unsure / Exploring")
  const matchesMajor = (college: College) => {
    if (!profile.intendedMajors || profile.intendedMajors.length === 0) return true;
    if (profile.intendedMajors.includes('Unsure / Exploring')) return true;
    // Check if college offers programs related to intended majors
    const majorToPrograms: Record<string, string[]> = {
      'Engineering/Technology': ['Engineering', 'Technology'],
      'Computer Science/IT': ['Computer Science', 'Engineering', 'Technology'],
      'Medicine/Health Sciences': ['Medicine', 'Health Sciences', 'Medical'],
      'Business/Commerce': ['Business', 'Commerce', 'Management'],
      'Law': ['Law'],
      'Arts/Humanities': ['Arts & Humanities', 'Arts', 'Humanities', 'Liberal Arts'],
      'Social Sciences': ['Social Sciences', 'Arts & Humanities'],
      'Natural Sciences': ['Sciences', 'Natural Sciences'],
      'Design': ['Design'],
      'Architecture': ['Architecture'],
      'Media/Communications': ['Media', 'Communications', 'Journalism'],
      'Education': ['Education'],
      'Agriculture': ['Agriculture'],
      'Hospitality': ['Hospitality', 'Hotel Management'],
    };
    return profile.intendedMajors.some(major => {
      const relatedPrograms = majorToPrograms[major] || [];
      return relatedPrograms.some(prog =>
        college.programs.some(cp => normalize(cp).includes(normalize(prog)))
      );
    });
  };

  const strictMatches = colleges.filter(
    (college) => matchesCountry(college) && matchesMajor(college) && college.feesINR <= maxBudget,
  );
  if (strictMatches.length > 0) {
    return strictMatches;
  }

  // Relax budget constraint but KEEP major filter
  const countryMajorMatches = colleges.filter(
    (college) => matchesCountry(college) && matchesMajor(college),
  );
  if (countryMajorMatches.length > 0) {
    return countryMajorMatches;
  }

  // Relax country but KEEP major filter
  const majorMatches = colleges.filter(matchesMajor);
  if (majorMatches.length > 0) {
    return majorMatches;
  }

  // Last resort: relax everything (shouldn't normally reach here)
  const countryMatches = colleges.filter(matchesCountry);
  if (countryMatches.length > 0) {
    return countryMatches;
  }

  return colleges.filter((college) => college.feesINR <= maxBudget);
}

function createRecommendation(
  profile: StudentProfile,
  college: College,
): CollegeRecommendation {
  const requirements = college.admissionRequirements;
  const gradeScore = calculateGradeScore(profile.grades, requirements.minGrades);
  const examScore = calculateExamScore(profile, requirements);
  const subjectScore = calculateSubjectScore(
    profile.subjects,
    requirements.requiredSubjects,
    requirements.preferredSubjects,
  );
  const extracurricularScore = calculateExtracurricularScore(
    profile.extracurriculars,
    college.extracurricularPreferences,
  );
  const budgetScore = calculateBudgetScore(profile.budgetRange, college.feesINR);

  const weightedScore =
    gradeScore * 0.3 +
    examScore * 0.25 +
    subjectScore * 0.15 +
    extracurricularScore * 0.15 +
    budgetScore * 0.15;

  const strategicBoost = calculateStrategicBoost(profile, college);
  const matchScore = roundScore(clamp(weightedScore + strategicBoost, 0, 100));
  const requirementStatuses = buildRequirementStatuses(profile, college);

  return {
    college,
    category: categorizeCollegeWithContext(matchScore, college, profile),
    matchScore,
    requirementsMet: requirementStatuses.filter((status) => status.status === 'met'),
    areasToImprove: requirementStatuses.filter((status) => status.status === 'improve'),
    requirementsNotMet: requirementStatuses.filter((status) => status.status === 'not_met'),
    alternativeSuggestions: buildAlternativeSuggestions(
      college,
      requirementStatuses,
      profile.budgetRange,
    ),
  };
}

function calculateStrategicBoost(
  profile: StudentProfile,
  college: College,
): number {
  let boost = 0;

  // Boost for major alignment
  if (profile.intendedMajors && profile.intendedMajors.length > 0 && !profile.intendedMajors.includes('Unsure / Exploring')) {
    const majorToPrograms: Record<string, string[]> = {
      'Engineering/Technology': ['Engineering', 'Technology'],
      'Computer Science/IT': ['Computer Science', 'Engineering', 'Technology'],
      'Medicine/Health Sciences': ['Medicine', 'Health Sciences'],
      'Business/Commerce': ['Business', 'Commerce', 'Management'],
      'Law': ['Law'],
      'Arts/Humanities': ['Arts & Humanities', 'Arts', 'Humanities'],
      'Social Sciences': ['Social Sciences'],
      'Natural Sciences': ['Sciences', 'Natural Sciences'],
      'Design': ['Design'],
      'Architecture': ['Architecture'],
      'Media/Communications': ['Media', 'Communications'],
      'Education': ['Education'],
      'Agriculture': ['Agriculture'],
      'Hospitality': ['Hospitality'],
    };
    const matchCount = profile.intendedMajors.filter(major => {
      const relatedPrograms = majorToPrograms[major] || [];
      return relatedPrograms.some(prog =>
        college.programs.some(cp => normalize(cp).includes(normalize(prog)))
      );
    }).length;
    if (matchCount > 0) {
      boost += Math.min(8, matchCount * 4);
    }
  }

  if (isIndianEngineeringCollege(college)) {
    const jee = profile.testScores.jee ?? 0;
    if (jee >= 99) {
      boost += 14;
    } else if (jee >= 97) {
      boost += 10;
    } else if (jee >= 95) {
      boost += 7;
    }

    if (profile.grades >= 90) {
      boost += 3;
    }
  }

  if (isTopInternationalCollege(college)) {
    const sat = profile.testScores.sat ?? 0;
    if (sat >= 1550) {
      boost += 12;
    } else if (sat >= 1500) {
      boost += 8;
    }
  }

  if (
    isInternationalCollege(college) &&
    (profile.educationBoard === 'IB' || profile.educationBoard === 'Cambridge')
  ) {
    boost += 6;
  }

  if (
    isIndianEngineeringCollege(college) &&
    (profile.educationBoard === 'CBSE' || profile.educationBoard === 'ICSE')
  ) {
    boost += 2;
  }

  if (targetsCollege(profile, college)) {
    boost += 3;
  }

  return Math.min(boost, 18);
}

function buildRequirementStatuses(
  profile: StudentProfile,
  college: College,
): RequirementStatus[] {
  const requirements = college.admissionRequirements;
  const statuses: RequirementStatus[] = [];

  statuses.push(
    createNumericStatus({
      label: 'Academic grades',
      currentValue: profile.grades,
      minimumValue: requirements.minGrades,
      metDetail: `Current average of ${profile.grades}% meets the minimum ${requirements.minGrades}% benchmark.`,
      improveDetail: `Current average of ${profile.grades}% is close to the ${requirements.minGrades}% benchmark.`,
      notMetDetail: `Current average of ${profile.grades}% is below the expected ${requirements.minGrades}% threshold.`,
      improveSuggestion: 'Aim to raise your next 2 terms by 3-5 percentage points.',
      notMetSuggestion: 'Prioritize board-exam style revision and weekly subject diagnostics.',
      improveMargin: 5,
    }),
  );

  for (const exam of requirements.requiredExams) {
    statuses.push(createExamRequirementStatus(exam, profile.testScores, requirements.minTestScores));
  }

  statuses.push(
    createSubjectRequirementStatus(
      profile.subjects,
      requirements.requiredSubjects,
      requirements.preferredSubjects,
    ),
  );

  if (college.extracurricularPreferences.length > 0) {
    statuses.push(
      createExtracurricularRequirementStatus(
        profile.extracurriculars,
        college.extracurricularPreferences,
      ),
    );
  }

  statuses.push(createBudgetRequirementStatus(profile.budgetRange, college.feesINR));

  const boardNote = resolveBoardNote(college, profile.educationBoard);
  if (boardNote) {
    statuses.push({
      requirement: `${profile.educationBoard} board alignment`,
      status: 'met',
      detail: boardNote,
      suggestion:
        isInternationalCollege(college) &&
        (profile.educationBoard === 'IB' || profile.educationBoard === 'Cambridge')
          ? 'Highlight coursework rigor and any predicted grades in applications.'
          : undefined,
    });
  }

  return statuses;
}

function createNumericStatus({
  label,
  currentValue,
  minimumValue,
  metDetail,
  improveDetail,
  notMetDetail,
  improveSuggestion,
  notMetSuggestion,
  improveMargin,
}: {
  label: string;
  currentValue: number;
  minimumValue: number;
  metDetail: string;
  improveDetail: string;
  notMetDetail: string;
  improveSuggestion?: string;
  notMetSuggestion?: string;
  improveMargin: number;
}): RequirementStatus {
  if (currentValue >= minimumValue) {
    return {
      requirement: label,
      status: 'met',
      detail: metDetail,
    };
  }

  if (currentValue >= minimumValue - improveMargin) {
    return {
      requirement: label,
      status: 'improve',
      detail: improveDetail,
      suggestion: improveSuggestion,
    };
  }

  return {
    requirement: label,
    status: 'not_met',
    detail: notMetDetail,
    suggestion: notMetSuggestion,
  };
}

function createExamRequirementStatus(
  examName: string,
  testScores: TestScores,
  minimums?: Partial<TestScores>,
): RequirementStatus {
  const examKeys = resolveExamKeys(examName);
  const label = formatExamRequirementLabel(examName);

  if (examKeys.length === 0) {
    return {
      requirement: label,
      status: 'improve',
      detail: 'An exam requirement exists, but it needs manual review because the exam type is uncommon.',
      suggestion: 'Check the official admissions page for the latest test policy.',
    };
  }

  let bestStatus: RequirementStatus | null = null;

  for (const examKey of examKeys) {
    const studentScore = testScores[examKey];
    const requiredScore = minimums?.[examKey];
    const candidate = createSingleExamStatus(label, examKey, studentScore, requiredScore);
    if (!bestStatus || statusPriority(candidate.status) > statusPriority(bestStatus.status)) {
      bestStatus = candidate;
    }
  }

  return bestStatus ?? {
    requirement: label,
    status: 'not_met',
    detail: `${label} is required and no qualifying score is present yet.`,
    suggestion: `Schedule a ${label} attempt in the next available testing window.`,
  };
}

function createSingleExamStatus(
  label: string,
  examKey: ExamKey,
  studentScore: number | undefined,
  requiredScore: number | undefined,
): RequirementStatus {
  if (studentScore === undefined) {
    return {
      requirement: label,
      status: 'not_met',
      detail: `${EXAM_LABELS[examKey]} score is missing.`,
      suggestion: `Register for ${EXAM_LABELS[examKey]} and begin a structured prep plan.`,
    };
  }

  if (requiredScore === undefined) {
    return {
      requirement: label,
      status: 'met',
      detail: `${EXAM_LABELS[examKey]} score of ${studentScore} is available for review.`,
    };
  }

  if (studentScore >= requiredScore) {
    return {
      requirement: label,
      status: 'met',
      detail: `${EXAM_LABELS[examKey]} score of ${studentScore} meets the minimum ${requiredScore}.`,
    };
  }

  if (studentScore >= requiredScore - EXAM_CLOSE_MARGINS[examKey]) {
    return {
      requirement: label,
      status: 'improve',
      detail: `${EXAM_LABELS[examKey]} score of ${studentScore} is close to the minimum ${requiredScore}.`,
      suggestion: `A focused retake could close the gap in ${EXAM_LABELS[examKey]}.`,
    };
  }

  return {
    requirement: label,
    status: 'not_met',
    detail: `${EXAM_LABELS[examKey]} score of ${studentScore} is below the required ${requiredScore}.`,
    suggestion: `Build a 10-12 week prep cycle before the next ${EXAM_LABELS[examKey]} attempt.`,
  };
}

function createSubjectRequirementStatus(
  studentSubjects: string[],
  requiredSubjects: string[],
  preferredSubjects: string[] = [],
): RequirementStatus {
  const studentSet = new Set(studentSubjects.map(normalize));
  const missingRequired = requiredSubjects.filter(
    (subject) => !studentSet.has(normalize(subject)),
  );
  const matchedPreferred = preferredSubjects.filter((subject) =>
    studentSet.has(normalize(subject)),
  );

  if (missingRequired.length === 0 && preferredSubjects.length === 0) {
    return {
      requirement: 'Subject prerequisites',
      status: 'met',
      detail: 'All required academic subjects are already covered.',
    };
  }

  if (missingRequired.length === 0 && matchedPreferred.length >= Math.ceil(preferredSubjects.length / 2)) {
    return {
      requirement: 'Subject prerequisites',
      status: 'met',
      detail: `Required subjects are covered and preferred depth is visible in ${matchedPreferred.join(', ')}.`,
    };
  }

  if (missingRequired.length === 0) {
    return {
      requirement: 'Subject prerequisites',
      status: 'improve',
      detail: 'Required subjects are covered, but preferred subject depth could be stronger.',
      suggestion: `Consider adding coursework, projects, or Olympiads in ${preferredSubjects
        .filter((subject) => !matchedPreferred.includes(subject))
        .join(', ')}.`,
    };
  }

  if (missingRequired.length === 1) {
    return {
      requirement: 'Subject prerequisites',
      status: 'improve',
      detail: `One prerequisite is missing: ${missingRequired[0]}.`,
      suggestion: `Add bridge coursework or an alternate credential for ${missingRequired[0]}.`,
    };
  }

  return {
    requirement: 'Subject prerequisites',
    status: 'not_met',
    detail: `Missing multiple prerequisite subjects: ${missingRequired.join(', ')}.`,
    suggestion: 'Reassess fit or complete accredited bridge courses before applying.',
  };
}

function createExtracurricularRequirementStatus(
  studentExtracurriculars: string[],
  collegePreferences: string[],
): RequirementStatus {
  const studentSet = new Set(studentExtracurriculars.map(normalize));
  const overlap = collegePreferences.filter((item) => studentSet.has(normalize(item)));

  if (overlap.length >= Math.ceil(collegePreferences.length / 2)) {
    return {
      requirement: 'Extracurricular fit',
      status: 'met',
      detail: `Strong alignment through ${overlap.join(', ')}.`,
    };
  }

  if (overlap.length > 0) {
    return {
      requirement: 'Extracurricular fit',
      status: 'improve',
      detail: `Partial alignment through ${overlap.join(', ')}.`,
      suggestion: `Add one more activity in ${collegePreferences
        .filter((item) => !overlap.includes(item))
        .slice(0, 2)
        .join(' or ')}.`,
    };
  }

  return {
    requirement: 'Extracurricular fit',
    status: 'not_met',
    detail: 'Current activity profile does not overlap with the college’s preferred extracurricular themes.',
    suggestion: `Build depth in ${collegePreferences.slice(0, 2).join(' and ')}.`,
  };
}

function createBudgetRequirementStatus(
  budgetRange: BudgetRange,
  feesINR: number,
): RequirementStatus {
  const maxBudget = BUDGET_MAX_INR[budgetRange];
  if (feesINR <= maxBudget) {
    return {
      requirement: 'Annual budget fit',
      status: feesINR <= maxBudget * 0.8 ? 'met' : 'improve',
      detail:
        feesINR <= maxBudget * 0.8
          ? `Estimated annual cost of ₹${formatNumber(feesINR)} sits comfortably within budget.`
          : `Estimated annual cost of ₹${formatNumber(feesINR)} is within budget, but leaves limited buffer.`,
      suggestion:
        feesINR <= maxBudget * 0.8
          ? undefined
          : 'Keep scholarship and living-cost planning active for this option.',
    };
  }

  if (feesINR <= maxBudget * 1.15) {
    return {
      requirement: 'Annual budget fit',
      status: 'improve',
      detail: `Estimated annual cost of ₹${formatNumber(feesINR)} is slightly above the current budget band.`,
      suggestion: 'Target scholarships, need-based aid, or lower-cost program variants.',
    };
  }

  return {
    requirement: 'Annual budget fit',
    status: 'not_met',
    detail: `Estimated annual cost of ₹${formatNumber(feesINR)} is well above the budget range.`,
    suggestion: 'Look for scholarships, public universities, or more affordable countries/programs.',
  };
}

function calculateSingleExamRequirementScore(
  examName: string,
  testScores: TestScores,
  minimums?: Partial<TestScores>,
): number {
  const examKeys = resolveExamKeys(examName);
  if (examKeys.length === 0) {
    return 35;
  }

  const scores = examKeys.map((examKey) => {
    const studentScore = testScores[examKey];
    const requiredScore = minimums?.[examKey];

    if (studentScore === undefined) {
      return 0;
    }
    if (requiredScore === undefined) {
      return 100;
    }
    return scoreExamProgress(examKey, studentScore, requiredScore);
  });

  return Math.max(...scores);
}

function scoreExamProgress(
  examKey: ExamKey,
  studentScore: number,
  requiredScore: number,
): number {
  if (studentScore >= requiredScore) {
    return 100;
  }

  const gap = requiredScore - studentScore;
  if (gap <= EXAM_CLOSE_MARGINS[examKey]) {
    return 78;
  }
  if (gap <= EXAM_IMPROVE_MARGINS[examKey]) {
    return 48;
  }

  return 12;
}

function resolveExamKeys(examName: string): ExamKey[] {
  const normalized = normalize(examName);
  const examKeys: ExamKey[] = [];

  if (normalized.includes('sat')) {
    examKeys.push('sat');
  }
  if (normalized.includes('act')) {
    examKeys.push('act');
  }
  if (normalized.includes('jee')) {
    examKeys.push('jee');
  }
  if (normalized.includes('neet')) {
    examKeys.push('neet');
  }
  if (normalized.includes('cuet')) {
    examKeys.push('cuet');
  }
  if (normalized.includes('ap')) {
    examKeys.push('ap');
  }

  return [...new Set(examKeys)];
}

function formatExamRequirementLabel(examName: string): string {
  const examKeys = resolveExamKeys(examName);
  if (examKeys.length === 0) {
    return examName;
  }
  return examKeys.map((examKey) => EXAM_LABELS[examKey]).join(' / ');
}

function meetsExamRequirement(
  examName: string,
  testScores: TestScores,
  minimums?: Partial<TestScores>,
): boolean {
  return calculateSingleExamRequirementScore(examName, testScores, minimums) === 100;
}

function buildAlternativeSuggestions(
  college: College,
  statuses: RequirementStatus[],
  budgetRange: BudgetRange,
): string[] {
  const suggestions = new Set<string>();

  if (statuses.some((status) => status.requirement.includes('budget') && status.status !== 'met')) {
    if (college.scholarships.length > 0) {
      suggestions.add(`Explore ${college.scholarships[0].name} and other scholarship options.`);
    } else if (budgetRange !== 'above-80l') {
      suggestions.add('Pair this option with lower-cost colleges in the same country.');
    }
  }

  for (const status of statuses.filter((item) => item.status !== 'met').slice(0, 2)) {
    if (status.suggestion) {
      suggestions.add(status.suggestion);
    }
  }

  if (college.acceptanceRate < 15) {
    suggestions.add('Add 2-3 less selective colleges to balance this ambitious option.');
  }

  return [...suggestions].slice(0, 3);
}

function categorizeCollegeWithContext(
  score: number,
  college: College,
  profile: StudentProfile,
): 'reach' | 'match' | 'safety' {
  const tier = college.difficultyTier ?? inferDifficultyTier(college);
  const acceptanceRate = college.acceptanceRate;
  const gradeGap = profile.grades - college.admissionRequirements.minGrades;

  // Tier 1 colleges (MIT, Stanford, IIT Bombay, AIIMS, etc.) are almost always Reach
  if (tier === 1) {
    // Only "match" if student is truly exceptional
    if (score >= 88 && gradeGap >= 10 && acceptanceRate > 3) return 'match';
    return 'reach';
  }

  // Tier 2 colleges are Reach for most, Match for strong students
  if (tier === 2) {
    if (score >= 85 && gradeGap >= 8) return 'match';
    if (score >= 92 && gradeGap >= 15) return 'safety';
    return 'reach';
  }

  // Tier 3 colleges: competitive
  if (tier === 3) {
    if (score >= 80 && gradeGap >= 5) return 'safety';
    if (score >= 60 && gradeGap >= 0) return 'match';
    return 'reach';
  }

  // Tier 4 colleges: moderate
  if (tier === 4) {
    if (score >= 65 && gradeGap >= 0) return 'safety';
    if (score >= 45) return 'match';
    return 'reach';
  }

  // Tier 5 colleges: accessible
  if (tier === 5) {
    if (score >= 50) return 'safety';
    if (score >= 30) return 'match';
    return 'reach';
  }

  // Fallback: use acceptance rate as primary signal
  if (acceptanceRate < 10) {
    if (score >= 85 && gradeGap >= 10) return 'match';
    return 'reach';
  }
  if (acceptanceRate < 25) {
    if (score >= 75 && gradeGap >= 5) return 'safety';
    if (score >= 55) return 'match';
    return 'reach';
  }
  if (acceptanceRate < 50) {
    if (score >= 60) return 'safety';
    if (score >= 40) return 'match';
    return 'reach';
  }
  // >50% acceptance
  if (score >= 45) return 'safety';
  if (score >= 25) return 'match';
  return 'reach';
}

// Infer difficulty tier from acceptance rate for colleges that don't have it set
function inferDifficultyTier(college: College): 1 | 2 | 3 | 4 | 5 {
  const rate = college.acceptanceRate;
  if (rate < 5) return 1;
  if (rate < 15) return 2;
  if (rate < 35) return 3;
  if (rate < 60) return 4;
  return 5;
}

function categorizeCollege(score: number): 'reach' | 'match' | 'safety' {
  if (score >= 75) {
    return 'safety';
  }
  if (score >= 50) {
    return 'match';
  }
  return 'reach';
}

function hasIndianEngineeringTarget(
  profile: StudentProfile,
  recommendations: CollegeRecommendation[],
): boolean {
  const countryPreference = profile.preferredCountries.some(
    (country) => normalize(country) === 'india',
  );
  const targetCollegeHint = profile.targetColleges.some((collegeName) =>
    /iit|nit|bits|iiit|engineering|technology/i.test(collegeName),
  );
  const recommendationHint = recommendations.some((recommendation) =>
    isIndianEngineeringCollege(recommendation.college),
  );

  return countryPreference || targetCollegeHint || recommendationHint;
}

function hasInternationalTarget(
  profile: StudentProfile,
  recommendations: CollegeRecommendation[],
): boolean {
  const countryPreference = profile.preferredCountries.some(
    (country) => normalize(country) !== 'india',
  );
  const targetCollegeHint = profile.targetColleges.some((collegeName) =>
    /university|college|usa|uk|canada|australia|singapore/i.test(collegeName),
  );
  const recommendationHint = recommendations.some((recommendation) =>
    isInternationalCollege(recommendation.college),
  );

  return countryPreference || targetCollegeHint || recommendationHint;
}

function buildPath(
  profile: StudentProfile,
  recommendations: CollegeRecommendation[],
  pathKind: PathKind,
): PathStrategy {
  const timeline = createTimeline(profile, pathKind);

  switch (pathKind) {
    case 'indian-engineering':
      return {
        id: 'indian-engineering-path',
        name: 'Indian Engineering Path',
        description:
          'Optimize for IIT, NIT, IIIT, and strong engineering backups through JEE-led preparation and board-score consistency.',
        icon: '🏛️',
        timeline,
        examsToPrep: ['JEE Main', 'JEE Advanced', 'Board Exams'],
        extracurricularsToAdd: ['STEM competition', 'maker project', 'technical club leadership'],
        gradeTarget: Math.max(90, deriveGradeTarget(recommendations, 'india')),
        colleges: selectCollegeIds(recommendations, (college) => isIndianEngineeringCollege(college)),
        pros: [
          'Keeps focus tight on the highest-value Indian engineering entrances.',
          'Works well for CBSE and ICSE students with strong PCM fundamentals.',
        ],
        cons: [
          'Demands sustained mock-test discipline and rank-focused preparation.',
          'Leaves less time for broad application-building outside STEM.',
        ],
      };
    case 'international-university':
      return {
        id: 'international-university-path',
        name: 'International University Path',
        description:
          'Build a globally competitive application around SAT/ACT, essays, rigor, and standout extracurricular depth.',
        icon: '🌍',
        timeline,
        examsToPrep: ['SAT or ACT', 'AP exams', 'English proficiency if needed'],
        extracurricularsToAdd: ['community impact initiative', 'research project', 'leadership role'],
        gradeTarget: Math.max(88, deriveGradeTarget(recommendations, 'international')),
        colleges: selectCollegeIds(recommendations, (college) => isInternationalCollege(college)),
        pros: [
          'Creates flexibility across US, UK, Canada, Singapore, and similar destinations.',
          'Rewards strong essays, project work, and profile differentiation.',
        ],
        cons: [
          'Applications are more time-intensive and can be costlier.',
          'Needs early planning for testing, recommendations, and scholarships.',
        ],
      };
    case 'balanced-approach':
      return {
        id: 'balanced-approach',
        name: 'Balanced Approach',
        description:
          'Keep both Indian and international pathways alive until scores, budgets, and outcomes make the strongest option clear.',
        icon: '⚖️',
        timeline,
        examsToPrep: ['JEE Main', 'SAT', 'Board Exams'],
        extracurricularsToAdd: ['technical project', 'service initiative', 'leadership responsibility'],
        gradeTarget: Math.max(90, deriveGradeTarget(recommendations, 'all')),
        colleges: selectCollegeIds(recommendations, () => true),
        pros: [
          'Reduces downside by keeping parallel options open.',
          'Lets late score improvements materially change the final shortlist.',
        ],
        cons: [
          'Requires careful calendar management to avoid spreading effort too thin.',
          'You may need to choose a primary path by mid-cycle.',
        ],
      };
    case 'scholarship-first':
      return {
        id: 'scholarship-first-global-path',
        name: 'Scholarship-First Global Path',
        description:
          'Pursue strong international fits while prioritizing merit aid, application timing, and cost control.',
        icon: '💸',
        timeline,
        examsToPrep: ['SAT', 'Scholarship essays', 'AP exams'],
        extracurricularsToAdd: ['high-impact service project', 'competitive academic activity'],
        gradeTarget: Math.max(90, deriveGradeTarget(recommendations, 'international')),
        colleges: selectCollegeIds(recommendations, (college) => isInternationalCollege(college)),
        pros: [
          'Targets colleges where profile strength can translate into financial aid.',
          'Useful when the aspirational list exceeds the current budget band.',
        ],
        cons: [
          'Scholarship timelines can be earlier than regular admission rounds.',
          'Aid outcomes remain uncertain even for strong applicants.',
        ],
      };
    case 'focused-improvement':
    default:
      return {
        id: 'focused-improvement-path',
        name: 'Focused Improvement Path',
        description:
          'Use the next application cycle months to close score gaps, deepen profile evidence, and convert reaches into matches.',
        icon: '📈',
        timeline,
        examsToPrep: ['Primary target exam', 'Board Exams', 'Mock tests'],
        extracurricularsToAdd: EXTRACURRICULAR_IDEAS.slice(0, 3),
        gradeTarget: Math.max(profile.grades + 3, deriveGradeTarget(recommendations, 'all')),
        colleges: selectCollegeIds(recommendations, () => true),
        pros: [
          'Directly addresses the biggest current weaknesses in the profile.',
          'Can materially improve both admission odds and scholarship outcomes.',
        ],
        cons: [
          'Needs disciplined execution over the next 4-6 months.',
          'May require dropping lower-impact commitments to focus on results.',
        ],
      };
  }
}

function createTimeline(
  profile: StudentProfile,
  pathKind: PathKind,
): TimelineItem[] {
  const months = getTimelineMonths(profile.currentGrade);

  const academicReset: TimelineItem = {
    month: months[0],
    title: 'Set score and grade baseline',
    description:
      'Audit current grades, create a weekly study timetable, and define score targets for each priority exam.',
    category: 'academic',
  };

  const timelineByPath: Record<PathKind, TimelineItem[]> = {
    'indian-engineering': [
      academicReset,
      {
        month: months[1],
        title: 'Launch JEE test cycle',
        description:
          'Start topic-wise PCM revision, one timed JEE Main mock every two weeks, and an error log for weak chapters.',
        category: 'exam',
      },
      {
        month: months[2],
        title: 'Build technical evidence',
        description:
          'Add one STEM project, Olympiad, hackathon, or school technical club role to strengthen engineering intent.',
        category: 'extracurricular',
      },
      {
        month: months[3],
        title: 'Raise mock percentile',
        description:
          'Move to weekly mocks and review time-management patterns chapter by chapter.',
        category: 'exam',
      },
      {
        month: months[4],
        title: 'Parallel board exam reinforcement',
        description:
          'Shift one-third of weekly study time to board-style writing practice and exemplar questions.',
        category: 'academic',
      },
      {
        month: months[5],
        title: 'Shortlist branches and backups',
        description:
          'Finalize IIT/NIT/IIIT/BITS branch preferences and keep backup colleges ready for counseling season.',
        category: 'application',
      },
    ],
    'international-university': [
      academicReset,
      {
        month: months[1],
        title: 'Start SAT or ACT prep',
        description:
          'Begin a 10-12 week digital SAT/ACT plan with one full-length test every two weeks and targeted review blocks.',
        category: 'exam',
      },
      {
        month: months[2],
        title: 'Create a standout project',
        description:
          'Launch one leadership, research, or community initiative with measurable outcomes and clear ownership.',
        category: 'extracurricular',
      },
      {
        month: months[3],
        title: 'Build application narrative',
        description:
          'Write an activities inventory, collect recommendation leads, and draft essay themes tied to your profile strengths.',
        category: 'application',
      },
      {
        month: months[4],
        title: 'Retake or finalize scores',
        description:
          'Use a second SAT/ACT attempt if needed and lock in an initial shortlist by score band and budget.',
        category: 'exam',
      },
      {
        month: months[5],
        title: 'Prepare scholarship and deadline packet',
        description:
          'Organize essays, transcripts, predicted grades, and scholarship documents before early deadlines open.',
        category: 'deadline',
      },
    ],
    'balanced-approach': [
      academicReset,
      {
        month: months[1],
        title: 'Split testing calendar smartly',
        description:
          'Set JEE mock slots on weekdays and reserve weekend blocks for SAT practice so neither track slips.',
        category: 'exam',
      },
      {
        month: months[2],
        title: 'Add one cross-compatible profile builder',
        description:
          'Choose a project or competition that strengthens both engineering and holistic international applications.',
        category: 'extracurricular',
      },
      {
        month: months[3],
        title: 'Review shortlist by score trend',
        description:
          'Reclassify colleges using current mock percentiles, SAT practice scores, and budget reality.',
        category: 'application',
      },
      {
        month: months[4],
        title: 'Board and application checkpoint',
        description:
          'Protect school grades while collecting counselor references, transcripts, and deadline notes.',
        category: 'academic',
      },
      {
        month: months[5],
        title: 'Choose primary lane for the final sprint',
        description:
          'Use your latest scores to decide whether to lean Indian, international, or continue dual filing.',
        category: 'deadline',
      },
    ],
    'focused-improvement': [
      academicReset,
      {
        month: months[1],
        title: 'Fix the biggest scoring bottleneck',
        description:
          'Identify the weakest exam section or subject and build a daily drill routine around it.',
        category: 'academic',
      },
      {
        month: months[2],
        title: 'Add one high-signal activity',
        description:
          'Pick a leadership, research, or service activity with tangible output instead of broad but shallow participation.',
        category: 'extracurricular',
      },
      {
        month: months[3],
        title: 'Run a progress mock checkpoint',
        description:
          'Take a full-length mock, benchmark against target colleges, and adjust the next month of preparation.',
        category: 'exam',
      },
      {
        month: months[4],
        title: 'Refresh shortlist',
        description:
          'Move newly realistic colleges into the active list and drop options that still show major structural gaps.',
        category: 'application',
      },
      {
        month: months[5],
        title: 'Prepare final evidence pack',
        description:
          'Collect certificates, score reports, project summaries, and academic proof for upcoming applications.',
        category: 'deadline',
      },
    ],
    'scholarship-first': [
      academicReset,
      {
        month: months[1],
        title: 'Target high-aid score band',
        description:
          'Push SAT practice into scholarship-competitive territory and shortlist aid-friendly colleges.',
        category: 'exam',
      },
      {
        month: months[2],
        title: 'Document impact clearly',
        description:
          'Quantify extracurricular outcomes, leadership scale, and awards for scholarship reviewers.',
        category: 'extracurricular',
      },
      {
        month: months[3],
        title: 'Draft merit and need-based essays',
        description:
          'Prepare reusable scholarship narratives around achievement, context, and future plans.',
        category: 'application',
      },
      {
        month: months[4],
        title: 'Finalize affordable shortlist',
        description:
          'Prioritize colleges where total cost after likely aid still stays within the family budget band.',
        category: 'application',
      },
      {
        month: months[5],
        title: 'Submit before early aid deadlines',
        description:
          'Complete scholarship forms, CSS/Profile-style documents if required, and all early financial aid tasks.',
        category: 'deadline',
      },
    ],
  };

  return timelineByPath[pathKind].filter((item) => item.month);
}

function getTimelineMonths(currentGrade: StudentProfile['currentGrade']): string[] {
  const count = currentGrade === '11th' ? 8 : currentGrade === '12th' ? 6 : 5;
  const startDate = new Date();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(startDate.getFullYear(), startDate.getMonth() + index + 1, 1);
    return MONTH_FORMATTER.format(date);
  });
}

function deriveGradeTarget(
  recommendations: CollegeRecommendation[],
  scope: 'india' | 'international' | 'all',
): number {
  const filtered = recommendations.filter((recommendation) => {
    if (scope === 'all') {
      return true;
    }
    return scope === 'india'
      ? normalize(recommendation.college.country) === 'india'
      : normalize(recommendation.college.country) !== 'india';
  });

  if (filtered.length === 0) {
    return scope === 'india' ? 90 : 88;
  }

  return Math.max(
    ...filtered.slice(0, 5).map((recommendation) => recommendation.college.admissionRequirements.minGrades),
  );
}

function selectCollegeIds(
  recommendations: CollegeRecommendation[],
  predicate: (college: College) => boolean,
): string[] {
  return recommendations
    .filter((recommendation) => predicate(recommendation.college))
    .slice(0, 6)
    .map((recommendation) => recommendation.college.id);
}

function identifyStrengths(
  profile: StudentProfile,
  recommendations: CollegeRecommendation[],
): string[] {
  const strengths: string[] = [];

  if (profile.grades >= 90) {
    strengths.push('Strong academic consistency with 90%+ grades.');
  } else if (profile.grades >= 85) {
    strengths.push('Solid academic base that is already competitive for many target colleges.');
  }

  if ((profile.testScores.jee ?? 0) >= 95) {
    strengths.push('JEE percentile is strong enough to make Indian engineering options more realistic.');
  }
  if ((profile.testScores.sat ?? 0) >= 1500) {
    strengths.push('SAT profile is already competitive for selective international universities.');
  }
  if (profile.extracurriculars.length >= 3) {
    strengths.push('Extracurricular breadth gives room to build a compelling story.');
  }
  if (
    (profile.educationBoard === 'IB' || profile.educationBoard === 'Cambridge') &&
    recommendations.some((recommendation) => isInternationalCollege(recommendation.college))
  ) {
    strengths.push('Your curriculum is naturally well-aligned with international admissions review.');
  }
  if (
    profile.subjects.some((subject) => normalize(subject) === 'mathematics') &&
    profile.subjects.some((subject) => normalize(subject) === 'physics')
  ) {
    strengths.push('Math and Physics foundation supports engineering and quantitative programs.');
  }

  if (strengths.length === 0) {
    strengths.push('You already have a base profile; the biggest upside now comes from focused execution.');
  }

  return strengths.slice(0, 5);
}

function generateResourceSuggestions(
  profile: StudentProfile,
  recommendations: CollegeRecommendation[],
  gapAnalysis: GapAnalysis,
): ResourceSuggestion[] {
  const suggestions: ResourceSuggestion[] = [];
  const seen = new Set<string>();

  const pushSuggestion = (suggestion: ResourceSuggestion) => {
    const key = `${suggestion.category}:${suggestion.title}`;
    if (!seen.has(key)) {
      seen.add(key);
      suggestions.push(suggestion);
    }
  };

  const examResourceMap: Record<string, ResourceSuggestion> = {
    SAT: {
      category: 'test-prep',
      title: 'Khan Academy Digital SAT Prep',
      url: 'https://www.khanacademy.org/test-prep/digital-sat',
      description: 'Official-style SAT practice with diagnostics, timed drills, and adaptive review.',
      relevance: 'Best fit if SAT is missing or below the target score band.',
    },
    ACT: {
      category: 'test-prep',
      title: 'ACT Official Prep',
      url: 'https://www.act.org/content/act/en/products-and-services/the-act/test-preparation.html',
      description: 'Official ACT prep resources, section practice, and exam guidance.',
      relevance: 'Useful when ACT is your alternate to SAT requirements.',
    },
    JEE: {
      category: 'test-prep',
      title: 'NTA JEE Resources',
      url: 'https://www.nta.ac.in/',
      description: 'Official exam notifications, sample papers, and planning material for JEE aspirants.',
      relevance: 'Prioritize this if Indian engineering colleges are central to your shortlist.',
    },
    NEET: {
      category: 'test-prep',
      title: 'NTA NEET Resources',
      url: 'https://www.nta.ac.in/',
      description: 'Official updates and exam planning support for NEET preparation.',
      relevance: 'Useful when health-science programs require NEET readiness.',
    },
    CUET: {
      category: 'test-prep',
      title: 'CUET Official Portal',
      url: 'https://cuet.samarth.ac.in/',
      description: 'Official CUET portal with exam notices and application guidance.',
      relevance: 'Helpful for central university pathways in India.',
    },
    'AP exams': {
      category: 'test-prep',
      title: 'AP Students',
      url: 'https://apstudents.collegeboard.org/',
      description: 'Official AP subject planning, exam registration, and score reporting guidance.',
      relevance: 'Adds rigor and credit opportunities for international applications.',
    },
  };

  for (const exam of gapAnalysis.missingExams) {
    const suggestion = examResourceMap[exam];
    if (suggestion) {
      pushSuggestion(suggestion);
    }
  }

  if (gapAnalysis.gradeGap > 0) {
    pushSuggestion({
      category: 'courses',
      title: 'Khan Academy Mastery Practice',
      url: 'https://www.khanacademy.org/',
      description: 'Free topic-wise practice for math, science, and foundational coursework.',
      relevance: `Helpful for closing the current ${gapAnalysis.gradeGap}% grade gap to top targets.`,
    });
  }

  if (gapAnalysis.missingSubjects.length > 0) {
    pushSuggestion({
      category: 'courses',
      title: 'Bridge Coursework Planning',
      url: 'https://www.coursera.org/',
      description: 'Use structured online courses or certificate programs to cover subject prerequisites.',
      relevance: `Relevant for missing subjects like ${gapAnalysis.missingSubjects.slice(0, 2).join(', ')}.`,
    });
  }

  if (gapAnalysis.extracurricularGaps.length > 0) {
    pushSuggestion({
      category: 'skills',
      title: 'Forage Project Programs',
      url: 'https://www.theforage.com/',
      description: 'Short virtual experience programs that add project-based evidence to your profile.',
      relevance: `Useful for adding evidence in areas such as ${gapAnalysis.extracurricularGaps
        .slice(0, 2)
        .join(' and ')}.`,
    });
  }

  const expensiveRecommendations = recommendations.filter(
    (recommendation) =>
      recommendation.college.feesINR > BUDGET_MAX_INR[profile.budgetRange] * 0.85,
  );
  if (expensiveRecommendations.length > 0 || profile.budgetRange !== 'above-80l') {
    pushSuggestion({
      category: 'scholarships',
      title: 'BigFuture Scholarship Search',
      url: 'https://bigfuture.collegeboard.org/pay-for-college/scholarship-search',
      description: 'Scholarship discovery tool with filters by geography, profile, and field.',
      relevance: 'Useful if several shortlisted colleges are near the top of the current budget band.',
    });
  }

  pushSuggestion({
    category: 'application-help',
    title: 'Common App Application Guide',
    url: 'https://www.commonapp.org/apply/first-year-students',
    description: 'Timeline, essay, and application-planning guidance for international undergraduate applicants.',
    relevance: 'Especially helpful for organizing deadlines, essays, and recommendation letters.',
  });

  return suggestions.slice(0, 6);
}

function calculateCoverage(values: string[], studentSet: Set<string>): number {
  if (values.length === 0) {
    return 1;
  }

  const matched = values.filter((value) => studentSet.has(normalize(value))).length;
  return matched / values.length;
}

function resolveBoardNote(college: College, board: StudentProfile['educationBoard']): string | undefined {
  const directMatch = college.boardNotes[board];
  if (directMatch) {
    return directMatch;
  }

  const normalizedBoard = normalize(board);
  for (const [key, note] of Object.entries(college.boardNotes)) {
    if (normalize(key) === normalizedBoard) {
      return note;
    }
  }

  return undefined;
}

function targetsCollege(profile: StudentProfile, college: College): boolean {
  const targetNames = profile.targetColleges.map(normalize);
  return targetNames.some((targetName) => {
    const name = normalize(college.name);
    const shortName = normalize(college.shortName ?? '');
    return targetName.includes(name) || name.includes(targetName) || (!!shortName && targetName.includes(shortName));
  });
}

function isInternationalCollege(college: College): boolean {
  return normalize(college.country) !== 'india';
}

function isIndianEngineeringCollege(college: College): boolean {
  return (
    normalize(college.country) === 'india' &&
    (/engineering|technology/i.test(college.name) ||
      /engineering|computer science|technology/i.test(college.programs.join(' ')) ||
      /iit|nit|iiit|bits/i.test(college.name))
  );
}

function isTopInternationalCollege(college: College): boolean {
  return (
    isInternationalCollege(college) &&
    (college.acceptanceRate <= 25 ||
      /top|global|qs|times|ivy/i.test(college.ranking ?? '') ||
      /mit|stanford|harvard|princeton|columbia|berkeley|cambridge|oxford/i.test(college.name))
  );
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function roundScore(value: number): number {
  return Math.round(value);
}

function clamp(value: number, minValue: number, maxValue: number): number {
  return Math.min(maxValue, Math.max(minValue, value));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(Math.round(value));
}

function statusPriority(status: RequirementStatus['status']): number {
  if (status === 'met') {
    return 3;
  }
  if (status === 'improve') {
    return 2;
  }
  return 1;
}
