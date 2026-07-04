import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthLayout } from '@/components/auth/auth-layout';
import { SignupFlow } from '@/components/auth/signup-flow';

export const metadata: Metadata = { title: 'Sign up · SMC CRM' };

export default function SignupPage() {
  return (
    <AuthLayout title="Create your account" subtitle="Join Strategic Mind Chess as a student">
      <Suspense>
        <SignupFlow />
      </Suspense>
    </AuthLayout>
  );
}
