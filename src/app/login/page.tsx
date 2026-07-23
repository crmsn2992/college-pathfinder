'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const { signIn, signUp, signInWithGoogle, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Redirect if already logged in
  if (!authLoading && user) {
    router.push('/');
    return null;
  }

  // Map Firebase error messages to user-friendly versions
  const formatError = (msg: string): string => {
    if (msg.includes('auth/email-already-in-use')) return 'This email is already registered. Try signing in instead.';
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) return 'Incorrect email or password. Please try again.';
    if (msg.includes('auth/invalid-email')) return 'Please enter a valid email address.';
    if (msg.includes('auth/weak-password')) return 'Password must be at least 6 characters long.';
    if (msg.includes('auth/too-many-requests')) return 'Too many attempts. Please wait a few minutes and try again.';
    if (msg.includes('auth/popup-closed-by-user')) return 'Google sign-in was cancelled. Please try again.';
    if (msg.includes('auth/network-request-failed')) return 'Network error. Please check your internet connection.';
    if (msg.includes('auth/operation-not-allowed')) return 'This sign-in method is not enabled. Please contact support.';
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Client-side validation
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!password) { setError('Please enter a password.'); return; }
    if (isSignUp && password.length < 6) { setError('Password must be at least 6 characters long.'); return; }

    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password);
      if (error) {
        setError(formatError(error.message));
      } else {
        setSuccessMessage('✅ Account created! You are now signed in.');
        setTimeout(() => router.push('/'), 1500);
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(formatError(error.message));
      } else {
        router.push('/');
      }
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(formatError(error.message));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎓</div>
          <h1 className="text-2xl font-bold gradient-text mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-muted text-sm">
            {isSignUp
              ? 'Sign up to save your profile and track your college journey'
              : 'Sign in to access your saved profile and recommendations'}
          </p>
        </div>

        <div className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-sm">
          {/* Google OAuth */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-card-border px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-card-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card-bg px-2 text-muted">or</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-lg border border-card-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-lg border border-card-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {loading ? '...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-muted">
            {isSignUp ? (
              <>
                Already have an account?{' '}
                <button onClick={() => { setIsSignUp(false); setError(''); }} className="text-primary font-medium hover:underline">
                  Sign In
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{' '}
                <button onClick={() => { setIsSignUp(true); setError(''); }} className="text-primary font-medium hover:underline">
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-muted hover:text-primary">
            ← Continue without signing in
          </Link>
        </div>
      </div>
    </div>
  );
}
