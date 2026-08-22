'use client';

import { useEffect } from 'react';

export function AIButton() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const btn = document.getElementById('ai-fab');
        btn?.click();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <button
      id="ai-fab"
      aria-label="Open AI Assistant"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:scale-105 transition-transform"
      onClick={() => {
        const modal = document.getElementById('ai-modal');
        if (modal) modal.classList.remove('hidden');
      }}
    >
      🤖
    </button>
  );
}
