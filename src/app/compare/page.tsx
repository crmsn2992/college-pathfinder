'use client';

import { useMemo, useState } from 'react';
import collegesData from '@/data/colleges.json';
import type { College, StudentProfile } from '@/lib/types';

const colleges = collegesData as unknown as College[];
const PROFILE_KEY = 'college-pathfinder-profile';

export default function ComparePage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [profile] = useState<StudentProfile | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem(PROFILE_KEY);
    return saved ? (JSON.parse(saved) as StudentProfile) : null;
  });
  const compared = useMemo(
    () => selected.map(id => colleges.find(college => college.id === id)).filter((college): college is College => Boolean(college)),
    [selected],
  );
  const suggestions = colleges
    .filter(college => !selected.includes(college.id))
    .filter(college => {
      const search = query.trim().toLowerCase();
      return !search || `${college.name} ${college.shortName || ''} ${college.location} ${college.country}`.toLowerCase().includes(search);
    })
    .slice(0, 12);

  function toggleCollege(id: string) {
    setSelected(current => current.includes(id)
      ? current.filter(item => item !== id)
      : current.length < 3 ? [...current, id] : current);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold gradient-text">Compare Colleges ⚖️</h1>
      <p className="mt-2 text-muted">Choose up to three colleges to compare side by side.</p>
      {profile && (
        <p className="mt-3 rounded-lg bg-primary/5 p-3 text-sm text-muted">
          Personalized for {profile.name || 'your profile'} — programs and costs are shown against your interests and budget.
        </p>
      )}
      <label className="mt-6 block">
        <span className="mb-2 block text-sm font-medium">Search colleges to compare</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by college, city, or country..."
          className="w-full rounded-lg border border-card-border px-4 py-3 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </label>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {suggestions.map(college => (
          <button key={college.id} type="button" onClick={() => toggleCollege(college.id)}
            className="rounded-lg border border-card-border p-3 text-left hover:border-primary">
            <span className="font-medium">{college.name}</span>
            <span className="mt-1 block text-xs text-muted">{college.location} · {college.country}</span>
          </button>
        ))}
      </div>
      {compared.length > 0 && (
        <div className="mt-8 overflow-x-auto rounded-xl border border-card-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead><tr className="bg-gray-50"><th className="p-4">Category</th>{compared.map(college => <th className="p-4" key={college.id}>{college.name}</th>)}</tr></thead>
            <tbody>
              {[
                ['Location', (college: College) => `${college.location}, ${college.country}`],
                ['Type', (college: College) => college.type],
                ['Annual fees', (college: College) => `₹${college.feesINR.toLocaleString('en-IN')}`],
                ['Acceptance rate', (college: College) => `${college.acceptanceRate}%`],
                ['Difficulty', (college: College) => `${college.difficultyTier}/5 accessibility`],
                ['Programs', (college: College) => college.programs.join(', ')],
                ['Ranking', (college: College) => college.ranking || 'Not listed'],
              ].map(([label, getValue]) => (
                <tr className="border-t border-card-border" key={label as string}>
                  <th className="p-4 font-medium">{label as string}</th>
                  {compared.map(college => <td className="p-4 align-top" key={college.id}>{(getValue as (college: College) => string)(college)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
