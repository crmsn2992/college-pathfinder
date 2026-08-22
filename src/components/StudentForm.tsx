  // Call the demo AI server endpoint with local cache + background refresh
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
                // fire-and-forget save to server
                fetch('/api/results/save', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    profile,
                    results: {
                      recommendations: [text],
                      paths: [],
                      gapAnalysis: {
                        currentGrades: profile.grades,
                        targetGrades: profile.grades,
                        gradeGap: 0,
                        missingExams: [],
                        missingSubjects: [],
                        extracurricularGaps: [],
                        strengths: [],
                        subjectGaps: [],
                      },
                      resourceSuggestions: [],
                    },
                    userId: user.uid,
                  }),
                }).catch(() => {});
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

      // save to server if logged in (do not await to keep UI snappy)
      if (user) {
        fetch('/api/results/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile,
            results: {
              recommendations: [text],
              paths: [],
              gapAnalysis: {
                currentGrades: profile.grades,
                targetGrades: profile.grades,
                gradeGap: 0,
                missingExams: [],
                missingSubjects: [],
                extracurricularGaps: [],
                strengths: [],
                subjectGaps: [],
              },
              resourceSuggestions: [],
            },
            userId: user?.uid,
          }),
        }).catch(err => console.error('saveResults failed', err));
      }
    } catch (err) {
      console.error('AI request failed', err);
      setAiRecommendation('Failed to generate recommendation.');
    } finally {
      setIsAiLoading(false);
    }
  };
