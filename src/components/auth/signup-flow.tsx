'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { SignupDetailsForm } from './signup-details-form';
import { SignupOtpForm } from './signup-otp-form';

export function SignupFlow() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'details' | 'otp'>(
    searchParams.get('step') === 'otp' ? 'otp' : 'details',
  );
  const [email, setEmail] = useState(searchParams.get('email') ?? '');

  if (step === 'otp') {
    return <SignupOtpForm email={email} onBack={() => setStep('details')} />;
  }

  return (
    <SignupDetailsForm
      onVerificationRequired={(verifiedEmail) => {
        setEmail(verifiedEmail);
        setStep('otp');
      }}
    />
  );
}
