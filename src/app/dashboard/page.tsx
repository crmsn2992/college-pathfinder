'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { StudentProfile } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const res = await fetch('/api/profile/load', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.uid }) });
        const data = await res.json();
        if (data?.profile) {
          setProfile(data.profile);
        } else {
          // If no server profile, fall back to localStorage if present
          const saved = typeof window !== 'undefined' ? localStorage.getItem('college-pathfinder-profile') : null;
          if (saved) setProfile(JSON.parse(saved));
        }
      } catch (e) {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('college-pathfinder-profile') : null;
        if (saved) setProfile(JSON.parse(saved));
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) load();
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) return <div className="min-h-[60vh] flex items-center justify-center">Loading dashboard...</div>;

  if (!profile) {
    // If logged in but no profile, redirect to onboarding
    router.push('/');
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Welcome back, {profile.name || 'Student'}</h1>
        <Link href="/" className="rounded-md bg-primary px-3 py-1 text-sm text-white">Edit Profile</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border p-4">
          <h3 className="font-semibold mb-2">Academic Summary</h3>
          <p className="text-sm">Board: {profile.educationBoard}</p>
          <p className="text-sm">Grade: {profile.currentGrade}</p>
          <p className="text-sm">Overall Score: {profile.grades}%</p>
          {profile.ibScore !== undefined && <p className="text-sm">IB Score: {profile.ibScore}</p>}
        </div>

        <div className="rounded-xl border p-4">
          <h3 className="font-semibold mb-2">Preferences</h3>
          <p className="text-sm">Intended Majors: {profile.intendedMajors.join(', ') || '—'}</p>
          <p className="text-sm">Preferred Countries: {profile.preferredCountries.join(', ') || '—'}</p>
          <p className="text-sm">Budget: {profile.budgetRange}</p>
        </div>

        <div className="rounded-xl border p-4 md:col-span-2">
          <h3 className="font-semibold mb-2">Extracurriculars & Notes</h3>
          <p className="text-sm">Activities: {profile.extracurriculars.join(', ') || '—'}</p>
          <p className="text-sm mt-2">Notes: {profile.extracurricularDetails || '—'}</p>
        </div>
      </div>

      <div className="mt-6">
        <Link href="/results" className="rounded-lg bg-secondary px-4 py-2 text-white">View Recommendations</Link>
      </div>
    </div>
  );
}
