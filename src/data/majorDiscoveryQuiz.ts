'use client';

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
}

export interface QuizOption {
  text: string;
  majorScores: Record<string, number>; // major -> points
}

export const MAJOR_DISCOVERY_QUIZ: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'When working on a problem, do you prefer...',
    options: [
      {
        text: 'Solving it with logic and numbers',
        majorScores: {
          'Engineering/Technology': 3,
          'Computer Science/IT': 4,
          'Natural Sciences': 3,
          'Business/Commerce': 2,
        },
      },
      {
        text: 'Understanding how people think and behave',
        majorScores: {
          'Social Sciences': 4,
          'Education': 3,
          'Media/Communications': 2,
        },
      },
      {
        text: 'Creating something new and original',
        majorScores: {
          'Design': 4,
          'Media/Communications': 3,
          'Arts/Humanities': 4,
          'Architecture': 3,
        },
      },
      {
        text: 'Helping others directly',
        majorScores: {
          'Medicine/Health Sciences': 4,
          'Education': 3,
          'Social Sciences': 2,
          'Law': 2,
        },
      },
    ],
  },
  {
    id: 'q2',
    question: 'What type of work environment excites you most?',
    options: [
      {
        text: 'Lab, research, or experimental setting',
        majorScores: {
          'Natural Sciences': 4,
          'Medicine/Health Sciences': 3,
          'Engineering/Technology': 2,
        },
      },
      {
        text: 'Office with data, analysis, and strategy',
        majorScores: {
          'Business/Commerce': 4,
          'Computer Science/IT': 2,
          'Law': 2,
        },
      },
      {
        text: 'Creative studio, design space, or production set',
        majorScores: {
          'Design': 4,
          'Media/Communications': 4,
          'Arts/Humanities': 3,
          'Architecture': 3,
        },
      },
      {
        text: 'Courtroom, policy office, or community setting',
        majorScores: {
          'Law': 4,
          'Social Sciences': 3,
          'Education': 2,
        },
      },
    ],
  },
  {
    id: 'q3',
    question: 'Which subject in school did you enjoy most?',
    options: [
      {
        text: 'Math and Physics',
        majorScores: {
          'Engineering/Technology': 4,
          'Computer Science/IT': 4,
          'Natural Sciences': 3,
        },
      },
      {
        text: 'Biology and Chemistry',
        majorScores: {
          'Medicine/Health Sciences': 4,
          'Natural Sciences': 4,
          'Agriculture': 2,
        },
      },
      {
        text: 'History, Literature, Languages',
        majorScores: {
          'Arts/Humanities': 4,
          'Media/Communications': 2,
          'Law': 2,
        },
      },
      {
        text: 'Economics, Commerce, Accounting',
        majorScores: {
          'Business/Commerce': 4,
          'Law': 2,
          'Social Sciences': 2,
        },
      },
    ],
  },
  {
    id: 'q4',
    question: 'Your ideal career would involve...',
    options: [
      {
        text: 'Building, designing, or creating physical things',
        majorScores: {
          'Engineering/Technology': 4,
          'Design': 3,
          'Architecture': 4,
        },
      },
      {
        text: 'Writing, storytelling, or communication',
        majorScores: {
          'Media/Communications': 4,
          'Arts/Humanities': 3,
        },
      },
      {
        text: 'Treating patients or researching cures',
        majorScores: {
          'Medicine/Health Sciences': 4,
          'Natural Sciences': 2,
        },
      },
      {
        text: 'Leading organizations or making business decisions',
        majorScores: {
          'Business/Commerce': 4,
          'Engineering/Technology': 2,
          'Law': 2,
        },
      },
    ],
  },
  {
    id: 'q5',
    question: 'How do you feel about learning rules and policies?',
    options: [
      {
        text: 'I love understanding how systems and laws work',
        majorScores: {
          'Law': 4,
          'Social Sciences': 3,
          'Business/Commerce': 2,
        },
      },
      {
        text: 'I prefer creative freedom over strict rules',
        majorScores: {
          'Design': 4,
          'Arts/Humanities': 4,
          'Media/Communications': 3,
        },
      },
      {
        text: 'Rules are useful, but I focus on solving problems',
        majorScores: {
          'Engineering/Technology': 3,
          'Computer Science/IT': 3,
          'Natural Sciences': 2,
        },
      },
      {
        text: 'I like balancing both structure and creativity',
        majorScores: {
          'Architecture': 3,
          'Business/Commerce': 2,
          'Education': 2,
        },
      },
    ],
  },
  {
    id: 'q6',
    question: 'What motivates you most?',
    options: [
      {
        text: 'Innovation and cutting-edge technology',
        majorScores: {
          'Computer Science/IT': 4,
          'Engineering/Technology': 3,
          'Natural Sciences': 2,
        },
      },
      {
        text: 'Making a positive social impact',
        majorScores: {
          'Social Sciences': 3,
          'Education': 4,
          'Law': 3,
          'Medicine/Health Sciences': 3,
        },
      },
      {
        text: 'Financial success and business growth',
        majorScores: {
          'Business/Commerce': 4,
          'Engineering/Technology': 2,
          'Law': 2,
        },
      },
      {
        text: 'Artistic expression and cultural contribution',
        majorScores: {
          'Arts/Humanities': 4,
          'Design': 3,
          'Media/Communications': 4,
        },
      },
    ],
  },
  {
    id: 'q7',
    question: 'Do you prefer working with...',
    options: [
      {
        text: 'Computers, code, and technology',
        majorScores: {
          'Computer Science/IT': 5,
          'Engineering/Technology': 2,
        },
      },
      {
        text: 'People directly (counseling, mentoring, etc.)',
        majorScores: {
          'Education': 4,
          'Social Sciences': 3,
          'Medicine/Health Sciences': 2,
        },
      },
      {
        text: 'Numbers, data, and financial analysis',
        majorScores: {
          'Business/Commerce': 4,
          'Natural Sciences': 2,
        },
      },
      {
        text: 'Visual elements, aesthetics, and user experience',
        majorScores: {
          'Design': 4,
          'Architecture': 3,
          'Media/Communications': 3,
        },
      },
    ],
  },
];

export function calculateMajorRecommendations(
  answers: Record<string, number>
): { major: string; score: number }[] {
  const majorScores: Record<string, number> = {};

  Object.entries(answers).forEach(([questionId, optionIndex]) => {
    const question = MAJOR_DISCOVERY_QUIZ.find((q) => q.id === questionId);
    if (question && question.options[optionIndex]) {
      const option = question.options[optionIndex];
      Object.entries(option.majorScores).forEach(([major, points]) => {
        majorScores[major] = (majorScores[major] || 0) + points;
      });
    }
  });

  return Object.entries(majorScores)
    .map(([major, score]) => ({ major, score }))
    .sort((a, b) => b.score - a.score);
}

export const MAJOR_DESCRIPTIONS: Record<string, string> = {
  'Engineering/Technology': 'Design and build systems, infrastructure, and mechanical solutions.',
  'Computer Science/IT': 'Develop software, apps, and digital solutions.',
  'Medicine/Health Sciences': 'Diagnose and treat diseases, conduct medical research.',
  'Business/Commerce': 'Manage organizations, finance, marketing, and entrepreneurship.',
  'Law': 'Practice law, policy-making, and justice advocacy.',
  'Arts/Humanities': 'Study languages, literature, history, and cultural studies.',
  'Social Sciences': 'Research human behavior, society, economics, and sociology.',
  'Natural Sciences': 'Conduct research in physics, chemistry, biology, and mathematics.',
  'Design': 'Create visual and product designs, UX/UI, and graphic design.',
  'Architecture': 'Design buildings and urban spaces.',
  'Media/Communications': 'Produce content, journalism, broadcasting, and public relations.',
  'Education': 'Teach and develop educational programs.',
  'Agriculture': 'Farming, agricultural science, and sustainability.',
  'Hospitality': 'Manage hotels, restaurants, tourism, and event management.',
};
