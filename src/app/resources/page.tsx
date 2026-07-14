'use client';

import { useState } from 'react';
import resourcesData from '@/data/resources.json';
import type { Resource, ResourceCategory } from '@/lib/types';

const CATEGORIES: { id: ResourceCategory; label: string; icon: string }[] = [
  { id: 'test-prep', label: 'Test Prep', icon: '📝' },
  { id: 'courses', label: 'Courses', icon: '🎓' },
  { id: 'application-help', label: 'Application Help', icon: '📋' },
  { id: 'scholarships', label: 'Scholarships', icon: '💰' },
  { id: 'skills', label: 'Skills', icon: '🛠️' },
];

export default function ResourcesPage() {
  const [activeCategory, setActiveCategory] = useState<ResourceCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const resources = resourcesData as Resource[];

  const filtered = resources.filter(r => {
    const matchesCategory = activeCategory === 'all' || r.category === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold gradient-text mb-2">Free Resources 📚</h1>
        <p className="text-muted max-w-xl mx-auto">
          Curated free resources to help you prepare for exams, build skills, and ace your applications.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="🔍 Search resources (e.g., SAT, coding, scholarship)..."
          className="w-full rounded-xl border border-card-border px-5 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            activeCategory === 'all'
              ? 'bg-primary text-white shadow-md'
              : 'bg-gray-100 text-muted hover:bg-gray-200'
          }`}
        >
          🌟 All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeCategory === cat.id
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-muted hover:bg-gray-200'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Resources Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-muted">No resources found. Try a different search or category.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(resource => (
            <a
              key={resource.id}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card-hover group rounded-xl border border-card-border bg-card-bg p-5 shadow-sm"
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">{resource.icon || '📄'}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                    {resource.title}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    {CATEGORIES.find(c => c.id === resource.category)?.label}
                  </p>
                </div>
                {resource.free && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 uppercase">
                    Free
                  </span>
                )}
              </div>
              <p className="text-xs text-muted leading-relaxed mb-3">
                {resource.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {resource.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-muted">
                    {tag}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="mt-12 text-center rounded-xl gradient-bg p-8 text-white">
        <h2 className="text-xl font-bold mb-2">Need Personalized Recommendations? 🎯</h2>
        <p className="text-white/80 text-sm mb-4">
          Fill out your student profile and we&apos;ll suggest resources tailored to your goals.
        </p>
        <a
          href="/"
          className="inline-block rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-primary hover:bg-white/90 transition-colors"
        >
          Get Started →
        </a>
      </div>
    </div>
  );
}
