'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { StudentProfile, College, RecommendationResult } from '@/lib/types';
import { generateRecommendations } from '@/lib/recommendation';
import { useAuth } from '@/components/AuthProvider';
import { loadProfileFromSupabase, saveResultsToSupabase } from '@/lib/db';
import collegesData from '@/data/colleges.json';

const STORAGE_KEY = 'college-pathfinder-profile';

export default function ResultsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [results, setResults] = useState<RecommendationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'colleges' | 'paths' | 'gaps' | 'timeline'>('colleges');
  const [loading, setLoading] = useState(true);
  const [savedToCloud, setSavedToCloud] = useState(false);

  useEffect(() => {
    async function loadData() {
      let loadedProfile: StudentProfile | null = null;

      // Try loading from Supabase first if logged in
      if (user) {
        const { profile: dbProfile } = await loadProfileFromSupabase();
        if (dbProfile) loadedProfile = dbProfile;
      }

      // Fallback to localStorage
      if (!loadedProfile) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            loadedProfile = JSON.parse(saved) as StudentProfile;
          } catch {
            // ignore
          }
        }
      }

      if (loadedProfile) {
        setProfile(loadedProfile);
        const recs = generateRecommendations(loadedProfile, collegesData as unknown as College[]);
        setResults(recs);

        // Auto-save results to Supabase
        if (user) {
          const { error } = await saveResultsToSupabase(loadedProfile, recs);
          if (!error) setSavedToCloud(true);
        }
      }
      setLoading(false);
    }

    if (!authLoading) {
      loadData();
    }
  }, [user, authLoading]);

  // Redirect to login if not authenticated (optional - show reduced experience)
  if (!authLoading && !user && !loading && !profile) {
    // Only redirect if there's no localStorage data either
    router.push('/login');
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl animate-gentle-pulse mb-4">🎓</div>
          <p className="text-muted">Analyzing your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile || !results) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="text-6xl mb-4">📋</div>
        <h1 className="text-2xl font-bold mb-2">No Profile Found</h1>
        <p className="text-muted mb-6">Complete the student profile form first to get your personalized recommendations.</p>
        <Link href="/" className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-dark">
          Fill Out Profile →
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: 'colleges' as const, label: 'College Matches', icon: '🏛️' },
    { id: 'paths' as const, label: 'Strategy Paths', icon: '🗺️' },
    { id: 'gaps' as const, label: 'Gap Analysis', icon: '📊' },
    { id: 'timeline' as const, label: 'Timeline', icon: '📅' },
  ];

  const reachColleges = results.recommendations.filter(r => r.category === 'reach');
  const matchColleges = results.recommendations.filter(r => r.category === 'match');
  const safetyColleges = results.recommendations.filter(r => r.category === 'safety');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">
          Your College Roadmap 🚀
        </h1>
        <p className="text-muted">
          Hi {profile.name}! Here&apos;s your personalized college recommendation based on your profile.
        </p>
        {/* Cloud save status */}
        {user && savedToCloud && (
          <p className="mt-2 text-xs text-success flex items-center gap-1">
            <span>☁️</span> Results saved to your account
          </p>
        )}
        {!user && (
          <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center justify-between">
            <p className="text-xs text-muted">💡 Sign in to save your results and access them later</p>
            <Link href="/login" className="text-xs font-medium text-primary hover:underline whitespace-nowrap ml-2">
              Sign In →
            </Link>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Matches" value={results.recommendations.length} icon="🎯" color="primary" />
        <StatCard label="Reach" value={reachColleges.length} icon="⭐" color="warning" />
        <StatCard label="Match" value={matchColleges.length} icon="✅" color="success" />
        <StatCard label="Safety" value={safetyColleges.length} icon="🛡️" color="accent" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto rounded-lg bg-gray-100 p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-primary shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'colleges' && (
        <CollegesTab reach={reachColleges} match={matchColleges} safety={safetyColleges} />
      )}
      {activeTab === 'paths' && <PathsTab paths={results.paths} />}
      {activeTab === 'gaps' && <GapsTab gapAnalysis={results.gapAnalysis} resources={results.resourceSuggestions} />}
      {activeTab === 'timeline' && <TimelineTab paths={results.paths} />}
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  const colorClasses: Record<string, string> = {
    primary: 'bg-primary/10 border-primary/20',
    warning: 'bg-yellow-50 border-yellow-200',
    success: 'bg-green-50 border-green-200',
    accent: 'bg-cyan-50 border-cyan-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color] || ''}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function CollegesTab({
  reach,
  match,
  safety,
}: {
  reach: RecommendationResult['recommendations'];
  match: RecommendationResult['recommendations'];
  safety: RecommendationResult['recommendations'];
}) {
  return (
    <div className="space-y-8">
      {safety.length > 0 && (
        <CollegeSection title="🛡️ Safety Schools" subtitle="High chance of admission" colleges={safety} badgeClass="badge-safety" />
      )}
      {match.length > 0 && (
        <CollegeSection title="✅ Match Schools" subtitle="Good chance of admission" colleges={match} badgeClass="badge-match" />
      )}
      {reach.length > 0 && (
        <CollegeSection title="⭐ Reach Schools" subtitle="Ambitious but possible" colleges={reach} badgeClass="badge-reach" />
      )}
      {reach.length === 0 && match.length === 0 && safety.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🤔</div>
          <p className="text-muted">No matches found. Try adjusting your preferred countries or budget.</p>
        </div>
      )}
    </div>
  );
}

function CollegeSection({
  title,
  subtitle,
  colleges,
  badgeClass,
}: {
  title: string;
  subtitle: string;
  colleges: RecommendationResult['recommendations'];
  badgeClass: string;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted mb-4">{subtitle}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {colleges.map(rec => (
          <CollegeCard key={rec.college.id} rec={rec} badgeClass={badgeClass} />
        ))}
      </div>
    </div>
  );
}

function CollegeCard({
  rec,
  badgeClass,
}: {
  rec: RecommendationResult['recommendations'][0];
  badgeClass: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card-hover rounded-xl border border-card-border bg-card-bg p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-sm leading-tight">{rec.college.name}</h4>
        <span className={`${badgeClass} rounded-full px-2 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap`}>
          {rec.category}
        </span>
      </div>
      <p className="text-xs text-muted mb-2">📍 {rec.college.location}, {rec.college.country}</p>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
            style={{ width: `${rec.matchScore}%` }}
          />
        </div>
        <span className="text-xs font-medium text-primary">{rec.matchScore}%</span>
      </div>
      <div className="text-xs space-y-1 mb-3">
        <p>💰 ₹{(rec.college.feesINR / 100000).toFixed(1)}L/year</p>
        <p>📈 {rec.college.acceptanceRate}% acceptance rate</p>
      </div>

      {expanded && (
        <div className="border-t border-card-border pt-3 mt-3 space-y-2">
          {rec.requirementsMet.length > 0 && (
            <div>
              <p className="text-xs font-medium text-success mb-1">✅ Requirements Met:</p>
              {rec.requirementsMet.map((r, i) => (
                <p key={i} className="text-xs text-muted ml-4">• {r.detail}</p>
              ))}
            </div>
          )}
          {rec.areasToImprove.length > 0 && (
            <div>
              <p className="text-xs font-medium text-warning mb-1">⚠️ Areas to Improve:</p>
              {rec.areasToImprove.map((r, i) => (
                <p key={i} className="text-xs text-muted ml-4">• {r.detail}{r.suggestion ? ` → ${r.suggestion}` : ''}</p>
              ))}
            </div>
          )}
          {rec.requirementsNotMet.length > 0 && (
            <div>
              <p className="text-xs font-medium text-danger mb-1">❌ Not Met:</p>
              {rec.requirementsNotMet.map((r, i) => (
                <p key={i} className="text-xs text-muted ml-4">• {r.detail}{r.suggestion ? ` → ${r.suggestion}` : ''}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full mt-2 text-xs text-primary font-medium hover:underline"
      >
        {expanded ? 'Show less ↑' : 'View details ↓'}
      </button>
    </div>
  );
}

function PathsTab({ paths }: { paths: RecommendationResult['paths'] }) {
  const [selectedPath, setSelectedPath] = useState(0);

  if (paths.length === 0) {
    return <p className="text-muted text-center py-8">No paths generated. Complete your profile for personalized strategies.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {paths.map((path, i) => (
          <button
            key={path.id}
            onClick={() => setSelectedPath(i)}
            className={`rounded-xl border p-4 text-left transition-all ${
              selectedPath === i
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-card-border hover:border-primary/50'
            }`}
          >
            <div className="text-2xl mb-2">{path.icon}</div>
            <h4 className="font-semibold text-sm mb-1">{path.name}</h4>
            <p className="text-xs text-muted">{path.description}</p>
          </button>
        ))}
      </div>

      {paths[selectedPath] && (
        <div className="rounded-xl border border-card-border bg-card-bg p-6">
          <h3 className="font-semibold text-lg mb-4">{paths[selectedPath].icon} {paths[selectedPath].name}</h3>

          <div className="grid gap-6 sm:grid-cols-2 mb-6">
            <div>
              <h4 className="text-sm font-medium mb-2 text-success">✅ Pros</h4>
              <ul className="space-y-1">
                {paths[selectedPath].pros.map((p, i) => (
                  <li key={i} className="text-xs text-muted flex gap-1.5">
                    <span>•</span><span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2 text-danger">⚠️ Cons</h4>
              <ul className="space-y-1">
                {paths[selectedPath].cons.map((c, i) => (
                  <li key={i} className="text-xs text-muted flex gap-1.5">
                    <span>•</span><span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-blue-50 p-3">
              <h4 className="text-xs font-medium text-blue-700 mb-2">📝 Exams to Prepare</h4>
              <div className="flex flex-wrap gap-1.5">
                {paths[selectedPath].examsToPrep.map(exam => (
                  <span key={exam} className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                    {exam}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-lg bg-purple-50 p-3">
              <h4 className="text-xs font-medium text-purple-700 mb-2">🏆 Extracurriculars to Add</h4>
              <div className="flex flex-wrap gap-1.5">
                {paths[selectedPath].extracurricularsToAdd.map(ec => (
                  <span key={ec} className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                    {ec}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-green-50 p-3">
            <h4 className="text-xs font-medium text-green-700 mb-1">🎯 Grade Target</h4>
            <p className="text-sm font-semibold text-green-800">{paths[selectedPath].gradeTarget}% or above</p>
          </div>
        </div>
      )}
    </div>
  );
}

function GapsTab({
  gapAnalysis,
  resources,
}: {
  gapAnalysis: RecommendationResult['gapAnalysis'];
  resources: RecommendationResult['resourceSuggestions'];
}) {
  return (
    <div className="space-y-6">
      {/* Grade Gap */}
      <div className="rounded-xl border border-card-border bg-card-bg p-6">
        <h3 className="font-semibold mb-4">📊 Grade Gap Analysis</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span>Current: {gapAnalysis.currentGrades}%</span>
              <span>Target: {gapAnalysis.targetGrades}%</span>
            </div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden relative">
              <div
                className="h-full rounded-full bg-primary absolute left-0"
                style={{ width: `${gapAnalysis.currentGrades}%` }}
              />
              <div
                className="h-full w-0.5 bg-danger absolute top-0"
                style={{ left: `${gapAnalysis.targetGrades}%` }}
              />
            </div>
          </div>
          <div className={`text-center rounded-lg p-2 ${gapAnalysis.gradeGap > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <div className={`text-lg font-bold ${gapAnalysis.gradeGap > 0 ? 'text-danger' : 'text-success'}`}>
              {gapAnalysis.gradeGap > 0 ? `+${gapAnalysis.gradeGap}%` : '✓'}
            </div>
            <div className="text-[10px] text-muted">{gapAnalysis.gradeGap > 0 ? 'needed' : 'on track'}</div>
          </div>
        </div>
      </div>

      {/* Strengths */}
      {gapAnalysis.strengths.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6">
          <h3 className="font-semibold mb-3 text-green-800">💪 Your Strengths</h3>
          <div className="flex flex-wrap gap-2">
            {gapAnalysis.strengths.map((s, i) => (
              <span key={i} className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Subject-by-Subject Breakdown */}
      {gapAnalysis.subjectGaps && gapAnalysis.subjectGaps.length > 0 && (
        <div className="rounded-xl border border-card-border bg-card-bg p-6">
          <h3 className="font-semibold mb-4">📋 Subject-by-Subject Analysis</h3>
          <div className="space-y-3">
            {gapAnalysis.subjectGaps.map((sg, i) => (
              <div key={i} className="rounded-lg border border-card-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{sg.subject}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    sg.priority === 'high' ? 'bg-red-100 text-red-700' :
                    sg.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {sg.priority === 'low' ? '✓ on track' : sg.priority} priority
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full absolute left-0 ${
                        sg.gap > 15 ? 'bg-red-400' : sg.gap > 5 ? 'bg-yellow-400' : 'bg-green-400'
                      }`}
                      style={{ width: `${sg.currentGrade}%` }}
                    />
                    <div
                      className="h-full w-0.5 bg-gray-600 absolute top-0"
                      style={{ left: `${sg.targetGrade}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium whitespace-nowrap">
                    {sg.currentGrade}% → {sg.targetGrade}%
                  </span>
                </div>
                {sg.gap > 0 && (
                  <p className="text-xs text-muted mt-1">💡 {sg.suggestion}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gaps */}
      <div className="grid gap-4 sm:grid-cols-2">
        {gapAnalysis.missingExams.length > 0 && (
          <div className="rounded-xl border border-card-border p-4">
            <h4 className="text-sm font-medium mb-2">📝 Missing Exams</h4>
            <ul className="space-y-1">
              {gapAnalysis.missingExams.map((e, i) => (
                <li key={i} className="text-xs text-muted flex items-center gap-1.5">
                  <span className="text-warning">⚠️</span> {e}
                </li>
              ))}
            </ul>
          </div>
        )}
        {gapAnalysis.extracurricularGaps.length > 0 && (
          <div className="rounded-xl border border-card-border p-4">
            <h4 className="text-sm font-medium mb-2">🏆 Extracurricular Gaps</h4>
            <ul className="space-y-1">
              {gapAnalysis.extracurricularGaps.map((e, i) => (
                <li key={i} className="text-xs text-muted flex items-center gap-1.5">
                  <span className="text-warning">⚠️</span> {e}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Resource Suggestions */}
      {resources.length > 0 && (
        <div className="rounded-xl border border-card-border bg-card-bg p-6">
          <h3 className="font-semibold mb-4">📚 Recommended Resources</h3>
          <div className="space-y-3">
            {resources.map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-card-border p-3 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted">{r.description}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary whitespace-nowrap">
                    {r.relevance}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineTab({ paths }: { paths: RecommendationResult['paths'] }) {
  const allTimeline = paths.length > 0 ? paths[0].timeline : [];

  if (allTimeline.length === 0) {
    return <p className="text-muted text-center py-8">Complete your profile to see a personalized timeline.</p>;
  }

  const categoryColors: Record<string, string> = {
    exam: 'bg-blue-100 text-blue-700 border-blue-200',
    application: 'bg-purple-100 text-purple-700 border-purple-200',
    extracurricular: 'bg-green-100 text-green-700 border-green-200',
    academic: 'bg-orange-100 text-orange-700 border-orange-200',
    deadline: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">📅 Your Action Timeline</h3>
      <p className="text-sm text-muted mb-4">Based on your recommended path, here&apos;s what to do and when.</p>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-primary/20" />
        <div className="space-y-4">
          {allTimeline.map((item, i) => (
            <div key={i} className="relative pl-10">
              <div className="absolute left-2.5 top-1.5 h-3 w-3 rounded-full bg-primary border-2 border-white" />
              <div className={`rounded-lg border p-3 ${categoryColors[item.category] || 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase">{item.month}</span>
                  <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium">
                    {item.category}
                  </span>
                </div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs opacity-80">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
