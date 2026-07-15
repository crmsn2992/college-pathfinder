'use client';

import { useState } from 'react';
import { MAJOR_DISCOVERY_QUIZ, calculateMajorRecommendations, MAJOR_DESCRIPTIONS } from '@/data/majorDiscoveryQuiz';
import type { StudentProfile } from '@/lib/types';

interface MajorDiscoveryQuizProps {
  onComplete: (selectedMajors: string[]) => void;
  profile: StudentProfile;
}

export default function MajorDiscoveryQuiz({ onComplete, profile }: MajorDiscoveryQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [selectedMajors, setSelectedMajors] = useState<string[]>([]);

  const handleAnswer = (optionIndex: number) => {
    const questionId = MAJOR_DISCOVERY_QUIZ[currentQuestion].id;
    const newAnswers = { ...answers, [questionId]: optionIndex };
    setAnswers(newAnswers);

    if (currentQuestion < MAJOR_DISCOVERY_QUIZ.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Quiz complete, show results
      setShowResults(true);
    }
  };

  const handleSelectMajor = (major: string) => {
    setSelectedMajors((prev) =>
      prev.includes(major) ? prev.filter((m) => m !== major) : [...prev, major]
    );
  };

  const handleComplete = () => {
    if (selectedMajors.length > 0) {
      onComplete(selectedMajors);
    }
  };

  if (showResults) {
    const recommendations = calculateMajorRecommendations(answers);
    const topMajors = recommendations.slice(0, 5);

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🎯</div>
            <h1 className="text-3xl font-bold gradient-text mb-2">Your Major Match Results</h1>
            <p className="text-muted">Based on your answers, here are your top recommended fields of study</p>
          </div>

          <div className="space-y-3 mb-8">
            {topMajors.map((rec, idx) => (
              <div
                key={rec.major}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedMajors.includes(rec.major)
                    ? 'border-primary bg-primary/10'
                    : 'border-card-border bg-card-bg hover:border-primary'
                }`}
                onClick={() => handleSelectMajor(rec.major)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedMajors.includes(rec.major)}
                    onChange={() => handleSelectMajor(rec.major)}
                    className="mt-1 w-5 h-5 accent-primary cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{rec.major}</h3>
                      <span className="text-sm text-muted">Match: {Math.round((rec.score / 35) * 100)}%</span>
                    </div>
                    <p className="text-sm text-muted mb-2">{MAJOR_DESCRIPTIONS[rec.major]}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full"
                        style={{ width: `${(rec.score / 35) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card-bg rounded-lg p-6 border border-card-border mb-6">
            <p className="text-sm text-muted mb-4">
              ✨ <strong>Pro Tip:</strong> You can explore colleges in ANY field! These are just recommendations based on your interests.
              Feel free to adjust your selections.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setCurrentQuestion(0);
                setAnswers({});
                setShowResults(false);
                setSelectedMajors([]);
              }}
              className="flex-1 px-4 py-2.5 text-sm font-medium border border-card-border rounded-lg hover:bg-gray-50 transition-colors"
            >
              Retake Quiz
            </button>
            <button
              onClick={handleComplete}
              disabled={selectedMajors.length === 0}
              className="flex-1 px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue with Selected Majors
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = MAJOR_DISCOVERY_QUIZ[currentQuestion];
  const progress = ((currentQuestion + 1) / MAJOR_DISCOVERY_QUIZ.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🔍</div>
            <h1 className="text-3xl font-bold gradient-text mb-2">Discover Your Major</h1>
            <p className="text-muted">Answer a few questions to find fields that match your interests</p>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted text-center mt-2">
            Question {currentQuestion + 1} of {MAJOR_DISCOVERY_QUIZ.length}
          </p>
        </div>

        {/* Question */}
        <div className="bg-card-bg rounded-2xl p-8 border border-card-border mb-6">
          <h2 className="text-2xl font-bold mb-6">{question.question}</h2>

          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                className="w-full p-4 text-left rounded-lg border-2 border-card-border hover:border-primary hover:bg-primary/5 transition-all font-medium"
              >
                {option.text}
              </button>
            ))}
          </div>
        </div>

        {/* Skip button for unsure students */}
        <div className="text-center">
          <button
            onClick={() => onComplete(['Unsure / Exploring'])}
            className="text-sm text-muted hover:text-primary underline transition-colors"
          >
            Skip this and explore all colleges
          </button>
        </div>
      </div>
    </div>
  );
}
