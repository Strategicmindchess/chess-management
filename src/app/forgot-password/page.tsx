import type { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata: Metadata = { title: 'Forgot password · SMC CRM' };

export default function ForgotPasswordPage() {
  return (
    <AuthLayout title="Forgot your password?" subtitle="We'll email you a code to reset it">
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
