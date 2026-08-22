  // Call the demo AI server endpoint
  const simpleHash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return h.toString(36);
  };

  const requestAiRecommendation = async () => {
    const profileStr = JSON.stringify(profile);
    const cacheKey = `ai:rec:${simpleHash(profileStr)}`;

    // If we have a cached recommendation for the exact same profile, show it immediately
    try {
      const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
      if (cached) {
        setAiRecommendation(cached);
        // Refresh in background so users see immediate response while we fetch latest
        (async () => {
          try {
            const res = await fetch('/api/ai/recommend', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ profile }),
            });
            const data = await res.json();
            const text = data?.recommendation ?? cached;
            if (text !== cached) {
              setAiRecommendation(text);
              try { localStorage.setItem(cacheKey, text); } catch {}
              if (user) {
                // fire-and-forget save to avoid blocking UI
                saveResults(profile, { recommendations: [text], paths: [], gapAnalysis: { currentGrades: profile.grades, targetGrades: profile.grades, gradeGap: 0, missingExams: [], missingSubjects: [], extracurricularGaps: [], strengths: [], subjectGaps: [] }, resourceSuggestions: [] }, user.uid).catch(() => {});
              }
            }
          } catch (e) {
            console.error('AI background refresh failed', e);
          }
        })();
        return;
      }
    } catch (e) {
      // ignore localStorage errors
    }

    setIsAiLoading(true);
    setAiRecommendation('Generating recommendation...');

    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      const data = await res.json();
      const text = data?.recommendation ?? 'No recommendation available.';
      setAiRecommendation(text);

      try { localStorage.setItem(cacheKey, text); } catch {}

      // save to Firestore if logged in (do not await to keep UI snappy)
      if (user) {
        saveResults(profile, { recommendations: [text], paths: [], gapAnalysis: { currentGrades: profile.grades, targetGrades: profile.grades, gradeGap: 0, missingExams: [], missingSubjects: [], extracurricularGaps: [], strengths: [], subjectGaps: [] }, resourceSuggestions: [] }, user.uid).catch(err => console.error('saveResults failed', err));
      }
    } catch (err) {
      console.error('AI request failed', err);
      setAiRecommendation('Failed to generate recommendation.');
    } finally {
      setIsAiLoading(false);
    }
  };
