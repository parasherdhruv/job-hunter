import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from './login-form';
import { LoadingState } from '@/components/ui/states';

export const metadata: Metadata = { title: 'Sign in · Job Hunter' };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-base font-bold text-white">
            JH
          </span>
          <h1 className="text-xl font-semibold tracking-tight">Autonomous Job Hunter</h1>
          <p className="mt-1 text-sm text-muted">
            Sign in to manage your profile, jobs and applications.
          </p>
        </div>
        <Suspense fallback={<LoadingState label="Loading…" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
