import { createClient } from '@/lib/supabase';
import type { StudentProfile, RecommendationResult } from '@/lib/types';

export interface SavedProfile {
  id: string;
  user_id: string;
  updated_at: string;
}

export async function saveProfileToSupabase(profile: StudentProfile): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('student_profiles')
    .upsert({
      user_id: user.id,
      name: profile.name,
      board: profile.educationBoard,
      current_class: profile.currentGrade,
      subjects: profile.subjects,
      grades: { percentage: profile.grades },
      test_scores: profile.testScores,
      target_colleges: profile.targetColleges,
      preferred_countries: profile.preferredCountries,
      extracurriculars: profile.extracurriculars,
      extracurricular_details: profile.extracurricularDetails,
      budget_range: profile.budgetRange,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  return { error: error?.message ?? null };
}

export async function loadProfileFromSupabase(): Promise<{ profile: StudentProfile | null; updatedAt: string | null; error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { profile: null, updatedAt: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !data) return { profile: null, updatedAt: null, error: error?.message ?? 'No profile found' };

  const profile: StudentProfile = {
    name: data.name ?? '',
    educationBoard: data.board ?? 'CBSE',
    currentGrade: data.current_class ?? '11th',
    subjects: data.subjects ?? [],
    grades: data.grades?.percentage ?? 0,
    testScores: data.test_scores ?? {},
    targetColleges: data.target_colleges ?? [],
    preferredCountries: data.preferred_countries ?? [],
    extracurriculars: data.extracurriculars ?? [],
    extracurricularDetails: data.extracurricular_details ?? '',
    budgetRange: data.budget_range ?? '10l-20l',
  };

  return { profile, updatedAt: data.updated_at, error: null };
}

export async function saveResultsToSupabase(
  profile: StudentProfile,
  results: RecommendationResult
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('saved_results')
    .insert({
      user_id: user.id,
      profile_snapshot: profile,
      recommendations: results.recommendations,
      paths: results.paths,
      gap_analysis: results.gapAnalysis,
    });

  return { error: error?.message ?? null };
}

export async function loadLatestResults(): Promise<{ results: RecommendationResult | null; createdAt: string | null; error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { results: null, createdAt: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('saved_results')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return { results: null, createdAt: null, error: error?.message ?? 'No results found' };

  return {
    results: {
      recommendations: data.recommendations ?? [],
      paths: data.paths ?? [],
      gapAnalysis: data.gap_analysis ?? { currentGrades: 0, targetGrades: 0, gradeGap: 0, missingExams: [], missingSubjects: [], extracurricularGaps: [], strengths: [] },
      resourceSuggestions: [],
    },
    createdAt: data.created_at,
    error: null,
  };
}
