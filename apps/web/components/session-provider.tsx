'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { AuthUser } from '@job-hunter/shared';
import { api, ApiError } from '@/lib/api';
import { LoadingState } from '@/components/ui/states';

interface SessionValue {
  user: AuthUser | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}

/**
 * Resolves the current session once on mount and redirects unauthenticated
 * visitors to `/login`. Child pages can assume a signed-in user.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');

  const load = useCallback(async () => {
    try {
      const me = await api.auth.me();
      setUser(me);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    } finally {
      setStatus('ready');
    }
  }, [pathname, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const signOut = useCallback(async () => {
    await api.auth.logout().catch(() => undefined);
    setUser(null);
    router.replace('/login');
  }, [router]);

  const value = useMemo<SessionValue>(
    () => ({ user, refresh: load, signOut }),
    [user, load, signOut],
  );

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-md px-6 py-24">
        <LoadingState label="Checking your session…" />
      </div>
    );
  }

  if (!user) return null;

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
