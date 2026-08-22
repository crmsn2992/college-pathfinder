'use client';

import { useState } from 'react';
import collegesData from '@/data/colleges.json';
import { useAuth } from '@/components/AuthProvider';

export default function ComparePage() {
  const { user } = useAuth();
  const [college, setCollege] = useState('');
  const [essay, setEssay] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleCompare = async () => {
    setLoading(true);
    setResult(null);
    setSaved(false);
    try {
      const res = await fetch('/api/ai/compare/essay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collegeId: college, essay }),
      });
      const data = await res.json();
      const analysis = data?.analysis ?? 'No analysis available';
      setResult(analysis);

      // Save to server if logged in
      if (user) {
        try {
          await fetch('/api/essays/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid, collegeId: college, essay, analysis }),
          });
          setSaved(true);
        } catch (e) {
          // ignore save errors
        }
      }
    } catch (e) {
      setResult('Failed to get analysis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">AI Compare — Essay Review</h1>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Target College</label>
        <select value={college} onChange={e => setCollege(e.target.value)} className="w-full rounded border px-3 py-2">
          <option value="">Select a college (optional)</option>
          {(collegesData as { id: string; name: string }[]).slice(0,200).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Paste your essay</label>
        <textarea value={essay} onChange={e => setEssay(e.target.value)} rows={12} className="w-full rounded border px-3 py-2" />
      </div>
      <div className="flex gap-2">
        <button onClick={handleCompare} disabled={loading || !essay} className="px-4 py-2 bg-primary text-white rounded">{loading ? 'Analyzing...' : 'Compare'}</button>
        <button onClick={() => { setEssay(''); setResult(null); setSaved(false); }} className="px-4 py-2 border rounded">Clear</button>
      </div>

      {result && (
        <div className="mt-6 rounded-lg border p-4 bg-white">
          <h3 className="font-semibold mb-2">AI Analysis</h3>
          <pre className="whitespace-pre-wrap text-sm">{result}</pre>
          {saved && <p className="mt-3 text-sm text-green-700">Saved to your account.</p>}
        </div>
      )}
    </div>
  );
}
