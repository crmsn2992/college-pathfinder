    return {
      results: {
        recommendations: data.recommendations ?? [],
        paths: data.paths ?? [],
        gapAnalysis: data.gap_analysis ?? { currentGrades: 0, targetGrades: 0, gradeGap: 0, missingExams: [], missingSubjects: [], extracurricularGaps: [], strengths: [], subjectGaps: [] },
        resourceSuggestions: [],
      },
      createdAt: data.created_at ?? null,
      error: null,
    };
