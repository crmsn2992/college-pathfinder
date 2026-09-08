'use client';

import { useMemo, useState } from 'react';

interface SubjectDiscoveryQuizProps {
  subjects: string[];
  onComplete: (subjects: string[]) => void;
}

const QUESTIONS = [
  {
    question: 'Which activities sound most exciting?',
    options: [
      { label: 'Experiments, nature, and health', tags: ['science', 'biology'] },
      { label: 'Building, coding, and solving puzzles', tags: ['math', 'physics', 'computer'] },
      { label: 'Businesses, money, and planning', tags: ['math', 'economics', 'business'] },
      { label: 'Writing, people, and society', tags: ['humanities', 'social'] },
      { label: 'Designing, drawing, or performing', tags: ['creative', 'humanities'] },
    ],
  },
  {
    question: 'What kind of problems would you like to solve?',
    options: [
      { label: 'How the body and living world work', tags: ['biology', 'chemistry'] },
      { label: 'How machines and technology work', tags: ['math', 'physics', 'computer'] },
      { label: 'How organizations and markets work', tags: ['economics', 'business', 'math'] },
      { label: 'How communities and governments work', tags: ['humanities', 'social'] },
      { label: 'How to communicate ideas visually', tags: ['creative', 'humanities'] },
    ],
  },
  {
    question: 'Which schoolwork feels most natural?',
    options: [
      { label: 'Lab reports and observing patterns', tags: ['science', 'biology'] },
      { label: 'Calculations and logical challenges', tags: ['math', 'physics'] },
      { label: 'Presentations, case studies, and debates', tags: ['business', 'social', 'humanities'] },
      { label: 'Stories, art, and creative projects', tags: ['creative', 'humanities'] },
    ],
  },
];

const SUBJECT_TAGS: Record<string, string[]> = {
  Mathematics: ['math'],
  'Applied Mathematics': ['math'],
  'Business Mathematics': ['math'],
  Physics: ['physics', 'science'],
  Chemistry: ['chemistry', 'science'],
  Biology: ['biology', 'science'],
  'Computer Science': ['computer', 'math'],
  Economics: ['economics', 'business', 'math'],
  'Business Studies': ['business'],
  Business: ['business'],
  Accountancy: ['business', 'math'],
  Accounts: ['business', 'math'],
  English: ['humanities', 'social'],
  'English Core': ['humanities', 'social'],
  History: ['humanities', 'social'],
  'Political Science': ['humanities', 'social'],
  Psychology: ['social', 'science'],
  Sociology: ['social'],
  Geography: ['social', 'science'],
  'Fine Arts': ['creative'],
  Art: ['creative'],
  'Art and Design': ['creative'],
};

export default function SubjectDiscoveryQuiz({
  subjects,
  onComplete,
}: SubjectDiscoveryQuizProps) {
  const [answers, setAnswers] = useState<string[]>([]);
  const [question, setQuestion] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const recommendedSubjects = useMemo(() => {
    const scores = new Map<string, number>();
    answers.forEach(tag => {
      subjects.forEach(subject => {
        if ((SUBJECT_TAGS[subject] || []).includes(tag)) {
          scores.set(subject, (scores.get(subject) || 0) + 1);
        }
      });
    });
    return [...subjects]
      .sort((left, right) => (scores.get(right) || 0) - (scores.get(left) || 0))
      .slice(0, 5);
  }, [answers, subjects]);

  function choose(tags: string[]) {
    const nextAnswers = [...answers, ...tags];
    setAnswers(nextAnswers);
    if (question === QUESTIONS.length - 1) setShowResults(true);
    else setQuestion(current => current + 1);
  }

  if (showResults) {
    return (
      <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-4">
        <h3 className="font-semibold">Suggested subjects for you</h3>
        <p className="mt-1 text-xs text-muted">
          This is a starting point, not a fixed decision. Talk with a teacher or counselor too.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {recommendedSubjects.map(subject => (
            <span key={subject} className="rounded-full bg-white px-3 py-1.5 text-sm">
              {subject}
            </span>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => onComplete(recommendedSubjects)} className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-white">
            Use these subjects
          </button>
          <button type="button" onClick={() => { setAnswers([]); setQuestion(0); setShowResults(false); }} className="rounded-lg border border-card-border px-3 py-2 text-sm">
            Retake
          </button>
        </div>
      </div>
    );
  }

  const current = QUESTIONS[question];
  return (
    <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">🧭 Help me choose subjects</h3>
          <p className="mt-1 text-xs text-muted">A quick guide for students who are still exploring.</p>
        </div>
        <span className="text-xs text-muted">{question + 1}/{QUESTIONS.length}</span>
      </div>
      <p className="mt-4 font-medium">{current.question}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {current.options.map(option => (
          <button key={option.label} type="button" onClick={() => choose(option.tags)} className="rounded-lg border border-card-border bg-white p-3 text-left text-sm hover:border-secondary">
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
