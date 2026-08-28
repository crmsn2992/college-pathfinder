'use client';

import { useEffect, useState } from 'react';

export default function AIModal() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('ai-modal');
        if (modal) modal.classList.add('hidden');
      }
    };
    window.addEventListener('keydown', escHandler);
    return () => window.removeEventListener('keydown', escHandler);
  }, []);

  const close = () => {
    const modal = document.getElementById('ai-modal');
    if (modal) modal.classList.add('hidden');
  };

  const send = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setOutput('');

    // Try to include a profile: prefer localStorage (fast) and fall back to server load
    let profile = null;
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('college-pathfinder-profile') : null;
      if (raw) profile = JSON.parse(raw);
      else {
        // attempt server load - endpoint may or may not exist in this environment
        try {
          const resp = await fetch('/api/profile/load', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
          if (resp.ok) {
            const d = await resp.json();
            if (d?.profile) profile = d.profile;
          }
        } catch {}
      }
    } catch (e) {
      // ignore parse errors
    }

    try {
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input, profile }),
      });

      if (!res.ok) {
        // show details when available
        let detail = '';
        try { detail = await res.text(); } catch {}
        setOutput(`Demo answer: I couldn't reach the AI service. (${res.status}) ${detail}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      const text = data?.recommendation ?? data?.analysis ?? data?.answer ?? JSON.stringify(data);
      setOutput(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
    } catch (err) {
      console.error('AI request error', err);
      setOutput('Demo answer: AI service unavailable. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="ai-modal" className="hidden fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={close}
        role="button"
        aria-label="Close AI Assistant overlay"
      />

      <div className="relative w-full max-w-2xl bg-card-bg rounded-t-lg md:rounded-lg p-4 mx-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">AI Assistant</h3>
          <div className="flex items-center gap-2">
            <button onClick={close} className="text-sm text-muted px-2 py-1">Close</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <button
            className="px-3 py-2 rounded bg-primary text-white"
            onClick={() => setInput('Please review my essay for clarity, structure, and fit for my target colleges.')}
          >
            Review Essay
          </button>
          <button
            className="px-3 py-2 rounded border"
            onClick={() => setInput('Compare my profile to a typical applicant for my target college and provide strengths/gaps.')}
          >
            Compare Profile
          </button>
          <button
            className="px-3 py-2 rounded border"
            onClick={() => setInput('Generate an admissions checklist for applying to international universities.')}
          >
            Generate Checklist
          </button>
        </div>

        <div className="border-t pt-3">
          <label className="block text-sm text-muted mb-2">Ask the assistant</label>
          <div className="flex gap-2">
            <input
              id="ai-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask something like: 'How can I strengthen my profile for CS?'"
              className="flex-1 rounded border px-3 py-2"
            />
            <button id="ai-send" onClick={send} disabled={loading} className="px-3 py-2 bg-primary text-white rounded">
              {loading ? 'Thinking…' : 'Send'}
            </button>
          </div>
          <div id="ai-output" className="mt-4 text-sm text-muted whitespace-pre-wrap" aria-live="polite">{output}</div>
        </div>
      </div>
    </div>
  );
}
