import { doc, setDoc, getDoc, collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { StudentProfile, RecommendationResult } from '@/lib/types';

export interface SavedProfile {
  id: string;
  user_id: string;
  updated_at: string;
}

export async function saveProfile(profile: StudentProfile, userId?: string): Promise<{ error: string | null }> {
  if (!userId) return { error: 'Not authenticated' };

  try {
    await setDoc(doc(db, 'studentProfiles', userId), {
      name: profile.name,
      board: profile.educationBoard,
      current_class: profile.currentGrade,
      subjects: profile.subjects,
      grades: { percentage: profile.grades, ibScore: profile.ibScore ?? null, cambridgeGrades: profile.cambridgeGrades ?? null },
      test_scores: profile.testScores,
      target_colleges: profile.targetColleges,
      preferred_countries: profile.preferredCountries,
      extracurriculars: [...profile.extracurriculars, ...(profile.intendedMajors || []).map(m => `major:${m}`)],
      extracurricular_details: profile.extracurricularDetails ?? '',
      budget_range: profile.budgetRange,
      updated_at: new Date().toISOString(),
    }, { merge: true });
    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to save profile' };
  }
}

export async function loadProfile(userId?: string): Promise<{ profile: StudentProfile | null; updatedAt: string | null; error: string | null }> {
  if (!userId) return { profile: null, updatedAt: null, error: 'Not authenticated' };

  try {
    const snap = await getDoc(doc(db, 'studentProfiles', userId));
    if (!snap.exists()) return { profile: null, updatedAt: null, error: 'No profile found' };

    const data = snap.data();
    const allExtras: string[] = data.extracurriculars ?? [];
    const intendedMajors = allExtras.filter((e: string) => e.startsWith('major:')).map((e: string) => e.replace('major:', ''));
    const extracurriculars = allExtras.filter((e: string) => !e.startsWith('major:'));

    const profile: StudentProfile = {
      name: data.name ?? '',
      educationBoard: data.board ?? 'CBSE',
      currentGrade: data.current_class ?? '11th',
      subjects: data.subjects ?? [],
      grades: data.grades?.percentage ?? 0,
      ibScore: data.grades?.ibScore ?? undefined,
      cambridgeGrades: data.grades?.cambridgeGrades ?? undefined,
      testScores: data.test_scores ?? {},
      intendedMajors,
      targetColleges: data.target_colleges ?? [],
      preferredCountries: data.preferred_countries ?? [],
      extracurriculars,
      extracurricularDetails: data.extracurricular_details ?? '',
      budgetRange: data.budget_range ?? '10l-20l',
    };

    return { profile, updatedAt: data.updated_at ?? null, error: null };
  } catch (err: unknown) {
    return { profile: null, updatedAt: null, error: err instanceof Error ? err.message : 'Failed to load profile' };
  }
}

export async function saveResults(
  profile: StudentProfile,
  results: RecommendationResult,
  userId?: string,
): Promise<{ error: string | null }> {
  if (!userId) return { error: 'Not authenticated' };

  try {
    await addDoc(collection(db, 'studentProfiles', userId, 'savedResults'), {
      profile_snapshot: JSON.parse(JSON.stringify(profile)),
      recommendations: JSON.parse(JSON.stringify(results.recommendations)),
      paths: JSON.parse(JSON.stringify(results.paths)),
      gap_analysis: JSON.parse(JSON.stringify(results.gapAnalysis)),
      created_at: new Date().toISOString(),
    });
    return { error: null };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to save results' };
  }
}

export async function loadLatestResults(userId?: string): Promise<{ results: RecommendationResult | null; createdAt: string | null; error: string | null }> {
  if (!userId) return { results: null, createdAt: null, error: 'Not authenticated' };

  try {
    const q = query(
      collection(db, 'studentProfiles', userId, 'savedResults'),
      orderBy('created_at', 'desc'),
      limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return { results: null, createdAt: null, error: 'No results found' };

    const data = snap.docs[0].data();
    return {
      results: {
        recommendations: data.recommendations ?? [],
        paths: data.paths ?? [],
        gapAnalysis: data.gap_analysis ?? { currentGrades: 0, targetGrades: 0, gradeGap: 0, missingExams: [], missingSubjects: [], extracurricularGaps: [], strengths: [] },
        resourceSuggestions: [],
      },
      createdAt: data.created_at ?? null,
      error: null,
    };
  } catch (err: unknown) {
    return { results: null, createdAt: null, error: err instanceof Error ? err.message : 'Failed to load results' };
  }
}
