    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      const data = await res.json();
      const text = data?.recommendation ?? 'No recommendation available.';
      setAiRecommendation(text);

      // save to Firestore if logged in
      if (user) {
        await saveResults(profile, { recommendations: [text], paths: [], gapAnalysis: { currentGrades: profile.grades, targetGrades: profile.grades, gradeGap: 0, missingExams: [], missingSubjects: [], extracurricularGaps: [], strengths: [], subjectGaps: [] }, resourceSuggestions: [] }, user.uid);
      }
    } catch (err) {
      console.error('AI request failed', err);
      setAiRecommendation('Failed to generate recommendation.');
    } finally {
      setIsAiLoading(false);
    }
  };
