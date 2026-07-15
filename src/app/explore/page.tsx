'use client';

import { useState } from 'react';
import Link from 'next/link';
import collegesData from '@/data/colleges.json';
import type { College } from '@/lib/types';

interface QuizQuestion {
  id: string;
  question: string;
  type: 'multi' | 'single';
  options: { label: string; value: string; emoji: string }[];
}

interface FieldResult {
  field: string;
  score: number;
  icon: string;
  description: string;
  whyMatch: string;
  careers: string[];
  subjectsToFocus: string[];
  topColleges: { name: string; country: string }[];
}

const QUESTIONS: QuizQuestion[] = [
  {
    id: 'subjects',
    question: 'What subjects do you enjoy most in school?',
    type: 'multi',
    options: [
      { label: 'Mathematics', value: 'math', emoji: '🔢' },
      { label: 'Physics', value: 'physics', emoji: '⚡' },
      { label: 'Chemistry', value: 'chemistry', emoji: '🧪' },
      { label: 'Biology', value: 'biology', emoji: '🧬' },
      { label: 'Computer Science', value: 'cs', emoji: '💻' },
      { label: 'English/Literature', value: 'english', emoji: '📖' },
      { label: 'History', value: 'history', emoji: '🏛️' },
      { label: 'Economics', value: 'economics', emoji: '📈' },
      { label: 'Art/Design', value: 'art', emoji: '🎨' },
      { label: 'Psychology', value: 'psychology', emoji: '🧠' },
    ],
  },
  {
    id: 'environment',
    question: 'What kind of work environment appeals to you?',
    type: 'multi',
    options: [
      { label: 'Lab / Research facility', value: 'lab', emoji: '🔬' },
      { label: 'Office / Corporate', value: 'office', emoji: '🏢' },
      { label: 'Outdoors / Field work', value: 'outdoors', emoji: '🌳' },
      { label: 'Studio / Creative space', value: 'studio', emoji: '🎨' },
      { label: 'Hospital / Clinic', value: 'hospital', emoji: '🏥' },
      { label: 'Courtroom / Legal', value: 'courtroom', emoji: '⚖️' },
      { label: 'Classroom / Educational', value: 'classroom', emoji: '📚' },
      { label: 'Remote / Anywhere', value: 'remote', emoji: '🌍' },
    ],
  },
  {
    id: 'activities',
    question: 'What activities do you enjoy in your free time?',
    type: 'multi',
    options: [
      { label: 'Reading & writing', value: 'reading', emoji: '📚' },
      { label: 'Building / tinkering with things', value: 'building', emoji: '🔧' },
      { label: 'Art, music, or creative projects', value: 'creative', emoji: '🎵' },
      { label: 'Playing sports', value: 'sports', emoji: '⚽' },
      { label: 'Debating & discussions', value: 'debating', emoji: '🗣️' },
      { label: 'Helping people / volunteering', value: 'helping', emoji: '🤝' },
      { label: 'Coding / video games', value: 'coding', emoji: '🎮' },
      { label: 'Experimenting / exploring nature', value: 'experimenting', emoji: '🔭' },
    ],
  },
  {
    id: 'problems',
    question: 'Which of these problems would you most like to solve?',
    type: 'multi',
    options: [
      { label: 'Climate change & environment', value: 'climate', emoji: '🌍' },
      { label: 'Diseases & health crises', value: 'health', emoji: '💊' },
      { label: 'Injustice & inequality', value: 'justice', emoji: '⚖️' },
      { label: 'Poverty & economic issues', value: 'poverty', emoji: '💰' },
      { label: 'Technology access & innovation', value: 'tech', emoji: '🚀' },
      { label: 'Mental health & wellbeing', value: 'mental_health', emoji: '🧠' },
      { label: 'Education & literacy', value: 'education', emoji: '📖' },
      { label: 'Entertainment & media', value: 'entertainment', emoji: '🎬' },
    ],
  },
  {
    id: 'style',
    question: 'What\'s your working style?',
    type: 'single',
    options: [
      { label: 'Independent — I work best alone', value: 'independent', emoji: '🧘' },
      { label: 'Team-based — I thrive collaborating', value: 'team', emoji: '👥' },
      { label: 'Mix of both', value: 'mix', emoji: '🤝' },
    ],
  },
  {
    id: 'preference',
    question: 'Which approach do you prefer?',
    type: 'single',
    options: [
      { label: 'Structured rules & procedures', value: 'structured', emoji: '📋' },
      { label: 'Creative freedom & expression', value: 'creative', emoji: '🎨' },
      { label: 'Analytical problem-solving', value: 'analytical', emoji: '🧩' },
      { label: 'Hands-on practical work', value: 'practical', emoji: '🔨' },
    ],
  },
];

// Scoring matrix: which answers map to which fields
const FIELD_SIGNALS: Record<string, Record<string, number>> = {
  'Engineering/Technology': { math: 3, physics: 3, cs: 2, building: 3, coding: 2, tech: 3, analytical: 2, practical: 2, lab: 1, remote: 1 },
  'Computer Science/IT': { math: 2, cs: 3, coding: 3, tech: 3, building: 2, analytical: 2, remote: 2, independent: 1 },
  'Medicine/Health Sciences': { biology: 3, chemistry: 2, health: 3, mental_health: 2, hospital: 3, helping: 2, experimenting: 1, structured: 1 },
  'Business/Commerce': { economics: 3, office: 2, poverty: 2, team: 2, structured: 1, debating: 1, sports: 1 },
  'Law': { english: 2, history: 2, debating: 3, justice: 3, courtroom: 3, reading: 2, structured: 2, independent: 1 },
  'Arts/Humanities': { english: 3, history: 3, reading: 3, creative: 2, studio: 2, education: 1, classroom: 1 },
  'Social Sciences': { psychology: 3, history: 2, economics: 2, justice: 2, mental_health: 2, helping: 2, classroom: 1, team: 1 },
  'Natural Sciences': { biology: 2, chemistry: 3, physics: 2, experimenting: 3, lab: 3, climate: 2, independent: 1, analytical: 2 },
  'Design': { art: 3, creative: 3, studio: 3, building: 2, entertainment: 2, practical: 1 },
  'Architecture': { art: 2, math: 1, building: 2, studio: 2, practical: 2, climate: 1, outdoors: 1 },
  'Media/Communications': { english: 2, creative: 2, entertainment: 3, debating: 2, studio: 1, team: 1, remote: 1 },
  'Education': { helping: 3, reading: 2, classroom: 3, education: 3, team: 1, psychology: 1 },
};

const FIELD_DETAILS: Record<string, { icon: string; description: string; careers: string[]; subjects: string[] }> = {
  'Engineering/Technology': {
    icon: '⚙️',
    description: 'Design, build, and improve systems, machines, and technology that solve real-world problems.',
    careers: ['Software Engineer', 'Mechanical Engineer', 'Data Scientist', 'Robotics Engineer', 'Civil Engineer', 'Product Manager'],
    subjects: ['Mathematics', 'Physics', 'Computer Science', 'Chemistry'],
  },
  'Computer Science/IT': {
    icon: '💻',
    description: 'Create software, apps, AI systems, and digital solutions that shape how the world works.',
    careers: ['Software Developer', 'AI/ML Engineer', 'Cybersecurity Analyst', 'Game Developer', 'UX Designer', 'CTO'],
    subjects: ['Mathematics', 'Computer Science', 'Physics', 'Logic'],
  },
  'Medicine/Health Sciences': {
    icon: '🏥',
    description: 'Diagnose and treat diseases, conduct medical research, and improve human health and wellbeing.',
    careers: ['Doctor', 'Surgeon', 'Medical Researcher', 'Pharmacist', 'Public Health Expert', 'Psychologist'],
    subjects: ['Biology', 'Chemistry', 'Physics', 'Psychology'],
  },
  'Business/Commerce': {
    icon: '📊',
    description: 'Lead organizations, manage finances, develop strategies, and drive economic growth.',
    careers: ['Management Consultant', 'Investment Banker', 'Entrepreneur', 'Marketing Director', 'CFO', 'Chartered Accountant'],
    subjects: ['Economics', 'Mathematics', 'Accountancy', 'Business Studies'],
  },
  'Law': {
    icon: '⚖️',
    description: 'Advocate for justice, draft policies, argue cases, and shape the legal framework of society.',
    careers: ['Corporate Lawyer', 'Criminal Advocate', 'Judge', 'Legal Advisor', 'Policy Maker', 'Human Rights Activist'],
    subjects: ['English', 'History', 'Political Science', 'Economics'],
  },
  'Arts/Humanities': {
    icon: '📜',
    description: 'Study human culture, literature, languages, and history to understand and interpret the world.',
    careers: ['Writer/Author', 'Journalist', 'Historian', 'Translator', 'Professor', 'Curator'],
    subjects: ['English', 'History', 'Philosophy', 'Languages', 'Sociology'],
  },
  'Social Sciences': {
    icon: '🌐',
    description: 'Understand human behavior, societies, and institutions to address social challenges.',
    careers: ['Psychologist', 'Sociologist', 'Policy Analyst', 'Social Worker', 'Economist', 'Political Scientist'],
    subjects: ['Psychology', 'Sociology', 'Political Science', 'Economics'],
  },
  'Natural Sciences': {
    icon: '🔬',
    description: 'Explore the fundamental laws of nature through experimentation and research.',
    careers: ['Research Scientist', 'Professor', 'Lab Director', 'Environmental Scientist', 'Astronomer', 'Biotechnologist'],
    subjects: ['Physics', 'Chemistry', 'Biology', 'Mathematics'],
  },
  'Design': {
    icon: '🎨',
    description: 'Create visual experiences, products, and spaces that are beautiful and functional.',
    careers: ['UX/UI Designer', 'Fashion Designer', 'Product Designer', 'Graphic Designer', 'Industrial Designer', 'Creative Director'],
    subjects: ['Art', 'Computer Science', 'Mathematics', 'Psychology'],
  },
  'Architecture': {
    icon: '🏗️',
    description: 'Design buildings, spaces, and urban environments that combine art with engineering.',
    careers: ['Architect', 'Urban Planner', 'Interior Designer', 'Landscape Architect', 'Sustainable Design Consultant'],
    subjects: ['Mathematics', 'Physics', 'Art', 'Geography'],
  },
  'Media/Communications': {
    icon: '📺',
    description: 'Tell stories, create content, and shape public discourse through various media.',
    careers: ['Film Director', 'Journalist', 'Content Creator', 'PR Manager', 'Advertising Executive', 'Social Media Strategist'],
    subjects: ['English', 'Art', 'Psychology', 'Sociology'],
  },
  'Education': {
    icon: '📚',
    description: 'Inspire and educate the next generation, develop curricula, and improve learning systems.',
    careers: ['Teacher', 'Professor', 'Education Consultant', 'Curriculum Designer', 'EdTech Founder', 'School Principal'],
    subjects: ['Psychology', 'English', 'Any subject of specialization'],
  },
};

export default function ExplorePage() {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [results, setResults] = useState<FieldResult[] | null>(null);

  const handleAnswer = (questionId: string, value: string, type: 'multi' | 'single') => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      if (type === 'single') {
        return { ...prev, [questionId]: [value] };
      }
      // Toggle for multi
      if (current.includes(value)) {
        return { ...prev, [questionId]: current.filter(v => v !== value) };
      }
      return { ...prev, [questionId]: [...current, value] };
    });
  };

  const handleNext = () => {
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(q => q + 1);
    } else {
      calculateResults();
    }
  };

  const calculateResults = () => {
    const fieldScores: Record<string, number> = {};
    const allAnswers = Object.values(answers).flat();

    for (const [field, signals] of Object.entries(FIELD_SIGNALS)) {
      let score = 0;
      for (const answer of allAnswers) {
        score += signals[answer] || 0;
      }
      fieldScores[field] = score;
    }

    // Normalize and sort
    const maxScore = Math.max(...Object.values(fieldScores), 1);
    const colleges = collegesData as unknown as College[];

    const sorted = Object.entries(fieldScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([field, score]): FieldResult => {
        const details = FIELD_DETAILS[field] || { icon: '📌', description: '', careers: [], subjects: [] };
        const matchingColleges = colleges
          .filter(c => c.programs.some(p => p.toLowerCase().includes(field.split('/')[0].toLowerCase())))
          .slice(0, 5)
          .map(c => ({ name: c.shortName || c.name, country: c.country }));

        return {
          field,
          score: Math.round((score / maxScore) * 100),
          icon: details.icon,
          description: details.description,
          whyMatch: generateWhyMatch(field, allAnswers),
          careers: details.careers,
          subjectsToFocus: details.subjects,
          topColleges: matchingColleges,
        };
      });

    setResults(sorted);
  };

  const generateWhyMatch = (field: string, answers: string[]): string => {
    const signals = FIELD_SIGNALS[field] || {};
    const matched = answers.filter(a => (signals[a] || 0) >= 2);
    if (matched.length === 0) return 'Based on your overall profile pattern.';
    const labels: Record<string, string> = {
      math: 'math skills', physics: 'physics interest', chemistry: 'chemistry interest',
      biology: 'biology passion', cs: 'computing interest', english: 'language skills',
      history: 'history interest', economics: 'economics awareness', art: 'artistic sense',
      psychology: 'people understanding', building: 'love of building', coding: 'coding interest',
      creative: 'creativity', debating: 'communication skills', helping: 'desire to help',
      experimenting: 'curiosity', health: 'health focus', justice: 'sense of justice',
      tech: 'technology enthusiasm', lab: 'research orientation', hospital: 'healthcare setting',
      courtroom: 'legal interest', studio: 'creative workspace', reading: 'reading habit',
    };
    const reasons = matched.slice(0, 3).map(a => labels[a] || a);
    return `Matches your ${reasons.join(', ')}.`;
  };

  if (results) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-2">Your Field Matches 🎯</h1>
          <p className="text-muted">Based on your interests and preferences, here are the fields that suit you best.</p>
        </div>

        <div className="space-y-6">
          {results.map((result, i) => (
            <div key={result.field} className={`rounded-2xl border p-6 ${i === 0 ? 'border-primary bg-primary/5' : 'border-card-border bg-card-bg'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{result.icon}</span>
                  <div>
                    <h3 className="font-bold text-lg">{result.field}</h3>
                    <p className="text-xs text-muted">{result.whyMatch}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{result.score}%</div>
                  <div className="text-[10px] text-muted">match</div>
                </div>
              </div>

              <p className="text-sm text-muted mb-4">{result.description}</p>

              <div className="grid gap-4 sm:grid-cols-3 mb-4">
                <div className="rounded-lg bg-blue-50 p-3">
                  <h4 className="text-xs font-medium text-blue-700 mb-1.5">💼 Career Paths</h4>
                  <ul className="space-y-0.5">
                    {result.careers.slice(0, 4).map(c => (
                      <li key={c} className="text-xs text-blue-600">• {c}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg bg-purple-50 p-3">
                  <h4 className="text-xs font-medium text-purple-700 mb-1.5">📖 Subjects to Focus</h4>
                  <ul className="space-y-0.5">
                    {result.subjectsToFocus.map(s => (
                      <li key={s} className="text-xs text-purple-600">• {s}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg bg-green-50 p-3">
                  <h4 className="text-xs font-medium text-green-700 mb-1.5">🏛️ Top Colleges</h4>
                  <ul className="space-y-0.5">
                    {result.topColleges.slice(0, 4).map(c => (
                      <li key={c.name} className="text-xs text-green-600">• {c.name} ({c.country})</li>
                    ))}
                  </ul>
                </div>
              </div>

              <Link
                href={`/?major=${encodeURIComponent(result.field)}`}
                className={`inline-block rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                  i === 0 ? 'bg-primary text-white hover:bg-primary-dark' : 'bg-gray-100 text-foreground hover:bg-gray-200'
                }`}
              >
                Use this major in my profile →
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => { setResults(null); setCurrentQ(0); setAnswers({}); }}
            className="text-sm text-muted hover:text-primary"
          >
            ← Retake quiz
          </button>
        </div>
      </div>
    );
  }

  const question = QUESTIONS[currentQ];
  const currentAnswers = answers[question.id] || [];
  const canContinue = currentAnswers.length > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Career Explorer 🧭</h1>
        <p className="text-muted">Answer a few questions to discover fields that match your personality and interests.</p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-muted mb-1">
          <span>Question {currentQ + 1} of {QUESTIONS.length}</span>
          <span>{Math.round(((currentQ + 1) / QUESTIONS.length) * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-secondary to-primary transition-all duration-300"
            style={{ width: `${((currentQ + 1) / QUESTIONS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-1">{question.question}</h2>
        <p className="text-xs text-muted mb-4">
          {question.type === 'multi' ? 'Select all that apply' : 'Pick one'}
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map(option => (
            <button
              key={option.value}
              onClick={() => handleAnswer(question.id, option.value, question.type)}
              className={`flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm text-left transition-colors ${
                currentAnswers.includes(option.value)
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-card-border hover:border-primary/50'
              }`}
            >
              <span className="text-lg">{option.emoji}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setCurrentQ(q => q - 1)}
            disabled={currentQ === 0}
            className="text-sm text-muted hover:text-foreground disabled:invisible"
          >
            ← Back
          </button>
          <button
            onClick={handleNext}
            disabled={!canContinue}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {currentQ === QUESTIONS.length - 1 ? '🎯 See My Results' : 'Next →'}
          </button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="text-sm text-muted hover:text-primary">
          Skip — I already know what I want to study
        </Link>
      </div>
    </div>
  );
}
