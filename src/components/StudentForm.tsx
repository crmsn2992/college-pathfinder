'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { StudentProfile, EducationBoard, Grade, BudgetRange } from '@/lib/types';
import { BUDGET_LABELS, INTENDED_MAJORS } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { saveProfile as saveProfileToDb, loadProfile as loadProfileFromDb } from '@/lib/db';
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

function StepAcademic({
  profile,
  updateProfile,
  toggleArrayItem,
  subjects,
  setProfile,
}: {
  profile: StudentProfile;
  updateProfile: <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => void;
  toggleArrayItem: (key: keyof StudentProfile, item: string) => void;
  subjects: string[];
  setProfile: React.Dispatch<React.SetStateAction<StudentProfile>>;
}) {
  const isIB = profile.educationBoard === 'IB';
  const isCambridge = profile.educationBoard === 'Cambridge';

  // Convert IB score (out of 45) to percentage for internal use
  const handleIBScoreChange = (score: number) => {
    setProfile(prev => ({
      ...prev,
      ibScore: score,
      grades: Math.round((score / 45) * 100),
    }));
  };

  // Convert Cambridge grade to percentage
  const cambridgeGradeToPercent = (grades: Record<string, string>): number => {
    const gradeValues: Record<string, number> = { 'A*': 95, 'A': 88, 'B': 78, 'C': 68, 'D': 58, 'E': 48 };
    const values = Object.values(grades).map(g => gradeValues[g] || 60);
    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  };

  const handleCambridgeGradeChange = (subject: string, grade: string) => {
    setProfile(prev => {
      const updated = { ...prev.cambridgeGrades, [subject]: grade };
      return { ...prev, cambridgeGrades: updated, grades: cambridgeGradeToPercent(updated) };
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Your Academics 📚</h2>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          Subjects (select all you&apos;re studying)
        </label>
        <div className="max-h-48 overflow-y-auto rounded-lg border border-card-border p-3">
          <div className="grid grid-cols-2 gap-2">
            {subjects.map(subject => (
              <label key={subject} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.subjects.includes(subject)}
                  onChange={() => toggleArrayItem('subjects', subject)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                {subject}
              </label>
            ))}
          </div>
        </div>
        {profile.subjects.length > 0 && (
          <p className="mt-1 text-xs text-muted">{profile.subjects.length} subjects selected</p>
        )}
      </div>

      {/* Board-specific grade input */}
      {isIB ? (
        <div>
          <label className="block text-sm font-medium mb-1.5">IB Predicted/Actual Score</label>
          <p className="text-xs text-muted mb-3">Enter your total IB score out of 45 (including TOK and EE bonus points)</p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="45"
              value={profile.ibScore || 0}
              onChange={e => handleIBScoreChange(Number(e.target.value))}
              className="flex-1 h-2 rounded-lg appearance-none bg-gray-200 accent-primary"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="45"
                value={profile.ibScore || ''}
                onChange={e => handleIBScoreChange(Math.min(45, Math.max(0, Number(e.target.value))))}
                className="w-16 rounded-lg border border-card-border px-2 py-1.5 text-center text-sm focus:border-primary focus:outline-none"
              />
              <span className="text-sm text-muted">/ 45</span>
            </div>
          </div>
          {profile.ibScore ? (
            <p className="mt-2 text-xs text-muted">
              Equivalent to approximately {Math.round((profile.ibScore / 45) * 100)}%
              {profile.ibScore >= 40 && ' — Excellent! 🌟'}
              {profile.ibScore >= 35 && profile.ibScore < 40 && ' — Very good!'}
            </p>
          ) : null}
        </div>
      ) : isCambridge ? (
        <div>
          <label className="block text-sm font-medium mb-1.5">A-Level / IGCSE Grades</label>
          <p className="text-xs text-muted mb-3">
            Enter your predicted/actual grades for each subject you selected above
          </p>
          {profile.subjects.length === 0 ? (
            <p className="text-xs text-warning">Select your subjects above first</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto rounded-lg border border-card-border p-3">
              {profile.subjects.map(subject => (
                <div key={subject} className="flex items-center justify-between gap-3">
                  <span className="text-sm truncate flex-1">{subject}</span>
                  <select
                    value={profile.cambridgeGrades?.[subject] || ''}
                    onChange={e => handleCambridgeGradeChange(subject, e.target.value)}
                    className="rounded-lg border border-card-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none w-20"
                  >
                    <option value="">Grade</option>
                    <option value="A*">A*</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                  </select>
                </div>
              ))}
            </div>
          )}
          {profile.grades > 0 && (
            <p className="mt-2 text-xs text-muted">
              Equivalent overall: ~{profile.grades}%
            </p>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Current Grades/Marks (Overall Percentage)
          </label>
          <p className="text-xs text-muted mb-2">Enter your approximate overall percentage. Convert GPA if needed (e.g., 9.0 CGPA ≈ 85%)</p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={profile.grades}
              onChange={e => updateProfile('grades', Number(e.target.value))}
              className="flex-1 h-2 rounded-lg appearance-none bg-gray-200 accent-primary"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                value={profile.grades || ''}
                onChange={e => updateProfile('grades', Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-16 rounded-lg border border-card-border px-2 py-1.5 text-center text-sm focus:border-primary focus:outline-none"
              />
              <span className="text-sm text-muted">%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepMajor({
  profile,
  toggleArrayItem,
}: {
  profile: StudentProfile;
  toggleArrayItem: (key: keyof StudentProfile, item: string) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">What do you want to study? 🎓</h2>
      <p className="text-sm text-muted">
        Select the fields you&apos;re interested in. You can pick multiple if you&apos;re considering different paths.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {INTENDED_MAJORS.map(major => (
          <button
            key={major}
            onClick={() => toggleArrayItem('intendedMajors', major)}
            className={`rounded-lg border px-3 py-2.5 text-sm text-left font-medium transition-colors ${
              profile.intendedMajors.includes(major)
                ? major === 'Unsure / Exploring'
                  ? 'border-secondary bg-secondary/10 text-secondary'
                  : 'border-primary bg-primary/10 text-primary'
                : 'border-card-border hover:border-primary/50'
            }`}
          >
            {major}
          </button>
        ))}
      </div>

      {profile.intendedMajors.includes('Unsure / Exploring') && (
        <div className="rounded-lg bg-secondary/5 border border-secondary/20 p-4">
          <p className="text-sm font-medium text-secondary mb-1">
            🧭 Not sure what to study?
          </p>
          <p className="text-xs text-muted mb-3">
            Take our quick Career Explorer quiz to discover fields that match your interests and personality.
          </p>
          <Link href="/explore" className="inline-block rounded-lg bg-secondary px-4 py-2 text-xs font-medium text-white hover:bg-secondary/90 transition-colors">
            Try Career Explorer →
          </Link>
        </div>
      )}

      {profile.intendedMajors.length > 0 && !profile.intendedMajors.includes('Unsure / Exploring') && (
        <p className="text-xs text-muted">{profile.intendedMajors.length} field(s) selected</p>
      )}
    </div>
  );
}

function StepTests({
  profile,
  setProfile,
}: {
  profile: StudentProfile;
  setProfile: React.Dispatch<React.SetStateAction<StudentProfile>>;
}) {
  const updateScore = (key: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      testScores: {
        ...prev.testScores,
        [key]: value ? Number(value) : undefined,
      },
    }));
  };

  const tests = [
    { key: 'sat', label: 'SAT', max: 1600, placeholder: 'Score (400-1600)', hint: 'Required for most US universities' },
    { key: 'act', label: 'ACT', max: 36, placeholder: 'Score (1-36)', hint: 'Alternative to SAT for US colleges' },
    { key: 'jee', label: 'JEE Main/Advanced', max: 100, placeholder: 'Percentile (0-100)', hint: 'Required for IITs, NITs' },
    { key: 'neet', label: 'NEET', max: 720, placeholder: 'Score (0-720)', hint: 'Required for medical colleges' },
    { key: 'cuet', label: 'CUET', max: 100, placeholder: 'Percentile (0-100)', hint: 'Required for Delhi University, central universities' },
    { key: 'ap', label: 'AP Exams', max: 10, placeholder: 'Number with score 4+', hint: 'Helps with US/international applications' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Standardized Tests 📝</h2>
      <p className="text-sm text-muted">
        Fill in only the tests you&apos;ve taken or plan to take. All fields are optional.
      </p>

      <div className="space-y-4">
        {tests.map(test => (
          <div key={test.key} className="rounded-lg border border-card-border p-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">{test.label}</label>
              <span className="text-xs text-muted">{test.hint}</span>
            </div>
            <input
              type="number"
              min="0"
              max={test.max}
              value={profile.testScores[test.key as keyof typeof profile.testScores] || ''}
              onChange={e => updateScore(test.key, e.target.value)}
              placeholder={test.placeholder}
              className="w-full rounded-lg border border-card-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function StepGoals({
  profile,
  toggleArrayItem,
  collegeSearch,
  setCollegeSearch,
  filteredColleges,
  updateProfile,
}: {
  profile: StudentProfile;
  toggleArrayItem: (key: keyof StudentProfile, item: string) => void;
  collegeSearch: string;
  setCollegeSearch: (s: string) => void;
  filteredColleges: { id: string; name: string }[];
  updateProfile: <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Your Goals 🎯</h2>

      <div>
        <label className="block text-sm font-medium mb-1.5">Preferred Countries</label>
        <p className="text-xs text-muted mb-2">Select countries where you&apos;d like to study</p>
        <div className="flex flex-wrap gap-2">
          {COUNTRIES.map(country => (
            <button
              key={country}
              onClick={() => toggleArrayItem('preferredCountries', country)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                profile.preferredCountries.includes(country)
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-muted hover:bg-gray-200'
              }`}
            >
              {country}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Target Colleges (optional)</label>
        <p className="text-xs text-muted mb-2">Search and select specific colleges you&apos;re interested in</p>
        <input
          type="text"
          value={collegeSearch}
          onChange={e => setCollegeSearch(e.target.value)}
          placeholder="🔍 Search colleges..."
          className="w-full rounded-lg border border-card-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 mb-2"
        />
        {collegeSearch && (
          <div className="max-h-36 overflow-y-auto rounded-lg border border-card-border">
            {filteredColleges.slice(0, 10).map(college => (
              <button
                key={college.id}
                onClick={() => {
                  toggleArrayItem('targetColleges', college.id);
                  setCollegeSearch('');
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  profile.targetColleges.includes(college.id) ? 'bg-primary/5 text-primary' : ''
                }`}
              >
                {profile.targetColleges.includes(college.id) ? '✓ ' : ''}{college.name}
              </button>
            ))}
          </div>
        )}
        {profile.targetColleges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.targetColleges.map(id => {
              const college = (collegesData as { id: string; name: string }[]).find(c => c.id === id);
              return (
                <span key={id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {college?.name || id}
                  <button onClick={() => toggleArrayItem('targetColleges', id)} className="hover:text-danger">×</button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Annual Budget Range</label>
        <p className="text-xs text-muted mb-2">This helps us filter colleges within your budget</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.entries(BUDGET_LABELS) as [BudgetRange, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => updateProfile('budgetRange', key)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                profile.budgetRange === key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-card-border hover:border-primary/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepActivities({
  profile,
  toggleArrayItem,
  updateProfile,
}: {
  profile: StudentProfile;
  toggleArrayItem: (key: keyof StudentProfile, item: string) => void;
  updateProfile: <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Extracurriculars & Activities 🏆</h2>
      <p className="text-sm text-muted">
        Colleges value well-rounded students. Select your activities and achievements.
      </p>

      <div>
        <label className="block text-sm font-medium mb-2">Select your activities</label>
        <div className="flex flex-wrap gap-2">
          {EXTRACURRICULARS.map(activity => (
            <button
              key={activity}
              onClick={() => toggleArrayItem('extracurriculars', activity)}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                profile.extracurriculars.includes(activity)
                  ? 'bg-secondary text-white'
                  : 'bg-gray-100 text-muted hover:bg-gray-200'
              }`}
            >
              {activity}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          Tell us more (optional)
        </label>
        <p className="text-xs text-muted mb-2">
          Describe any achievements, leadership roles, or special projects
        </p>
        <textarea
          value={profile.extracurricularDetails}
          onChange={e => updateProfile('extracurricularDetails', e.target.value)}
          placeholder="e.g., Captain of school cricket team, won state-level debate competition, built a mobile app with 1000+ downloads..."
          rows={4}
          className="w-full rounded-lg border border-card-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
      </div>
    </div>
  );
}
