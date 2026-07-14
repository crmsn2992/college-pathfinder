'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export function Navigation() {
  const pathname = usePathname();
  const { user, signOut, loading } = useAuth();

  const links = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/results', label: 'Results', icon: '📊' },
    { href: '/resources', label: 'Resources', icon: '📚' },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-card-border bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-2xl">🎓</span>
          <span className="gradient-text hidden sm:inline">College Pathfinder</span>
        </Link>
        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:bg-gray-100 hover:text-foreground'
              }`}
            >
              <span>{link.icon}</span>
              <span className="hidden sm:inline">{link.label}</span>
            </Link>
          ))}

          {/* Auth section */}
          {!loading && (
            <div className="ml-2 border-l border-card-border pl-2">
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-xs text-muted truncate max-w-[120px]">
                    {user.email}
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-gray-100 hover:text-foreground transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
