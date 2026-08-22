'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { StudentProfile, EducationBoard, Grade, BudgetRange } from '@/lib/types';
import { BUDGET_LABELS, INTENDED_MAJORS } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import subjectsData from '@/data/subjects.json';
import collegesData from '@/data/colleges.json';

const STORAGE_KEY = 'college-pathfinder-profile';

const BOARDS: EducationBoard[] = ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge'];
const GRADES: Grade[] = ['9th', '10th', '11th', '12th', 'Gap Year'];
const COUNTRIES = ['India', 'USA', 'UK', 'Canada', 'Australia', 'Singapore', 'Germany', 'Netherlands'];
const EXTRACURRICULARS = [
  'Sports', 'Music', 'Dance', 'Debate', 'MUN', 'Volunteer Work',
  'Coding/Programming', 'Research', 'Writing/Blogging', 'Art/Design',
  'Robotics', 'Olympiads', 'Theater/Drama', 'Photography',
  'Entrepreneurship', 'Student Government', 'Science Fair', 'NCC/NSS',
];

const STEPS = [
  { id: 'basic', title: 'Basic Info', icon: '👤' },
  { id: 'academic', title: 'Academics', icon: '📖' },
  { id: 'major', title: 'Field of Study', icon: '🎓' },
  { id: 'tests', title: 'Test Scores', icon: '📝' },
  { id: 'goals', title: 'Goals', icon: '🎯' },
  { id: 'activities', title: 'Activities', icon: '🏆' },
];

const defaultProfile: StudentProfile = {
  name: '',
  educationBoard: 'CBSE',
  currentGrade: '11th',
  subjects: [],
  grades: 0,
  testScores: {},
  intendedMajors: [],
  targetColleges: [],
  preferredCountries: [],
  extracurriculars: [],
  extracurricularDetails: '',
  budgetRange: '10l-20l',
};

export default function StudentForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<StudentProfile>(defaultProfile);
  const [collegeSearch, setCollegeSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (user) {
        try {
          const res = await fetch('/api/profile/load', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.uid }) });
          const data = await res.json();
          if (data?.profile) {
            setProfile(data.profile);
            return;
          }
        } catch (e) {
          // ignore
        }
      }
      try {
        const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        if (saved) setProfile({ ...defaultProfile, ...(JSON.parse(saved) as Partial<StudentProfile>) });
      } catch {}
    }
    loadProfile();
  }, [user]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch {}
  }, [profile]);

  const updateProfile = useCallback(<K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleArrayItem = useCallback((key: keyof StudentProfile, item: string) => {
    setProfile(prev => {
      const arr = (prev[key] as unknown as string[]) || [];
      const newArr = arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
      return { ...prev, [key]: newArr };
    });
  }, []);

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

    try {
      const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
      if (cached) {
        setAiRecommendation(cached);
        (async () => {
          try {
            const res = await fetch('/api/ai/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile }) });
            const data = await res.json();
            const text = data?.recommendation ?? cached;
            if (text !== cached) {
              setAiRecommendation(text);
              try { localStorage.setItem(cacheKey, text); } catch {}
              if (user) {
                fetch('/api/results/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile, results: { recommendations: [text], paths: [], gapAnalysis: { currentGrades: profile.grades, targetGrades: profile.grades, gradeGap: 0, missingExams: [], missingSubjects: [], extracurricularGaps: [], strengths: [], subjectGaps: [] }, resourceSuggestions: [] }, userId: user.uid }) }).catch(() => {});
              }
            }
          } catch (e) {
            console.error('AI background refresh failed', e);
          }
        })();
        return;
      }
    } catch {}

    setIsAiLoading(true);
    setAiRecommendation('Generating recommendation...');

    try {
      const res = await fetch('/api/ai/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile }) });
      const data = await res.json();
      const text = data?.recommendation ?? 'No recommendation available.';
      setAiRecommendation(text);
      try { localStorage.setItem(cacheKey, text); } catch {}
      if (user) {
        fetch('/api/results/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile, results: { recommendations: [text], paths: [], gapAnalysis: { currentGrades: profile.grades, targetGrades: profile.grades, gradeGap: 0, missingExams: [], missingSubjects: [], extracurricularGaps: [], strengths: [], subjectGaps: [] }, resourceSuggestions: [] }, userId: user.uid }) }).catch(err => console.error('saveResults failed', err));
      }
    } catch (err) {
      console.error('AI request failed', err);
      setAiRecommendation('Failed to generate recommendation.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch {}

    if (user) {
      try {
        await fetch('/api/profile/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile, userId: user.uid }) });
      } catch (e) {
        // ignore
      }
    }

    setIsSubmitting(false);
    router.push('/results');
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h2 className="text-xl font-semibold mb-4">Student Profile</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full name</label>
          <input type="text" value={profile.name} onChange={e => updateProfile('name', e.target.value)} className="w-full rounded border px-3 py-2" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Education Board</label>
          <select value={profile.educationBoard} onChange={e => updateProfile('educationBoard', e.target.value as EducationBoard)} className="w-full rounded border px-3 py-2">
            {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Current Grade</label>
          <select value={profile.currentGrade} onChange={e => updateProfile('currentGrade', e.target.value as Grade)} className="w-full rounded border px-3 py-2">
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Intended Majors</label>
          <div className="flex flex-wrap gap-2">
            {INTENDED_MAJORS.map(m => (
              <button key={m} type="button" onClick={() => toggleArrayItem('intendedMajors', m)} className={`px-3 py-1 rounded ${profile.intendedMajors.includes(m) ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Extracurriculars</label>
          <div className="flex flex-wrap gap-2">
            {EXTRACURRICULARS.map(a => (
              <button key={a} type="button" onClick={() => toggleArrayItem('extracurriculars', a)} className={`px-3 py-1 rounded ${profile.extracurriculars.includes(a) ? 'bg-primary text-white' : 'bg-gray-100'}`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tell us more</label>
          <textarea value={profile.extracurricularDetails} onChange={e => updateProfile('extracurricularDetails', e.target.value)} className="w-full rounded border px-3 py-2" rows={4} />
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={requestAiRecommendation} disabled={isAiLoading} className="px-4 py-2 bg-indigo-600 text-white rounded">
            {isAiLoading ? '🤖 Thinking...' : '✨ Get AI Recommendations'}
          </button>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="px-4 py-2 bg-green-600 text-white rounded">
            {isSubmitting ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>

        {aiRecommendation && (
          <div className="mt-4 p-4 bg-slate-50 rounded">
            <pre className="whitespace-pre-wrap">{aiRecommendation}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
