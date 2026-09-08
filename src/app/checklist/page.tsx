'use client';

import { useMemo, useState } from 'react';
import type { StudentProfile } from '@/lib/types';

const PROFILE_KEY = 'college-pathfinder-profile';
const TASKS = [
  { id: 'profile', title: 'Complete your student profile', detail: 'Add your academic interests, goals, and activities.' },
  { id: 'shortlist', title: 'Create a balanced college shortlist', detail: 'Choose reach, match, and safety options.' },
  { id: 'research', title: 'Research entry requirements', detail: 'Review exams, subjects, fees, and deadlines for each college.' },
  { id: 'activities', title: 'Plan one meaningful activity', detail: 'Choose an activity connected to your intended field.' },
  { id: 'scores', title: 'Plan required entrance tests', detail: 'Add SAT, ACT, JEE, NEET, CUET, or other relevant preparation.' },
  { id: 'essay', title: 'Draft your personal statement', detail: 'Tell a clear story about your interests, growth, and goals.' },
  { id: 'recommendations', title: 'Request recommendation letters', detail: 'Ask teachers or mentors early and share your achievements.' },
  { id: 'deadlines', title: 'Add application deadlines to your calendar', detail: 'Track each college’s application and scholarship dates.' },
];

export default function ChecklistPage() {
  const [profile] = useState<StudentProfile | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem(PROFILE_KEY);
    return saved ? (JSON.parse(saved) as StudentProfile) : null;
  });
  const [completed, setCompleted] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('college-pathfinder-checklist');
    return saved ? (JSON.parse(saved) as string[]) : [];
  });

  const personalizedTasks = useMemo(() => {
    if (!profile) return TASKS;
    return TASKS.map(task => task.id === 'scores' && profile.intendedMajors.includes('Medicine/Health Sciences')
      ? { ...task, title: 'Plan NEET preparation', detail: 'Map Biology, Chemistry, and Physics preparation to your target timeline.' }
      : task);
  }, [profile]);

  function toggleTask(id: string) {
    setCompleted(current => {
      const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id];
      localStorage.setItem('college-pathfinder-checklist', JSON.stringify(next));
      return next;
    });
  }

  const progress = Math.round((completed.length / personalizedTasks.length) * 100);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold gradient-text">Application Checklist ✅</h1>
      <p className="mt-2 text-muted">{profile ? `A plan tailored for ${profile.name || 'your college journey'}.` : 'Complete your profile to personalize this plan.'}</p>
      <div className="mt-6 rounded-xl border border-card-border p-4">
        <div className="flex justify-between text-sm"><span>Progress</span><span>{completed.length}/{personalizedTasks.length} complete</span></div>
        <div className="mt-2 h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
      </div>
      <div className="mt-6 space-y-3">
        {personalizedTasks.map(task => (
          <label key={task.id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${completed.includes(task.id) ? 'border-green-200 bg-green-50' : 'border-card-border'}`}>
            <input type="checkbox" checked={completed.includes(task.id)} onChange={() => toggleTask(task.id)} className="mt-1 h-4 w-4" />
            <span><span className={`block font-medium ${completed.includes(task.id) ? 'line-through' : ''}`}>{task.title}</span><span className="mt-1 block text-sm text-muted">{task.detail}</span></span>
          </label>
        ))}
      </div>
    </main>
  );
}
