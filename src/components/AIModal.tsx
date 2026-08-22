'use client';

import { useEffect } from 'react';

export default function AIModal() {
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
          <button className="px-3 py-2 rounded bg-primary text-white">Review Essay</button>
          <button className="px-3 py-2 rounded border">Compare Profile</button>
          <button className="px-3 py-2 rounded border">Generate Checklist</button>
        </div>

        <div className="border-t pt-3">
          <label className="block text-sm text-muted mb-2">Ask the assistant</label>
          <div className="flex gap-2">
            <input id="ai-input" placeholder="Ask something like: 'How can I strengthen my profile for CS?'" className="flex-1 rounded border px-3 py-2" />
            <button id="ai-send" className="px-3 py-2 bg-primary text-white rounded">Send</button>
          </div>
          <div id="ai-output" className="mt-4 text-sm text-muted" aria-live="polite"></div>
        </div>
      </div>
    </div>
  );
}
