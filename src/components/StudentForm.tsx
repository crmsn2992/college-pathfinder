'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { StudentProfile, EducationBoard, Grade, BudgetRange } from '@/lib/types';
import { BUDGET_LABELS, INTENDED_MAJORS } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { saveProfile as saveProfileToDb, loadProfile as loadProfileFromDb, saveResults } from '@/lib/db';
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
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // AI states
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);

  // Load from Firebase (if logged in) or localStorage
  useEffect(() => {
    async function loadProfile() {
      if (user) {
        const { profile: dbProfile, updatedAt } = await loadProfileFromDb(user.uid);
        if (dbProfile) {
          setProfile(dbProfile);
          setLastSaved(updatedAt);
          return;
        }
      }
      // Fallback to localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setProfile({ ...defaultProfile, ...parsed });
        } catch {
          // ignore parse errors
        }
      }
    }
    loadProfile();
  }, [user]);

  // Save to localStorage on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  const updateProfile = useCallback(<K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleArrayItem = useCallback((key: keyof StudentProfile, item: string) => {
    setProfile(prev => {
      const arr = prev[key] as string[];
      const newArr = arr.includes(item)
        ? arr.filter(i => i !== item)
        : [...arr, item];
      return { ...prev, [key]: newArr };
    });
  }, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));

    // Save to Firebase if logged in
    if (user) {
      setSaveStatus('saving');
      const { error } = await saveProfileToDb(profile, user.uid);
      if (!error) {
        setSaveStatus('saved');
        setLastSaved(new Date().toISOString());
      } else {
        setSaveStatus('error');
      }
    }

    router.push('/results');
  };

  const canProceed = () => {
    switch (step) {
      case 0: return profile.name.trim().length > 0;
      case 1: return profile.subjects.length > 0 && profile.grades > 0;
      case 2: return profile.intendedMajors.length > 0;
      case 3: return true; // tests are optional
      case 4: return profile.preferredCountries.length > 0;
      case 5: return true;
      default: return true;
    }
  };

  const getSubjectsForBoard = (): string[] => {
    const boardData = (subjectsData as Record<string, unknown>)[profile.educationBoard];
    if (!boardData || typeof boardData !== 'object') return [];
    const allSubjects = new Set<string>();

    const extractStrings = (obj: unknown): void => {
      if (Array.isArray(obj)) {
        obj.forEach(item => { if (typeof item === 'string') allSubjects.add(item); });
      } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(extractStrings);
      }
    };

    extractStrings(boardData);
    return Array.from(allSubjects).sort();
  };

  const filteredColleges = (collegesData as { id: string; name: string }[]).filter(c =>
    c.name.toLowerCase().includes(collegeSearch.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Auth Banner for non-logged-in users */}
      {!user && step === 0 && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">💾</span>
            <div>
              <p className="text-sm font-medium">Sign in to save your progress</p>
              <p className="text-xs text-muted">Your data will be saved securely and accessible from any device</p>
            </div>
          </div>
          <Link href="/login" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark transition-colors whitespace-nowrap">
            Sign In
          </Link>
        </div>
      )}

      {/* Save status for logged-in users */}
      {user && lastSaved && step === 0 && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-3 flex items-center gap-2">
          <span className="text-sm">✅</span>
          <p className="text-xs text-green-700">
            Last saved: {new Date(lastSaved).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {saveStatus === 'saving' && ' • Saving...'}
          </p>
        </div>
      )}

      {/* Hero Section */}
      {step === 0 && (
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold gradient-text mb-3">
            Find Your Perfect College 🎓
          </h1>
          <p className="text-muted text-lg">
            Tell us about yourself and we&apos;ll create a personalized plan for your dream college
          </p>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => i < step && setStep(i)}
              className={`flex flex-col items-center gap-1 text-xs transition-colors ${
                i <= step ? 'text-primary' : 'text-muted'
              } ${i < step ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                i < step
                  ? 'bg-primary text-white'
                  : i === step
                  ? 'bg-primary/20 text-primary border-2 border-primary'
                  : 'bg-gray-100 text-muted'
              }`}>
                {i < step ? '✓' : s.icon}
              </span>
              <span className="hidden sm:block">{s.title}</span>
            </button>
          ))}
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 animate-progress"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Form Steps */}
      <div className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-sm">
        {step === 0 && (
          <StepBasicInfo profile={profile} updateProfile={updateProfile} />
        )}
        {step === 1 && (
          <StepAcademic
            profile={profile}
            updateProfile={updateProfile}
            toggleArrayItem={toggleArrayItem}
            subjects={getSubjectsForBoard()}
            setProfile={setProfile}
          />
        )}
        {step === 2 && (
          <StepMajor profile={profile} toggleArrayItem={toggleArrayItem} />
        )}
        {step === 3 && (
          <StepTests profile={profile} setProfile={setProfile} />
        )}
        {step === 4 && (
          <StepGoals
            profile={profile}
            toggleArrayItem={toggleArrayItem}
            collegeSearch={collegeSearch}
            setCollegeSearch={setCollegeSearch}
            filteredColleges={filteredColleges}
            updateProfile={updateProfile}
          />
        )}
        {step === 5 && (
          <StepActivities
            profile={profile}
            toggleArrayItem={toggleArrayItem}
            updateProfile={updateProfile}
          />
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:text-foreground disabled:invisible"
          >
            ← Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="rounded-lg bg-gradient-to-r from-primary to-secondary px-8 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span> Analyzing...
                </span>
              ) : (
                '🚀 Get My Results'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Step Components
function StepBasicInfo({
  profile,
  updateProfile,
}: {
  profile: StudentProfile;
  updateProfile: <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Let&apos;s get to know you 👋</h2>

      <div>
        <label className="block text-sm font-medium mb-1.5">Your Name</label>
        <input
          type="text"
          value={profile.name}
          onChange={e => updateProfile('name', e.target.value)}
          placeholder="Enter your full name"
          className="w-full rounded-lg border border-card-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Education Board</label>
        <p className="text-xs text-muted mb-2">This helps us show relevant subjects and exam requirements</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BOARDS.map(board => (
            <button
              key={board}
              onClick={() => {
                updateProfile('educationBoard', board);
                updateProfile('subjects', []);
              }}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                profile.educationBoard === board
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-card-border hover:border-primary/50'
              }`}
            >
              {board}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Current Grade/Class</label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {GRADES.map(grade => (
            <button
              key={grade}
              onClick={() => updateProfile('currentGrade', grade)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                profile.currentGrade === grade
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-card-border hover:border-primary/50'
              }`}
            >
              {grade}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// (rest of Step components unchanged)
